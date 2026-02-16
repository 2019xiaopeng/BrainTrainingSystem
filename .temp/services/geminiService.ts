import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize Gemini
// Note: In a real production app, you might want to proxy these requests or handle keys more securely.
// For this frontend-only demo, we assume the env var is injected by the bundler/environment.
const ai = new GoogleGenAI({ apiKey });

export const generateCoachAdvice = async (
  stats: any, 
  userMessage: string
): Promise<string> => {
  try {
    const model = "gemini-3-pro-preview";
    
    // Construct a prompt that gives context about the game
    const context = `
      You are a world-class cognitive science coach for a brain training app called "Brain Expedition".
      The user is playing an N-Back game to improve working memory.
      
      User Stats:
      - Current Max N-Level: ${stats.currentMaxN || 'Unknown'}
      - Recent Accuracy: ${stats.recentAccuracy || 'Unknown'}%
      - Total Stars: ${stats.totalStars}
      
      User says: "${userMessage}"
      
      Provide a helpful, encouraging, and scientifically grounded response. 
      Keep it concise (under 150 words) but insightful.
      If the user is struggling, suggest strategies (e.g., chunking, vocalizing).
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: context,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking budget for deep analysis
      }
    });

    return response.text || "I'm having trouble connecting to the neural network right now. Try again later.";
  } catch (error) {
    console.error("Gemini Coach Error:", error);
    return "The neural link is unstable. Please check your connection and API key.";
  }
};

export const generateRewardImage = async (
  prompt: string, 
  size: '1K' | '2K' | '4K' = '1K'
): Promise<string | null> => {
  try {
    const model = "gemini-3-pro-image-preview";
    
    // Check if high res is requested
    const effectivePrompt = prompt + ", masterpiece, high quality, trending on artstation";

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: effectivePrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: size, 
        }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};
