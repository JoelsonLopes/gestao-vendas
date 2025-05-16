import { regions, type Region, type InsertRegion } from "@shared/schema";
import { db } from "../infra/db";
import { eq } from "drizzle-orm";

export interface IRegionStorage {
  getRegion(id: number): Promise<Region | undefined>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(id: number, regionData: Partial<InsertRegion>): Promise<Region | undefined>;
  listRegions(): Promise<Region[]>;
  deleteRegion(id: number): Promise<boolean>;
}

export class RegionStorage implements IRegionStorage {
  async getRegion(id: number): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    return region || undefined;
  }

  async createRegion(region: InsertRegion): Promise<Region> {
    const [newRegion] = await db.insert(regions).values(region).returning();
    return newRegion;
  }

  async updateRegion(id: number, regionData: Partial<InsertRegion>): Promise<Region | undefined> {
    const [updatedRegion] = await db.update(regions).set({ ...regionData, updatedAt: new Date() }).where(eq(regions.id, id)).returning();
    return updatedRegion || undefined;
  }

  async listRegions(): Promise<Region[]> {
    return await db.select().from(regions);
  }

  async deleteRegion(id: number): Promise<boolean> {
    const result = await db.delete(regions).where(eq(regions.id, id)).returning();
    return result.length > 0;
  }
} 