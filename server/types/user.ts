/**
 * Interface para representar um usuário
 */
export interface User {
  id: number
  email: string
  password: string
  name: string
  role: "admin" | "representative"
  regionId?: number | null
  googleId?: string | null
  active: boolean
  approved: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * DTO para criação de usuário
 */
export interface CreateUserDTO {
  email: string
  password: string
  name: string
  role: "admin" | "representative"
  regionId?: number | null
  googleId?: string | null
  active?: boolean
  approved?: boolean
  createRegion?: boolean // Flag para criar região automaticamente
}

/**
 * DTO para atualização de usuário
 */
export interface UpdateUserDTO {
  email?: string
  password?: string
  name?: string
  role?: "admin" | "representative"
  regionId?: number | null
  googleId?: string | null
  active?: boolean
  approved?: boolean
  updateRegion?: boolean // Flag para atualizar região automaticamente
}
