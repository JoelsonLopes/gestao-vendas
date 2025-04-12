/**
 * Interface para representar um cliente
 */
export interface Client {
  id: number
  code: string
  name: string
  cnpj: string
  address?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
  email?: string | null
  regionId?: number | null
  representativeId?: number | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * DTO para criação de cliente
 */
export interface CreateClientDTO {
  code: string
  name: string
  cnpj: string
  address?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
  email?: string | null
  regionId?: number | null
  representativeId?: number | null
  active?: boolean
}

/**
 * DTO para atualização de cliente
 */
export interface UpdateClientDTO {
  code?: string
  name?: string
  cnpj?: string
  address?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
  email?: string | null
  regionId?: number | null
  representativeId?: number | null
  active?: boolean
}

/**
 * Interface para representar o histórico de um cliente
 */
export interface ClientHistory {
  id: number
  clientId: number
  userId: number
  action: string
  details: any
  createdAt: Date
}

/**
 * DTO para criação de histórico de cliente
 */
export interface CreateClientHistoryDTO {
  clientId: number
  userId: number
  action: string
  details: any
}
