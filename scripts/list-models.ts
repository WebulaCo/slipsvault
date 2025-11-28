
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

// Try to load from .env or vercel.env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "vercel.env") });

async function main() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Error: No API key found in .env or vercel.env");
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log("Fetching available models...");
        // Note: listModels is not directly on genAI instance in some versions, 
        // but usually accessible via the API. 
        // The SDK might not expose listModels directly on the main class in all versions.
        // Let's try to get a model and see if we can list from there or use the model manager if available.
        // Actually, for the JS SDK, it's often just getting a model. 
        // But there isn't a simple "listModels" helper in the basic usage.
        // We might need to make a raw REST call if the SDK doesn't support it easily.

        // Let's try a raw fetch to be sure.
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach((m: any) => {
                if (m.name.includes("gemini")) {
                    console.log(`- ${m.name} (Supported methods: ${m.supportedGenerationMethods.join(", ")})`);
                }
            });
        } else {
            console.error("Failed to list models:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

main();
