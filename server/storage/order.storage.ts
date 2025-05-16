import { orders, type Order, type InsertOrder, orderItems, type OrderItem, type InsertOrderItem } from "@shared/schema";
import { db, pool } from "../infra/db";
import { eq } from "drizzle-orm";

export interface IOrderStorage {
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: 'cotacao' | 'confirmado'): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;
  listOrders(): Promise<Order[]>;
  listOrdersByRepresentative(representativeId: number): Promise<Order[]>;
  listOrdersByClient(clientId: number): Promise<Order[]>;
  getOrderWithItems(orderId: number): Promise<{ order: Order, items: OrderItem[] } | undefined>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  updateOrderItems(orderId: number, items: InsertOrderItem[]): Promise<OrderItem[]>;
  deleteOrderItems(orderId: number): Promise<boolean>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
}

export class OrderStorage implements IOrderStorage {
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updatedOrder] = await db.update(orders).set({ ...orderData, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return updatedOrder || undefined;
  }

  async updateOrderStatus(id: number, status: 'cotacao' | 'confirmado'): Promise<Order | undefined> {
    const [updatedOrder] = await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return updatedOrder || undefined;
  }

  async deleteOrder(id: number): Promise<boolean> {
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    const result = await db.delete(orders).where(eq(orders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async listOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async listOrdersByRepresentative(representativeId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.representativeId, representativeId));
  }

  async listOrdersByClient(clientId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.clientId, clientId));
  }

  async getOrderWithItems(orderId: number): Promise<{ order: Order, items: OrderItem[] } | undefined> {
    const order = await this.getOrder(orderId);
    if (!order) return undefined;
    const items = await this.getOrderItems(orderId);
    return { order, items };
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const insertQuery = `
      INSERT INTO order_items (
        order_id, product_id, quantity, unit_price, 
        discount_id, discount_percentage, commission, subtotal
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, order_id, product_id, quantity, unit_price, 
               discount_id, discount_percentage, commission, subtotal
    `;
    const values = [
      Number(orderItem.orderId),
      Number(orderItem.productId),
      Number(orderItem.quantity),
      orderItem.unitPrice.toString(),
      orderItem.discountId ? Number(orderItem.discountId) : null,
      orderItem.discountPercentage ? orderItem.discountPercentage.toString() : null,
      orderItem.commission ? orderItem.commission.toString() : null,
      orderItem.subtotal.toString()
    ];
    const result = await pool.query(insertQuery, values);
    const row = result.rows[0];
    return {
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      discountId: row.discount_id,
      discountPercentage: row.discount_percentage,
      commission: row.commission,
      subtotal: row.subtotal,
    };
  }

  async updateOrderItems(orderId: number, items: InsertOrderItem[]): Promise<OrderItem[]> {
    const deleteQuery = `DELETE FROM order_items WHERE order_id = $1`;
    await pool.query(deleteQuery, [orderId]);
    const newItems: OrderItem[] = [];
    for (const item of items) {
      const insertQuery = `
        INSERT INTO order_items (
          order_id, product_id, quantity, unit_price, 
          discount_id, discount_percentage, commission, subtotal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, order_id, product_id, quantity, unit_price, 
                 discount_id, discount_percentage, commission, subtotal
      `;
      const values = [
        orderId,
        Number(item.productId),
        Number(item.quantity),
        item.unitPrice.toString(),
        item.discountId ? Number(item.discountId) : null,
        item.discountPercentage ? item.discountPercentage.toString() : null,
        item.commission ? item.commission.toString() : null,
        item.subtotal.toString()
      ];
      const result = await pool.query(insertQuery, values);
      const row = result.rows[0];
      newItems.push({
        id: row.id,
        orderId: row.order_id,
        productId: row.product_id,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        discountId: row.discount_id,
        discountPercentage: row.discount_percentage,
        commission: row.commission,
        subtotal: row.subtotal,
      });
    }
    return newItems;
  }

  async deleteOrderItems(orderId: number): Promise<boolean> {
    const result = await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }
} 