import { Router } from "express";
import { storage } from "../repositories";
import { isAuthenticated, isAdmin } from "../middlewares/auth";
import { insertOrderSchema, insertOrderItemSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all orders
router.get("/orders", isAuthenticated, async (req, res) => {
  try {
    let orders;
    if (req.user && req.user.role === 'representative') {
      orders = await storage.order.listOrdersByRepresentative(req.user.id);
    } else {
      orders = await storage.order.listOrders();
    }
    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
      try {
        const items = await storage.order.getOrderItems(order.id);
        const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
        let clientName = 'Cliente';
        let clientCode = '';
        try {
          const client = await storage.client.getClient(order.clientId);
          if (client) {
            clientName = client.name || `Cliente #${client.id}`;
            clientCode = client.code || '';
          }
        } catch {}
        let formattedDate = 'Data não disponível';
        if (order.createdAt) {
          try {
            const date = new Date(order.createdAt);
            if (!isNaN(date.getTime())) {
              formattedDate = date.toLocaleDateString('pt-BR');
            }
          } catch {}
        }
        const orderCode = `ORD-${order.id.toString().padStart(4, '0')}`;
        return { ...order, totalPieces, clientName, date: formattedDate, code: orderCode, clientCode };
      } catch {
        const orderCode = `ORD-${order.id.toString().padStart(4, '0')}`;
        return { ...order, totalPieces: 0, clientName: 'Cliente', date: 'Data não disponível', code: orderCode, clientCode: '' };
      }
    }));
    res.json(ordersWithDetails);
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders" });
  }
});

// Get order by ID with items
router.get("/orders/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const orderData = await storage.order.getOrderWithItems(id);
    if (!orderData) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (req.user?.role === 'representative' && orderData.order.representativeId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }
    res.json(orderData.order);
  } catch (error) {
    res.status(500).json({ message: "Error fetching order" });
  }
});

// Get items for a specific order
router.get("/orders/:id/items", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const orderData = await storage.order.getOrderWithItems(id);
    if (!orderData) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (req.user?.role === 'representative' && orderData.order.representativeId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }
    res.json(orderData.items);
  } catch (error) {
    res.status(500).json({ message: "Error fetching order items" });
  }
});

// Delete order
router.delete("/orders/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const order = await storage.order.getOrder(id);
    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }
    if (!req.user || (req.user.role !== 'admin' && order.representativeId !== req.user.id)) {
      return res.status(403).json({ message: "Not authorized to delete this order" });
    }
    const success = await storage.order.deleteOrder(id);
    if (success) {
      res.json({ message: "Pedido excluído com sucesso" });
    } else {
      res.status(500).json({ message: "Erro ao excluir pedido" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao excluir pedido", error: error instanceof Error ? error.message : String(error) });
  }
});

// Update order
router.put("/orders/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let { order, items } = req.body;
    if (!order || !items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Invalid order data" });
    }
    const existingOrder = await storage.order.getOrder(id);
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (req.user?.role === 'representative' && existingOrder.representativeId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this order" });
    }
    let validatedOrder = insertOrderSchema.parse(order);
    if (req.user?.role === 'representative') {
      validatedOrder = { ...validatedOrder, representativeId: req.user.id };
    }
    if (req.user?.role === 'representative') {
      const client = await storage.client.getClient(validatedOrder.clientId);
      if (!client || client.representativeId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to create order for this client" });
      }
    }
    const updatedOrder = await storage.order.updateOrder(id, validatedOrder);
    const processedItems = items.map(item => {
      const { clientRef, ...itemWithoutClientRef } = item as any;
      return { ...itemWithoutClientRef, orderId: id };
    });
    const updatedItems = await storage.order.updateOrderItems(id, processedItems);
    const updatedItemsWithClientRef = updatedItems.map((item, index) => {
      return { ...item, clientRef: items[index]?.clientRef || null };
    });
    const orderResult = { order: updatedOrder, items: updatedItemsWithClientRef };
    res.json(orderResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error updating order", error: error instanceof Error ? error.message : String(error) });
  }
});

// Get orders by client
router.get("/clients/:id/orders", isAuthenticated, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const client = await storage.client.getClient(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    if (req.user?.role === 'representative' && client.representativeId !== req.user?.id) {
      return res.status(403).json({ message: "Not authorized to view this client's orders" });
    }
    const orders = await storage.order.listOrdersByClient(clientId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching client orders" });
  }
});

// Create order
router.post("/orders", isAuthenticated, async (req, res) => {
  try {
    let { order, items } = req.body;
    if (!order || !items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Invalid order data" });
    }
    let validatedOrder = insertOrderSchema.parse(order);
    if (req.user?.role === 'representative') {
      validatedOrder = { ...validatedOrder, representativeId: req.user.id };
    }
    if (req.user?.role === 'representative') {
      const client = await storage.client.getClient(validatedOrder.clientId);
      if (!client || client.representativeId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to create order for this client" });
      }
    }
    const newOrder = await storage.order.createOrder(validatedOrder);
    const orderItems = [];
    for (const item of items) {
      try {
        const { clientRef, ...itemWithoutClientRef } = item as any;
        const validatedItem = insertOrderItemSchema.parse({ ...itemWithoutClientRef, orderId: newOrder.id });
        const newItem = await storage.order.createOrderItem(validatedItem);
        orderItems.push({ ...newItem, clientRef: clientRef || null });
      } catch {}
    }
    res.status(201).json({ order: newOrder, items: orderItems });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error creating order" });
  }
});

// Update order status
router.put("/orders/:id/status", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!status || !['cotacao', 'confirmado'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const order = await storage.order.getOrder(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (req.user?.role === 'representative' && order.representativeId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this order status" });
    }
    const updatedOrder = await storage.order.updateOrderStatus(id, status);
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: "Error updating order status" });
  }
});

export default router; 