
import { analyzeImageWithGemini, analyzeImageWithGrok } from "../src/lib/ocr";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
    try {
        const imagePath = path.resolve(__dirname, "../public/uploads/17b211b9-f719-4248-95f6-67f4aba081d6.jpeg");

        if (!fs.existsSync(imagePath)) {
            console.error("Test image not found at:", imagePath);
            return;
        }

        console.log("Reading test image...");
        const buffer = fs.readFileSync(imagePath);

        console.log("Testing analyzeImageWithGemini (gemini-3.8-flash)...");
        const geminiResult = await analyzeImageWithGemini(buffer);
        console.log("GEMINI SUCCESS! Result:", JSON.stringify(geminiResult, null, 2));

        console.log("Testing analyzeImageWithGrok (grok-4.7)...");
        const grokResult = await analyzeImageWithGrok(buffer);
        console.log("GROK SUCCESS! Result:", JSON.stringify(grokResult, null, 2));
    } catch (error) {
        console.error("FAILED:", error);
    }
}

main();
