
import { createWorker } from 'tesseract.js';
import path from 'path';
import os from 'os';

interface SlipData {
    place?: string;
    date?: string;
    amountAfterTax?: number;
    currency?: string;
    summary?: string;
    tags?: string[];
}

// Keyword mapping for auto-tagging
const TAG_KEYWORDS: Record<string, string[]> = {
    'Food': ['restaurant', 'cafe', 'coffee', 'burger', 'pizza', 'lunch', 'dinner', 'breakfast', 'starbucks', 'mcdonalds', 'kfc', 'subway', 'dining'],
    'Groceries': ['supermarket', 'grocery', 'market', 'woolworths', 'coles', 'aldi', 'spar', 'checkers', 'pick n pay'],
    'Transport': ['uber', 'taxi', 'cab', 'train', 'bus', 'fuel', 'petrol', 'gas', 'shell', 'bp', 'caltex', 'engien', 'total'],
    'Utilities': ['water', 'electricity', 'power', 'gas', 'internet', 'phone', 'telkom', 'vodacom', 'mtn'],
    'Shopping': ['mall', 'clothing', 'apparel', 'shoes', 'retail', 'store'],
    'Health': ['pharmacy', 'doctor', 'hospital', 'clinic', 'clicks', 'dis-chem', 'medical'],
    'Entertainment': ['cinema', 'movie', 'theatre', 'concert', 'netflix', 'spotify'],
    'Travel': ['hotel', 'airbnb', 'flight', 'airline', 'booking', 'accommodation']
};

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
    let worker;
    try {
        // Use /tmp for cache to avoid permission issues in serverless/restricted environments
        const cachePath = path.join(os.tmpdir(), 'tesseract-cache');

        // Ensure the directory exists (optional, tesseract might create it)
        // const fs = require('fs');
        // if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

        // Explicitly set worker path to avoid resolution issues in Next.js
        const workerPath = path.join(process.cwd(), 'node_modules', 'tesseract.js', 'src', 'worker-script', 'node', 'index.js');

        worker = await createWorker('eng', 1, {
            cachePath,
            workerPath,
            logger: m => {
                // Only log progress in development to avoid cluttering production logs
                if (process.env.NODE_ENV === 'development') {
                    console.log(m);
                }
            }
        });

        const { data: { text } } = await worker.recognize(buffer);
        return text;
    } catch (error) {
        console.error("OCR Extraction Failed:", error);
        throw new Error("Failed to extract text from image");
    } finally {
        if (worker) {
            await worker.terminate();
        }
    }
}

export function generateTagsFromText(text: string): string[] {
    const lowerText = text.toLowerCase();
    const tags = new Set<string>();

    for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            tags.add(tag);
        }
    }

    return Array.from(tags);
}

export function parseSlipDetails(text: string): SlipData {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const data: SlipData = {};

    // 1. Attempt to find Total Amount
    const amountRegex = /(\d+[.,]\d{2})/g;
    let maxAmount = 0;

    const potentialAmounts = text.match(amountRegex);
    if (potentialAmounts) {
        potentialAmounts.forEach(match => {
            const val = parseFloat(match.replace(',', '.'));
            if (!isNaN(val) && val > maxAmount) {
                maxAmount = val;
            }
        });
    }

    if (maxAmount > 0) {
        data.amountAfterTax = maxAmount;
    }

    // 2. Attempt to find Date
    const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})|(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
        try {
            const dateStr = dateMatch[0];
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                data.date = date.toISOString().split('T')[0];
            }
        } catch (e) {
            console.warn("Failed to parse date:", dateMatch[0]);
        }
    }

    // 3. Attempt to find Place / Merchant
    for (const line of lines) {
        if (line.length > 3 && !line.match(dateRegex) && isNaN(parseFloat(line))) {
            data.place = line;
            break;
        }
    }

    // 4. Currency
    if (text.includes('$')) data.currency = '$';
    else if (text.includes('€')) data.currency = '€';
    else if (text.includes('£')) data.currency = '£';
    else if (text.includes('R')) data.currency = 'R'; // ZAR
    else data.currency = '$'; // Default

    // 5. Summary
    data.summary = text.substring(0, 200) + (text.length > 200 ? '...' : '');

    // 6. Tags
    data.tags = generateTagsFromText(text);

    return data;
}
