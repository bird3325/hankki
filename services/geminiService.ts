
import { GoogleGenAI, Type } from "@google/genai";
import { NutritionInfo, DetailedIngredient, LocationInfo } from "../types";

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface AIAnalysisResult extends NutritionInfo {
  foodName: string;
  description: string;
  ingredients: string[];
  ingredientDetails: DetailedIngredient[];
  aiTip: string;
  locationName?: string;
  locationType?: 'home' | 'restaurant' | 'other';
}

export const analyzeFoodImage = async (base64Image: string, location?: { latitude: number; longitude: number }): Promise<AIAnalysisResult> => {
  // Always use the named parameter for API Key initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isLocationEnabled = !!location;

  // Maps grounding is only supported in Gemini 2.5 series models.
  const tools = isLocationEnabled ? [{ googleMaps: {} }] : [];
  const toolConfig = isLocationEnabled ? {
    retrievalConfig: {
      latLng: {
        latitude: location!.latitude,
        longitude: location!.longitude
      }
    }
  } : undefined;

  let prompt = `
    Analyze this food image. 
    Identify the main dish or dishes.
    Estimate the total calories and macronutrients (carbohydrates, protein, fat) for the entire serving shown.
    Break down the main ingredients and provide nutritional insights for each.
    
    ${isLocationEnabled ? "Using the provided location data, identify if this is a restaurant or home. If it is a restaurant, try to identify the specific restaurant name." : ""}

    IMPORTANT: Return the response in Korean (Hangul).
    
    Fields:
    - foodName: Simple name of the dish.
    - description: A short, neutral description.
    - ingredientDetails: A list of main ingredients found in the dish. For each:
       - name: Name of the ingredient.
       - nutritionEstimate: Estimated calories or key content (e.g., "약 50kcal", "단백질 10g").
       - benefit: A brief health benefit (e.g., "비타민 C 풍부", "소화에 도움").
    - aiTip: Warm, helpful nutritional advice (max 2 sentences).
    - calories, carbs, protein, fat: Total numeric values for the meal.
    ${isLocationEnabled ? "- locationName: The name of the restaurant if identified, or '집밥' if it seems like home cooked, or a general place name.\n- locationType: One of 'restaurant', 'home', 'other'." : ""}

    If not food, return 0/empty values and "음식 아님".
  `;

  // Maps grounding tool requires conditional config handling
  if (isLocationEnabled) {
    prompt += `\n\nOutput the result as a valid JSON object. Do not use Markdown code blocks.`;
  }

  const schema = {
    type: Type.OBJECT,
    properties: {
      foodName: { type: Type.STRING },
      calories: { type: Type.NUMBER },
      carbs: { type: Type.NUMBER },
      protein: { type: Type.NUMBER },
      fat: { type: Type.NUMBER },
      description: { type: Type.STRING },
      ingredientDetails: { 
        type: Type.ARRAY, 
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            nutritionEstimate: { type: Type.STRING },
            benefit: { type: Type.STRING }
          },
          required: ["name", "nutritionEstimate", "benefit"]
        }
      },
      aiTip: { type: Type.STRING },
      locationName: { type: Type.STRING },
      locationType: { type: Type.STRING, enum: ["home", "restaurant", "other"] }
    },
    required: ["foodName", "calories", "carbs", "protein", "fat", "description", "ingredientDetails", "aiTip"]
  };

  const requestConfig: any = {
    tools: tools,
    toolConfig: toolConfig,
  };

  // Only use JSON mode if NOT using Maps tool (Maps tool + JSON mode is unsupported)
  if (!isLocationEnabled) {
      requestConfig.responseMimeType = "application/json";
      requestConfig.responseSchema = schema;
  }

  try {
    // Model selection based on feature availability: Maps grounding requires 2.5 series.
    const response = await ai.models.generateContent({
      model: isLocationEnabled ? 'gemini-2.5-flash' : 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: requestConfig
    });

    // Access text property directly from the response object
    let jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    // Clean up markdown code blocks if present
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(jsonText);
    
    // Map ingredientDetails to simple ingredients array for backward compatibility
    const ingredients = data.ingredientDetails?.map((d: any) => d.name) || [];

    return {
        ...data,
        ingredients
    } as AIAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      foodName: "분석 실패",
      calories: 0,
      carbs: 0,
      protein: 0,
      fat: 0,
      description: "음식을 인식할 수 없습니다. 다시 시도해주세요.",
      ingredients: [],
      ingredientDetails: [],
      aiTip: "음식을 분석할 수 없어서 꿀팁을 제공할 수 없어요."
    };
  }
};

export const recalculateNutrition = async (base64Image: string, ingredients: string[]): Promise<NutritionInfo> => {
  // Always use the named parameter for API Key initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this food image again, focusing specifically on these ingredients provided by the user: ${ingredients.join(', ')}.
    
    Recalculate the total calories and macronutrients (carbohydrates, protein, fat) for the serving shown, considering ONLY these ingredients are present or dominant.
    
    Output the result as a valid JSON object.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      calories: { type: Type.NUMBER },
      carbs: { type: Type.NUMBER },
      protein: { type: Type.NUMBER },
      fat: { type: Type.NUMBER },
    },
    required: ["calories", "carbs", "protein", "fat"]
  };

  try {
    // Using gemini-3-flash-preview for specialized multimodal analysis tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    // Access text property directly from the response object
    let jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(jsonText);
    
    return {
        calories: data.calories || 0,
        carbs: data.carbs || 0,
        protein: data.protein || 0,
        fat: data.fat || 0
    };

  } catch (error) {
    console.error("Gemini Recalculation Failed:", error);
    throw error;
  }
};
