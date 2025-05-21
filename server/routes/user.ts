import { Router } from "express";
import { storage } from "../repositories";
import { isAuthenticated, isAdmin } from "../middlewares/auth";
import { hashPassword } from "../services/auth";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all users (admin only)
router.get("/users", isAdmin, async (req, res) => {
  try {
    const users = await storage.user.listUsers();
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Get all pending users (admin only)
router.get("/pending-users", isAdmin, async (req, res) => {
  try {
    const pendingUsers = await storage.user.getPendingUsers();
    const usersWithoutPasswords = pendingUsers.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error("Error fetching pending users:", error);
    res.status(500).json({ message: "Erro ao buscar usuários pendentes" });
  }
});

// Approve user (admin only)
router.post("/users/:id/approve", isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updatedUser = await storage.user.updateUser(userId, { approved: true });
    if (!updatedUser) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error approving user:", error);
    res.status(500).json({ message: "Erro ao aprovar usuário" });
  }
});

// Delete user (admin only)
router.delete("/users/:id", isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const success = await storage.user.deleteUser(userId);
    if (!success) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json({ message: "Usuário excluído com sucesso" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Erro ao excluir usuário" });
  }
});

// Get all representatives
router.get("/representatives", isAuthenticated, async (req, res) => {
  try {
    const representatives = await storage.user.listRepresentatives();
    const repsWithoutPasswords = representatives.map(({ password, ...rep }) => rep);
    res.json(repsWithoutPasswords);
  } catch (error) {
    res.status(500).json({ message: "Error fetching representatives" });
  }
});

// Get a specific user (admin only)
router.get("/users/:id", isAdmin, async (req, res) => {
  try {
    const user = await storage.user.getUser(parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user" });
  }
});

// Create a new user (admin only)
router.post("/users", isAdmin, async (req, res) => {
  try {
    // Validate request body against schema
    const createUserSchema = insertUserSchema.extend({
      password: z.string().min(6, "Password must be at least 6 characters"),
    });
    const validatedData = createUserSchema.parse(req.body);
    // Check if user already exists
    const existingUser = await storage.user.getUserByEmail(validatedData.email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }
    // Hash password and create user
    const hashedPassword = await hashPassword(validatedData.password);
    let user;
    try {
      // Se for representante, primeiro cria uma região com o mesmo nome
      if (validatedData.role === 'representative') {
        const region = await storage.region.createRegion({
          name: validatedData.name,
          ...(typeof validatedData.name === 'string' && { description: `Região de ${validatedData.name}` }),
        });
        user = await storage.user.createUser({
          ...validatedData,
          password: hashedPassword,
          regionId: region.id,
        });
        console.log(`Região ${region.name} (ID: ${region.id}) criada para representante ${user.name} (ID: ${user.id})`);
      } else {
        user = await storage.user.createUser({
          ...validatedData,
          password: hashedPassword,
        });
      }
    } catch (createError) {
      console.error('Erro ao criar usuário:', createError);
      return res.status(500).json({ 
        message: "Erro ao criar usuário", 
        error: createError instanceof Error ? createError.message : String(createError)
      });
    }
    const { password, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: "Error creating user" });
  }
});

// Update a user (admin only)
router.put("/users/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const currentUser = await storage.user.getUser(id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const updateSchema = insertUserSchema.partial().extend({
      password: z.string().min(6, "Password must be at least 6 characters").optional(),
      updateRegion: z.boolean().optional()
    });
    const validatedData = updateSchema.parse(req.body);
    if (validatedData.email && validatedData.email !== currentUser.email) {
      const existingUser = await storage.user.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }
    let updatedUser;
    if (validatedData.password) {
      validatedData.password = await hashPassword(validatedData.password);
    }
    // Atualização de região se necessário
    if (validatedData.updateRegion && validatedData.role === 'representative' && validatedData.name) {
      const region = await storage.region.createRegion({
        name: validatedData.name,
        ...(typeof validatedData.name === 'string' && { description: `Região de ${validatedData.name}` }),
      });
      updatedUser = await storage.user.updateUser(id, {
        ...validatedData,
        regionId: region.id,
      });
    } else {
      updatedUser = await storage.user.updateUser(id, validatedData);
    }
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: "Error updating user" });
  }
});

export default router; 