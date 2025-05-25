import { Router } from "express";
import { userService } from "../services/user";
import { isAuthenticated, isAdmin } from "../middlewares/auth";
import { validate, validateMultiple } from "../middlewares/validation";
import { z } from "zod";
import {
  createUserByAdminSchema,
  updateUserSchema,
  approveUserSchema,
  getUserByIdSchema,
  deleteUserSchema
} from "../validators/user";

const router = Router();

// Get all users (admin only)
router.get("/users", isAdmin, async (req, res) => {
  try {
    const usersWithoutPasswords = await userService.getUsersWithoutPassword();
    res.json(usersWithoutPasswords);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Get all pending users (admin only)
router.get("/pending-users", isAdmin, async (req, res) => {
  try {
    const usersWithoutPasswords = await userService.getPendingUsersWithoutPassword();
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error("Error fetching pending users:", error);
    res.status(500).json({ message: "Erro ao buscar usuários pendentes" });
  }
});

// Approve user (admin only)
router.post("/users/:id/approve", 
  isAdmin,
  validate(approveUserSchema, 'params'),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userWithoutPassword = await userService.approveUser(userId);
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error approving user:", error);
      if (error instanceof Error && error.message === "Usuário não encontrado") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro ao aprovar usuário" });
    }
  }
);

// Delete user (admin only)
router.delete("/users/:id", 
  isAdmin,
  validate(deleteUserSchema, 'params'),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      await userService.deleteUser(userId);
      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      if (error instanceof Error && error.message === "Usuário não encontrado") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  }
);

// Get all representatives
router.get("/representatives", isAuthenticated, async (req, res) => {
  try {
    const repsWithoutPasswords = await userService.getRepresentativesWithoutPassword();
    res.json(repsWithoutPasswords);
  } catch (error) {
    res.status(500).json({ message: "Error fetching representatives" });
  }
});

// Get a specific user (admin only)
router.get("/users/:id", 
  isAdmin,
  validate(getUserByIdSchema, 'params'),
  async (req, res) => {
    try {
      const userWithoutPassword = await userService.getUserByIdWithoutPassword(parseInt(req.params.id));
      if (!userWithoutPassword) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user" });
    }
  }
);

// Create a new user (admin only)
router.post("/users", 
  isAdmin,
  validate(createUserByAdminSchema),
  async (req, res) => {
    try {
      // Dados já validados pelo middleware
      const userWithoutPassword = await userService.createUserByAdmin(req.body);
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof Error && error.message === "Email already in use") {
        return res.status(400).json({ message: error.message });
      }
      console.error('Error creating user:', error);
      res.status(500).json({ 
        message: "Error creating user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

// Update a user (admin only)
router.put("/users/:id", 
  isAdmin,
  validateMultiple([
    { schema: getUserByIdSchema, target: 'params' },
    { schema: updateUserSchema, target: 'body' }
  ]),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Dados já validados pelo middleware
      const userWithoutPassword = await userService.updateUserByAdmin(id, req.body);
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "User not found") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === "Email already in use") {
          return res.status(400).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Error updating user" });
    }
  }
);

export default router; 