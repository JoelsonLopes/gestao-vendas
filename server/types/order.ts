/**
 * Interface para representar um pedido
 */
export interface Order {
  id: number
  code: string
  clientId: number
  representativeId: number
  status: "pending" | "approved" | "rejected" | "delivered" | "canceled"
  totalAmount: string
  discountId?: number | null
  discountPercentage?: string | null
  discountAmount?: string | null
  finalAmount: string
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * DTO para criação de pedido
 */
export interface CreateOrderDTO {
  code?: string
  clientId: number
  representativeId: number
  status?: "pending" | "approved" | "rejected" | "delivered" | "canceled"
  totalAmount: string
  discountId?: number | null
  discountPercentage?: string | null
  discountAmount?: string | null
  finalAmount: string
  notes?: string | null
  items: CreateOrderItemDTO[]
}

/**
 * DTO para atualização de pedido
 */
export interface UpdateOrderDTO {
  clientId?: number
  representativeId?: number
  status?: "pending" | "approved" | "rejected" | "delivered" | "canceled"
  totalAmount?: string
  discountId?: number | null
  discountPercentage?: string | null
  discountAmount?: string | null
  finalAmount?: string
  notes?: string | null
}

/**
 * Interface para representar um item de pedido
 */
export interface OrderItem {
  id: number
  orderId: number
  productId: number
  quantity: number
  unitPrice: string
  totalPrice: string
  clientReference?: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * DTO para criação de item de pedido
 */
export interface CreateOrderItemDTO {
  productId: number
  quantity: number
  unitPrice: string
  totalPrice: string
  clientReference?: string | null
}

/**
 * DTO para atualização de item de pedido
 */
export interface UpdateOrderItemDTO {
  productId?: number
  quantity?: number
  unitPrice?: string
  totalPrice?: string
  clientReference?: string | null
}

/**
 * Interface para representar um pedido com seus itens e informações relacionadas
 */
export interface OrderWithDetails extends Order {
  items: OrderItem[]
  client?: any
  representative?: any
  discount?: any
}
