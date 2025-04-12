import { UserRepository } from "./user-repository"
import { ClientRepository } from "./client-repository"
import { ProductRepository } from "./product-repository"
import { OrderRepository } from "./order-repository"
import { RegionRepository } from "./region-repository"
import { DiscountRepository } from "./discount-repository"
import { logger } from "../utils/logger"

/**
 * Fábrica para criar e gerenciar instâncias de repositórios
 */
export class RepositoryFactory {
  private userRepository: UserRepository
  private clientRepository: ClientRepository
  private productRepository: ProductRepository
  private orderRepository: OrderRepository
  private regionRepository: RegionRepository
  private discountRepository: DiscountRepository

  constructor() {
    // Inicializar repositórios
    this.regionRepository = new RegionRepository()
    this.userRepository = new UserRepository(this.regionRepository)
    this.clientRepository = new ClientRepository()
    this.productRepository = new ProductRepository()
    this.orderRepository = new OrderRepository()
    this.discountRepository = new DiscountRepository()

    logger.info("Repositórios inicializados")
  }

  /**
   * Obtém o repositório de usuários
   */
  public getUserRepository(): UserRepository {
    return this.userRepository
  }

  /**
   * Obtém o repositório de clientes
   */
  public getClientRepository(): ClientRepository {
    return this.clientRepository
  }

  /**
   * Obtém o repositório de produtos
   */
  public getProductRepository(): ProductRepository {
    return this.productRepository
  }

  /**
   * Obtém o repositório de pedidos
   */
  public getOrderRepository(): OrderRepository {
    return this.orderRepository
  }

  /**
   * Obtém o repositório de regiões
   */
  public getRegionRepository(): RegionRepository {
    return this.regionRepository
  }

  /**
   * Obtém o repositório de descontos
   */
  public getDiscountRepository(): DiscountRepository {
    return this.discountRepository
  }
}
