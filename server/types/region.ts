/**
 * Interface para representar uma região
 */
export interface Region {
  id: number
  name: string
  description?: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * DTO para criação de região
 */
export interface CreateRegionDTO {
  name: string
  description?: string | null
  active?: boolean
}

/**
 * DTO para atualização de região
 */
export interface UpdateRegionDTO {
  name?: string
  description?: string | null
  active?: boolean
}
