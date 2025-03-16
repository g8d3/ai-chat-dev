import OpenAI from "openai";
import { storage } from "./storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
async function getOpenAIClient(modelId: number) {
  const model = await storage.getModel(modelId);
  if (!model) throw new Error("Model not found");

  const provider = await storage.getProvider(model.providerId);
  if (!provider) throw new Error("Provider not found");

  return new OpenAI({ 
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl 
  });
}

export async function generateResponse(message: string, modelId: number): Promise<string> {
  try {
    const model = await storage.getModel(modelId);
    if (!model) throw new Error("Model not found");

    const openai = await getOpenAIClient(modelId);

    const response = await openai.chat.completions.create({
      model: model.modelId,
      messages: [
        { role: "user", content: message }
      ],
    });

    return response.choices[0].message.content || "No response generated";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Sorry, I encountered an error processing your request.";
  }
}