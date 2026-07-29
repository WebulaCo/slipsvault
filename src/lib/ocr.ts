
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { retryWithBackoff } from "./utils";

interface SlipData {
    place?: string;
    date?: string;
    amountAfterTax?: number;
    currency?: string;
    summary?: string;
    tag?: string;
}

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
    // This function is kept for backward compatibility or raw text needs,
    // but we'll primarily use analyzeImageWithGemini for structured data.
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("No Google AI API Key found in environment variables");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

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
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("No Google AI API Key found in environment variables");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Use a model capable of vision and JSON output
        const model = genAI.getGenerativeModel({
            model: "gemini-3.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        place: { type: SchemaType.STRING },
                        date: { type: SchemaType.STRING },
                        amountAfterTax: { type: SchemaType.NUMBER },
                        currency: { type: SchemaType.STRING },
                        summary: { type: SchemaType.STRING },
                        tag: {
                            type: SchemaType.STRING,
                            format: "enum",
                            enum: [
                                "Food",
                                "Transport",
                                "Groceries",
                                "Utilities",
                                "Shopping",
                                "Health",
                                "Entertainment",
                                "Travel",
                                "Office Supplies",
                                "Accommodation",
                                "Other"
                            ]
                        }
                    },
                    required: ["place", "date", "amountAfterTax", "currency", "summary", "tag"]
                }
            }
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
            - tag: Choose EXACTLY ONE category from this list: Food, Transport, Groceries, Utilities, Shopping, Health, Entertainment, Travel, Office Supplies, Accommodation, Other.
            
            Return ONLY the JSON object conforming to the schema.
        `;

        const result = await retryWithBackoff(async () => {
            return await model.generateContent([prompt, imagePart]);
        }, 5, 2000);

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

export async function analyzeImageWithGrok(buffer: Buffer, mimeType: string = "image/jpeg"): Promise<SlipData> {
    try {
        const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
        if (!apiKey) {
            throw new Error("No xAI / Grok API Key found in environment variables");
        }

        const modelName = process.env.XAI_MODEL || "grok-2-vision-1212";
        const base64Image = buffer.toString("base64");
        const validMimeType = mimeType || "image/jpeg";

        const prompt = `
            Analyze this receipt/slip and extract the following information in JSON format:
            - place: The name of the merchant or place.
            - date: The date of the transaction (YYYY-MM-DD format if possible).
            - amountAfterTax: The total amount paid (number).
            - currency: The currency symbol (e.g., R, $, €).
            - summary: A brief summary of the items purchased (max 200 chars).
            - tag: Choose EXACTLY ONE category from this list: Food, Transport, Groceries, Utilities, Shopping, Health, Entertainment, Travel, Office Supplies, Accommodation, Other.
            
            Return ONLY a valid JSON object. Do not include markdown code block formatting (no \`\`\`json).
        `;

        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${validMimeType};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`xAI API returned status ${response.status}: ${errBody}`);
        }

        const responseData = await response.json();
        const text = responseData.choices[0].message.content;
        return JSON.parse(text) as SlipData;

    } catch (error: any) {
        console.error("Grok Analysis Failed:", error);
        const errorMessage = error?.message || "Unknown error";
        throw new Error(`Grok Analysis Failed: ${errorMessage}`);
    }
}

// Kept for backward compatibility if needed, but Gemini does this better
export function parseSlipDetails(text: string): SlipData {
    // This is now a fallback or utility if we only have text
    return {};
}
