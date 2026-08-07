// Global Configuration & API Management for 9Router AI
export const CONFIG = {
  APP_NAME: "FitCoach AI Tracker",
  VERSION: "1.0.0",
  // 9Router AI API configuration read securely from .env
  NINEROUTER_API_KEY: import.meta.env.VITE_NINEROUTER_API_KEY || "sk-f040bde5ab80cf9c-nut82e-f2995b77",
  NINEROUTER_BASE_URL: import.meta.env.VITE_NINEROUTER_BASE_URL || "http://localhost:20128/v1/chat/completions",
  DEFAULT_MODEL: import.meta.env.VITE_NINEROUTER_MODEL || "gemini/gemini-3.6-flash",
  SUPPORTED_MODELS: [
    { id: "oc/big-pickle", name: "Big Pickle Free (OpenCode 9Router)" },
    { id: "oc/deepseek-v4-flash-free", name: "DeepSeek V4 Flash Free (OpenCode 9Router)" },
    { id: "oc/longcat-2.0-free", name: "LongCat 2.0 Free (OpenCode 9Router)" },
    { id: "oc/laguna-s-2.1-free", name: "Laguna S 2.1 Free (OpenCode 9Router)" },
    { id: "oc/north-mini-code-free", name: "North Mini Code Free (OpenCode 9Router)" },
    { id: "oc/nemotron-3-ultra-free", name: "Nemotron 3 Ultra Free (OpenCode 9Router)" },
    { id: "oc/ling-3.0-flash-free", name: "Ling 3.0 Flash Free (OpenCode 9Router)" },
    { id: "oc/mimo-v2.5-free", name: "MiMo V2.5 Free (OpenCode 9Router)" },
    { id: "gemini/gemini-3.6-flash", name: "Gemini 3.6 Flash (Nhanh & Tối ưu nhất)" },
    { id: "gemini/gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite" },
    { id: "gemini/gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite Preview" },
    { id: "gemini/gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
    { id: "gemini/gemma-4-31b-it", name: "Gemma 4 31B IT" },
    { id: "ds/deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "ds/deepseek-v4-pro-max", name: "DeepSeek V4 Pro Max" },
    { id: "ds/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "ds/deepseek-chat", name: "DeepSeek V3 Chat (Thông minh & Chi tiết)" },
    { id: "ds/deepseek-reasoner", name: "DeepSeek R1 Reasoner (Suy luận nâng cao)" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek Chat" },
    { id: "glm-cn/glm-5.2", name: "GLM 5.2" },
    { id: "glm-cn/glm-5.1", name: "GLM 5.1" },
    { id: "glm-cn/glm-5", name: "GLM 5" },
    { id: "glm-cn/glm-4.7", name: "GLM 4.7" },
    { id: "glm-cn/glm-4.6", name: "GLM 4.6" },
    { id: "glm-cn/glm-4.5-air", name: "GLM 4.5 Air" }
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
