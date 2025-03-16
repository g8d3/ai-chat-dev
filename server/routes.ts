import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { insertProviderSchema, insertModelSchema, insertPromptSchema, insertChatSchema, insertMessageSchema } from "@shared/schema";

function extractApiKey(key: string) {
  const firstPart = key.slice(0, 4);
  const lastPart = key.slice(-4);
  return `${firstPart}${'*'.repeat(key.length - 8)}${lastPart}`;
}

async function generateAIResponse(message: string, modelId: number): Promise<string> {
  // For now, return a simple echo response
  // TODO: Implement actual AI provider integration
  return `[AI Response] ${message}`;
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
  app.get("/api/providers/:providerId/models", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const provider = await storage.getProvider(parseInt(req.params.providerId));
    if (!provider || provider.userId !== req.user.id) return res.sendStatus(404);
    const models = await storage.getModels(provider.id);
    res.json(models);
  });

  app.post("/api/models", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const data = insertModelSchema.parse(req.body);
    const provider = await storage.getProvider(data.providerId);
    if (!provider || provider.userId !== req.user.id) return res.sendStatus(404);
    const model = await storage.createModel(data);
    res.status(201).json(model);
  });

  // System Prompts
  app.get("/api/prompts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const prompts = await storage.getPrompts(req.user.id);
    res.json(prompts);
  });

  app.post("/api/prompts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const data = insertPromptSchema.parse(req.body);
    const prompt = await storage.createPrompt({ ...data, userId: req.user.id });
    res.status(201).json(prompt);
  });

  app.patch("/api/prompts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const prompt = await storage.getPrompt(parseInt(req.params.id));
    if (!prompt || prompt.userId !== req.user.id) return res.sendStatus(404);
    const updated = await storage.updatePrompt(prompt.id, req.body);
    res.json(updated);
  });

  app.delete("/api/prompts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const prompt = await storage.getPrompt(parseInt(req.params.id));
    if (!prompt || prompt.userId !== req.user.id) return res.sendStatus(404);
    await storage.deletePrompt(prompt.id);
    res.sendStatus(204);
  });

  // Chats
  app.get("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const chats = await storage.getChats(req.user.id);
    res.json(chats);
  });

  app.post("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const data = insertChatSchema.parse(req.body);
    const chat = await storage.createChat({ ...data, userId: req.user.id });
    res.status(201).json(chat);
  });

  // Messages
  app.get("/api/chats/:chatId/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const chat = await storage.getChat(parseInt(req.params.chatId));
    if (!chat || chat.userId !== req.user.id) return res.sendStatus(404);
    const messages = await storage.getMessages(chat.id);
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const data = insertMessageSchema.parse(req.body);
    const chat = await storage.getChat(data.chatId);
    if (!chat || chat.userId !== req.user.id) return res.sendStatus(404);

    // Create user message
    const userMessage = await storage.createMessage(data);

    // Generate and create AI response
    const aiResponse = await generateAIResponse(data.content, chat.modelId);
    const aiMessage = await storage.createMessage({
      chatId: chat.id,
      role: "assistant",
      content: aiResponse,
    });

    res.status(201).json(userMessage);
  });

  const httpServer = createServer(app);

  // WebSocket for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
      const message = JSON.parse(data.toString());
      // Handle document collaboration updates
      if (message.type === 'document_update') {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      }
    });
  });

  return httpServer;
}