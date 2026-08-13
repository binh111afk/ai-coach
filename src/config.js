// Global Configuration & API Management for 9Router AI
export const CONFIG = {
  APP_NAME: "FitCoach AI Tracker",
  VERSION: "1.0.0",
  // 9Router AI API configuration read securely from .env
  NINEROUTER_API_KEY: import.meta.env.VITE_NINEROUTER_API_KEY || "sk-f040bde5ab80cf9c-nut82e-f2995b77",
  NINEROUTER_BASE_URL: import.meta.env.VITE_NINEROUTER_BASE_URL || "https://r7nnd8p.abc-tunnel.us/v1/chat/completions",
  DEFAULT_MODEL: import.meta.env.VITE_NINEROUTER_MODEL || "gemini/gemini-3.6-flash",
  SUPPORTED_MODELS: [
    // 1. Google / Gemini / Gemma
    { id: "gemini/gemini-3.6-flash", name: "Gemini 3.6 Flash (Nhanh & Tối ưu nhất)", isVision: true },
    { id: "gemini/gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", isVision: true },
    { id: "gemini/gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite Preview", isVision: true },
    { id: "gemini/gemini-3-flash-preview", name: "Gemini 3 Flash Preview", isVision: true },
    { id: "gemini/gemma-4-31b-it", name: "Gemma 4 31B IT" },
    { id: "openrouter/google/gemma-4-31b-it:free", name: "Google Gemma 4 31B IT Free (OpenRouter)" },
    { id: "openrouter/google/gemma-4-26b-a4b-it:free", name: "Google Gemma 4 26B A4B IT Free (OpenRouter)" },

    // 2. Kimi / Moonshot AI
    { id: "tokenrouter/moonshotai/kimi-k2.5", name: "Kimi 2.5 (Moonshot AI / 9Router)", isVision: true },
    { id: "alims-intl/kimi-k2.5", name: "Kimi 2.5 (Alibaba Cloud / 9Router)", isVision: true },

    // 3. OpenCode / Big Pickle
    { id: "oc/big-pickle", name: "Big Pickle Free (OpenCode 9Router)" },

    // 4. Nvidia / Nemotron
    { id: "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nvidia Nemotron 3 Ultra 550B Free (OpenRouter)" },
    { id: "openrouter/nvidia/nemotron-3-super-120b-a12b:free", name: "Nvidia Nemotron 3 Super 120B Free (OpenRouter)" },
    { id: "openrouter/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", name: "Nvidia Nemotron 3 Nano Omni Reasoning Free (OpenRouter)", isVision: true },
    { id: "openrouter/nvidia/nemotron-3-nano-30b-a3b:free", name: "Nvidia Nemotron 3 Nano 30B Free (OpenRouter)" },
    { id: "oc/nemotron-3-ultra-free", name: "Nemotron 3 Ultra Free (OpenCode 9Router)" },

    // 5. DeepSeek
    { id: "ds/deepseek-chat", name: "DeepSeek V3 Chat (Thông minh & Chi tiết)" },
    { id: "ds/deepseek-reasoner", name: "DeepSeek R1 Reasoner (Suy luận nâng cao)" },
    { id: "ds/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "ds/deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "ds/deepseek-v4-pro-max", name: "DeepSeek V4 Pro Max" },
    { id: "oc/deepseek-v4-flash-free", name: "DeepSeek V4 Flash Free (OpenCode 9Router)" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek Chat" },

    // 6. GLM / Zhipu
    { id: "glm-cn/glm-5.2", name: "GLM 5.2" },
    { id: "glm-cn/glm-5.1", name: "GLM 5.1" },
    { id: "glm-cn/glm-5", name: "GLM 5" },
    { id: "glm-cn/glm-4.7", name: "GLM 4.7" },
    { id: "glm-cn/glm-4.6", name: "GLM 4.6" },
    { id: "glm-cn/glm-4.5-air", name: "GLM 4.5 Air" },

    // 7. Poolside / Laguna
    { id: "openrouter/poolside/laguna-s-2.1:free", name: "Poolside Laguna S 2.1 Free (OpenRouter)" },
    { id: "openrouter/poolside/laguna-xs-2.1:free", name: "Poolside Laguna XS 2.1 Free (OpenRouter)" },
    { id: "oc/laguna-s-2.1-free", name: "Laguna S 2.1 Free (OpenCode 9Router)" },

    // 8. Cohere / North / Aya
    { id: "openrouter/cohere/north-mini-code:free", name: "Cohere North Mini Code Free (OpenRouter)" },
    { id: "oc/north-mini-code-free", name: "North Mini Code Free (OpenCode 9Router)" },

    // 9. LongCat
    { id: "oc/longcat-2.0-free", name: "LongCat 2.0 Free (OpenCode 9Router)" },

    // 10. MiMo / Minimax
    { id: "oc/mimo-v2.5-free", name: "MiMo V2.5 Free (OpenCode 9Router)" },

    // 11. Ling / AntGroup
    { id: "oc/ling-3.0-flash-free", name: "Ling 3.0 Flash Free (OpenCode 9Router)" },

    // 12. Alibaba Qwen (Alibaba Cloud / 9Router)
    { id: "alims-intl/qwen3.5-plus", name: "Qwen 3.5 Plus (Alibaba Cloud / 9Router)", isVision: true },
    { id: "tokenrouter/qwen/qwen3.7-plus", name: "Qwen 3.7 Plus (TokenRouter / 9Router)", isVision: true }
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
