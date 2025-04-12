import { WebSocketServer, WebSocket } from "ws"
import type { Server } from "http"
import { logger } from "../utils/logger"

/**
 * Tipos de notificações suportadas
 */
export type NotificationType = "info" | "success" | "warning" | "error" | "heartbeat" | "pong"

/**
 * Interface para notificações
 */
export interface Notification {
  type: NotificationType
  message?: string
  timestamp: number
  data?: any
}

/**
 * Serviço WebSocket simplificado
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null

  constructor(httpServer: Server) {
    logger.info("Serviço WebSocket inicializado")
  }

  /**
   * Inicializa o servidor WebSocket
   */
  public initialize(httpServer: Server): void {
    try {
      // Criar um WebSocket server no mesmo servidor HTTP
      this.wss = new WebSocketServer({
        server: httpServer,
        path: "/ws",
      })

      this.setupEventHandlers()
      logger.info("Servidor WebSocket inicializado com sucesso")
    } catch (error) {
      logger.error("Erro ao inicializar servidor WebSocket:", error)
      this.wss = null
    }
  }

  /**
   * Configura os manipuladores de eventos do WebSocket
   */
  private setupEventHandlers(): void {
    if (!this.wss) return

    this.wss.on("connection", (ws: WebSocket) => {
      logger.info("Nova conexão WebSocket estabelecida")

      // Enviar mensagem de boas-vindas
      this.sendToSocket(ws, {
        type: "info",
        message: "Conectado ao servidor de notificações",
        timestamp: Date.now(),
      })

      // Configurar manipuladores de eventos para esta conexão
      ws.on("message", (message) => {
        try {
          // Tentar parsear a mensagem como JSON
          const data = JSON.parse(message.toString())
          logger.debug(`Mensagem WebSocket recebida: ${JSON.stringify(data)}`)

          // Se for um heartbeat, responder com um pong
          if (data.type === "heartbeat") {
            this.sendToSocket(ws, {
              type: "pong",
              timestamp: Date.now(),
            })
          }
        } catch (error) {
          logger.error("Erro ao processar mensagem WebSocket:", error)
        }
      })

      ws.on("error", (error) => {
        logger.error("Erro na conexão WebSocket:", error)
      })

      ws.on("close", () => {
        logger.info("Conexão WebSocket fechada")
      })
    })

    this.wss.on("error", (error) => {
      logger.error("Erro no servidor WebSocket:", error)
    })
  }

  /**
   * Envia uma notificação para um socket específico
   */
  private sendToSocket(ws: WebSocket, data: Notification): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data))
      } catch (error) {
        logger.error("Erro ao enviar mensagem para WebSocket:", error)
      }
    }
  }

  /**
   * Notifica todos os clientes conectados
   */
  public notifyAll(notification: Notification): void {
    if (!this.wss) return

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToSocket(client, notification)
      }
    })
    logger.debug(`Notificação enviada para todos os clientes: ${notification.message || ""}`)
  }

  /**
   * Notifica apenas os administradores
   */
  public notifyAdmins(notification: Notification): void {
    // Implementação simplificada: apenas log
    logger.debug(`[STUB] Notificação para administradores: ${notification.message || ""}`)
  }

  /**
   * Notifica um usuário específico
   */
  public notifyUser(userId: number, notification: Notification): void {
    // Implementação simplificada: apenas log
    logger.debug(`[STUB] Notificação para usuário ${userId}: ${notification.message || ""}`)
  }
}
