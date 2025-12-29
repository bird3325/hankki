
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// .env 또는 .env.local 로드
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;

async function diagnose() {
    console.log("--- Gemini API 진단 시작 ---");

    if (!apiKey) {
        console.error("오류: API Key를 찾을 수 없습니다. .env 파일을 확인해 주세요.");
        return;
    }

    console.log("1. API Key 감지됨 (길이: " + apiKey.length + ")");

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log("2. 가용 모델 목록 요청 중...");
        // @ts-ignore - listModels might not be in all type definitions but exists in the client
        const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // 실제 모델 리스트를 가져오는 공식 API 호출 시도 (네트워크 연결 테스트)
        console.log("3. 모델 연결 테스트 (gemini-1.5-flash)...");
        const result = await models.generateContent("Hello, are you available?");
        console.log("결과: 성공! 모델이 정상적으로 응답합니다.");
        console.log("응답 내용:", result.response.text());
    } catch (error: any) {
        console.error("4. 오류 발생!");
        console.error("에러 메시지:", JSON.stringify(error, null, 2));

        if (error.message?.includes("404")) {
            console.log("\n--- 상세 솔루션 ---");
            console.log("404 오류는 '모델을 찾을 수 없음'을 의미합니다.");
            console.log("원인 1: API Key가 특정 리전(국가)에서 제한됨.");
            console.log("원인 2: API Key에 해당 모델 사용 권한이 활성화되지 않음.");
            console.log("해결 방법: AI Studio에서 새 API Key를 발급받아 보세요.");
        }
    }
}

diagnose();
