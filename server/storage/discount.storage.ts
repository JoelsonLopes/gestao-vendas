import { discounts, type Discount, type InsertDiscount } from "@shared/schema";
import { db } from "../infra/db";
import { eq } from "drizzle-orm";

export interface IDiscountStorage {
  getDiscount(id: number): Promise<Discount | undefined>;
  createDiscount(discount: InsertDiscount): Promise<Discount>;
  listDiscounts(): Promise<Discount[]>;
}

export class DiscountStorage implements IDiscountStorage {
  async getDiscount(id: number): Promise<Discount | undefined> {
    const [discount] = await db.select().from(discounts).where(eq(discounts.id, id));
    return discount || undefined;
  }

  async createDiscount(discount: InsertDiscount): Promise<Discount> {
    const [newDiscount] = await db.insert(discounts).values(discount).returning();
    return newDiscount;
  }

  async listDiscounts(): Promise<Discount[]> {
    return await db.select().from(discounts);
  }
} 