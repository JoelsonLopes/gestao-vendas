import type { Express, Request, Response, NextFunction } from "express"
import { z } from "zod"
import { isAuthenticated, isAdmin } from "../middlewares/auth-middleware"
import type { UserRepository } from "../repositories/user-repository"
import type { WebSocketService } from "../services/websocket-service"
import type { User } from "../types/user"
import { logger } from "../utils/logger"

/**
 * Controlador de rotas relacionadas a usuários
 */
export class UserRoutes {
  private userRepository: UserRepository
  private webSocketService: WebSocketService

  constructor(userRepository: UserRepository, webSocketService: WebSocketService) {
    this.userRepository = userRepository
    this.webSocketService = webSocketService
  }

  /**
   * Registra todas as rotas de usuários no aplicativo Express
   */
  public registerRoutes(app: Express): void {
    // Obter todos os usuários (admin)
    app.get("/api/users", isAdmin, this.getAllUsers.bind(this))

    // Obter usuários pendentes (admin)
    app.get("/api/pending-users", isAdmin, this.getPendingUsers.bind(this))

    // Aprovar usuário (admin)
    app.post("/api/users/:id/approve", isAdmin, this.approveUser.bind(this))

    // Excluir usuário (admin)
    app.delete("/api/users/:id", isAdmin, this.deleteUser.bind(this))

    // Obter representantes
    app.get("/api/representatives", isAuthenticated, this.getRepresentatives.bind(this))

    // Obter usuário específico (admin)
    app.get("/api/users/:id", isAdmin, this.getUserById.bind(this))

    // Criar usuário (admin)
    app.post("/api/users", isAdmin, this.createUser.bind(this))

    // Atualizar usuário (admin)
    app.put("/api/users/:id", isAdmin, this.updateUser.bind(this))

    // Alternar status do usuário (admin)
    app.patch("/api/users/:id/toggle-status", isAdmin, this.toggleUserStatus.bind(this))

    logger.info("Rotas de usuários registradas")
  }

  /**
   * Obtém todos os usuários
   */
  private async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const users = await this.userRepository.findAll()
      const usersWithoutPasswords = users.map(({ password, ...user }) => user)
      res.json({
        success: true,
        data: usersWithoutPasswords,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Obtém usuários pendentes de aprovação
   */
  private async getPendingUsers(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const pendingUsers = await this.userRepository.findPendingUsers()
      const usersWithoutPasswords = pendingUsers.map(({ password, ...user }) => user)
      res.json({
        success: true,
        data: usersWithoutPasswords,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Aprova um usuário representante
   */
  private async approveUser(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = Number.parseInt(req.params.id)
      const updatedUser = await this.userRepository.approveUser(userId)

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        })
      }

      // Notificar sobre a aprovação
      this.webSocketService.notifyAdmins({
        type: "success",
        message: `O representante ${updatedUser.name} foi aprovado com sucesso!`,
        timestamp: Date.now(),
      })

      // Notificar o usuário específico
      this.webSocketService.notifyUser(updatedUser.id, {
        type: "success",
        message: "Sua conta foi aprovada! Você já pode acessar o sistema.",
        timestamp: Date.now(),
      })

      const { password, ...userWithoutPassword } = updatedUser
      res.json({
        success: true,
        data: userWithoutPassword,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Exclui um usuário
   */
  private async deleteUser(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = Number.parseInt(req.params.id)
      const success = await this.userRepository.delete(userId)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        })
      }

      res.json({
        success: true,
        message: "Usuário excluído com sucesso",
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Obtém todos os representantes
   */
  private async getRepresentatives(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      let representatives: User[] = []
      try {
        representatives = await this.userRepository.findAllRepresentatives()
        representatives = representatives.map(({ password, ...rep }) => rep) as User[]
      } catch (error) {
        logger.error("Erro ao listar representantes:", error)
        // Em caso de erro, retornar um array vazio
        representatives = []
      }

      // Garantir que representatives seja sempre um array
      if (!Array.isArray(representatives)) {
        representatives = []
      }

      res.json({
        success: true,
        data: representatives,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Obtém um usuário específico pelo ID
   */
  private async getUserById(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = await this.userRepository.findById(Number.parseInt(req.params.id))

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        })
      }

      const { password, ...userWithoutPassword } = user
      res.json({
        success: true,
        data: userWithoutPassword,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Cria um novo usuário
   */
  private async createUser(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      // Validar dados de entrada
      const createUserSchema = z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
        name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
        role: z.enum(["admin", "representative"]),
        regionId: z.number().optional(),
        active: z.boolean().optional(),
        approved: z.boolean().optional(),
        createRegion: z.boolean().optional(),
      })

      const validatedData = createUserSchema.parse(req.body)

      // Verificar se o email já está em uso
      const existingUser = await this.userRepository.findByEmail(validatedData.email)
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Este email já está em uso",
        })
      }

      // Criar o usuário
      const user = await this.userRepository.create(validatedData)

      // Remover senha da resposta
      const { password, ...userWithoutPassword } = user
      res.status(201).json({
        success: true,
        data: userWithoutPassword,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Atualiza um usuário existente
   */
  private async updateUser(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number.parseInt(req.params.id)

      // Obter o usuário atual
      const currentUser = await this.userRepository.findById(id)
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        })
      }

      // Validar dados de entrada
      const updateUserSchema = z
        .object({
          email: z.string().email("Email inválido").optional(),
          password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres").optional(),
          name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").optional(),
          role: z.enum(["admin", "representative"]).optional(),
          regionId: z.number().optional(),
          active: z.boolean().optional(),
          approved: z.boolean().optional(),
          updateRegion: z.boolean().optional(),
        })
        .partial()

      const validatedData = updateUserSchema.parse(req.body)

      // Verificar se o email já está em uso por outro usuário
      if (validatedData.email && validatedData.email !== currentUser.email) {
        const existingUser = await this.userRepository.findByEmail(validatedData.email)
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Este email já está em uso",
          })
        }
      }

      // Atualizar o usuário
      const user = await this.userRepository.update(id, validatedData)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        })
      }

      // Remover senha da resposta
      const { password, ...userWithoutPassword } = user
      res.json({
        success: true,
        data: userWithoutPassword,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Alterna o status ativo/inativo de um usuário
   */
  private async toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number.parseInt(req.params.id)

      // Obter o usuário atual
      const currentUser = await this.userRepository.findById(id)
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        })
      }

      // Impedir a desativação do último administrador ativo
      if (currentUser.role === "admin" && currentUser.active) {
        const adminUsers = (await this.userRepository.findAll()).filter((u) => u.role === "admin" && u.active)
        if (adminUsers.length <= 1) {
          return res.status(400).json({
            success: false,
            message: "Não é possível desativar o último administrador",
          })
        }
      }

      // Alternar o status
      const user = await this.userRepository.toggleStatus(id)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        })
      }

      // Remover senha da resposta
      const { password, ...userWithoutPassword } = user
      res.json({
        success: true,
        data: userWithoutPassword,
      })
    } catch (error) {
      next(error)
    }
  }
}
