import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const aiProviders = pgTable("ai_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
  userId: integer("user_id").notNull(),
  isActive: boolean("is_active").default(true),
});

export const aiModels = pgTable("ai_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  providerId: integer("provider_id").notNull(),
  modelId: text("model_id").notNull(),
  isDefault: boolean("is_default").default(false),
});

export const systemPrompts = pgTable("system_prompts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull(),
  isShared: boolean("is_shared").default(false),
});

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull(),
  modelId: integer("model_id").notNull(),
  systemPromptId: integer("system_prompt_id"),
  isDocument: boolean("is_document").default(false),
  content: text("content"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProviderSchema = createInsertSchema(aiProviders).pick({
  name: true,
  baseUrl: true,
  apiKey: true,
});

export const insertModelSchema = createInsertSchema(aiModels).pick({
  name: true,
  providerId: true,
  modelId: true,
  isDefault: true,
});

export const insertPromptSchema = createInsertSchema(systemPrompts).pick({
  name: true,
  content: true,
  isShared: true,
});

export const insertChatSchema = createInsertSchema(chats).pick({
  name: true,
  modelId: true,
  systemPromptId: true,
  isDocument: true,
  content: true,
  metadata: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatId: true,
  role: true,
  content: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type AIProvider = typeof aiProviders.$inferSelect;
export type InsertProvider = z.infer<typeof insertProviderSchema>;

export type AIModel = typeof aiModels.$inferSelect;
export type InsertModel = z.infer<typeof insertModelSchema>;

export type SystemPrompt = typeof systemPrompts.$inferSelect;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;

export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
