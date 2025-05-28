import { Router } from "express";
import { storage } from "../repositories";
import { isAuthenticated, isAdmin } from "../middlewares/auth";
import { insertClientSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Associar clientes a um representante (admin only)
router.post("/representatives/:id/assign-clients", isAdmin, async (req, res) => {
  try {
    const representativeId = parseInt(req.params.id);
    const representative = await storage.user.getUser(representativeId);
    if (!representative) {
      return res.status(404).json({ message: "Representante não encontrado" });
    }
    const schema = z.object({ clientIds: z.array(z.number()) });
    const { clientIds } = schema.parse(req.body);
    if (!clientIds || clientIds.length === 0) {
      return res.status(400).json({ message: "Lista de IDs de clientes é obrigatória" });
    }
    const existingClients = await Promise.all(clientIds.map(id => storage.client.getClient(id)));
    const missingClients = clientIds.filter((_, index) => !existingClients[index]);
    if (missingClients.length > 0) {
      return res.status(404).json({ message: "Alguns clientes não foram encontrados", clientIds: missingClients });
    }
    const results = await Promise.all(clientIds.map(clientId => storage.client.updateClient(clientId, { representativeId })));
    await Promise.all(results.map(client => storage.clientHistory.addClientHistory({
      clientId: client!.id,
      userId: req.user?.id ?? 0,
      action: 'assigned_representative',
      details: { representativeId, representativeName: representative.name }
    })));
    res.json({ message: `${clientIds.length} clientes atribuídos ao representante ${representative.name}`, updatedClients: results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Formato de dados inválido", errors: error.errors });
    }
    res.status(500).json({ message: "Erro ao associar clientes ao representante" });
  }
});

// Importar clientes para um representante via CSV (admin only)
router.post("/representatives/:id/import-clients", isAdmin, async (req, res) => {
  try {
    const representativeId = parseInt(req.params.id);
    const representative = await storage.user.getUser(representativeId);
    if (!representative) {
      return res.status(404).json({ message: "Representante não encontrado" });
    }
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
    const results = { created: [], updated: [], errors: [] } as any;
    for (const clientData of clients) {
      try {
        const existingClient = await storage.client.getClientByCode(clientData.code);
        if (existingClient) {
          const updatedClient = await storage.client.updateClient(existingClient.id, { ...clientData, representativeId });
          if (updatedClient) {
            results.updated.push(updatedClient);
            await storage.clientHistory.addClientHistory({
              clientId: updatedClient.id,
              userId: req.user?.id ?? 0,
              action: 'updated_via_import',
              details: { representativeId, representativeName: representative.name, changedFields: Object.keys(clientData) }
            });
          }
        } else {
          const newClient = await storage.client.createClient({ ...clientData, representativeId, active: true });
          results.created.push(newClient);
          await storage.clientHistory.addClientHistory({
            clientId: newClient.id,
            userId: req.user?.id ?? 0,
            action: 'created_via_import',
            details: { representativeId, representativeName: representative.name }
          });
        }
      } catch (error) {
        results.errors.push({ client: clientData, error: error instanceof Error ? error.message : String(error) });
      }
    }
    res.json({
      message: `Importação concluída: ${results.created.length} criados, ${results.updated.length} atualizados, ${results.errors.length} erros`,
      results
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Formato de dados inválido", errors: error.errors });
    }
    res.status(500).json({ message: "Erro ao importar clientes", error: error instanceof Error ? error.message : String(error) });
  }
});

// Importar clientes próprios via CSV (representantes)
router.post("/clients/import", isAuthenticated, async (req, res) => {
  try {
    // Se for admin, precisa especificar o representativeId no body
    // Se for representante, usa o próprio ID
    const representativeId = req.user?.role === 'representative' 
      ? req.user.id 
      : req.body.representativeId;

    if (req.user?.role === 'admin' && !representativeId) {
      return res.status(400).json({ 
        message: "Admin deve especificar o representativeId para importação" 
      });
    }

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

    const results = { created: [], updated: [], errors: [] } as any;
    
    for (const clientData of clients) {
      try {
        const existingClient = await storage.client.getClientByCode(clientData.code);
        
        if (existingClient) {
          // Se for representante, só pode atualizar seus próprios clientes
          if (req.user?.role === 'representative' && existingClient.representativeId !== req.user.id) {
            results.errors.push({ 
              client: clientData, 
              error: "Não autorizado a atualizar cliente de outro representante" 
            });
            continue;
          }
          
          const updatedClient = await storage.client.updateClient(existingClient.id, { 
            ...clientData, 
            representativeId 
          });
          
          if (updatedClient) {
            results.updated.push(updatedClient);
            await storage.clientHistory.addClientHistory({
              clientId: updatedClient.id,
              userId: req.user?.id ?? 0,
              action: 'updated_via_import',
              details: { 
                representativeId, 
                importedBy: req.user?.role,
                changedFields: Object.keys(clientData) 
              }
            });
          }
        } else {
          const newClient = await storage.client.createClient({ 
            ...clientData, 
            representativeId, 
            active: true 
          });
          results.created.push(newClient);
          await storage.clientHistory.addClientHistory({
            clientId: newClient.id,
            userId: req.user?.id ?? 0,
            action: 'created_via_import',
            details: { 
              representativeId,
              importedBy: req.user?.role
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
router.get("/representatives/:id/clients", isAuthenticated, async (req, res) => {
  try {
    const representativeId = parseInt(req.params.id);
    if (!req.user || (req.user.role !== 'admin' && req.user.id !== representativeId)) {
      return res.status(403).json({ message: "Não autorizado a ver clientes de outro representante" });
    }
    const clients = await storage.client.listClientsByRepresentative(representativeId);
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar clientes do representante" });
  }
});

// Get all clients
router.get("/clients", isAuthenticated, async (req, res) => {
  try {
    let clients;
    if (req.user?.role === 'representative') {
      clients = await storage.client.listClientsByRepresentative(req.user.id);
    } else {
      clients = await storage.client.listClients();
    }
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: "Error fetching clients" });
  }
});

// Search clients
router.get("/clients/search", isAuthenticated, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: "Search query is required" });
    }
    let clients = await storage.client.searchClients(q);
    if (req.user?.role === 'representative') {
      clients = clients.filter(client => req.user && client.representativeId === req.user.id);
    }
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: "Error searching clients" });
  }
});

// Get client by ID
router.get("/clients/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const client = await storage.client.getClient(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    if (req.user?.role === 'representative' && client.representativeId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to view this client" });
    }
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: "Error fetching client" });
  }
});

