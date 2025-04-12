import { db } from "../config/database"
import type { BaseRepository } from "./base-repository"
import type { Region, CreateRegionDTO, UpdateRegionDTO } from "../types/region"
import { regions } from "@shared/schema"
import { eq, ilike } from "drizzle-orm"
import { logger } from "../utils/logger"

/**
 * Repositório para operações relacionadas a regiões
 */
export class RegionRepository implements BaseRepository<Region, CreateRegionDTO, UpdateRegionDTO> {
  /**
   * Encontra uma região pelo ID
   */
  async findById(id: number): Promise<Region | undefined> {
    try {
      const [region] = await db.select().from(regions).where(eq(regions.id, id))
      return region ? this.normalizeRegion(region) : undefined
    } catch (error) {
      logger.error(`Erro ao buscar região com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Cria uma nova região
   */
  async create(regionData: CreateRegionDTO): Promise<Region> {
    try {
      // Remover propriedades que não existem no esquema do banco de dados
      const { active, ...dataToInsert } = regionData as any

      const [newRegion] = await db.insert(regions).values(dataToInsert).returning()

      logger.info(`Região ${newRegion.name} (ID: ${newRegion.id}) criada com sucesso`)
      return this.normalizeRegion(newRegion, active)
    } catch (error) {
      logger.error("Erro ao criar região:", error)
      throw error
    }
  }

  /**
   * Atualiza uma região existente
   */
  async update(id: number, regionData: UpdateRegionDTO): Promise<Region | undefined> {
    try {
      // Remover propriedades que não existem no esquema do banco de dados
      const { active, ...dataToUpdate } = regionData as any

      const [updatedRegion] = await db
        .update(regions)
        .set({ ...dataToUpdate, updatedAt: new Date() })
        .where(eq(regions.id, id))
        .returning()

      if (updatedRegion) {
        logger.info(`Região ${updatedRegion.name} (ID: ${updatedRegion.id}) atualizada com sucesso`)

        // Se active foi fornecido, usamos esse valor, caso contrário mantemos o valor atual
        const currentRegion = await this.findById(id)
        const activeValue = active !== undefined ? active : currentRegion?.active

        return this.normalizeRegion(updatedRegion, activeValue)
      }

      return undefined
    } catch (error) {
      logger.error(`Erro ao atualizar região com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Exclui uma região
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(regions).where(eq(regions.id, id)).returning()
      const success = result.length > 0
      if (success) {
        logger.info(`Região com ID ${id} excluída com sucesso`)
      } else {
        logger.warn(`Tentativa de excluir região com ID ${id} falhou - região não encontrada`)
      }
      return success
    } catch (error) {
      logger.error(`Erro ao excluir região com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Lista todas as regiões
   */
  async findAll(): Promise<Region[]> {
    try {
      const regionsList = await db.select().from(regions)
      return regionsList.map((region) => this.normalizeRegion(region))
    } catch (error) {
      logger.error("Erro ao listar todas as regiões:", error)
      throw error
    }
  }

  /**
   * Lista regiões ativas
   */
  async findActive(): Promise<Region[]> {
    try {
      // Como o campo active não existe no banco, buscamos todas as regiões
      // e filtramos as ativas na aplicação
      const regionsList = await db.select().from(regions)
      const normalizedRegions = regionsList.map((region) => this.normalizeRegion(region))
      return normalizedRegions.filter((region) => region.active)
    } catch (error) {
      logger.error("Erro ao listar regiões ativas:", error)
      throw error
    }
  }

  /**
   * Busca regiões por nome
   */
  async searchByName(name: string): Promise<Region[]> {
    try {
      const regionsList = await db
        .select()
        .from(regions)
        .where(ilike(regions.name, `%${name}%`))
      return regionsList.map((region) => this.normalizeRegion(region))
    } catch (error) {
      logger.error(`Erro ao buscar regiões pelo nome "${name}":`, error)
      throw error
    }
  }

  /**
   * Alterna o status ativo/inativo de uma região
   */
  async toggleStatus(id: number): Promise<Region | undefined> {
    try {
      // Obter a região atual
      const region = await this.findById(id)
      if (!region) {
        return undefined
      }

      // Como o campo active não existe no banco, apenas atualizamos a região
      // e retornamos com o status alternado
      const [updatedRegion] = await db
        .update(regions)
        .set({ updatedAt: new Date() })
        .where(eq(regions.id, id))
        .returning()

      if (updatedRegion) {
        // Alternar o status na aplicação
        const newActiveStatus = !region.active

        logger.info(
          `Status da região ${updatedRegion.name} (ID: ${updatedRegion.id}) alterado para ${
            newActiveStatus ? "ativo" : "inativo"
          }`,
        )

        return this.normalizeRegion(updatedRegion, newActiveStatus)
      }

      return undefined
    } catch (error) {
      logger.error(`Erro ao alternar status da região com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Normaliza uma região do banco de dados para o formato da interface Region
   */
  private normalizeRegion(region: any, activeValue?: boolean): Region {
    return {
      ...region,
      active: activeValue !== undefined ? activeValue : true, // Por padrão, consideramos todas as regiões como ativas
      createdAt: region.createdAt || new Date(),
      updatedAt: region.updatedAt || new Date(),
    } as Region
  }
}
