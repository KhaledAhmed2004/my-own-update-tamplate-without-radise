/**
 * User-Agent Rotation System
 * Anti-bot detection এড়াতে বিভিন্ন browser এর User-Agent ব্যবহার করা হয়
 */

// Latest User Agents (Updated 2024)
const USER_AGENTS = {
  // Chrome on Windows (Most common)
  chromeWindows: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  ],

  // Chrome on Mac
  chromeMac: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  ],

  // Firefox on Windows
  firefoxWindows: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  ],

  // Firefox on Mac
  firefoxMac: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  ],

  // Edge on Windows
  edgeWindows: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
  ],

  // Safari on Mac
  safariMac: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  ],
};

// All User Agents in a flat array
const ALL_USER_AGENTS = Object.values(USER_AGENTS).flat();

/**
 * Get a random User-Agent string
 * র্যান্ডম User-Agent return করে detection এড়াতে
 */
export const getRandomUserAgent = (): string => {
  const index = Math.floor(Math.random() * ALL_USER_AGENTS.length);
  return ALL_USER_AGENTS[index];
};

/**
 * Get User-Agent by browser type
 * নির্দিষ্ট browser এর User-Agent পেতে
 */
export const getUserAgentByBrowser = (
  browser: 'chrome' | 'firefox' | 'edge' | 'safari' = 'chrome'
): string => {
  let agents: string[];

  switch (browser) {
    case 'chrome':
      agents = [...USER_AGENTS.chromeWindows, ...USER_AGENTS.chromeMac];
      break;
    case 'firefox':
      agents = [...USER_AGENTS.firefoxWindows, ...USER_AGENTS.firefoxMac];
      break;
    case 'edge':
      agents = USER_AGENTS.edgeWindows;
      break;
    case 'safari':
      agents = USER_AGENTS.safariMac;
      break;
    default:
      agents = ALL_USER_AGENTS;
  }

  return agents[Math.floor(Math.random() * agents.length)];
};

/**
 * Get default User-Agent (Chrome on Windows - most common)
 */
export const getDefaultUserAgent = (): string => {
  return USER_AGENTS.chromeWindows[0];
};

/**
 * Get all available User-Agents
 */
export const getAllUserAgents = (): string[] => {
  return [...ALL_USER_AGENTS];
};

export const userAgentHelper = {
  getRandomUserAgent,
  getUserAgentByBrowser,
  getDefaultUserAgent,
  getAllUserAgents,
};
