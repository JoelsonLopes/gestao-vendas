import { Express } from "express";
import { type User as UserType } from "@shared/schema";
import { userService } from "../services/user";
import passport from "passport";
import { validate } from "../middlewares/validation";
import { registerUserSchema } from "../validators/user";
import { RegisterResponseDto, LoginResponseDto, toUserResponseDto } from "../dtos/user.dto";

export function setupAuthRoutes(app: Express) {
  app.post("/api/register", 
    validate(registerUserSchema),
    async (req, res, next) => {
      try {
        // Dados já validados pelo middleware
        const userResponseDto = await userService.registerUser(req.body);
        
        const response: RegisterResponseDto = {
          ...userResponseDto,
          message: "Cadastro realizado com sucesso. Aguarde a aprovação do administrador para acessar o sistema."
        };
        
        res.status(201).json(response);
      } catch (error) {
        if (error instanceof Error && error.message === "Este email já está em uso") {
          return res.status(400).json({ message: error.message });
        }
        next(error);
      }
    }
  );

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
        const loginResponse: LoginResponseDto = toUserResponseDto(user);
        res.status(200).json(loginResponse);
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
    const userResponse: LoginResponseDto = toUserResponseDto(req.user);
    res.json(userResponse);
  });
} 