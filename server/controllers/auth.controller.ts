import { Express } from "express";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { type User as UserType, type InsertUser } from "@shared/schema";
import { hashPassword } from "../services/auth.service";
import { storage } from "../storage";
import passport from "passport";

export function setupAuthRoutes(app: Express) {
  app.post("/api/register", async (req, res, next) => {
    try {
      const registerSchema = insertUserSchema.extend({
        password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
        createRegion: z.boolean().optional(),
      });
      const validatedData = registerSchema.parse(req.body);
      const existingUser = await storage.user.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está em uso" });
      }
      const hashedPassword = await hashPassword(validatedData.password);
      const userData: InsertUser = {
        ...validatedData,
        role: 'representative' as const,
        approved: false,
        password: hashedPassword,
      };
      let regionId = validatedData.regionId;
      if (validatedData.createRegion) {
        try {
          const newRegion = await storage.region.createRegion({ name: validatedData.name });
          regionId = newRegion.id;
          userData.regionId = regionId;
        } catch (regionError) {
          console.error("Erro ao criar região:", regionError);
        }
      }
      const user = await storage.user.createUser(userData);
      const { password, ...userWithoutPassword } = user;
      try {
        const notificationPayload = { userName: user.name };
        const fetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationPayload)
        };
        fetch('http://localhost:' + process.env.PORT + '/api/notify-new-user', fetchOptions)
          .catch(err => console.error("Erro ao notificar sobre novo usuário:", err));
      } catch (notificationError) {
        console.error("Erro ao enviar notificação:", notificationError);
      }
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
        return res.status(401).json({
          message: info?.message || "Email ou senha inválidos"
        });
      }
      if (user.role === 'representative' && !user.approved) {
        return res.status(403).json({
          message: "Sua conta ainda não foi aprovada. Aguarde a aprovação do administrador para acessar o sistema."
        });
      }
      req.login(user, (err: Error | null | undefined) => {
        if (err) return next(err);
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
    const { password, ...userWithoutPassword } = req.user as UserType & { password: string };
    res.json(userWithoutPassword);
  });
} 