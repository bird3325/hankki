
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

const getAiInstance = () => {
  const apiKey =
    process.env.API_KEY ||
    process.env.GEMINI_API_KEY ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === "undefined" || apiKey === '""') {
    throw new Error("정상적인 API Key를 찾을 수 없습니다. .env.local 파일에 VITE_GEMINI_API_KEY=your_key_here 형식을 입력했는지 확인해주세요.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeFoodImage = async (base64Image: string, location?: { latitude: number; longitude: number }): Promise<AIAnalysisResult> => {
  try {
    const ai = getAiInstance();
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
      // JSON mode is set here
    };

    // Only use JSON mode if NOT using Maps tool (Maps tool + JSON mode is unsupported)
    if (!isLocationEnabled) {
      requestConfig.responseMimeType = "application/json";
      requestConfig.responseSchema = schema;
    }

    // Unified SDK (1.x) 규격에 맞게 호출
    // 모델 이름을 'gemini-1.5-flash-latest'로 명확히 지정하여 404 해결 시도
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            { text: prompt }
          ]
        }
      ],
      // Maps grounding 도구가 404의 원인일 수 있어 일시적으로 주석 처리하여 테스트
      // tools: tools as any,
      systemInstruction: "You are a professional nutritionist. Always respond in Korean.",
      config: requestConfig
    } as any);

    // Access text property/method safely (Unified SDK uses .text)
    let jsonText = response.text || "";

    if (!jsonText) throw new Error("AI로부터 응답 텍스트를 받지 못했습니다.");

    // Clean up markdown code blocks if present
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(jsonText);

    // Map ingredientDetails to simple ingredients array for backward compatibility
    const ingredients = data.ingredientDetails?.map((d: any) => d.name) || [];

    return {
      ...data,
      ingredients
    } as AIAnalysisResult;

  } catch (error: any) {
    console.error("Gemini Analysis Failed Detailed Error:", error);
    return {
      foodName: "분석 실패",
      calories: 0,
      carbs: 0,
      protein: 0,
      fat: 0,
      description: `분석 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
      ingredients: [],
      ingredientDetails: [],
      aiTip: "콘솔 로그를 확인하거나 API 키 설정을 점검해주세요."
    };
  }
};

export const recalculateNutrition = async (base64Image: string, ingredients: string[]): Promise<NutritionInfo> => {
  const ai = getAiInstance();

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
      model: 'gemini-1.5-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            { text: prompt }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema as any
      }
    } as any);

    let jsonText = response.text || "";
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
