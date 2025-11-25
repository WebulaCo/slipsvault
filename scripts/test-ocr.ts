
import { extractTextFromImage, parseSlipDetails } from '../src/lib/ocr';
import fs from 'fs';
import path from 'path';

async function main() {
    const imagePath = '/Users/raymondswart/.gemini/antigravity/brain/35b5a7a1-19af-44f4-b3d2-92e2057d25c1/uploaded_image_1_1764052709196.jpg';

    console.log(`Reading image from: ${imagePath}`);

    try {
        if (!fs.existsSync(imagePath)) {
            console.error('Image file not found!');
            process.exit(1);
        }

        const buffer = fs.readFileSync(imagePath);
        console.log(`Image read, size: ${buffer.length} bytes`);

        console.log('Starting OCR extraction...');
        const startTime = Date.now();

        const text = await extractTextFromImage(buffer);

        const endTime = Date.now();
        console.log(`OCR completed in ${(endTime - startTime) / 1000}s`);

        console.log('--- Extracted Text ---');
        console.log(text);
        console.log('----------------------');

        console.log('Parsing details...');
        const details = parseSlipDetails(text);
        console.log('Parsed Details:', JSON.stringify(details, null, 2));

    } catch (error) {
        console.error('Error during OCR test:', error);
    }
}

main();
