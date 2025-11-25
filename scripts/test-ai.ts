import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

async function main() {
    const modelName = "gemini-2.0-flash";
    console.log(`Testing model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you working?");
        console.log(`SUCCESS (${modelName}):`, result.response.text());
    } catch (error: any) {
        console.error(`FAILED (${modelName}):`, error.message);
    }
}

main();
