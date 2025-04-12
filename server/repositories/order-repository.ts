import { db } from "../config/database"
import type { BaseRepository } from "./base-repository"
import type {
  Order,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderItem,
  CreateOrderItemDTO,
  OrderWithDetails,
} from "../types/order"
import { orders, orderItems, clients, users, discounts, products } from "@shared/schema"
import { eq, and, desc, sql, inArray } from "drizzle-orm"
import { logger } from "../utils/logger"

/**
 * Repositório para operações relacionadas a pedidos
 */
export class OrderRepository implements BaseRepository<Order, CreateOrderDTO, UpdateOrderDTO> {
  /**
   * Encontra um pedido pelo ID
   */
  async findById(id: number): Promise<Order | undefined> {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, id))
      if (order) {
        return this.normalizeOrder(order)
      }
      return undefined
    } catch (error) {
      logger.error(`Erro ao buscar pedido com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Encontra um pedido pelo código
   */
  async findByCode(code: string): Promise<Order | undefined> {
    try {
      // Como o campo code não existe no banco, buscamos pelo ID ou outro campo
      // e depois filtramos pelo código na aplicação
      const allOrders = await db.select().from(orders)
      const normalizedOrders = allOrders.map((order) => this.normalizeOrder(order))
      const order = normalizedOrders.find((o) => o.code === code)
      return order
    } catch (error) {
      logger.error(`Erro ao buscar pedido pelo código ${code}:`, error)
      throw error
    }
  }

  /**
   * Cria um novo pedido
   */
  async create(orderData: CreateOrderDTO): Promise<Order> {
    try {
      // Iniciar uma transação
      return await db.transaction(async (tx) => {
        // Gerar código do pedido se não fornecido
        if (!orderData.code) {
          const timestamp = Date.now().toString()
          const random = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0")
          orderData.code = `P${timestamp.slice(-6)}${random}`
        }

        // Mapear os dados da interface para o esquema do banco
        const dbOrderData = {
          clientId: orderData.clientId,
          representativeId: orderData.representativeId,
          status: this.mapStatusToDb(orderData.status || "pending"),
          subtotal: orderData.totalAmount,
          total: orderData.finalAmount,
          discount: orderData.discountAmount || null,
          taxes: null,
          paymentTerms: null,
          notes: orderData.notes,
        }

        // Criar o pedido
        const [newOrder] = await tx.insert(orders).values(dbOrderData).returning()

        logger.info(`Pedido criado com sucesso (ID: ${newOrder.id})`)

        // Criar os itens do pedido
        if (orderData.items && orderData.items.length > 0) {
          for (const item of orderData.items) {
            // Mapear os dados do item para o esquema do banco
            const dbItemData = {
              orderId: newOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.totalPrice,
              discountId: null,
              discountPercentage: null,
              commission: null,
            }

            await tx.insert(orderItems).values(dbItemData)
          }
          logger.info(`${orderData.items.length} itens adicionados ao pedido ${newOrder.id}`)
        }

        // Retornar o pedido normalizado
        return this.normalizeOrder({
          ...newOrder,
          code: orderData.code, // Adicionar o código gerado
        })
      })
    } catch (error) {
      logger.error("Erro ao criar pedido:", error)
      throw error
    }
  }

  /**
   * Atualiza um pedido existente
   */
  async update(id: number, orderData: UpdateOrderDTO): Promise<Order | undefined> {
    try {
      // Obter o pedido atual
      const currentOrder = await this.findById(id)
      if (!currentOrder) {
        return undefined
      }

      // Mapear os dados da interface para o esquema do banco
      const dbOrderData: any = {}

      if (orderData.clientId !== undefined) {
        dbOrderData.clientId = orderData.clientId
      }

      if (orderData.representativeId !== undefined) {
        dbOrderData.representativeId = orderData.representativeId
      }

      if (orderData.status !== undefined) {
        dbOrderData.status = this.mapStatusToDb(orderData.status)
      }

      if (orderData.totalAmount !== undefined) {
        dbOrderData.subtotal = orderData.totalAmount
      }

      if (orderData.finalAmount !== undefined) {
        dbOrderData.total = orderData.finalAmount
      }

      if (orderData.discountAmount !== undefined) {
        dbOrderData.discount = orderData.discountAmount
      }

      if (orderData.notes !== undefined) {
        dbOrderData.notes = orderData.notes
      }

      // Atualizar o pedido
      const [updatedOrder] = await db.update(orders).set(dbOrderData).where(eq(orders.id, id)).returning()

      if (updatedOrder) {
        logger.info(`Pedido ID ${updatedOrder.id} atualizado com sucesso`)
        return this.normalizeOrder({
          ...updatedOrder,
          code: currentOrder.code, // Manter o código original
        })
      }

      return undefined
    } catch (error) {
      logger.error(`Erro ao atualizar pedido com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Exclui um pedido
   */
  async delete(id: number): Promise<boolean> {
    try {
      // Iniciar uma transação
      return await db.transaction(async (tx) => {
        // Excluir os itens do pedido primeiro
        await tx.delete(orderItems).where(eq(orderItems.orderId, id))

        // Excluir o pedido
        const result = await tx.delete(orders).where(eq(orders.id, id)).returning()
        const success = result.length > 0

        if (success) {
          logger.info(`Pedido com ID ${id} excluído com sucesso`)
        } else {
          logger.warn(`Tentativa de excluir pedido com ID ${id} falhou - pedido não encontrado`)
        }

        return success
      })
    } catch (error) {
      logger.error(`Erro ao excluir pedido com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Lista todos os pedidos
   */
  async findAll(): Promise<Order[]> {
    try {
      const ordersList = await db.select().from(orders).orderBy(desc(orders.createdAt))
      return ordersList.map((order) => this.normalizeOrder(order))
    } catch (error) {
      logger.error("Erro ao listar todos os pedidos:", error)
      throw error
    }
  }

  /**
   * Lista pedidos por representante
   */
  async findByRepresentative(representativeId: number): Promise<Order[]> {
    try {
      const ordersList = await db
        .select()
        .from(orders)
        .where(eq(orders.representativeId, representativeId))
        .orderBy(desc(orders.createdAt))
      return ordersList.map((order) => this.normalizeOrder(order))
    } catch (error) {
      logger.error(`Erro ao listar pedidos do representante ${representativeId}:`, error)
      throw error
    }
  }

  /**
   * Lista pedidos por cliente
   */
  async findByClient(clientId: number): Promise<Order[]> {
    try {
      const ordersList = await db
        .select()
        .from(orders)
        .where(eq(orders.clientId, clientId))
        .orderBy(desc(orders.createdAt))
      return ordersList.map((order) => this.normalizeOrder(order))
    } catch (error) {
      logger.error(`Erro ao listar pedidos do cliente ${clientId}:`, error)
      throw error
    }
  }

  /**
   * Lista pedidos por status
   */
  async findByStatus(status: string): Promise<Order[]> {
    try {
      // Mapear o status da interface para o status do banco
      const dbStatus = this.mapStatusToDb(status)

      const ordersList = await db
        .select()
        .from(orders)
        .where(eq(orders.status, dbStatus))
        .orderBy(desc(orders.createdAt))

      // Filtrar novamente na aplicação para garantir que apenas os pedidos com o status correto sejam retornados
      const normalizedOrders = ordersList.map((order) => this.normalizeOrder(order))
      return normalizedOrders.filter((order) => order.status === status)
    } catch (error) {
      logger.error(`Erro ao listar pedidos com status ${status}:`, error)
      throw error
    }
  }

  /**
   * Obtém os itens de um pedido
   */
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    try {
      const itemsList = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))
      return itemsList.map((item) => this.normalizeOrderItem(item))
    } catch (error) {
      logger.error(`Erro ao obter itens do pedido ${orderId}:`, error)
      throw error
    }
  }

  /**
   * Adiciona um item ao pedido
   */
  async addOrderItem(orderId: number, itemData: CreateOrderItemDTO): Promise<OrderItem> {
    try {
      // Mapear os dados do item para o esquema do banco
      const dbItemData = {
        orderId,
        productId: itemData.productId,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        subtotal: itemData.totalPrice,
        discountId: null,
        discountPercentage: null,
        commission: null,
      }

      const [newItem] = await db.insert(orderItems).values(dbItemData).returning()

      logger.info(`Item adicionado ao pedido ${orderId}`)

      // Atualizar o valor total do pedido
      await this.recalculateOrderTotal(orderId)

      return this.normalizeOrderItem(newItem)
    } catch (error) {
      logger.error(`Erro ao adicionar item ao pedido ${orderId}:`, error)
      throw error
    }
  }

  /**
   * Remove um item do pedido
   */
  async removeOrderItem(itemId: number): Promise<boolean> {
    try {
      // Obter o orderId antes de excluir
      const [item] = await db.select().from(orderItems).where(eq(orderItems.id, itemId))
      if (!item) {
        return false
      }

      const orderId = item.orderId

      // Excluir o item
      const result = await db.delete(orderItems).where(eq(orderItems.id, itemId)).returning()
      const success = result.length > 0

      if (success) {
        logger.info(`Item ${itemId} removido do pedido ${orderId}`)

        // Atualizar o valor total do pedido
        await this.recalculateOrderTotal(orderId)
      }

      return success
    } catch (error) {
      logger.error(`Erro ao remover item ${itemId} do pedido:`, error)
      throw error
    }
  }

  /**
   * Recalcula o valor total do pedido
   */
  private async recalculateOrderTotal(orderId: number): Promise<void> {
    try {
      // Obter todos os itens do pedido
      const items = await this.getOrderItems(orderId)

      // Calcular o valor total
      const totalAmount = items.reduce((sum, item) => sum + Number.parseFloat(item.totalPrice), 0).toFixed(2)

      // Obter o pedido atual para verificar o desconto
      const order = await this.findById(orderId)
      if (!order) {
        throw new Error(`Pedido ${orderId} não encontrado`)
      }

      let finalAmount = totalAmount
      let discountAmount = "0.00"

      // Recalcular o desconto se aplicável
      if (order.discountPercentage) {
        const discountValue = (Number.parseFloat(totalAmount) * Number.parseFloat(order.discountPercentage)) / 100
        discountAmount = discountValue.toFixed(2)
        finalAmount = (Number.parseFloat(totalAmount) - discountValue).toFixed(2)
      }

      // Atualizar o pedido no banco
      await db
        .update(orders)
        .set({
          subtotal: totalAmount,
          discount: discountAmount,
          total: finalAmount,
        })
        .where(eq(orders.id, orderId))

      logger.info(`Valores do pedido ${orderId} recalculados: total=${totalAmount}, final=${finalAmount}`)
    } catch (error) {
      logger.error(`Erro ao recalcular valor total do pedido ${orderId}:`, error)
      throw error
    }
  }

  /**
   * Atualiza o status de um pedido
   */
  async updateStatus(id: number, status: string): Promise<Order | undefined> {
    try {
      // Obter o pedido atual
      const currentOrder = await this.findById(id)
      if (!currentOrder) {
        return undefined
      }

      // Mapear o status da interface para o status do banco
      const dbStatus = this.mapStatusToDb(status)

      // Atualizar o status
      const [updatedOrder] = await db.update(orders).set({ status: dbStatus }).where(eq(orders.id, id)).returning()

      if (updatedOrder) {
        logger.info(`Status do pedido ID ${updatedOrder.id} atualizado para ${status}`)
        return this.normalizeOrder({
          ...updatedOrder,
          code: currentOrder.code, // Manter o código original
        })
      }

      return undefined
    } catch (error) {
      logger.error(`Erro ao atualizar status do pedido ${id} para ${status}:`, error)
      throw error
    }
  }

  /**
   * Obtém um pedido com todos os detalhes (itens, cliente, representante, etc.)
   */
  async getOrderWithDetails(id: number): Promise<OrderWithDetails | undefined> {
    try {
      // Obter o pedido
      const order = await this.findById(id)
      if (!order) {
        return undefined
      }

      // Obter os itens do pedido
      const items = await this.getOrderItems(id)

      // Obter informações do cliente
      const [client] = await db.select().from(clients).where(eq(clients.id, order.clientId))

      // Obter informações do representante
      const [representative] = await db.select().from(users).where(eq(users.id, order.representativeId))

      // Obter informações do desconto, se aplicável
      let discount = undefined
      if (order.discountId) {
        const [discountData] = await db.select().from(discounts).where(eq(discounts.id, order.discountId))
        discount = discountData
      }

      // Obter informações dos produtos para cada item
      const productIds = items.map((item) => item.productId)
      const productsData = await db.select().from(products).where(inArray(products.id, productIds))

      // Mapear produtos para os itens
      const itemsWithProducts = items.map((item) => {
        const product = productsData.find((p) => p.id === item.productId)
        return {
          ...item,
          product,
        }
      })

      // Construir o objeto completo
      const orderWithDetails: OrderWithDetails = {
        ...order,
        items: itemsWithProducts,
        client,
        representative: representative
          ? {
              id: representative.id,
              name: representative.name,
              email: representative.email,
            }
          : undefined,
        discount,
      }

      return orderWithDetails
    } catch (error) {
      logger.error(`Erro ao obter detalhes do pedido ${id}:`, error)
      throw error
    }
  }

  /**
   * Obtém estatísticas de pedidos
   */
  async getStatistics(
    representativeId?: number | null,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number
    pending: number
    approved: number
    rejected: number
    delivered: number
    canceled: number
    totalAmount: string
  }> {
    try {
      // Construir a consulta base com condições
      const conditions = []

      if (representativeId) {
        conditions.push(eq(orders.representativeId, representativeId))
      }

      if (startDate && endDate) {
        conditions.push(sql`${orders.createdAt} >= ${startDate}`)
        conditions.push(sql`${orders.createdAt} <= ${endDate}`)
      }

      // Executar a consulta com as condições apropriadas
      let dbOrders
      if (conditions.length > 0) {
        dbOrders = await db
          .select()
          .from(orders)
          .where(and(...conditions))
      } else {
        dbOrders = await db.select().from(orders)
      }

      // Normalizar os pedidos
      const allOrders = dbOrders.map((order) => this.normalizeOrder(order))

      // Calcular estatísticas
      const pending = allOrders.filter((o) => o.status === "pending").length
      const approved = allOrders.filter((o) => o.status === "approved").length
      const rejected = allOrders.filter((o) => o.status === "rejected").length
      const delivered = allOrders.filter((o) => o.status === "delivered").length
      const canceled = allOrders.filter((o) => o.status === "canceled").length

      // Calcular valor total
      const totalAmount = allOrders.reduce((sum, order) => sum + Number.parseFloat(order.finalAmount), 0).toFixed(2)

      return {
        total: allOrders.length,
        pending,
        approved,
        rejected,
        delivered,
        canceled,
        totalAmount,
      }
    } catch (error) {
      logger.error("Erro ao obter estatísticas de pedidos:", error)
      throw error
    }
  }

  /**
   * Mapeia o status da interface para o status do banco de dados
   */
  private mapStatusToDb(status: string): "cotacao" | "confirmado" {
    switch (status) {
      case "pending":
      case "rejected":
        return "cotacao"
      case "approved":
      case "delivered":
      case "canceled":
        return "confirmado"
      default:
        return "cotacao"
    }
  }

  /**
   * Mapeia o status do banco de dados para o status da interface
   */
  private mapStatusFromDb(dbStatus: "cotacao" | "confirmado", defaultStatus = "pending"): string {
    // Como o banco tem menos estados que a interface, usamos um estado padrão
    // Na prática, seria necessário armazenar o estado real em outro lugar
    return defaultStatus
  }

  /**
   * Normaliza um pedido do banco de dados para o formato da interface Order
   */
  private normalizeOrder(dbOrder: any): Order {
    // Gerar um código baseado no ID se não existir
    const code = dbOrder.code || `ORD-${dbOrder.id.toString().padStart(6, "0")}`

    return {
      id: dbOrder.id,
      code,
      clientId: dbOrder.clientId,
      representativeId: dbOrder.representativeId,
      status: this.mapStatusFromDb(dbOrder.status),
      totalAmount: dbOrder.subtotal || "0.00",
      discountId: null,
      discountPercentage: null,
      discountAmount: dbOrder.discount || null,
      finalAmount: dbOrder.total || "0.00",
      notes: dbOrder.notes,
      createdAt: dbOrder.createdAt || new Date(),
      updatedAt: dbOrder.updatedAt || new Date(),
    } as Order
  }

  /**
   * Normaliza um item de pedido do banco de dados para o formato da interface OrderItem
   */
  private normalizeOrderItem(dbItem: any): OrderItem {
    return {
      id: dbItem.id,
      orderId: dbItem.orderId,
      productId: dbItem.productId,
      quantity: dbItem.quantity,
      unitPrice: dbItem.unitPrice,
      totalPrice: dbItem.subtotal || "0.00",
      clientReference: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as OrderItem
  }
}
