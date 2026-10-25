/**
 * Per-call budgets. Primary + fallback + Grok is 12s + 15s + 12s = 39s,
 * inside the 45s client cap. The photo save runs at the same time.
 */
export const GEMINI_PRIMARY_TIMEOUT_MS = 12_000;
export const GEMINI_FALLBACK_TIMEOUT_MS = 15_000;
export const GROK_REQUEST_TIMEOUT_MS = 12_000;
export const PHOTO_SAVE_TIMEOUT_MS = 20_000;

/**
 * Backstop when the server action itself never settles.
 * Must stay above the three model attempts added together.
 */
export const CLIENT_ANALYSIS_TIMEOUT_MS = 45_000;

export const ANALYSIS_GAVE_UP_MESSAGE =
    "This is taking longer than it should. You can add the slip details below yourself.";

/**
 * Gemini 3 and 4 Flash default to medium thinking. Receipt extraction uses low.
 * Flash-Lite defaults to minimal, which is the fast setting, so it is left unset.
 * "minimal" is rejected by Gemini 3.8 Flash. Older ids are left alone.
 */
export function receiptThinkingConfig(modelName: string): { thinkingLevel: "low" } | undefined {
    if (/flash-lite/i.test(modelName)) return undefined;
    if (/^gemini-[34](?:[.-]|$)/.test(modelName)) {
        return { thinkingLevel: "low" };
    }
    return undefined;
}

/** 503, overload, 429, or a timeout. These should try another model, not the same one again. */
export function isGeminiCapacityError(error: unknown): boolean {
    if (isTimeoutError(error)) return true;
    const message = error instanceof Error ? error.message : String(error ?? "");
    return /\b503\b/.test(message)
        || /\b429\b/.test(message)
        || /high demand/i.test(message)
        || /overload/i.test(message)
        || /service unavailable/i.test(message)
        || /quota exceeded/i.test(message);
}

export function isTimeoutError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? "");
    return /timed out|timeout|aborted|abort/i.test(message);
}

/** Rejects when `promise` does not settle in time. The original call is left running. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(message));
        }, ms);

        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error: unknown) => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });
}
