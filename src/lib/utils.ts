
/**
 * Retries a function with exponential backoff.
 * 
 * @param fn The async function to retry.
 * @param retries Maximum number of retries.
 * @param initialDelay Initial delay in milliseconds.
 * @param factor Multiplier for the delay each retry.
 * @returns The result of the function.
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    initialDelay: number = 2000,
    factor: number = 2
): Promise<T> {
    let currentRetries = 0;
    let delay = initialDelay;

    while (true) {
        try {
            return await fn();
        } catch (error: any) {
            currentRetries++;
            
            // Check if we should retry
            const isRateLimit = 
                error?.status === 429 || 
                (error?.message && error.message.includes("429")) ||
                (error?.message && error.message.includes("Quota exceeded"));

            if (!isRateLimit || currentRetries > retries) {
                throw error;
            }

            console.warn(`Retry attempt ${currentRetries} failed with error: ${error.message}. Retrying in ${delay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= factor;
        }
    }
}
