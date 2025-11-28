
import { GoogleGenerativeAI } from "@google/generative-ai";

interface SlipData {
    place?: string;
    date?: string;
    amountAfterTax?: number;
    currency?: string;
    summary?: string;
    tags?: string[];
}

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
    // This function is kept for backward compatibility or raw text needs,
    // but we'll primarily use analyzeImageWithGemini for structured data.
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const imagePart = {
            inlineData: {
                data: buffer.toString("base64"),
                mimeType: "image/jpeg", // Assuming JPEG, but Gemini handles most common formats
            },
        };

        const result = await model.generateContent([
            "Extract all text from this image exactly as it appears.",
            imagePart,
        ]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini OCR Failed:", error);
        throw new Error("Failed to extract text from image using Gemini");
    }
}

export async function analyzeImageWithGemini(buffer: Buffer, mimeType: string = "image/jpeg"): Promise<SlipData> {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
        // Use a model capable of vision and JSON output
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const validMimeType = mimeType || "image/jpeg";

        const imagePart = {
            inlineData: {
                data: buffer.toString("base64"),
                mimeType: validMimeType,
            },
        };

        const prompt = `
            Analyze this receipt/slip and extract the following information in JSON format:
            - place: The name of the merchant or place.
            - date: The date of the transaction (YYYY-MM-DD format if possible).
            - amountAfterTax: The total amount paid (number).
            - currency: The currency symbol (e.g., R, $, €).
            - summary: A brief summary of the items purchased (max 200 chars).
            - tags: A list of categories for this expense (e.g., Food, Transport, Groceries, Utilities, Shopping, Health, Entertainment, Travel).
            
            Return ONLY the JSON object.
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Clean the text to ensure it's valid JSON (sometimes models add markdown code blocks)
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanedText) as SlipData;

    } catch (error: any) {
        console.error("Gemini Analysis Failed:", error);
        const errorMessage = error?.message || "Unknown error";
        throw new Error(`Gemini Analysis Failed: ${errorMessage}`);
    }
}

// Kept for backward compatibility if needed, but Gemini does this better
export function parseSlipDetails(text: string): SlipData {
    // This is now a fallback or utility if we only have text
    return {};
}
