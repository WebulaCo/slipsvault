export type SaveAndAnalyzeOutcome<T> =
    | { ok: true; url: string; result: T }
    | { ok: false; url?: string; error: unknown };

function asPromise<T>(start: () => Promise<T>): Promise<T> {
    try {
        return Promise.resolve(start());
    } catch (error) {
        return Promise.reject(error);
    }
}

/**
 * Run the storage upload and the AI analysis at the same time.
 * The upload used to finish before analysis started, so the user waited for both in series.
 *
 * Save still has to succeed before the call is a success. If analysis fails and the
 * file was stored, the saved url is returned with the analysis error.
 */
export async function saveAndAnalyze<T>(options: {
    save: () => Promise<string>;
    analyze: () => Promise<T>;
}): Promise<SaveAndAnalyzeOutcome<T>> {
    const savePromise = asPromise(options.save);
    const analyzePromise = asPromise(options.analyze);

    const [saveOutcome, analyzeOutcome] = await Promise.allSettled([
        savePromise,
        analyzePromise,
    ]);

    if (saveOutcome.status === "rejected") {
        return { ok: false, error: saveOutcome.reason };
    }

    if (analyzeOutcome.status === "rejected") {
        return {
            ok: false,
            url: saveOutcome.value,
            error: analyzeOutcome.reason,
        };
    }

    return {
        ok: true,
        url: saveOutcome.value,
        result: analyzeOutcome.value,
    };
}
