import type { Express, Request, Response, NextFunction } from "express"
import { z } from "zod"
import { isAuthenticated, isAdmin } from "../middlewares/auth-middleware"
import type { WebSocketService } from "../services/websocket-service"
import { logger } from "../utils/logger"
import { NotificationType } from "server/types/notification-type"

/**
 * Controlador de rotas relacionadas a notificações
 */
export class NotificationRoutes {
  private webSocketService: WebSocketService

  constructor(webSocketService: WebSocketService) {
    this.webSocketService = webSocketService
  }

  /**
   * Registra todas as rotas de notificações no aplicativo Express
   */
  public registerRoutes(app: Express): void {
    // Enviar notificação para todos os usuários
    app.post("/api/notifications/all", isAdmin, this.notifyAll.bind(this))

    // Enviar notificação para administradores
    app.post("/api/notifications/admins", isAdmin, this.notifyAdmins.bind(this))

    // Enviar notificação para um usuário específico
    app.post("/api/notifications/user/:userId", isAuthenticated, this.notifyUser.bind(this))

    // Rota para simular notificações (stub)
    app.get("/api/notifications/stub", (req, res) => {
      res.json({
        success: true,
        message: "Notificações desativadas. Usando stub.",
        timestamp: Date.now(),
      })
    })

    logger.info("Rotas de notificações registradas")
  }

  /**
   * Envia uma notificação para todos os usuários
   */
  private async notifyAll(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      // Validar dados de entrada
      const notificationSchema = z.object({
        type: z.enum(["info", "success", "warning", "error"]),
        message: z.string().min(1, "A mensagem é obrigatória"),
        data: z.any().optional(),
      })

      const validatedData = notificationSchema.parse(req.body)

      // Enviar notificação
      this.webSocketService.notifyAll({
        type: validatedData.type as NotificationType,
        message: validatedData.message,
        timestamp: Date.now(),
        ...(validatedData.data ? { data: validatedData.data } : {}),
      })

      res.json({
        success: true,
        message: "Notificação enviada para todos os usuários",
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Envia uma notificação para administradores
   */
  private async notifyAdmins(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      // Validar dados de entrada
      const notificationSchema = z.object({
        type: z.enum(["info", "success", "warning", "error"]),
        message: z.string().min(1, "A mensagem é obrigatória"),
        data: z.any().optional(),
      })

      const validatedData = notificationSchema.parse(req.body)

      // Enviar notificação
      this.webSocketService.notifyAdmins({
        type: validatedData.type as NotificationType,
        message: validatedData.message,
        timestamp: Date.now(),
        ...(validatedData.data ? { data: validatedData.data } : {}),
      })

      res.json({
        success: true,
        message: "Notificação enviada para administradores",
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Envia uma notificação para um usuário específico
   */
  private async notifyUser(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = Number.parseInt(req.params.userId)

      // Verificar se o usuário tem permissão para enviar notificação para este usuário
      // Adicionando verificação explícita para req.user
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Usuário não autenticado",
        })
      }

      if (req.user.role !== "admin" && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Você não tem permissão para enviar notificações para este usuário",
        })
      }

      // Validar dados de entrada
      const notificationSchema = z.object({
        type: z.enum(["info", "success", "warning", "error"]),
        message: z.string().min(1, "A mensagem é obrigatória"),
        data: z.any().optional(),
      })

      const validatedData = notificationSchema.parse(req.body)

      // Enviar notificação
      this.webSocketService.notifyUser(userId, {
        type: validatedData.type as NotificationType,
        message: validatedData.message,
        timestamp: Date.now(),
        ...(validatedData.data ? { data: validatedData.data } : {}),
      })

      res.json({
        success: true,
        message: `Notificação enviada para o usuário ${userId}`,
      })
    } catch (error) {
      next(error)
    }
  }
}
