
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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

  // API 버전을 v1으로 명시적으로 고정하여 v1beta 404 오류 해결 시도
  return new GoogleGenerativeAI(apiKey);
};

export const analyzeFoodImage = async (base64Image: string, location?: { latitude: number; longitude: number }): Promise<AIAnalysisResult> => {
  try {
    const genAI = getAiInstance();
    // 가장 표준적인 모델 명칭 사용 (models/ 접두어 없이 시도)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: "You are a professional nutritionist. Analyze food images and provide detailed nutritional information. Always respond in Korean (Hangul).",
    });

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
      type: SchemaType.OBJECT,
      properties: {
        foodName: { type: SchemaType.STRING },
        calories: { type: SchemaType.NUMBER },
        carbs: { type: SchemaType.NUMBER },
        protein: { type: SchemaType.NUMBER },
        fat: { type: SchemaType.NUMBER },
        description: { type: SchemaType.STRING },
        ingredientDetails: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              nutritionEstimate: { type: SchemaType.STRING },
              benefit: { type: SchemaType.STRING }
            },
            required: ["name", "nutritionEstimate", "benefit"]
          }
        },
        aiTip: { type: SchemaType.STRING },
        locationName: { type: SchemaType.STRING },
        locationType: { type: SchemaType.STRING }
      },
      required: ["foodName", "calories", "carbs", "protein", "fat", "description", "ingredientDetails", "aiTip"]
    };

    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: schema as any,
    };

    const result = await model.generateContent({
      contents: [{
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
      }],
      generationConfig,
    });

    const response = await result.response;
    let jsonText = response.text();

    if (!jsonText) throw new Error("AI로부터 응답 텍스트를 받지 못했습니다.");

    // Clean up markdown code blocks if present (though responseMimeType should handle it)
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(jsonText);
    const ingredients = data.ingredientDetails?.map((d: any) => d.name) || [];

    return {
      ...data,
      ingredients
    } as AIAnalysisResult;

  } catch (error: any) {
    console.error("Gemini Analysis Failed Detailed Error:", error);

    // Check for specific NOT_FOUND error to provide better guidance
    let errorMessage = error.message || '알 수 없는 오류';
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      errorMessage = "모델(gemini-1.5-flash)을 찾을 수 없습니다. (404 오류)";
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
      aiTip: "해결 가이드: 1. AI Studio(aistudio.google.com)에서 'Gemini 1.5 Flash' 모델이 활성화된 새 키를 발급받아 보세요. 2. .env.local 파일의 VITE_GEMINI_API_KEY 값을 새 키로 교체하고 서버를 재시작해 주세요."
    };
  }
};

export const recalculateNutrition = async (base64Image: string, ingredients: string[]): Promise<NutritionInfo> => {
  try {
    const genAI = getAiInstance();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze this food image again, focusing specifically on these ingredients provided by the user: ${ingredients.join(', ')}.
      Recalculate the total calories and macronutrients for the entire serving shown.
      Output ONLY a JSON object.
    `;

    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        calories: { type: SchemaType.NUMBER },
        carbs: { type: SchemaType.NUMBER },
        protein: { type: SchemaType.NUMBER },
        fat: { type: SchemaType.NUMBER },
      },
      required: ["calories", "carbs", "protein", "fat"]
    };

    const result = await model.generateContent({
      contents: [{
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
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema as any,
      },
    });

    const response = await result.response;
    const jsonText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
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
