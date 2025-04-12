import { db } from "../config/database"
import type { BaseRepository } from "./base-repository"
import type { User, CreateUserDTO, UpdateUserDTO } from "../types/user"
import { users } from "@shared/schema"
import { eq, and } from "drizzle-orm"
import type { RegionRepository } from "./region-repository"
import { logger } from "../utils/logger"

/**
 * Repositório para operações relacionadas a usuários
 */
export class UserRepository implements BaseRepository<User, CreateUserDTO, UpdateUserDTO> {
  private regionRepository: RegionRepository

  constructor(regionRepository: RegionRepository) {
    this.regionRepository = regionRepository
  }

  /**
   * Encontra um usuário pelo ID
   */
  async findById(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id))
      return user ? this.normalizeUser(user) : undefined
    } catch (error) {
      logger.error(`Erro ao buscar usuário com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Encontra um usuário pelo email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email))
      return user ? this.normalizeUser(user) : undefined
    } catch (error) {
      logger.error(`Erro ao buscar usuário pelo email ${email}:`, error)
      throw error
    }
  }

  /**
   * Encontra um usuário pelo ID do Google
   */
  async findByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.googleId, googleId))
      return user ? this.normalizeUser(user) : undefined
    } catch (error) {
      logger.error(`Erro ao buscar usuário pelo Google ID ${googleId}:`, error)
      throw error
    }
  }

  /**
   * Cria um novo usuário
   */
  async create(userData: CreateUserDTO): Promise<User> {
    try {
      // Se for representante e tiver a flag createRegion, criar uma região primeiro
      if (userData.role === "representative" && userData.createRegion) {
        const region = await this.regionRepository.create({
          name: userData.name,
          description: `Região de ${userData.name}`,
        })

        // Associar a região ao usuário
        userData.regionId = region.id
        logger.info(`Região ${region.name} (ID: ${region.id}) criada para representante ${userData.name}`)
      }

      // Remover propriedades não pertencentes ao schema
      const { createRegion, ...userDataToInsert } = userData

      const [newUser] = await db.insert(users).values(userDataToInsert).returning()

      logger.info(`Usuário ${newUser.name} (ID: ${newUser.id}) criado com sucesso`)
      return this.normalizeUser(newUser)
    } catch (error) {
      logger.error("Erro ao criar usuário:", error)
      throw error
    }
  }

  /**
   * Atualiza um usuário existente
   */
  async update(id: number, userData: UpdateUserDTO): Promise<User | undefined> {
    try {
      // Verificar se o usuário existe
      const existingUser = await this.findById(id)
      if (!existingUser) {
        return undefined
      }

      // Se estiver atualizando o nome e tiver a flag updateRegion, atualizar a região também
      if (userData.name && userData.updateRegion && existingUser.regionId) {
        await this.regionRepository.update(existingUser.regionId, {
          name: userData.name,
        })
        logger.info(`Região ${existingUser.regionId} atualizada para ${userData.name}`)
      }

      // Remover propriedades não pertencentes ao schema
      const { updateRegion, ...userDataToUpdate } = userData

      const [updatedUser] = await db
        .update(users)
        .set({ ...userDataToUpdate, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning()

      if (updatedUser) {
        logger.info(`Usuário ${updatedUser.name} (ID: ${updatedUser.id}) atualizado com sucesso`)
        return this.normalizeUser(updatedUser)
      }

      return undefined
    } catch (error) {
      logger.error(`Erro ao atualizar usuário com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Exclui um usuário
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id)).returning()

      const success = result.length > 0
      if (success) {
        logger.info(`Usuário com ID ${id} excluído com sucesso`)
      } else {
        logger.warn(`Tentativa de excluir usuário com ID ${id} falhou - usuário não encontrado`)
      }

      return success
    } catch (error) {
      logger.error(`Erro ao excluir usuário com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Lista todos os usuários
   */
  async findAll(): Promise<User[]> {
    try {
      const usersList = await db.select().from(users)
      return usersList.map((user) => this.normalizeUser(user))
    } catch (error) {
      logger.error("Erro ao listar todos os usuários:", error)
      throw error
    }
  }

  /**
   * Lista todos os representantes
   */
  async findAllRepresentatives(): Promise<User[]> {
    try {
      const representativesList = await db.select().from(users).where(eq(users.role, "representative"))
      return representativesList.map((user) => this.normalizeUser(user))
    } catch (error) {
      logger.error("Erro ao listar representantes:", error)
      throw error
    }
  }

  /**
   * Lista usuários pendentes de aprovação
   */
  async findPendingUsers(): Promise<User[]> {
    try {
      const pendingUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.role, "representative"), eq(users.approved, false)))
      return pendingUsers.map((user) => this.normalizeUser(user))
    } catch (error) {
      logger.error("Erro ao listar usuários pendentes:", error)
      throw error
    }
  }

  /**
   * Aprova um usuário representante
   */
  async approveUser(id: number): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ approved: true, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning()

      if (updatedUser) {
        logger.info(`Usuário ${updatedUser.name} (ID: ${updatedUser.id}) aprovado com sucesso`)
        return this.normalizeUser(updatedUser)
      }

      return undefined
    } catch (error) {
      logger.error(`Erro ao aprovar usuário com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Alterna o status ativo/inativo de um usuário
   */
  async toggleStatus(id: number): Promise<User | undefined> {
    try {
      // Obter o usuário atual
      const user = await this.findById(id)
      if (!user) {
        return undefined
      }

      // Alternar o status
      const [updatedUser] = await db
        .update(users)
        .set({ active: !user.active, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning()

      if (updatedUser) {
        logger.info(
          `Status do usuário ${updatedUser.name} (ID: ${updatedUser.id}) alterado para ${updatedUser.active ? "ativo" : "inativo"}`,
        )
        return this.normalizeUser(updatedUser)
      }

      return undefined
    } catch (error) {
      logger.error(`Erro ao alternar status do usuário com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Normaliza um usuário do banco de dados para o formato da interface User
   */
  private normalizeUser(user: any): User {
    return {
      ...user,
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date(),
      active: user.active === null ? false : user.active,
      approved: user.approved === null ? false : user.approved,
    } as User
  }
}
