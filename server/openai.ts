import OpenAI from "openai";
import { storage } from "./storage";

async function getOpenAIClient(modelId: number) {
  const model = await storage.getModel(modelId);
  if (!model) throw new Error("Model not found");

  const provider = await storage.getProvider(model.providerId);
  if (!provider) throw new Error("Provider not found");

  console.log("Using model:", model.modelId, "from provider:", provider.name);

  return new OpenAI({ 
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl,
    defaultHeaders: {
      "HTTP-Referer": "https://replit.com",
      "X-Title": "AI Chat",
    }
  });
}

export async function generateResponse(message: string, modelId: number): Promise<string> {
  try {
    const model = await storage.getModel(modelId);
    if (!model) throw new Error("Model not found");

    const provider = await storage.getProvider(model.providerId);
    if (!provider) throw new Error("Provider not found");

    console.log("Making API request to provider", provider.baseUrl);
    const openai = await getOpenAIClient(modelId);

    const response = await openai.chat.completions.create({
      model: model.modelId,
      messages: [
        { role: "user", content: message }
      ],
      stream: false,
      headers: {
        "Authorization": `Bearer ${provider.apiKey}`
      }
    });

    console.log("Response from API:", response);
    return response.choices[0].message.content || "No response generated";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}