import { clientHistory, type ClientHistory, type InsertClientHistory } from "@shared/schema";
import { db } from "../infra/db";
import { eq } from "drizzle-orm";

export interface IClientHistoryStorage {
  addClientHistory(history: InsertClientHistory): Promise<ClientHistory>;
  getClientHistory(clientId: number): Promise<ClientHistory[]>;
}

export class ClientHistoryStorage implements IClientHistoryStorage {
  async addClientHistory(history: InsertClientHistory): Promise<ClientHistory> {
    const [newHistory] = await db.insert(clientHistory).values(history).returning();
    return newHistory;
  }

  async getClientHistory(clientId: number): Promise<ClientHistory[]> {
    return await db.select().from(clientHistory).where(eq(clientHistory.clientId, clientId));
  }
} 