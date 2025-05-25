import { z } from "zod";
import { insertUserSchema } from "@shared/schema";

// Schema para registro de novo usuário
export const registerUserSchema = insertUserSchema.extend({
  password: z.string()
    .min(6, "A senha deve ter no mínimo 6 caracteres")
    .max(100, "A senha deve ter no máximo 100 caracteres"),
  createRegion: z.boolean().optional(),
});

// Schema para criação de usuário pelo admin
export const createUserByAdminSchema = insertUserSchema.extend({
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
});

// Schema para atualização de usuário
export const updateUserSchema = insertUserSchema.partial().extend({
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters")
    .optional(),
  updateRegion: z.boolean().optional(),
});

// Schema para aprovar usuário
export const approveUserSchema = z.object({
  id: z.number().positive("ID deve ser positivo"),
});

// Schema para buscar usuário por ID
export const getUserByIdSchema = z.object({
  id: z.number().positive("ID deve ser positivo"),
});

// Schema para deletar usuário
export const deleteUserSchema = z.object({
  id: z.number().positive("ID deve ser positivo"),
});

// Tipos exportados
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type CreateUserByAdminInput = z.infer<typeof createUserByAdminSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ApproveUserInput = z.infer<typeof approveUserSchema>;
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>; 