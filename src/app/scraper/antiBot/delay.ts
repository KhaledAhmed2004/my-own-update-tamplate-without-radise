/**
 * Delay & Timing Utilities
 * Human-like behavior simulate করতে random delays ব্যবহার করা হয়
 */

/**
 * Sleep for specified milliseconds
 * নির্দিষ্ট সময়ের জন্য wait করে
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Random delay between min and max milliseconds
 * Bot detection এড়াতে random delay দেয় (human-like behavior)
 *
 * @param min - Minimum delay in ms (default: 1000)
 * @param max - Maximum delay in ms (default: 3000)
 */
export const randomDelay = async (min = 1000, max = 3000): Promise<number> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await sleep(delay);
  return delay;
};

/**
 * Exponential backoff delay for retries
 * Retry করার সময় exponentially বাড়তে থাকে delay
 *
 * @param attempt - Current attempt number (1-based)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @param maxDelay - Maximum delay cap in ms (default: 30000)
 */
export const exponentialBackoff = async (
  attempt: number,
  baseDelay = 1000,
  maxDelay = 30000
): Promise<number> => {
  // Calculate delay: baseDelay * 2^(attempt-1) with some randomness
  const calculatedDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * calculatedDelay; // Add 0-30% jitter
  const delay = Math.min(calculatedDelay + jitter, maxDelay);

  await sleep(delay);
  return Math.round(delay);
};

/**
 * Human-like typing delay
 * টাইপিং simulate করতে (future use)
 */
export const typingDelay = async (text: string): Promise<void> => {
  // Average human types 40-60 WPM, roughly 200-300ms per character
  const delayPerChar = Math.random() * 100 + 50; // 50-150ms per char
  await sleep(text.length * delayPerChar);
};

/**
 * Page scroll delay
 * Scroll করার পর content load হওয়ার জন্য wait
 */
export const scrollDelay = async (): Promise<void> => {
  // Wait 500-1500ms after scroll for content to load
  await randomDelay(500, 1500);
};

export const delayHelper = {
  sleep,
  randomDelay,
  exponentialBackoff,
  typingDelay,
  scrollDelay,
};
