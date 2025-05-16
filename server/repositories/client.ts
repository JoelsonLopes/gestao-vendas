import { clients, type Client, type InsertClient, clientHistory, type ClientHistory, type InsertClientHistory } from "@shared/schema";
import { db } from "../infra/db";
import { eq, or, ilike } from "drizzle-orm";

export interface IClientRepository {
  getClient(id: number): Promise<Client | undefined>;
  getClientByCode(code: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined>;
  listClients(): Promise<Client[]>;
  listClientsByRepresentative(representativeId: number): Promise<Client[]>;
  searchClients(query: string): Promise<Client[]>;
  addClientHistory(history: InsertClientHistory): Promise<ClientHistory>;
  getClientHistory(clientId: number): Promise<ClientHistory[]>;
}

export class ClientRepository implements IClientRepository {
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientByCode(code: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.code, code));
    return client || undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const [updatedClient] = await db.update(clients).set({ ...clientData, updatedAt: new Date() }).where(eq(clients.id, id)).returning();
    return updatedClient || undefined;
  }

  async listClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async listClientsByRepresentative(representativeId: number): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.representativeId, representativeId));
  }

  async searchClients(query: string): Promise<Client[]> {
    const searchTerm = query.toLowerCase().trim();
    // Busca exata por código
    if (/^\d+$/.test(searchTerm)) {
      const exactCodeResults = await db.select().from(clients).where(eq(clients.code, searchTerm));
      if (exactCodeResults.length > 0) {
        return exactCodeResults;
      }
    }
    // Busca ampla
    return await db.select().from(clients).where(
      or(
        ilike(clients.name, `%${searchTerm}%`),
        ilike(clients.cnpj, `%${searchTerm}%`),
        ilike(clients.code, `%${searchTerm}%`),
        ilike(clients.phone, `%${searchTerm}%`),
        ilike(clients.city, `%${searchTerm}%`),
        ilike(clients.email, `%${searchTerm}%`)
      )
    );
  }

  async addClientHistory(history: InsertClientHistory): Promise<ClientHistory> {
    const [newHistory] = await db.insert(clientHistory).values(history).returning();
    return newHistory;
  }

  async getClientHistory(clientId: number): Promise<ClientHistory[]> {
    return await db.select().from(clientHistory).where(eq(clientHistory.clientId, clientId));
  }
} 