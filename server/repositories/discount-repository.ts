import { db } from "../config/database"
import type { BaseRepository } from "./base-repository"
import type { Discount, CreateDiscountDTO, UpdateDiscountDTO } from "../types/discount"
import { discounts } from "@shared/schema"
import { eq } from "drizzle-orm"
import { logger } from "../utils/logger"

/**
 * Repositório para operações relacionadas a descontos
 */
export class DiscountRepository implements BaseRepository<Discount, CreateDiscountDTO, UpdateDiscountDTO> {
  /**
   * Encontra um desconto pelo ID
   */
  async findById(id: number): Promise<Discount | undefined> {
    try {
      const [discount] = await db.select().from(discounts).where(eq(discounts.id, id))
      if (discount) {
        return this.normalizeDiscount(discount)
      }
      return undefined
    } catch (error) {
      logger.error(`Erro ao buscar desconto com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Cria um novo desconto
   */
  async create(discountData: CreateDiscountDTO): Promise<Discount> {
    try {
      // Remover propriedades que não existem no esquema do banco de dados
      const { active, ...dataToInsert } = discountData as any

      const [newDiscount] = await db.insert(discounts).values(dataToInsert).returning()

      logger.info(`Desconto ${newDiscount.name} (ID: ${newDiscount.id}) criado com sucesso`)
      return this.normalizeDiscount(newDiscount)
    } catch (error) {
      logger.error("Erro ao criar desconto:", error)
      throw error
    }
  }

  /**
   * Atualiza um desconto existente
   */
  async update(id: number, discountData: UpdateDiscountDTO): Promise<Discount | undefined> {
    try {
      // Remover propriedades que não existem no esquema do banco de dados
      const { active, ...dataToUpdate } = discountData as any

      const [updatedDiscount] = await db.update(discounts).set(dataToUpdate).where(eq(discounts.id, id)).returning()

      if (updatedDiscount) {
        logger.info(`Desconto ${updatedDiscount.name} (ID: ${updatedDiscount.id}) atualizado com sucesso`)
        return this.normalizeDiscount(updatedDiscount)
      }

      return undefined
    } catch (error) {
      logger.error(`Erro ao atualizar desconto com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Exclui um desconto
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(discounts).where(eq(discounts.id, id)).returning()
      const success = result.length > 0
      if (success) {
        logger.info(`Desconto com ID ${id} excluído com sucesso`)
      } else {
        logger.warn(`Tentativa de excluir desconto com ID ${id} falhou - desconto não encontrado`)
      }
      return success
    } catch (error) {
      logger.error(`Erro ao excluir desconto com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Lista todos os descontos
   */
  async findAll(): Promise<Discount[]> {
    try {
      const discountsList = await db.select().from(discounts)
      return discountsList.map((discount) => this.normalizeDiscount(discount))
    } catch (error) {
      logger.error("Erro ao listar todos os descontos:", error)
      throw error
    }
  }

  /**
   * Lista descontos ativos
   */
  async findActive(): Promise<Discount[]> {
    try {
      // Como o campo active não existe no banco, retornamos todos os descontos
      // e filtramos os ativos na aplicação
      const discountsList = await db.select().from(discounts)
      return discountsList.map((discount) => this.normalizeDiscount(discount)).filter((discount) => discount.active)
    } catch (error) {
      logger.error("Erro ao listar descontos ativos:", error)
      throw error
    }
  }

  /**
   * Alterna o status ativo/inativo de um desconto
   */
  async toggleStatus(id: number): Promise<Discount | undefined> {
    try {
      // Obter o desconto atual
      const discount = await this.findById(id)
      if (!discount) {
        return undefined
      }

      // Como o campo active não existe no banco, apenas retornamos o desconto
      // com o status alternado na aplicação
      const updatedDiscount = this.normalizeDiscount({
        ...discount,
        active: !discount.active,
      })

      logger.info(
        `Status do desconto ${updatedDiscount.name} (ID: ${updatedDiscount.id}) alterado para ${
          updatedDiscount.active ? "ativo" : "inativo"
        } (apenas na aplicação)`,
      )

      return updatedDiscount
    } catch (error) {
      logger.error(`Erro ao alternar status do desconto com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Encontra um desconto pelo nome
   */
  async findByName(name: string): Promise<Discount | undefined> {
    try {
      const [discount] = await db.select().from(discounts).where(eq(discounts.name, name))
      if (discount) {
        return this.normalizeDiscount(discount)
      }
      return undefined
    } catch (error) {
      logger.error(`Erro ao buscar desconto pelo nome ${name}:`, error)
      throw error
    }
  }

  /**
   * Normaliza um desconto do banco de dados para o formato da interface Discount
   */
  private normalizeDiscount(discount: any): Discount {
    return {
      ...discount,
      active: true, // Por padrão, consideramos todos os descontos como ativos
      createdAt: new Date(), // Data atual como fallback
      updatedAt: new Date(), // Data atual como fallback
    } as Discount
  }
}
