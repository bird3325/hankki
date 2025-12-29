
import { GoogleGenAI } from "@google/genai";
import { NutritionInfo, DetailedIngredient } from "../types";

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

const getAiClient = () => {
  let apiKey: string | undefined;

  // 1. Try Vite environment variable (most likely for this project)
  // Note: parsing import.meta as any to avoid type issues if types aren't fully set up
  if ((import.meta as any).env?.VITE_GEMINI_API_KEY) {
    apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
  }

  // 2. Fallback: Check process.env safely (for Node.js or compatible environments)
  if (!apiKey && typeof process !== 'undefined' && process.env) {
    apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  }

  if (!apiKey || apiKey === "undefined" || apiKey === '""') {
    throw new Error("정상적인 API Key를 찾을 수 없습니다. .env.local 파일에 VITE_GEMINI_API_KEY=your_key_here 형식을 입력했는지 확인해주세요. (참고: 배포 환경에서는 환경 변수가 빌드 시점에 설정되어야 할 수 있습니다.)");
  }

  return new GoogleGenAI({ apiKey });
};

export const analyzeFoodImage = async (base64Image: string, location?: { latitude: number; longitude: number }): Promise<AIAnalysisResult> => {
  try {
    const ai = getAiClient();
    const isLocationEnabled = !!location;

    const prompt = `
      Analyze this food image. 
      Identify the main dish or dishes.
      Estimate the total calories and macronutrients (carbohydrates, protein, fat) for the entire serving shown.
      Break down the main ingredients and provide nutritional insights for each.
      
      ${isLocationEnabled ? "Using the provided location data, identify if this is a restaurant or home. If it is a restaurant, try to identify the specific restaurant name." : ""}

      Return the response as a JSON object with the following fields:
      - foodName: Simple name of the dish.
      - description: A short, neutral description.
      - ingredientDetails: A list of objects with {name, nutritionEstimate, benefit}.
      - aiTip: Warm, helpful nutritional advice (max 2 sentences).
      - calories, carbs, protein, fat: Total numeric values for the meal.
      ${isLocationEnabled ? "- locationName: restaurant name or '집밥'\n- locationType: 'restaurant', 'home', or 'other'." : ""}
    `;

    const schema = {
      type: 'OBJECT',
      properties: {
        foodName: { type: 'STRING' },
        calories: { type: 'NUMBER' },
        carbs: { type: 'NUMBER' },
        protein: { type: 'NUMBER' },
        fat: { type: 'NUMBER' },
        description: { type: 'STRING' },
        ingredientDetails: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              nutritionEstimate: { type: 'STRING' },
              benefit: { type: 'STRING' }
            },
            required: ["name", "nutritionEstimate", "benefit"]
          }
        },
        aiTip: { type: 'STRING' },
        locationName: { type: 'STRING' },
        locationType: { type: 'STRING' }
      },
      required: ["foodName", "calories", "carbs", "protein", "fat", "description", "ingredientDetails", "aiTip"]
    };


    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
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
        systemInstruction: "You are a professional nutritionist. Analyze food images and provide detailed nutritional information. Always respond in Korean (Hangul). For 'nutritionEstimate', provide a VERY SHORT tag (max 10 characters, e.g., '고단백', '비타민C', '저칼로리'). Put detailed info in 'benefit'.",
        responseMimeType: "application/json",
        responseSchema: schema as any,
      }
    });

    console.log("Gemini Response:", response); // Debug log

    // Handle response structure depending on SDK version
    const candidates = response.candidates;
    if (!candidates || !candidates.length) {
      throw new Error("AI로부터 응답(candidates)을 받지 못했습니다.");
    }

    const textPart = candidates[0].content?.parts?.[0]?.text;
    if (!textPart) {
      throw new Error("AI 응답에서 텍스트를 추출할 수 없습니다.");
    }

    const data = JSON.parse(textPart);
    const ingredients = data.ingredientDetails?.map((d: any) => d.name) || [];

    return {
      ...data,
      ingredients
    } as AIAnalysisResult;

  } catch (error: any) {
    console.error("Gemini Analysis Failed Detailed Error:", error);

    let errorMessage = error.message || '알 수 없는 오류';
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      errorMessage = "모델(gemini-2.0-flash)을 찾을 수 없습니다. (404 오류)";
    }

    return {
      foodName: "분석 실패",
      calories: 0,
      carbs: 0,
      protein: 0,
      fat: 0,
      description: `분석 중 오류가 발생했습니다: ${errorMessage}`,
      ingredients: [],
      ingredientDetails: [],
      aiTip: "해결 가이드: 1. AI Studio(aistudio.google.com)에서 API 키를 확인해주세요. 2. .env.local 파일의 VITE_GEMINI_API_KEY 값을 확인하고 서버를 재시작해 주세요."
    };
  }
};

export const recalculateNutrition = async (base64Image: string, ingredients: string[]): Promise<NutritionInfo> => {
  try {
    const ai = getAiClient();

    const prompt = `
      Analyze this food image again, focusing specifically on these ingredients provided by the user: ${ingredients.join(', ')}.
      Recalculate the total calories and macronutrients for the entire serving shown.
      Output ONLY a JSON object.
    `;

    const schema = {
      type: 'OBJECT',
      properties: {
        calories: { type: 'NUMBER' },
        carbs: { type: 'NUMBER' },
        protein: { type: 'NUMBER' },
        fat: { type: 'NUMBER' },
      },
      required: ["calories", "carbs", "protein", "fat"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
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
        responseSchema: schema as any,
      },
    });

    console.log("Gemini Recalculate Response:", response); // Debug log

    const candidates = response.candidates;
    if (!candidates || !candidates.length) {
      throw new Error("AI로부터 응답(candidates)을 받지 못했습니다.");
    }

    const textPart = candidates[0].content?.parts?.[0]?.text;
    if (!textPart) {
      throw new Error("AI 응답에서 텍스트를 추출할 수 없습니다.");
    }

    const data = JSON.parse(textPart);

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