// Create client (authenticated users - admin and representatives)
router.post("/clients", isAuthenticated, async (req, res) => {
  try {
    let validatedData = insertClientSchema.parse(req.body);
    
    // Se for representante, forçar o representativeId para ser o próprio ID do usuário
    if (req.user?.role === 'representative') {
      validatedData.representativeId = req.user.id;
      
      // Garantir que o representante não tente criar cliente para outro representante
      if (req.body.representativeId && req.body.representativeId !== req.user.id) {
        return res.status(403).json({ 
          message: "Representantes só podem criar clientes para si mesmos" 
        });
      }
    }
    
    // Se for admin e não especificou representativeId, pode criar sem representante
    // Se for representante, sempre terá o representativeId definido acima
    
    const client = await storage.client.createClient(validatedData);
    await storage.clientHistory.addClientHistory({
      clientId: client.id,
      userId: req.user?.id ?? 0,
      action: 'created',
      details: { 
        client,
        createdBy: req.user?.role === 'representative' ? 'representative' : 'admin'
      }
    });
    res.status(201).json(client);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error creating client", error: error instanceof Error ? error.message : String(error) });
  }
});

// Update client
router.put("/clients/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const client = await storage.client.getClient(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    if (req.user?.role === 'representative' && client.representativeId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this client" });
    }
    const validatedData = insertClientSchema.partial().parse(req.body);
    if (req.user?.role === 'representative' && validatedData.representativeId && validatedData.representativeId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to change representative" });
    }
    const updatedClient = await storage.client.updateClient(id, validatedData);
    await storage.clientHistory.addClientHistory({
      clientId: id,
      userId: req.user?.id ?? 0,
      action: 'updated',
      details: { before: client, after: updatedClient }
    });
    res.json(updatedClient);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error updating client" });
  }
});

// Get client history
router.get("/clients/:id/history", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const client = await storage.client.getClient(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    if (req.user?.role === 'representative' && client.representativeId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to view this client's history" });
    }
    const history = await storage.clientHistory.getClientHistory(id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Error fetching client history" });
  }
});

export default router; 