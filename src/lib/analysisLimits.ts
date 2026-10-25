/** Per-call budgets. A stuck model or upload must reject instead of leaving the spinner up. */
export const GEMINI_REQUEST_TIMEOUT_MS = 20_000;
export const GROK_REQUEST_TIMEOUT_MS = 20_000;
export const PHOTO_SAVE_TIMEOUT_MS = 20_000;

/**
 * Longer than one Gemini attempt plus a Grok fallback, so a real server error
 * can arrive before the phone gives up. The client timer is the backstop when
 * the server action itself never settles.
 */
export const CLIENT_ANALYSIS_TIMEOUT_MS = 45_000;

export const ANALYSIS_GAVE_UP_MESSAGE =
    "This is taking longer than it should. You can add the slip details below yourself.";

/**
 * Gemini 3 and 4 think at "medium" unless a level is set. That default is aimed
 * at long agent tasks. Receipt extraction wants the low setting, which is the
 * supported latency option. "minimal" is rejected by Gemini 3.8 Flash.
 * Older model ids are left alone so an explicit GEMINI_MODEL override still works.
 */
export function receiptThinkingConfig(modelName: string): { thinkingLevel: "low" } | undefined {
    if (/^gemini-[34](?:[.-]|$)/.test(modelName)) {
        return { thinkingLevel: "low" };
    }
    return undefined;
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
