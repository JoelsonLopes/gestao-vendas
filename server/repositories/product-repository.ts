import { db } from "../config/database"
import type { BaseRepository } from "./base-repository"
import type { Product, CreateProductDTO, UpdateProductDTO } from "../types/product"
import { products } from "@shared/schema"
import { eq, or, ilike, sql } from "drizzle-orm"
import { logger } from "../utils/logger"

/**
 * Repositório para operações relacionadas a produtos
 */
export class ProductRepository implements BaseRepository<Product, CreateProductDTO, UpdateProductDTO> {
  /**
   * Encontra um produto pelo ID
   */
  async findById(id: number): Promise<Product | undefined> {
    try {
      const [product] = await db.select().from(products).where(eq(products.id, id))
      if (product) {
        return this.normalizeProduct(product)
      }
      return undefined
    } catch (error) {
      logger.error(`Erro ao buscar produto com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Encontra um produto pelo código
   */
  async findByCode(code: string): Promise<Product | undefined> {
    try {
      logger.debug(`Buscando produto com código: ${code}`)
      const [product] = await db.select().from(products).where(eq(products.code, code))
      if (product) {
        return this.normalizeProduct(product)
      }
      return undefined
    } catch (error) {
      logger.error(`Erro ao buscar produto pelo código ${code}:`, error)
      throw error
    }
  }

  /**
   * Cria um novo produto
   */
  async create(productData: CreateProductDTO): Promise<Product> {
    try {
      // Preparar dados para inserção
      const dataToInsert: any = {
        ...productData,
        stockQuantity: productData.stockQuantity ?? 0,
        active: productData.active ?? true,
      }

      // Tratar o campo equivalentBrands
      if (dataToInsert.equivalentBrands === "") {
        dataToInsert.equivalentBrands = null
      } else if (dataToInsert.equivalentBrands) {
        // Usar SQL.raw para converter string para array
        dataToInsert.equivalentBrands = sql`ARRAY[${dataToInsert.equivalentBrands}]::text[]`
      }

      const [newProduct] = await db.insert(products).values(dataToInsert).returning()
      logger.info(`Produto ${newProduct.name} (ID: ${newProduct.id}) criado com sucesso`)

      return this.normalizeProduct(newProduct)
    } catch (error) {
      logger.error("Erro ao criar produto:", error)
      throw error
    }
  }

  /**
   * Atualiza um produto existente
   */
  async update(id: number, productData: UpdateProductDTO): Promise<Product | undefined> {
    try {
      // Preparar dados para atualização
      const dataToUpdate: any = { ...productData, updatedAt: new Date() }

      // Tratar o campo equivalentBrands
      if (dataToUpdate.equivalentBrands === "") {
        dataToUpdate.equivalentBrands = null
      } else if (dataToUpdate.equivalentBrands) {
        // Usar SQL.raw para converter string para array
        dataToUpdate.equivalentBrands = sql`ARRAY[${dataToUpdate.equivalentBrands}]::text[]`
      }

      const [updatedProduct] = await db.update(products).set(dataToUpdate).where(eq(products.id, id)).returning()

      if (updatedProduct) {
        logger.info(`Produto ${updatedProduct.name} (ID: ${updatedProduct.id}) atualizado com sucesso`)
        return this.normalizeProduct(updatedProduct)
      }

      return undefined
    } catch (error) {
      logger.error(`Erro ao atualizar produto com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Exclui um produto
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(products).where(eq(products.id, id)).returning()
      const success = result.length > 0
      if (success) {
        logger.info(`Produto com ID ${id} excluído com sucesso`)
      } else {
        logger.warn(`Tentativa de excluir produto com ID ${id} falhou - produto não encontrado`)
      }
      return success
    } catch (error) {
      logger.error(`Erro ao excluir produto com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Lista todos os produtos
   */
  async findAll(): Promise<Product[]> {
    try {
      const productsList = await db.select().from(products)
      return productsList.map((product) => this.normalizeProduct(product))
    } catch (error) {
      logger.error("Erro ao listar todos os produtos:", error)
      throw error
    }
  }

  /**
   * Busca produtos por termo
   */
  async search(query: string): Promise<Product[]> {
    try {
      logger.debug(`Executando busca de produtos com o termo: "${query}"`)

      // Primeira etapa: buscar produtos com correspondência exata no código, nome ou conversion
      const exactMatches = await db
        .select()
        .from(products)
        .where(
          or(
            eq(products.name, query), // Correspondência exata com nome
            eq(products.code, query), // Correspondência exata com código
            eq(products.conversion, query), // Correspondência exata com conversão
          ),
        )
        .limit(20)

      // Segunda etapa: buscar produtos relacionados, onde o código pesquisado aparece como "conversion"
      const relatedProducts = await db.select().from(products).where(eq(products.conversion, query)).limit(20)

      // Combinar resultados e remover duplicatas
      const allResults = [...exactMatches, ...relatedProducts]
      const uniqueResults = Array.from(new Map(allResults.map((item) => [item.id, item])).values())

      if (uniqueResults.length > 0) {
        logger.debug(`Encontrados ${uniqueResults.length} produtos com correspondência para "${query}"`)
        return uniqueResults.map((product) => this.normalizeProduct(product))
      }

      // Se não encontrou nada com as buscas exatas, faz uma busca mais ampla com LIKE
      const result = await db
        .select()
        .from(products)
        .where(
          or(
            ilike(products.name, `%${query}%`),
            ilike(products.category, `%${query}%`),
            ilike(products.brand, `%${query}%`),
            ilike(products.barcode, `%${query}%`),
            ilike(products.code, `%${query}%`),
            ilike(products.conversion, `%${query}%`), // Buscar também na referência do cliente
          ),
        )
        .limit(20)

      logger.debug(`Encontrados ${result.length} produtos para o termo "${query}" na busca ampla`)
      return result.map((product) => this.normalizeProduct(product))
    } catch (error) {
      logger.error(`Erro ao buscar produtos com termo "${query}":`, error)
      throw error
    }
  }

  /**
   * Encontra um produto pela referência do cliente
   */
  async findByClientReference(clientRef: string): Promise<Product | undefined> {
    try {
      logger.debug(`Buscando produto pela referência do cliente: ${clientRef}`)

      // Primeira etapa: buscar produtos com correspondência exata no código, nome ou conversion
      const exactMatches = await db
        .select()
        .from(products)
        .where(
          or(
            eq(products.code, clientRef), // Correspondência exata com código
            eq(products.name, clientRef), // Correspondência exata com nome
            eq(products.conversion, clientRef), // Correspondência exata com conversão
          ),
        )

      if (exactMatches.length > 0) {
        logger.debug(`Encontrado produto com correspondência exata para "${clientRef}"`)
        return this.normalizeProduct(exactMatches[0])
      }

      // Se não encontrou correspondência exata, tentamos uma busca mais ampla com ILIKE
      const productsWithSimilarRef = await db
        .select()
        .from(products)
        .where(
          or(
            ilike(products.conversion, `%${clientRef}%`), // Busca na referência do cliente
            ilike(products.code, `%${clientRef}%`), // Busca no código
            ilike(products.name, `%${clientRef}%`), // Busca no nome
          ),
        )
        .limit(1)

      if (productsWithSimilarRef.length > 0) {
        logger.debug(`Encontrado produto com referência similar a '${clientRef}'`)
        return this.normalizeProduct(productsWithSimilarRef[0])
      }

      logger.debug(`Nenhum produto encontrado pela referência do cliente '${clientRef}'`)
      return undefined
    } catch (error) {
      logger.error(`Erro ao buscar produto pela referência do cliente ${clientRef}:`, error)
      throw error
    }
  }

  /**
   * Salva a conversão de um produto
   */
  async saveConversion(productId: number, clientRef: string): Promise<Product | undefined> {
    try {
      logger.debug(`Salvando conversão para o produto ${productId}: ${clientRef}`)

      const [updatedProduct] = await db
        .update(products)
        .set({
          conversion: clientRef,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning()

      if (updatedProduct) {
        logger.info(`Conversão salva para o produto ${updatedProduct.name} (ID: ${updatedProduct.id})`)
        return this.normalizeProduct(updatedProduct)
      }

      return undefined
    } catch (error) {
      logger.error(`Erro ao salvar conversão para o produto ${productId}:`, error)
      throw error
    }
  }

  /**
   * Importa múltiplos produtos
   */
  async importMany(productsData: CreateProductDTO[]): Promise<number> {
    try {
      logger.info(`Preparando para importar ${productsData.length} produtos`)

      // Inserir os produtos em lotes para evitar problemas com grandes volumes
      let insertedCount = 0
      const batchSize = 100

      for (let i = 0; i < productsData.length; i += batchSize) {
        const batch = productsData.slice(i, i + batchSize)
        
        // Processar cada produto individualmente para garantir a conversão correta
        for (const productData of batch) {
          await this.create(productData)
          insertedCount++
        }
      }

      logger.info(`${insertedCount} produtos importados com sucesso`)
      return insertedCount
    } catch (error) {
      logger.error("Erro ao importar produtos:", error)
      throw error
    }
  }

  /**
   * Obtém estatísticas de produtos
   */
  async getStatistics(): Promise<{ total: number; active: number }> {
    try {
      const allProducts = await this.findAll()
      const activeProducts = allProducts.filter((product) => product.active)

      return {
        total: allProducts.length,
        active: activeProducts.length,
      }
    } catch (error) {
      logger.error("Erro ao obter estatísticas de produtos:", error)
      throw error
    }
  }

  /**
   * Normaliza um produto do banco de dados para o formato da interface Product
   */
  private normalizeProduct(product: any): Product {
    // Converter equivalentBrands de array para string, se necessário
    let equivalentBrands = product.equivalentBrands
    if (Array.isArray(equivalentBrands) && equivalentBrands.length > 0) {
      equivalentBrands = equivalentBrands.join(", ")
    }

    return {
      ...product,
      equivalentBrands,
      stockQuantity: product.stockQuantity === null ? 0 : product.stockQuantity,
      active: product.active === null ? false : product.active,
      createdAt: product.createdAt || new Date(),
      updatedAt: product.updatedAt || new Date(),
    } as Product
  }
}
