import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { insertProviderSchema, insertModelSchema, insertPromptSchema, insertChatSchema, insertMessageSchema } from "@shared/schema";
import { generateResponse } from "./openai";

function extractApiKey(key: string) {
  const firstPart = key.slice(0, 4);
  const lastPart = key.slice(-4);
  return `${firstPart}${'*'.repeat(key.length - 8)}${lastPart}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Providers
  app.get("/api/providers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const providers = await storage.getProviders(req.user.id);
    // Mask API keys in response
    const maskedProviders = providers.map(p => ({
      ...p,
      apiKey: extractApiKey(p.apiKey)
    }));
    res.json(maskedProviders);
  });

  app.post("/api/providers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const data = insertProviderSchema.parse(req.body);
    const provider = await storage.createProvider({ ...data, userId: req.user.id });
    res.status(201).json({ ...provider, apiKey: extractApiKey(provider.apiKey) });
  });

  app.patch("/api/providers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const provider = await storage.getProvider(parseInt(req.params.id));
    if (!provider || provider.userId !== req.user.id) return res.sendStatus(404);
    const updated = await storage.updateProvider(provider.id, req.body);
    res.json({ ...updated, apiKey: extractApiKey(updated.apiKey) });
  });

  app.delete("/api/providers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const provider = await storage.getProvider(parseInt(req.params.id));
    if (!provider || provider.userId !== req.user.id) return res.sendStatus(404);
    await storage.deleteProvider(provider.id);
    res.sendStatus(204);
  });

  // Models
  app.get("/api/models", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const providers = await storage.getProviders(req.user.id);
    const allModels = [];

    for (const provider of providers) {
      const models = await storage.getModels(provider.id);
      allModels.push(...models);
    }

    res.json(allModels);
  });

  app.post("/api/models", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const data = insertModelSchema.parse(req.body);
    const provider = await storage.getProvider(data.providerId);
    if (!provider || provider.userId !== req.user.id) return res.sendStatus(404);
    const model = await storage.createModel(data);
    res.status(201).json(model);
  });

  app.delete("/api/models/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const model = await storage.getModel(parseInt(req.params.id));
    if (!model) return res.sendStatus(404);
    const provider = await storage.getProvider(model.providerId);
    if (!provider || provider.userId !== req.user.id) return res.sendStatus(404);
    await storage.deleteModel(model.id);
    res.sendStatus(204);
  });

  // Messages
  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const data = insertMessageSchema.parse(req.body);
    const chat = await storage.getChat(data.chatId);
    if (!chat || chat.userId !== req.user.id) return res.sendStatus(404);

    // Create user message
    const userMessage = await storage.createMessage(data);

    try {
      // Generate and create AI response
      const aiResponse = await generateResponse(data.content, chat.modelId);
      const aiMessage = await storage.createMessage({
        chatId: chat.id,
        role: "assistant",
        content: aiResponse,
      });

      // Store interaction log
      const model = await storage.getModel(chat.modelId);
      const provider = await storage.getProvider(model.providerId);

      await storage.createLog({
        timestamp: new Date(),
        username: req.user.username,
        modelName: model.name,
        providerUrl: provider.baseUrl,
        chatTitle: chat.name,
        messageSent: data.content,
        messageReceived: aiResponse,
        status: "success"
      });

      // Broadcast to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "message",
            chatId: chat.id,
            message: aiMessage
          }));
        }
      });

      res.status(201).json([userMessage, aiMessage]);
    } catch (error: any) {
      console.error("Error generating AI response:", error);

      // Log the error
      const model = await storage.getModel(chat.modelId);
      const provider = await storage.getProvider(model.providerId);

      await storage.createLog({
        timestamp: new Date(),
        username: req.user.username,
        modelName: model.name,
        providerUrl: provider.baseUrl,
        chatTitle: chat.name,
        messageSent: data.content,
        messageReceived: "No response generated",
        status: "error",
        errorMessage: error.message
      });

      res.status(201).json([userMessage]);
    }
  });

  // Logs endpoint
  app.get("/api/logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const logs = await storage.getLogs();
    res.json(logs);
  });

  const httpServer = createServer(app);

  // WebSocket for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data) => {
      const message = JSON.parse(data.toString());
      console.log('WebSocket message received:', message);

      // Handle document collaboration updates
      if (message.type === 'document_update') {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}