/**
 * Interface para representar um produto
 */
export interface Product {
  id: number
  code: string
  name: string
  description?: string | null
  barcode?: string | null
  category?: string | null
  brand?: string | null
  price: string
  stockQuantity: number
  active: boolean
  conversion?: string | null
  conversionBrand?: string | null
  equivalentBrands?: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * DTO para criação de produto
 */
export interface CreateProductDTO {
  code: string
  name: string
  description?: string | null
  barcode?: string | null
  category?: string | null
  brand?: string | null
  price: string
  stockQuantity?: number
  active?: boolean
  conversion?: string | null
  conversionBrand?: string | null
  equivalentBrands?: string | null
}

/**
 * DTO para atualização de produto
 */
export interface UpdateProductDTO {
  code?: string
  name?: string
  description?: string | null
  barcode?: string | null
  category?: string | null
  brand?: string | null
  price?: string
  stockQuantity?: number
  active?: boolean
  conversion?: string | null
  conversionBrand?: string | null
  equivalentBrands?: string | null
}
