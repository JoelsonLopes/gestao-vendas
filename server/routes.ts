import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupWebSocketServer, createNotificationService, type NotificationService } from "./websockets";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertClientSchema, 
  insertProductSchema, 
  insertOrderSchema, 
  insertOrderItemSchema,
  insertRegionSchema,
  insertUserSchema, 
  type Client
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
  
  // Create websocket server and notification service
  const httpServer = createServer(app);
  const wss = setupWebSocketServer(httpServer);
  const notificationService = createNotificationService(wss);

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
  
  // Get all pending users (admin only)
  app.get("/api/pending-users", isAdmin, async (req, res) => {
    try {
      const pendingUsers = await storage.getPendingUsers();
      const usersWithoutPasswords = pendingUsers.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários pendentes" });
    }
  });
  
  // Approve user (admin only)
  app.post("/api/users/:id/approve", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updatedUser = await storage.updateUser(userId, { approved: true });
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Erro ao aprovar usuário" });
    }
  });
  
  // Delete user (admin only)
  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Erro ao excluir usuário" });
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
  
  // Get a specific user (admin only)
  app.get("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });
  
  // Create a new user (admin only)
  app.post("/api/users", isAdmin, async (req, res) => {
    try {
      // Validate request body against schema
      const createUserSchema = insertUserSchema.extend({
        password: z.string().min(6, "Password must be at least 6 characters"),
      });
      
      const validatedData = createUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(validatedData.password);
      
      let user;
      
      try {
        // Se for representante, primeiro cria uma região com o mesmo nome
        if (validatedData.role === 'representative') {
          const region = await storage.createRegion({
            name: validatedData.name, // Nome da região igual ao nome do representante
            // A descrição é um campo opcional na tabela regiões
            ...(typeof validatedData.name === 'string' && { description: `Região de ${validatedData.name}` }),
          });
          
          // Depois cria o usuário com a regionId associada
          user = await storage.createUser({
            ...validatedData,
            password: hashedPassword,
            regionId: region.id, // Vincula o representante à região criada
          });
          
          console.log(`Região ${region.name} (ID: ${region.id}) criada para representante ${user.name} (ID: ${user.id})`);
        } else {
          // Caso não seja representante, cria sem região associada
          user = await storage.createUser({
            ...validatedData,
            password: hashedPassword,
          });
        }
      } catch (createError) {
        console.error('Erro ao criar usuário:', createError);
        return res.status(500).json({ 
          message: "Erro ao criar usuário", 
          error: createError instanceof Error ? createError.message : String(createError)
        });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });
  
  // Update a user (admin only)
  app.put("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the current user
      const currentUser = await storage.getUser(id);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Validate request body against partial schema
      const updateSchema = insertUserSchema.partial().extend({
        password: z.string().min(6, "Password must be at least 6 characters").optional(),
        // Campo para controlar a atualização da região
        updateRegion: z.boolean().optional()
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Check if updating email and if it's already in use
      if (validatedData.email && validatedData.email !== currentUser.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }
      
      // Hash password if provided
      let updateData = { ...validatedData };
      if (validatedData.password) {
        updateData.password = await hashPassword(validatedData.password);
      }
      
      // Verificar se precisamos atualizar a região relacionada
      if (validatedData.updateRegion && validatedData.name && currentUser.regionId) {
        try {
          // Verifica se a região existe
          const region = await storage.getRegion(currentUser.regionId);
          if (region) {
            // Atualiza o nome da região para corresponder ao nome atualizado do representante
            await storage.updateRegion(currentUser.regionId, {
              name: validatedData.name
            });
          }
        } catch (regionError) {
          console.error("Erro ao atualizar região:", regionError);
          // Continuamos mesmo se houver erro na atualização da região
        }
      }
      
      // Update user
      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating user" });
    }
  });
  
  // Toggle user status (active/inactive) (admin only)
  app.patch("/api/users/:id/toggle-status", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the current user
      const currentUser = await storage.getUser(id);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prevent deactivating the last admin
      if (currentUser.role === 'admin' && currentUser.active) {
        const adminUsers = (await storage.listUsers()).filter(u => u.role === 'admin' && u.active);
        if (adminUsers.length <= 1) {
          return res.status(400).json({ message: "Cannot deactivate the last admin user" });
        }
      }
      
      // Toggle the active status
      const user = await storage.updateUser(id, { active: !currentUser.active });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error toggling user status" });
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
  
  // Associar clientes a um representante (admin only)
  app.post("/api/representatives/:id/assign-clients", isAdmin, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      
      // Verificar se o representante existe
      const representative = await storage.getUser(representativeId);
      if (!representative) {
        return res.status(404).json({ message: "Representante não encontrado" });
      }
      
      // Validar os dados do request
      const schema = z.object({
        clientIds: z.array(z.number())
      });
      
      const { clientIds } = schema.parse(req.body);
      
      if (!clientIds || clientIds.length === 0) {
        return res.status(400).json({ message: "Lista de IDs de clientes é obrigatória" });
      }
      
      // Verificar se todos os clientes existem
      const existingClients = await Promise.all(
        clientIds.map(id => storage.getClient(id))
      );
      
      const missingClients = clientIds.filter((_, index) => !existingClients[index]);
      if (missingClients.length > 0) {
        return res.status(404).json({ 
          message: "Alguns clientes não foram encontrados", 
          clientIds: missingClients 
        });
      }
      
      // Atualizar cada cliente
      const results = await Promise.all(
        clientIds.map(clientId => 
          storage.updateClient(clientId, { representativeId })
        )
      );
      
      // Registrar no histórico
      await Promise.all(
        results.map(client => 
          storage.addClientHistory({
            clientId: client!.id,
            userId: req.user.id,
            action: 'assigned_representative',
            details: { 
              representativeId,
              representativeName: representative.name
            }
          })
        )
      );
      
      res.json({ 
        message: `${clientIds.length} clientes atribuídos ao representante ${representative.name}`,
        updatedClients: results 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Formato de dados inválido", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Erro ao associar clientes ao representante" });
    }
  });
  
  // Importar clientes para um representante via CSV (admin only)
  app.post("/api/representatives/:id/import-clients", isAdmin, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      
      // Verificar se o representante existe
      const representative = await storage.getUser(representativeId);
      if (!representative) {
        return res.status(404).json({ message: "Representante não encontrado" });
      }
      
      // Validar dados do request
      const schema = z.object({
        clients: z.array(z.object({
          name: z.string(),
          code: z.string(),
          cnpj: z.string(),
          city: z.string().optional(),
          address: z.string().optional(),
          state: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          regionId: z.number().optional()
        }))
      });
      
      const { clients } = schema.parse(req.body);
      
      if (!clients || clients.length === 0) {
        return res.status(400).json({ message: "Lista de clientes é obrigatória" });
      }
      
      const results = {
        created: [] as Client[],
        updated: [] as Client[],
        errors: [] as any[]
      };
      
      // Processamento em série para evitar problemas com códigos duplicados
      for (const clientData of clients) {
        try {
          // Verificar se o cliente já existe pelo código
          const existingClient = await storage.getClientByCode(clientData.code);
          
          if (existingClient) {
            // Atualizar cliente existente
            const updatedClient = await storage.updateClient(existingClient.id, {
              ...clientData,
              representativeId
            });
            
            if (updatedClient) {
              results.updated.push(updatedClient);
              
              // Registrar no histórico
              await storage.addClientHistory({
                clientId: updatedClient.id,
                userId: req.user.id,
                action: 'updated_via_import',
                details: { 
                  representativeId,
                  representativeName: representative.name,
                  changedFields: Object.keys(clientData)
                }
              });
            }
          } else {
            // Criar novo cliente
            const newClient = await storage.createClient({
              ...clientData,
              representativeId,
              active: true
            });
            
            results.created.push(newClient);
            
            // Registrar no histórico
            await storage.addClientHistory({
              clientId: newClient.id,
              userId: req.user.id,
              action: 'created_via_import',
              details: { 
                representativeId,
                representativeName: representative.name
              }
            });
          }
        } catch (error) {
          results.errors.push({
            client: clientData,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      res.json({
        message: `Importação concluída: ${results.created.length} criados, ${results.updated.length} atualizados, ${results.errors.length} erros`,
        results
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Formato de dados inválido", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Erro ao importar clientes", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get clients by representative
  app.get("/api/representatives/:id/clients", isAuthenticated, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      
      // Verificar se é admin ou se é o próprio representante acessando seus clientes
      if (req.user.role !== 'admin' && req.user.id !== representativeId) {
        return res.status(403).json({ message: "Não autorizado a ver clientes de outro representante" });
      }
      
      const clients = await storage.listClientsByRepresentative(representativeId);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar clientes do representante" });
    }
  });

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

  // Create client (admin only)
  app.post("/api/clients", isAdmin, async (req, res) => {
    try {
      let validatedData = insertClientSchema.parse(req.body);
      
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

  // Search products - suporta dois formatos de URL
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
  
  // Search products by term in URL path
  app.get("/api/products/search/:term", isAuthenticated, async (req, res) => {
    try {
      const { term } = req.params;
      if (!term) {
        return res.status(400).json({ message: "Search term is required" });
      }
      
      console.log(`Buscando produtos com o termo: ${term}`);
      const products = await storage.searchProducts(term);
      console.log(`Encontrados ${products.length} produtos para o termo "${term}"`);
      res.json(products);
    } catch (error) {
      console.error("Erro ao buscar produtos por termo:", error);
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
  
  // Salvar conversão de produto (admin only)
  app.post("/api/products/:id/save-conversion", isAdmin, async (req, res) => {
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

  // Update product (admin only)
  app.put("/api/products/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Validate data
      const validatedData = insertProductSchema.partial().parse(req.body);
      
      // Update product
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
      if (req.user && req.user.role === 'representative') {
        orders = await storage.listOrdersByRepresentative(req.user.id);
      } else {
        orders = await storage.listOrders();
      }
      
      // Enriquecer os dados dos pedidos com informações de totalPieces e nome do cliente
      const ordersWithDetails = await Promise.all(orders.map(async (order) => {
        try {
          // Buscar itens para calcular o total de peças
          const items = await storage.getOrderItems(order.id);
          const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
          
          // Buscar informações do cliente
          let clientName = 'Cliente';
          let clientCode = '';
          try {
            const client = await storage.getClient(order.clientId);
            if (client) {
              clientName = client.name || `Cliente #${client.id}`;
              clientCode = client.code || '';
            }
          } catch (clientError) {
            console.error(`Erro ao buscar cliente para o pedido ${order.id}:`, clientError);
          }
          
          // Formatar a data para exibição
          let formattedDate = 'Data não disponível';
          if (order.createdAt) {
            try {
              // Usar createdAt como data do pedido
              const date = new Date(order.createdAt);
              if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('pt-BR');
              }
            } catch (dateError) {
              console.error(`Erro ao formatar data do pedido ${order.id}:`, dateError);
            }
          }
          
          // Gerar código do pedido no formato ORD-XXXX
          const orderCode = `ORD-${order.id.toString().padStart(4, '0')}`;
          
          return {
            ...order,
            totalPieces,
            clientName,
            date: formattedDate,
            code: orderCode,
            clientCode: clientCode
          };
        } catch (error) {
          console.error(`Erro ao buscar itens para o pedido ${order.id}:`, error);
          // Gerar código do pedido no formato ORD-XXXX mesmo para casos de erro
          const orderCode = `ORD-${order.id.toString().padStart(4, '0')}`;
          
          return {
            ...order,
            totalPieces: 0,
            clientName: 'Cliente',
            date: 'Data não disponível',
            code: orderCode,
            clientCode: ''
          };
        }
      }));
      
      res.json(ordersWithDetails);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
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
      // Filtrar estatísticas por usuário logado se não for admin
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      const orderStats = await storage.getOrderStats(isAdmin ? null : userId);
      const productStats = await storage.getProductStats();
      const clientStats = await storage.getClientStats(isAdmin ? null : userId);
      
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
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      // Se for admin, mostra de todos, caso contrário apenas do usuário logado
      const salesByRep = await storage.getSalesByRepresentative(isAdmin ? null : userId);
      res.json(salesByRep);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sales by representative" });
    }
  });
  
  // Get sales by brand
  app.get("/api/stats/sales-by-brand", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      // Se for admin, mostra de todos, caso contrário apenas do usuário logado
      const salesByBrand = await storage.getSalesByBrand(isAdmin ? null : userId);
      res.json(salesByBrand);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sales by brand" });
    }
  });
  
  // Get top selling products
  app.get("/api/stats/top-selling-products", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      // O limite padrão é 20, mas pode ser alterado via query parameter
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const topProducts = await storage.getTopSellingProducts(limit, isAdmin ? null : userId);
      res.json(topProducts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching top selling products" });
    }
  });
  
  // Rota para enviar notificações (apenas para usuários autenticados)
  app.post("/api/notify", isAuthenticated, (req, res) => {
    try {
      const { type = "info", message, targetUsers = "all" } = req.body;
      
      if (!message) {
        return res.status(400).json({ 
          success: false, 
          message: "O campo 'message' é obrigatório" 
        });
      }
      
      const notification = {
        type,
        message,
        timestamp: Date.now()
      };
      
      // Enviar notificação com base no alvo especificado
      if (targetUsers === "admins") {
        notificationService.notifyAdmins(notification);
      } else if (typeof targetUsers === "number") {
        notificationService.notifyUser(targetUsers, notification);
      } else {
        notificationService.notifyAll(notification);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao enviar notificação" 
      });
    }
  });
  
  // Adicionar uma rota específica para notificar sobre aprovação de usuários
  app.post("/api/notify-user-approval", isAdmin, (req, res) => {
    try {
      const { userId, userName } = req.body;
      
      if (!userId || !userName) {
        return res.status(400).json({ 
          success: false, 
          message: "Os campos 'userId' e 'userName' são obrigatórios" 
        });
      }
      
      const notification = {
        type: "success",
        message: `O representante ${userName} foi aprovado com sucesso!`,
        timestamp: Date.now()
      };
      
      // Notificar todos os administradores
      notificationService.notifyAdmins(notification);
      
      // Notificar o usuário específico (quando implementarmos o mapeamento de usuários)
      notificationService.notifyUser(userId, {
        type: "success",
        message: "Sua conta foi aprovada! Você já pode acessar o sistema.",
        timestamp: Date.now()
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao enviar notificação de aprovação:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao enviar notificação de aprovação" 
      });
    }
  });
  
  // Rota para notificar administradores sobre novos usuários pendentes
  app.post("/api/notify-new-user", (req, res) => {
    try {
      const { userName } = req.body;
      
      if (!userName) {
        return res.status(400).json({ 
          success: false, 
          message: "O campo 'userName' é obrigatório" 
        });
      }
      
      const notification = {
        type: "info",
        message: `Novo representante ${userName} aguardando aprovação!`,
        timestamp: Date.now()
      };
      
      // Notificar apenas administradores
      notificationService.notifyAdmins(notification);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao enviar notificação de novo usuário:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao enviar notificação de novo usuário" 
      });
    }
  });
  
  return httpServer;
}
