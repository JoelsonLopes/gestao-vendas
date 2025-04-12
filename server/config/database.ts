import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import { logger } from "../utils/logger"

/**
 * Configuração da conexão com o banco de dados PostgreSQL
 */
export class Database {
  private static instance: Database
  public pool: pg.Pool
  public db: ReturnType<typeof drizzle>

  private constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL não está definida no ambiente")
    }

    this.pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // necessário para o Supabase
      },
    })

    this.db = drizzle(this.pool)
    logger.info("Conexão com o banco de dados inicializada")
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect()
      client.release()
      logger.info("Conexão com o banco de dados testada com sucesso")
      return true
    } catch (error) {
      logger.error("Erro ao testar conexão com o banco de dados", error)
      return false
    }
  }

  public async close(): Promise<void> {
    await this.pool.end()
    logger.info("Conexão com o banco de dados encerrada")
  }
}

// Exporta instâncias para uso em toda a aplicação
export const database = Database.getInstance()
export const db = database.db
export const pool = database.pool
