import { discounts, type Discount, type InsertDiscount } from "@shared/schema";
import { db } from "../infra/db";
import { eq } from "drizzle-orm";

export interface IDiscountRepository {
  getDiscount(id: number): Promise<Discount | undefined>;
  createDiscount(discount: InsertDiscount): Promise<Discount>;
  updateDiscount(id: number, discountData: Partial<InsertDiscount>): Promise<Discount | undefined>;
  listDiscounts(): Promise<Discount[]>;
}

export class DiscountRepository implements IDiscountRepository {
  async getDiscount(id: number): Promise<Discount | undefined> {
    const [discount] = await db.select().from(discounts).where(eq(discounts.id, id));
    return discount || undefined;
  }

  async createDiscount(discount: InsertDiscount): Promise<Discount> {
    const [newDiscount] = await db.insert(discounts).values(discount).returning();
    return newDiscount;
  }

  async updateDiscount(id: number, discountData: Partial<InsertDiscount>): Promise<Discount | undefined> {
    const [updatedDiscount] = await db.update(discounts).set({ ...discountData }).where(eq(discounts.id, id)).returning();
    return updatedDiscount || undefined;
  }

  async listDiscounts(): Promise<Discount[]> {
    return await db.select().from(discounts);
  }
} 