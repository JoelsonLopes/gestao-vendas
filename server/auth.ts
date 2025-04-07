import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { type User as UserType, type InsertUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

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
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          // Verifica se o usuário existe e se a senha está correta
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Email ou senha inválidos" });
          } else {
            // Verificar se a conta está desativada
            if (user.active === false) {
              return done(null, false, { message: "Conta desativada. Entre em contato com o administrador." });
            }
            
            // Verificar se é um representante que precisa de aprovação
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

  passport.serializeUser((user: Express.User, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate request body against schema
      const registerSchema = insertUserSchema.extend({
        password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
        // Adicionamos um campo opcional para indicar quando criar uma região automaticamente
        createRegion: z.boolean().optional(),
      });
      
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está em uso" });
      }

      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Forçar o papel para representante, independente do que foi enviado
      const userData: InsertUser = {
        ...validatedData,
        role: 'representative' as const, // Sempre registra como representante
        approved: false, // Novo usuário não é aprovado por padrão
        password: hashedPassword,
      };
      
      // Se createRegion estiver marcado como true, criamos uma região com seu nome
      let regionId = validatedData.regionId;
      if (validatedData.createRegion) {
        try {
          const newRegion = await storage.createRegion({
            name: validatedData.name,
          });
          // Usar o ID da nova região para o representante
          regionId = newRegion.id;
          userData.regionId = regionId;
        } catch (regionError) {
          console.error("Erro ao criar região:", regionError);
          // Continuamos mesmo se houver erro na criação da região
        }
      }

      // Criar o usuário com os dados validados
      const user = await storage.createUser(userData);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      // Não fazemos login automático, apenas retornamos uma mensagem
      res.status(201).json({ 
        ...userWithoutPassword,
        message: "Cadastro realizado com sucesso. Aguarde a aprovação do administrador para acessar o sistema."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Falha na validação", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: UserType | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        // O info contém a mensagem de erro do LocalStrategy
        return res.status(401).json({ 
          message: info?.message || "Email ou senha inválidos" 
        });
      }
      
      req.login(user, (err: Error | null | undefined) => {
        if (err) return next(err);
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user as UserType & { password: string };
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as UserType & { password: string };
    res.json(userWithoutPassword);
  });

  // Initialize default discounts if not present
  initializeDiscounts();
}

// Helper function to create default discount options
async function initializeDiscounts() {
  const discounts = await storage.listDiscounts();
  
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
      await storage.createDiscount(discount);
    }
  }
}
