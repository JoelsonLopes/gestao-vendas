/**
 * Interface para representar um desconto
 */
export interface Discount {
  id: number
  name: string
  percentage: string
  commission: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * DTO para criação de desconto
 */
export interface CreateDiscountDTO {
  name: string
  percentage: string
  commission: string
  active?: boolean
}

/**
 * DTO para atualização de desconto
 */
export interface UpdateDiscountDTO {
  name?: string
  percentage?: string
  commission?: string
  active?: boolean
}
