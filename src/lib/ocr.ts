
import { GoogleGenerativeAI, SchemaType, type GenerationConfig } from "@google/generative-ai";
import {
    GEMINI_FALLBACK_TIMEOUT_MS,
    GEMINI_PRIMARY_TIMEOUT_MS,
    GROK_REQUEST_TIMEOUT_MS,
    isGeminiCapacityError,
    receiptThinkingConfig,
} from "./analysisLimits";
import { ALL_CATEGORIES } from "./categories";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
/** Stable, low-latency model with image input and structured JSON. Not the overloaded 3.8 Flash tier. */
export const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";

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
        const modelName = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
        const model = genAI.getGenerativeModel({ model: modelName });

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

const SLIP_PROMPT = `
            Analyze this receipt/slip and extract the following information in JSON format:
            - place: The name of the merchant or place.
            - date: The date of the transaction (YYYY-MM-DD format if possible).
            - amountAfterTax: The total amount paid (number).
            - currency: The currency symbol (e.g., R, $, €).
            - summary: A brief summary of the items purchased (max 200 chars).
            - tag: Choose EXACTLY ONE category from this list: ${ALL_CATEGORIES.join(", ")}.
            
            Return ONLY the JSON object conforming to the schema.
        `;

function geminiErrorDetail(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
}

function slipGenerationConfig(modelName: string): GenerationConfig {
    const generationConfig: GenerationConfig = {
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
                    enum: ALL_CATEGORIES
                }
            },
            required: ["place", "date", "amountAfterTax", "currency", "summary", "tag"]
        }
    };
    // The SDK JSON-encodes this object as-is.
    const thinking = receiptThinkingConfig(modelName);
    if (thinking) {
        (generationConfig as GenerationConfig & { thinkingConfig: { thinkingLevel: "low" } }).thinkingConfig = thinking;
    }
    return generationConfig;
}

async function requestSlipFromGemini(
    apiKey: string,
    modelName: string,
    buffer: Buffer,
    mimeType: string,
    timeoutMs: number
): Promise<SlipData> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel(
        { model: modelName, generationConfig: slipGenerationConfig(modelName) },
        { timeout: timeoutMs }
    );
    const result = await model.generateContent([
        SLIP_PROMPT,
        {
            inlineData: {
                data: buffer.toString("base64"),
                mimeType: mimeType || "image/jpeg",
            },
        },
    ]);
    const text = result.response.text();
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedText) as SlipData;
}

export async function analyzeImageWithGemini(buffer: Buffer, mimeType: string = "image/jpeg"): Promise<SlipData> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Gemini Analysis Failed: No Google AI API Key found in environment variables");
    }

    const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
    const fallback = process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_GEMINI_FALLBACK_MODEL;

    try {
        return await requestSlipFromGemini(apiKey, primary, buffer, mimeType, GEMINI_PRIMARY_TIMEOUT_MS);
    } catch (primaryError) {
        const primaryDetail = geminiErrorDetail(primaryError);
        if (!isGeminiCapacityError(primaryError) || fallback === primary) {
            console.error("Gemini Analysis Failed:", primaryError);
            throw new Error(`Gemini Analysis Failed: ${primaryDetail}`);
        }

        console.error(`Gemini model ${primary} unavailable. Trying ${fallback}.`, primaryError);
        try {
            return await requestSlipFromGemini(apiKey, fallback, buffer, mimeType, GEMINI_FALLBACK_TIMEOUT_MS);
        } catch (fallbackError) {
            const fallbackDetail = geminiErrorDetail(fallbackError);
            console.error(`Gemini fallback ${fallback} failed:`, fallbackError);
            throw new Error(
                `Gemini Analysis Failed: ${primary} failed: ${primaryDetail}. ${fallback} failed: ${fallbackDetail}.`
            );
        }
    }
}

export async function analyzeImageWithGrok(buffer: Buffer, mimeType: string = "image/jpeg"): Promise<SlipData> {
    try {
        const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
        if (!apiKey) {
            throw new Error("No xAI / Grok API Key found in environment variables");
        }

        const modelName = process.env.XAI_MODEL || "grok-4.7";
        const base64Image = buffer.toString("base64");
        const validMimeType = mimeType || "image/jpeg";

        const prompt = `
            Analyze this receipt/slip and extract the following information in JSON format:
            - place: The name of the merchant or place.
            - date: The date of the transaction (YYYY-MM-DD format if possible).
            - amountAfterTax: The total amount paid (number).
            - currency: The currency symbol (e.g., R, $, €).
            - summary: A brief summary of the items purchased (max 200 chars).
            - tag: Choose EXACTLY ONE category from this list: ${ALL_CATEGORIES.join(", ")}.
            
            Return ONLY a valid JSON object. Do not include markdown code block formatting (no \`\`\`json).
        `;

        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            signal: AbortSignal.timeout(GROK_REQUEST_TIMEOUT_MS),
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
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText) as SlipData;

    } catch (error: unknown) {
        console.error("Grok Analysis Failed:", error);
        const detail = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Grok Analysis Failed: ${detail}`);
    }
}

// Kept for backward compatibility if needed, but Gemini does this better
export function parseSlipDetails(text: string): SlipData {
    // This is now a fallback or utility if we only have text
    return {};
}
