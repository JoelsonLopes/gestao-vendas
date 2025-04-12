import { db } from "../config/database"
import type { BaseRepository } from "./base-repository"
import type { Client, CreateClientDTO, UpdateClientDTO, ClientHistory, CreateClientHistoryDTO } from "../types/client"
import { clients, clientHistory } from "@shared/schema"
import { eq, ilike, or } from "drizzle-orm"
import { logger } from "../utils/logger"

/**
 * Repositório para operações relacionadas a clientes
 */
export class ClientRepository implements BaseRepository<Client, CreateClientDTO, UpdateClientDTO> {
  /**
   * Encontra um cliente pelo ID
   */
  async findById(id: number): Promise<Client | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.id, id))
      if (client) {
        // Garantir que active seja boolean
        return {
          ...client,
          active: client.active === null ? false : client.active,
          createdAt: client.createdAt || new Date(),
          updatedAt: client.updatedAt || new Date(),
        } as Client
      }
      return undefined
    } catch (error) {
      logger.error(`Erro ao buscar cliente com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Encontra um cliente pelo código
   */
  async findByCode(code: string): Promise<Client | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.code, code))
      if (client) {
        // Garantir que active seja boolean
        return {
          ...client,
          active: client.active === null ? false : client.active,
          createdAt: client.createdAt || new Date(),
          updatedAt: client.updatedAt || new Date(),
        } as Client
      }
      return undefined
    } catch (error) {
      logger.error(`Erro ao buscar cliente pelo código ${code}:`, error)
      throw error
    }
  }

  /**
   * Cria um novo cliente
   */
  async create(clientData: CreateClientDTO): Promise<Client> {
    try {
      logger.debug("Criando cliente com dados:", clientData)
      const [newClient] = await db
        .insert(clients)
        .values({
          ...clientData,
          active: clientData.active === undefined ? true : clientData.active,
        })
        .returning()

      logger.info(`Cliente ${newClient.name} (ID: ${newClient.id}) criado com sucesso`)

      // Garantir que active seja boolean
      return {
        ...newClient,
        active: newClient.active === null ? false : newClient.active,
        createdAt: newClient.createdAt || new Date(),
        updatedAt: newClient.updatedAt || new Date(),
      } as Client
    } catch (error) {
      logger.error("Erro ao criar cliente:", error)
      // Verificar se é um erro de chave única (código ou CNPJ duplicado)
      if (error instanceof Error && error.message.includes("duplicate key")) {
        if (error.message.includes("cnpj")) {
          throw new Error("CNPJ já está em uso por outro cliente")
        } else if (error.message.includes("code")) {
          throw new Error("Código já está em uso por outro cliente")
        }
      }
      throw error
    }
  }

  /**
   * Atualiza um cliente existente
   */
  async update(id: number, clientData: UpdateClientDTO): Promise<Client | undefined> {
    try {
      const [updatedClient] = await db
        .update(clients)
        .set({ ...clientData, updatedAt: new Date() })
        .where(eq(clients.id, id))
        .returning()

      if (updatedClient) {
        logger.info(`Cliente ${updatedClient.name} (ID: ${updatedClient.id}) atualizado com sucesso`)

        // Garantir que active seja boolean
        return {
          ...updatedClient,
          active: updatedClient.active === null ? false : updatedClient.active,
          createdAt: updatedClient.createdAt || new Date(),
          updatedAt: updatedClient.updatedAt || new Date(),
        } as Client
      }

      return undefined
    } catch (error) {
      logger.error(`Erro ao atualizar cliente com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Exclui um cliente
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(clients).where(eq(clients.id, id)).returning()
      const success = result.length > 0
      if (success) {
        logger.info(`Cliente com ID ${id} excluído com sucesso`)
      } else {
        logger.warn(`Tentativa de excluir cliente com ID ${id} falhou - cliente não encontrado`)
      }
      return success
    } catch (error) {
      logger.error(`Erro ao excluir cliente com ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Lista todos os clientes
   */
  async findAll(): Promise<Client[]> {
    try {
      const clientsList = await db.select().from(clients)

      // Garantir que active seja boolean para todos os clientes
      return clientsList.map((client) => ({
        ...client,
        active: client.active === null ? false : client.active,
        createdAt: client.createdAt || new Date(),
        updatedAt: client.updatedAt || new Date(),
      })) as Client[]
    } catch (error) {
      logger.error("Erro ao listar todos os clientes:", error)
      throw error
    }
  }

  /**
   * Lista clientes por representante
   */
  async findByRepresentative(representativeId: number): Promise<Client[]> {
    try {
      const clientsList = await db.select().from(clients).where(eq(clients.representativeId, representativeId))

      // Garantir que active seja boolean para todos os clientes
      return clientsList.map((client) => ({
        ...client,
        active: client.active === null ? false : client.active,
        createdAt: client.createdAt || new Date(),
        updatedAt: client.updatedAt || new Date(),
      })) as Client[]
    } catch (error) {
      logger.error(`Erro ao listar clientes do representante ${representativeId}:`, error)
      throw error
    }
  }

  /**
   * Busca clientes por termo
   */
  async search(query: string): Promise<Client[]> {
    try {
      // Converte a query para minúsculas para comparação case-insensitive
      const searchTerm = query.toLowerCase().trim()

      logger.debug(`Buscando clientes com termo: "${searchTerm}"`)

      // Verifica exatamente o código do cliente
      if (/^\d+$/.test(searchTerm)) {
        logger.debug(`Detectada busca por código exato: ${searchTerm}`)

        // Primeiro tenta buscar pelo código exato
        const exactCodeResults = await db.select().from(clients).where(eq(clients.code, searchTerm))

        // Se encontrou resultados exatos, retorna imediatamente
        if (exactCodeResults.length > 0) {
          logger.debug(`Encontrado cliente com código exato: ${searchTerm}`)

          // Garantir que active seja boolean para todos os clientes
          return exactCodeResults.map((client) => ({
            ...client,
            active: client.active === null ? false : client.active,
            createdAt: client.createdAt || new Date(),
            updatedAt: client.updatedAt || new Date(),
          })) as Client[]
        }
      }

      // Busca em todos os campos relevantes com ILIKE para busca case-insensitive
      const results = await db
        .select()
        .from(clients)
        .where(
          or(
            ilike(clients.name, `%${searchTerm}%`), // Nome
            ilike(clients.cnpj, `%${searchTerm}%`), // CNPJ
            ilike(clients.code, `%${searchTerm}%`), // Código
            ilike(clients.phone, `%${searchTerm}%`), // Telefone
            ilike(clients.city, `%${searchTerm}%`), // Cidade
            ilike(clients.email, `%${searchTerm}%`), // Email
          ),
        )

      logger.debug(`Encontrados ${results.length} clientes para o termo: "${searchTerm}"`)

      // Garantir que active seja boolean para todos os clientes
      return results.map((client) => ({
        ...client,
        active: client.active === null ? false : client.active,
        createdAt: client.createdAt || new Date(),
        updatedAt: client.updatedAt || new Date(),
      })) as Client[]
    } catch (error) {
      logger.error(`Erro ao buscar clientes com termo "${query}":`, error)
      throw error
    }
  }

  /**
   * Adiciona um registro ao histórico do cliente
   */
  async addHistory(historyData: CreateClientHistoryDTO): Promise<ClientHistory> {
    try {
      const [newHistory] = await db.insert(clientHistory).values(historyData).returning()
      logger.debug(`Histórico adicionado para cliente ${historyData.clientId}`)

      // Garantir que createdAt seja Date
      return {
        ...newHistory,
        createdAt: newHistory.createdAt || new Date(),
      } as ClientHistory
    } catch (error) {
      logger.error(`Erro ao adicionar histórico para cliente ${historyData.clientId}:`, error)
      throw error
    }
  }

  /**
   * Obtém o histórico de um cliente
   */
  async getHistory(clientId: number): Promise<ClientHistory[]> {
    try {
      const historyList = await db.select().from(clientHistory).where(eq(clientHistory.clientId, clientId))

      // Garantir que createdAt seja Date para todos os itens
      return historyList.map((history) => ({
        ...history,
        createdAt: history.createdAt || new Date(),
      })) as ClientHistory[]
    } catch (error) {
      logger.error(`Erro ao obter histórico do cliente ${clientId}:`, error)
      throw error
    }
  }

  /**
   * Atribui clientes a um representante
   */
  async assignToRepresentative(clientIds: number[], representativeId: number): Promise<Client[]> {
    try {
      const updatedClients: Client[] = []

      for (const clientId of clientIds) {
        const [updatedClient] = await db
          .update(clients)
          .set({ representativeId, updatedAt: new Date() })
          .where(eq(clients.id, clientId))
          .returning()

        if (updatedClient) {
          // Garantir que active seja boolean
          updatedClients.push({
            ...updatedClient,
            active: updatedClient.active === null ? false : updatedClient.active,
            createdAt: updatedClient.createdAt || new Date(),
            updatedAt: updatedClient.updatedAt || new Date(),
          } as Client)
        }
      }

      logger.info(`${updatedClients.length} clientes atribuídos ao representante ${representativeId}`)
      return updatedClients
    } catch (error) {
      logger.error(`Erro ao atribuir clientes ao representante ${representativeId}:`, error)
      throw error
    }
  }

  /**
   * Importa clientes para um representante
   */
  async importForRepresentative(
    clientsData: CreateClientDTO[],
    representativeId: number,
  ): Promise<{ created: Client[]; updated: Client[] }> {
    try {
      const created: Client[] = []
      const updated: Client[] = []

      for (const clientData of clientsData) {
        // Verificar se o cliente já existe pelo código
        const existingClient = await this.findByCode(clientData.code)

        if (existingClient) {
          // Atualizar cliente existente
          const updatedClient = await this.update(existingClient.id, {
            ...clientData,
            representativeId,
          })

          if (updatedClient) {
            updated.push(updatedClient)
          }
        } else {
          // Criar novo cliente
          const newClient = await this.create({
            ...clientData,
            representativeId,
            active: true,
          })

          created.push(newClient)
        }
      }

      logger.info(`Importação concluída: ${created.length} criados, ${updated.length} atualizados`)
      return { created, updated }
    } catch (error) {
      logger.error(`Erro ao importar clientes para o representante ${representativeId}:`, error)
      throw error
    }
  }

  /**
   * Obtém estatísticas de clientes
   */
  async getStatistics(representativeId?: number | null): Promise<{ total: number; active: number }> {
    try {
      let allClients: Client[]

      if (representativeId) {
        allClients = await this.findByRepresentative(representativeId)
      } else {
        allClients = await this.findAll()
      }

      const activeClients = allClients.filter((client) => client.active)

      return {
        total: allClients.length,
        active: activeClients.length,
      }
    } catch (error) {
      logger.error("Erro ao obter estatísticas de clientes:", error)
      throw error
    }
  }
}
