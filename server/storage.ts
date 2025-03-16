import memorystore from "memorystore";
import session from "express-session";
import { User, InsertUser, AIProvider, InsertProvider, AIModel, InsertModel, SystemPrompt, InsertPrompt, Chat, InsertChat, Message, InsertMessage } from "@shared/schema";

const MemoryStore = memorystore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Provider operations
  getProviders(userId: number): Promise<AIProvider[]>;
  getProvider(id: number): Promise<AIProvider | undefined>;
  createProvider(provider: InsertProvider & { userId: number }): Promise<AIProvider>;
  updateProvider(id: number, provider: Partial<InsertProvider>): Promise<AIProvider>;
  deleteProvider(id: number): Promise<void>;

  // Model operations
  getModels(providerId: number): Promise<AIModel[]>;
  getModel(id: number): Promise<AIModel | undefined>;
  createModel(model: InsertModel): Promise<AIModel>;
  updateModel(id: number, model: Partial<InsertModel>): Promise<AIModel>;
  deleteModel(id: number): Promise<void>;

  // System prompt operations
  getPrompts(userId: number): Promise<SystemPrompt[]>;
  getPrompt(id: number): Promise<SystemPrompt | undefined>;
  createPrompt(prompt: InsertPrompt & { userId: number }): Promise<SystemPrompt>;
  updatePrompt(id: number, prompt: Partial<InsertPrompt>): Promise<SystemPrompt>;
  deletePrompt(id: number): Promise<void>;

  // Chat operations
  getChats(userId: number): Promise<Chat[]>;
  getChat(id: number): Promise<Chat | undefined>;
  createChat(chat: InsertChat & { userId: number }): Promise<Chat>;
  updateChat(id: number, chat: Partial<InsertChat>): Promise<Chat>;
  deleteChat(id: number): Promise<void>;

  // Message operations
  getMessages(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private providers: Map<number, AIProvider>;
  private models: Map<number, AIModel>;
  private prompts: Map<number, SystemPrompt>;
  private chats: Map<number, Chat>;
  private messages: Map<number, Message>;
  public sessionStore: session.Store;

  private currentIds: {
    user: number;
    provider: number;
    model: number;
    prompt: number;
    chat: number;
    message: number;
  };

  constructor() {
    this.users = new Map();
    this.providers = new Map();
    this.models = new Map();
    this.prompts = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    this.currentIds = {
      user: 1,
      provider: 1,
      model: 1,
      prompt: 1,
      chat: 1,
      message: 1,
    };
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.user++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Provider operations
  async getProviders(userId: number): Promise<AIProvider[]> {
    return Array.from(this.providers.values()).filter(
      (provider) => provider.userId === userId,
    );
  }

  async getProvider(id: number): Promise<AIProvider | undefined> {
    return this.providers.get(id);
  }

  async createProvider(provider: InsertProvider & { userId: number }): Promise<AIProvider> {
    const id = this.currentIds.provider++;
    const newProvider = { ...provider, id, isActive: true };
    this.providers.set(id, newProvider);
    return newProvider;
  }

  async updateProvider(id: number, update: Partial<InsertProvider>): Promise<AIProvider> {
    const provider = this.providers.get(id);
    if (!provider) throw new Error("Provider not found");
    const updatedProvider = { ...provider, ...update };
    this.providers.set(id, updatedProvider);
    return updatedProvider;
  }

  async deleteProvider(id: number): Promise<void> {
    this.providers.delete(id);
  }

  // Model operations
  async getModels(providerId: number): Promise<AIModel[]> {
    return Array.from(this.models.values()).filter(
      (model) => model.providerId === providerId,
    );
  }

  async getModel(id: number): Promise<AIModel | undefined> {
    return this.models.get(id);
  }

  async createModel(model: InsertModel): Promise<AIModel> {
    const id = this.currentIds.model++;
    const newModel = { ...model, id, isDefault: model.isDefault ?? false };
    this.models.set(id, newModel);
    return newModel;
  }

  async updateModel(id: number, update: Partial<InsertModel>): Promise<AIModel> {
    const model = this.models.get(id);
    if (!model) throw new Error("Model not found");
    const updatedModel = { ...model, ...update };
    this.models.set(id, updatedModel);
    return updatedModel;
  }

  async deleteModel(id: number): Promise<void> {
    this.models.delete(id);
  }

  // System prompt operations
  async getPrompts(userId: number): Promise<SystemPrompt[]> {
    return Array.from(this.prompts.values()).filter(
      (prompt) => prompt.userId === userId || prompt.isShared,
    );
  }

  async getPrompt(id: number): Promise<SystemPrompt | undefined> {
    return this.prompts.get(id);
  }

  async createPrompt(prompt: InsertPrompt & { userId: number }): Promise<SystemPrompt> {
    const id = this.currentIds.prompt++;
    const newPrompt = { ...prompt, id, isShared: prompt.isShared ?? false };
    this.prompts.set(id, newPrompt);
    return newPrompt;
  }

  async updatePrompt(id: number, update: Partial<InsertPrompt>): Promise<SystemPrompt> {
    const prompt = this.prompts.get(id);
    if (!prompt) throw new Error("Prompt not found");
    const updatedPrompt = { ...prompt, ...update };
    this.prompts.set(id, updatedPrompt);
    return updatedPrompt;
  }

  async deletePrompt(id: number): Promise<void> {
    this.prompts.delete(id);
  }

  // Chat operations
  async getChats(userId: number): Promise<Chat[]> {
    return Array.from(this.chats.values()).filter(
      (chat) => chat.userId === userId,
    );
  }

  async getChat(id: number): Promise<Chat | undefined> {
    return this.chats.get(id);
  }

  async createChat(chat: InsertChat & { userId: number }): Promise<Chat> {
    const id = this.currentIds.chat++;
    const newChat = {
      ...chat,
      id,
      createdAt: new Date(),
      metadata: chat.metadata ?? null,
      content: chat.content ?? null,
      systemPromptId: chat.systemPromptId ?? null,
      isDocument: chat.isDocument ?? false
    };
    this.chats.set(id, newChat);
    return newChat;
  }

  async updateChat(id: number, update: Partial<InsertChat>): Promise<Chat> {
    const chat = this.chats.get(id);
    if (!chat) throw new Error("Chat not found");
    const updatedChat = { ...chat, ...update };
    this.chats.set(id, updatedChat);
    return updatedChat;
  }

  async deleteChat(id: number): Promise<void> {
    this.chats.delete(id);
  }

  // Message operations
  async getMessages(chatId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.chatId === chatId)
      .sort((a, b) => {
        return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
      });
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentIds.message++;
    const newMessage = { ...message, id, createdAt: new Date() };
    this.messages.set(id, newMessage);
    return newMessage;
  }
}

export const storage = new MemStorage();