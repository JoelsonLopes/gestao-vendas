import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertClientSchema, 
  insertProductSchema, 
  insertOrderSchema, 
  insertOrderItemSchema,
  insertRegionSchema
} from "@shared/schema";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Middleware to check if user is an admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Not authorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Get all users (admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.listUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  // Get all representatives
  app.get("/api/representatives", isAuthenticated, async (req, res) => {
    try {
      const representatives = await storage.listRepresentatives();
      const repsWithoutPasswords = representatives.map(({ password, ...rep }) => rep);
      res.json(repsWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Error fetching representatives" });
    }
  });

  // REGIONS API

  // Get all regions
  app.get("/api/regions", isAuthenticated, async (req, res) => {
    try {
      const regions = await storage.listRegions();
      res.json(regions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching regions" });
    }
  });

  // Create region (admin only)
  app.post("/api/regions", isAdmin, async (req, res) => {
    try {
      const validatedData = insertRegionSchema.parse(req.body);
      const region = await storage.createRegion(validatedData);
      res.status(201).json(region);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating region" });
    }
  });

  // Update region (admin only)
  app.put("/api/regions/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertRegionSchema.partial().parse(req.body);
      const region = await storage.updateRegion(id, validatedData);
      if (!region) {
        return res.status(404).json({ message: "Region not found" });
      }
      res.json(region);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating region" });
    }
  });

  // Delete region (admin only)
  app.delete("/api/regions/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteRegion(id);
      if (!success) {
        return res.status(404).json({ message: "Region not found" });
      }
      res.json({ message: "Region deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting region" });
    }
  });

  // CLIENTS API

  // Get all clients
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      let clients;
      // If rep, show only their clients
      if (req.user.role === 'representative') {
        clients = await storage.listClientsByRepresentative(req.user.id);
      } else {
        clients = await storage.listClients();
      }
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clients" });
    }
  });

  // Search clients
  app.get("/api/clients/search", isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      let clients = await storage.searchClients(q);
      
      // If representative, filter only their clients
      if (req.user.role === 'representative') {
        clients = clients.filter(client => client.representativeId === req.user.id);
      }
      
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error searching clients" });
    }
  });

  // Get client by ID
  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if rep has access to this client
      if (req.user.role === 'representative' && client.representativeId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this client" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Error fetching client" });
    }
  });

  // Create client
  app.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      let validatedData = insertClientSchema.parse(req.body);
      
      // If representative, force their ID as representative
      if (req.user.role === 'representative') {
        validatedData = { ...validatedData, representativeId: req.user.id };
      }
      
      console.log("Criando cliente com dados:", JSON.stringify(validatedData));
      const client = await storage.createClient(validatedData);
      
      // Add to history
      await storage.addClientHistory({
        clientId: client.id,
        userId: req.user.id,
        action: 'created',
        details: { client }
      });
      
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Erro ao criar cliente:", error);
      res.status(500).json({ 
        message: "Error creating client", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update client
  app.put("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if rep has access to this client
      if (req.user.role === 'representative' && client.representativeId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this client" });
      }
      
      const validatedData = insertClientSchema.partial().parse(req.body);
      
      // If rep trying to change representativeId, prevent it
      if (req.user.role === 'representative' && 
          validatedData.representativeId && 
          validatedData.representativeId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to change representative" });
      }
      
      const updatedClient = await storage.updateClient(id, validatedData);
      
      // Add to history
      await storage.addClientHistory({
        clientId: id,
        userId: req.user.id,
        action: 'updated',
        details: { 
          before: client,
          after: updatedClient
        }
      });
      
      res.json(updatedClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating client" });
    }
  });

  // Get client history
  app.get("/api/clients/:id/history", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if rep has access to this client
      if (req.user.role === 'representative' && client.representativeId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this client's history" });
      }
      
      const history = await storage.getClientHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Error fetching client history" });
    }
  });

  // PRODUCTS API

  // Get all products
  app.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      console.log("Buscando todos os produtos...");
      const products = await storage.listProducts();
      console.log(`Produtos encontrados: ${products?.length || 0}`);
      res.json(products || []);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      res.status(500).json({ message: "Error fetching products", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Buscar produto por ID
  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de produto inválido" });
      }
      
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Erro ao buscar produto:", error);
      res.status(500).json({ message: "Erro ao buscar produto" });
    }
  });

  // Buscar produto pelo código
  app.get("/api/products/by-code/:code", isAuthenticated, async (req, res) => {
    try {
      const { code } = req.params;
      if (!code) {
        return res.status(400).json({ message: "Código do produto é obrigatório" });
      }
      
      const product = await storage.getProductByCode(code);
      
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado com este código" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar produto pelo código" });
    }
  });

  // Search products
  app.get("/api/products/search", isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const products = await storage.searchProducts(q);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error searching products" });
    }
  });
  
  // Buscar produto por referência do cliente
  app.get("/api/products/by-client-reference/:reference", isAuthenticated, async (req, res) => {
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ message: "Referência do cliente é obrigatória" });
      }
      
      const product = await storage.getProductByClientReference(reference);
      
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado para esta referência do cliente" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar produto por referência do cliente" });
    }
  });
  
  // Salvar conversão de produto
  app.post("/api/products/:id/save-conversion", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { clientRef } = req.body;
      
      if (!clientRef) {
        return res.status(400).json({ message: "Referência do cliente é obrigatória" });
      }
      
      // Verificar se o produto existe
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      // Verificar se a referência já existe para outro produto
      const existingProduct = await storage.getProductByClientReference(clientRef);
      if (existingProduct && existingProduct.id !== id) {
        return res.status(400).json({ 
          message: "Esta referência já está associada a outro produto", 
          existingProduct
        });
      }
      
      // Salvar a conversão
      const updatedProduct = await storage.saveProductConversion(id, clientRef);
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Erro ao salvar conversão de produto" });
    }
  });



  // Create product (admin only)
  app.post("/api/products", isAdmin, async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating product" });
    }
  });

  // Update product
  app.put("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check if user is admin for certain fields
      const validatedData = insertProductSchema.partial().parse(req.body);
      
      // If not admin, limit updatable fields
      if (req.user.role !== 'admin') {
        const { price, description, stockQuantity } = validatedData;
        // Only allow updating these fields for non-admin users
        const allowedUpdates = { price, description, stockQuantity };
        Object.keys(allowedUpdates).forEach(key => {
          if (allowedUpdates[key] === undefined) delete allowedUpdates[key];
        });
        
        const updatedProduct = await storage.updateProduct(id, allowedUpdates);
        return res.json(updatedProduct);
      }
      
      const updatedProduct = await storage.updateProduct(id, validatedData);
      res.json(updatedProduct);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating product" });
    }
  });



  // Import products (admin only)
  app.post("/api/products/import", isAdmin, async (req, res) => {
    try {
      const products = req.body;
      
      if (!Array.isArray(products)) {
        return res.status(400).json({ message: "Expected array of products" });
      }
      
      // Processar e validar cada produto
      const validatedProducts = [];
      const errors = [];
      
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        try {
          // Implementar regras de negócio específicas
          
          // Garantir que código seja único
          if (product.code) {
            const existingProduct = await storage.getProductByCode(product.code);
            if (existingProduct) {
              throw new Error(`Produto com código '${product.code}' já existe no sistema`);
            }
          }
          
          // Converter tipos de dados para o formato correto
          const processedProduct = {
            ...product,
            code: product.code || '',
            name: product.name || `Produto ${i+1}`,
            price: typeof product.price === 'number' ? 
              product.price.toString() : 
              (typeof product.price === 'string' ? product.price : '0'),
            stockQuantity: typeof product.stockQuantity === 'number' ? 
              product.stockQuantity : 
              (typeof product.stockQuantity === 'string' ? parseInt(product.stockQuantity) || 0 : 0),
            // Novos campos de conversão
            conversion: product.conversion || null,
            conversionBrand: product.conversionBrand || null
          };
          
          // Validar usando o esquema Zod
          const validatedProduct = insertProductSchema.parse(processedProduct);
          validatedProducts.push(validatedProduct);
        } catch (error) {
          // Registrar o erro para retorná-lo ao cliente
          const errorMessage = error instanceof Error ? error.message : 'Erro de validação';
          errors.push({
            row: i + 1,
            data: product,
            error: errorMessage
          });
          continue;
        }
      }
      
      // Se não houver produtos válidos, retornar erro com detalhes
      if (validatedProducts.length === 0) {
        return res.status(400).json({ 
          message: "Nenhum produto válido encontrado", 
          errors,
          totalErrors: errors.length,
          totalSubmitted: products.length
        });
      }
      
      // Importar produtos válidos
      const count = await storage.importProducts(validatedProducts);
      
      // Retornar estatísticas detalhadas da importação
      res.status(201).json({ 
        message: `${count} produtos importados com sucesso`, 
        success: count,
        failed: errors.length,
        totalSubmitted: products.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Erro ao importar produtos:", error);
      res.status(500).json({ 
        message: "Erro ao importar produtos",
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // DISCOUNTS API

  // Get all discounts
  app.get("/api/discounts", isAuthenticated, async (req, res) => {
    try {
      const discounts = await storage.listDiscounts();
      res.json(discounts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching discounts" });
    }
  });

  // ORDERS API

  // Get all orders
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      let orders;
      // If rep, show only their orders
      if (req.user.role === 'representative') {
        orders = await storage.listOrdersByRepresentative(req.user.id);
      } else {
        orders = await storage.listOrders();
      }
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  // Get order by ID with items
  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orderData = await storage.getOrderWithItems(id);
      
      if (!orderData) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if rep has access to this order
      if (req.user.role === 'representative' && orderData.order.representativeId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this order" });
      }
      
      // Enviando apenas os dados do pedido, não os itens
      res.json(orderData.order);
    } catch (error) {
      res.status(500).json({ message: "Error fetching order" });
    }
  });
  
  // Get items for a specific order
  app.get("/api/orders/:id/items", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orderData = await storage.getOrderWithItems(id);
      
      if (!orderData) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if rep has access to this order
      if (req.user.role === 'representative' && orderData.order.representativeId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this order" });
      }
      
      // Enviando apenas os itens do pedido
      res.json(orderData.items);
    } catch (error) {
      res.status(500).json({ message: "Error fetching order items" });
    }
  });
  
  // Delete order
  app.delete("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      
      // Verificar se o usuário tem permissão para excluir o pedido
      if (req.user?.role !== 'admin' && order.representativeId !== req.user?.id) {
        return res.status(403).json({ message: "Não autorizado a excluir este pedido" });
      }
      
      const success = await storage.deleteOrder(id);
      
      if (success) {
        res.json({ message: "Pedido excluído com sucesso" });
      } else {
        res.status(500).json({ message: "Erro ao excluir pedido" });
      }
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      res.status(500).json({ 
        message: "Erro ao excluir pedido", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update order
  app.put("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      let { order, items } = req.body;
      
      if (!order || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid order data" });
      }
      
      // Get existing order
      const existingOrder = await storage.getOrder(id);
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if user has permission
      if (req.user.role === 'representative' && existingOrder.representativeId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this order" });
      }
      
      // Validate order data
      let validatedOrder = insertOrderSchema.parse(order);
      
      // If representative, ensure they can't change the representative ID
      if (req.user.role === 'representative') {
        validatedOrder = { 
          ...validatedOrder, 
          representativeId: req.user.id 
        };
      }
      
      // Check if rep has access to this client
      if (req.user.role === 'representative') {
        const client = await storage.getClient(validatedOrder.clientId);
        if (!client || client.representativeId !== req.user.id) {
          return res.status(403).json({ message: "Not authorized to create order for this client" });
        }
      }
      
      // Adicionar logs detalhados para depuração
      console.log(`Atualizando pedido ${id} no endpoint com dados:`, validatedOrder);
      
      // Update order
      const updatedOrder = await storage.updateOrder(id, validatedOrder);
      console.log(`Pedido ${id} atualizado no endpoint:`, updatedOrder);
      
      // Update order items
      // Remover o campo clientRef de todos os itens antes de processá-los
      const processedItems = items.map(item => {
        // Extrair o clientRef e manter o resto do objeto
        const { clientRef, ...itemWithoutClientRef } = item as any;
        
        return {
          ...itemWithoutClientRef,
          orderId: id
        };
      });
      
      console.log(`Atualizando ${processedItems.length} itens para o pedido ${id}`);
      const updatedItems = await storage.updateOrderItems(id, processedItems);
      
      // Adicionar o clientRef de volta aos itens para o frontend
      const updatedItemsWithClientRef = updatedItems.map((item, index) => {
        return {
          ...item,
          clientRef: items[index]?.clientRef || null
        };
      });
      
      console.log(`${updatedItemsWithClientRef.length} itens atualizados para o pedido ${id}`);
      
      // Invalidar cache explicitamente
      const orderResult = {
        order: updatedOrder,
        items: updatedItemsWithClientRef // Usar a versão com clientRef na resposta
      };
      
      console.log(`Enviando resposta completa para atualização do pedido ${id}:`, orderResult);
      res.json(orderResult);
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Error updating order", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get orders by client
  app.get("/api/clients/:id/orders", isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if rep has access to this client
      if (req.user.role === 'representative' && client.representativeId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this client's orders" });
      }
      
      const orders = await storage.listOrdersByClient(clientId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error fetching client orders" });
    }
  });

  // Create order
  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      let { order, items } = req.body;
      
      if (!order || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid order data" });
      }
      
      // Validate order
      let validatedOrder = insertOrderSchema.parse(order);
      
      // If representative, force their ID as representative
      if (req.user.role === 'representative') {
        validatedOrder = { ...validatedOrder, representativeId: req.user.id };
      }
      
      // Check if rep has access to this client
      if (req.user.role === 'representative') {
        const client = await storage.getClient(validatedOrder.clientId);
        if (!client || client.representativeId !== req.user.id) {
          return res.status(403).json({ message: "Not authorized to create order for this client" });
        }
      }
      
      // Create order
      const newOrder = await storage.createOrder(validatedOrder);
      
      // Create order items
      const orderItems = [];
      for (const item of items) {
        try {
          // Se o item tiver clientRef, remova antes de passar para o schema
          // pois essa propriedade não existe na tabela order_items
          const { clientRef, ...itemWithoutClientRef } = item as any;
          
          console.log(`Item sem clientRef para validação:`, itemWithoutClientRef);
          
          const validatedItem = insertOrderItemSchema.parse({
            ...itemWithoutClientRef,
            orderId: newOrder.id
          });
          
          const newItem = await storage.createOrderItem(validatedItem);
          
          // Se quisermos manter clientRef na resposta para o frontend,
          // podemos adicioná-lo manualmente ao objeto retornado
          orderItems.push({
            ...newItem,
            clientRef: clientRef || null
          });
        } catch (error) {
          // Log error and continue
          console.error("Error creating order item:", error);
          console.error("Item data:", JSON.stringify(item));
        }
      }
      
      res.status(201).json({
        order: newOrder,
        items: orderItems
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Error creating order" });
    }
  });

  // Update order status
  app.put("/api/orders/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['cotacao', 'confirmado'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if rep has access to this order
      if (req.user.role === 'representative' && order.representativeId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this order" });
      }
      
      const updatedOrder = await storage.updateOrderStatus(id, status);
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error updating order status" });
    }
  });

  // DASHBOARD/STATS API

  // Get dashboard stats
  app.get("/api/stats/dashboard", isAuthenticated, async (req, res) => {
    try {
      const orderStats = await storage.getOrderStats();
      const productStats = await storage.getProductStats();
      const clientStats = await storage.getClientStats();
      
      res.json({
        orders: orderStats,
        products: productStats,
        clients: clientStats
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching dashboard stats" });
    }
  });

  // Get sales by representative
  app.get("/api/stats/sales-by-representative", isAuthenticated, async (req, res) => {
    try {
      const salesByRep = await storage.getSalesByRepresentative();
      res.json(salesByRep);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sales by representative" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
