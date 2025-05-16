/**
 * Serviço de autenticação: configura passport, sessão, hash de senha e inicialização de descontos.
 * Funções auxiliares para hash e comparação de senha.
 */
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "../repositories";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { type User as UserType, type InsertUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

const scryptAsync = promisify(scrypt);

/**
 * Realiza o hash seguro de uma senha usando scrypt e salt aleatório.
 * @param password Senha em texto puro
 * @returns Hash no formato "hash.salt"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compara uma senha fornecida com o hash armazenado.
 * @param supplied Senha fornecida pelo usuário
 * @param stored Hash armazenado no banco
 * @returns true se a senha for válida
 */
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Configura o passport, sessão e serialização de usuário na aplicação Express.
 * @param app Instância do Express
 */
export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 semana
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Estratégia local de autenticação
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.user.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Email ou senha inválidos" });
          } else {
            if (user.active === false) {
              return done(null, false, { message: "Conta desativada. Entre em contato com o administrador." });
            }
            if (user.role === 'representative' && user.approved === false) {
              return done(null, false, { message: "Sua conta ainda não foi aprovada pelo administrador. Tente novamente mais tarde." });
            }
            return done(null, user);
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialização e desserialização do usuário na sessão
  passport.serializeUser((user: Express.User, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.user.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Inicializar descontos padrão se necessário
  initializeDiscounts();
}

/**
 * Inicializa descontos padrão no banco caso não existam.
 * Executado apenas uma vez na inicialização do serviço.
 */
async function initializeDiscounts() {
  const discounts = await storage.discount.listDiscounts();
  if (discounts.length === 0) {
    const defaultDiscounts = [
      { name: '2*5', percentage: '9.75', commission: '7.00' },
      { name: '3*5', percentage: '14.26', commission: '6.00' },
      { name: '4*5', percentage: '18.54', commission: '5.00' },
      { name: '5*5', percentage: '22.62', commission: '4.00' },
      { name: '6*5', percentage: '26.50', commission: '3.00' },
      { name: '7*5', percentage: '30.17', commission: '2.00' },
      { name: '8*5', percentage: '33.64', commission: '2.00' },
      { name: '8*5+3', percentage: '35.65', commission: '2.00' }
    ];
    for (const discount of defaultDiscounts) {
      await storage.discount.createDiscount(discount);
    }
  }
} 