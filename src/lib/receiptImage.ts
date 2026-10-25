/** Longest side of the JPEG uploaded for receipt OCR. */
export const RECEIPT_UPLOAD_MAX_EDGE = 1600;

/** JPEG quality for that upload. High enough for receipt text, much smaller than a phone photo. */
export const RECEIPT_UPLOAD_JPEG_QUALITY = 0.8;

/**
 * Scale a crop so its longest side is at most `maxEdge` pixels.
 * Smaller crops are left as they are (never upscaled).
 */
export function fitWithinLongestEdge(
    width: number,
    height: number,
    maxEdge: number = RECEIPT_UPLOAD_MAX_EDGE
): { width: number; height: number } {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    const longest = Math.max(safeWidth, safeHeight);

    if (longest <= maxEdge) {
        return {
            width: Math.max(1, Math.round(safeWidth)),
            height: Math.max(1, Math.round(safeHeight)),
        };
    }

    const scale = maxEdge / longest;
    return {
        width: Math.max(1, Math.round(safeWidth * scale)),
        height: Math.max(1, Math.round(safeHeight * scale)),
    };
}

/**
 * Draw the selected crop onto `canvas`, scaled down for upload.
 * Returns null when the canvas cannot be used.
 */
export function drawScaledCrop(
    image: CanvasImageSource,
    imageWidth: number,
    imageHeight: number,
    cropPercent: { x: number; y: number; w: number; h: number },
    canvas: HTMLCanvasElement
): { width: number; height: number } | null {
    const cropX = (cropPercent.x / 100) * imageWidth;
    const cropY = (cropPercent.y / 100) * imageHeight;
    const cropW = (cropPercent.w / 100) * imageWidth;
    const cropH = (cropPercent.h / 100) * imageHeight;
    const fitted = fitWithinLongestEdge(cropW, cropH);

    canvas.width = fitted.width;
    canvas.height = fitted.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
        image,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        fitted.width,
        fitted.height
    );

    return fitted;
}
