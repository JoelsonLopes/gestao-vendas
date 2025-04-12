import type { Express } from "express"
import { logger } from "../utils/logger"
import type { WebSocketService } from "../services/websocket-service"
import type { RepositoryFactory } from "../repositories/repository-factory"
import { UserRoutes } from "./user-routes"
import { ClientRoutes } from "./client-routes"
import { ProductRoutes } from "./product-routes"
import { OrderRoutes } from "./order-routes"
import { RegionRoutes } from "./region-routes"
import { DiscountRoutes } from "./discount-routes"
import { StatisticsRoutes } from "./statistics-routes"
import { NotificationRoutes } from "./notification-routes"
import { UploadRoutes } from "./upload-routes"

/**
 * Gerenciador central de rotas da aplicação
 */
export class RouteManager {
  private repositoryFactory: RepositoryFactory
  private webSocketService: WebSocketService
  private userRoutes: UserRoutes
  private clientRoutes: ClientRoutes
  private productRoutes: ProductRoutes
  private orderRoutes: OrderRoutes
  private regionRoutes: RegionRoutes
  private discountRoutes: DiscountRoutes
  private statisticsRoutes: StatisticsRoutes
  private notificationRoutes: NotificationRoutes
  private uploadRoutes: UploadRoutes

  constructor(repositoryFactory: RepositoryFactory, webSocketService: WebSocketService) {
    this.repositoryFactory = repositoryFactory
    this.webSocketService = webSocketService

    // Inicializar controladores de rotas
    this.userRoutes = new UserRoutes(repositoryFactory.getUserRepository(), webSocketService)
    this.clientRoutes = new ClientRoutes(repositoryFactory.getClientRepository())
    this.productRoutes = new ProductRoutes(repositoryFactory.getProductRepository())
    this.orderRoutes = new OrderRoutes(
      repositoryFactory.getOrderRepository(),
      repositoryFactory.getClientRepository(),
      repositoryFactory.getProductRepository(),
    )
    this.regionRoutes = new RegionRoutes(repositoryFactory.getRegionRepository())
    this.discountRoutes = new DiscountRoutes(repositoryFactory.getDiscountRepository())
    this.statisticsRoutes = new StatisticsRoutes(
      repositoryFactory.getOrderRepository(),
      repositoryFactory.getClientRepository(),
      repositoryFactory.getProductRepository(),
    )
    this.notificationRoutes = new NotificationRoutes(webSocketService)
    this.uploadRoutes = new UploadRoutes()

    logger.info("Gerenciador de rotas inicializado")
  }

  /**
   * Registra todas as rotas no aplicativo Express
   */
  public registerRoutes(app: Express): void {
    // Rota de verificação de saúde do sistema
    app.get("/api/health", (req, res) => {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      })
    })

    // Registrar rotas de usuários
    this.userRoutes.registerRoutes(app)

    // Registrar rotas de clientes
    this.clientRoutes.registerRoutes(app)

    // Registrar rotas de produtos
    this.productRoutes.registerRoutes(app)

    // Registrar rotas de pedidos
    this.orderRoutes.registerRoutes(app)

    // Registrar rotas de regiões
    this.regionRoutes.registerRoutes(app)

    // Registrar rotas de descontos
    this.discountRoutes.registerRoutes(app)

    // Registrar rotas de estatísticas
    this.statisticsRoutes.registerRoutes(app)

    // Registrar rotas de notificações
    this.notificationRoutes.registerRoutes(app)

    // Registrar rotas de upload
    this.uploadRoutes.registerRoutes(app)

    logger.info("Todas as rotas registradas com sucesso")
  }
}
