// Global Configuration & API Management for 9Router AI
export const CONFIG = {
  APP_NAME: "FitCoach AI Tracker",
  VERSION: "1.0.0",
  // 9Router & XKiro AI configuration (Serverless Proxy /api/chat will handle secrets on backend)
  NINEROUTER_API_KEY: import.meta.env.NINEROUTER_API_KEY || import.meta.env.VITE_NINEROUTER_API_KEY || "",
  NINEROUTER_BASE_URL: import.meta.env.NINEROUTER_BASE_URL || import.meta.env.VITE_NINEROUTER_BASE_URL || "https://r7nnd8p.abc-tunnel.us/v1/chat/completions",
  
  // XKiro AI API configuration
  XKIRO_API_KEY: import.meta.env.XKIRO_API_KEY || import.meta.env.VITE_XKIRO_API_KEY || "",
  XKIRO_BASE_URL: import.meta.env.XKIRO_BASE_URL || import.meta.env.VITE_XKIRO_BASE_URL || "https://api.xkiro.com/v1/chat/completions",
  NINEROUTER_MODEL: import.meta.env.NINEROUTER_MODEL || import.meta.env.VITE_NINEROUTER_MODEL || "gemini/gemini-3.7-flash",
  XKIRO_MODEL: import.meta.env.XKIRO_MODEL || import.meta.env.VITE_XKIRO_MODEL || "deepseek/deepseek-v4-pro",
  DEFAULT_MODEL: import.meta.env.NINEROUTER_MODEL || import.meta.env.VITE_NINEROUTER_MODEL || "gemini/gemini-3.7-flash",
  SUPPORTED_MODELS: [
    // 1. Mistral AI
    { id: "mistralai/mistral-large-2512", name: "Mistral Large 2512 (Mistral AI)" },
    { id: "mistralai/mistral-medium-3.5", name: "Mistral Medium 3.5 (Mistral AI)" },
    { id: "mistralai/mistral-small-2603", name: "Mistral Small 2603 (Mistral AI)" },
    { id: "mistralai/codestral-2508", name: "Codestral 2508 (Mistral AI)" },
    { id: "mistralai/devstral-medium", name: "Devstral Medium (Mistral AI)" },
    { id: "mistralai/ministral-14b", name: "Ministral 14B (Mistral AI)" },
    { id: "mistralai/ministral-8b", name: "Ministral 8B (Mistral AI)" },
    { id: "mistralai/ministral-3b", name: "Ministral 3B (Mistral AI)" },

    // 2. MiniMax
    { id: "minimax/minimax-m2.7", name: "MiniMax M2.7 (MiniMax)" },
    { id: "minimax/minimax-m2.7-highspeed", name: "MiniMax M2.7 HighSpeed (MiniMax)" },
    { id: "minimax/minimax-m2.5", name: "MiniMax M2.5 (MiniMax)" },
    { id: "minimax/minimax-m2.5-highspeed", name: "MiniMax M2.5 HighSpeed (MiniMax)" },
    { id: "minimax/minimax-m2.1", name: "MiniMax M2.1 (MiniMax)" },
    { id: "minimax/minimax-m2.1-highspeed", name: "MiniMax M2.1 HighSpeed (MiniMax)" },
    { id: "minimax/minimax-m2", name: "MiniMax M2 (MiniMax)" },

    // 3. DeepSeek & Stealth
    { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro (XKiro AI)" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek Chat (XKiro AI)" },
    { id: "stealth/ox-alpha-free", name: "Ox Alpha Free (Stealth XKiro AI)" },
    { id: "gpt-4o", name: "GPT-4o (OpenAI / XKiro)" },
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet (Anthropic / XKiro)" },
    { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash (DeepSeek)" },
    { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2 (DeepSeek)" },
    { id: "deepseek/deepseek-chat-v3.1", name: "DeepSeek Chat V3.1 (DeepSeek)" },

    // 4. Alibaba Qwen
    { id: "qwen/qwen3.8-max", name: "Qwen 3.8 Max (Alibaba Qwen)", isVision: true },
    { id: "qwen/qwen3.7-max", name: "Qwen 3.7 Max (Alibaba Qwen)", isVision: true },
    { id: "qwen/qwen3.7-plus", name: "Qwen 3.7 Plus (Alibaba Qwen)", isVision: true },
    { id: "qwen/qwen3.6-plus", name: "Qwen 3.6 Plus (Alibaba Qwen)", isVision: true },
    { id: "qwen/qwen3.5-omni-plus", name: "Qwen 3.5 Omni Plus (Alibaba Qwen)", isVision: true },
    { id: "qwen/qwen3.5-flash", name: "Qwen 3.5 Flash (Alibaba Qwen)", isVision: true },
    { id: "qwen/qwen3.5-omni-flash", name: "Qwen 3.5 Omni Flash (Alibaba Qwen)", isVision: true }
  ],
  // Fallback mode if API Key is not set or network fails
  SMART_LOCAL_FALLBACK: true,
  // Gamification Constants
  XP_RULES: {
    MEAL_TARGET: 30,       // Hit calorie target (+/- 10%)
    PROTEIN_TARGET: 20,    // Hit protein target
    WATER_TARGET: 20,      // Hit water target
    WORKOUT_COMPLETE: 25,  // Completed workout
    CHECKLIST_FULL: 30,    // All daily checklist items done
    STREAK_BONUS_PER_DAY: 10 // Bonus XP per consecutive streak day
  }
};

/**
 * Helper to check whether a model ID has Vision (multimodal image analysis) capabilities
 */
export function isVisionModel(modelId = '') {
  if (!modelId) return false;
  const mObj = CONFIG.SUPPORTED_MODELS.find(m => m.id === modelId);
  if (mObj && mObj.isVision !== undefined) return Boolean(mObj.isVision);
  const mid = modelId.toLowerCase();
  return mid.includes('gemini') || mid.includes('kimi') || mid.includes('moonshot') || mid.includes('qwen') || mid.includes('omni') || mid.includes('vision') || mid.includes('vl');
}
