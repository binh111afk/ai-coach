// Global Configuration & API Management for 9Router AI
export const CONFIG = {
  APP_NAME: "FitCoach AI Tracker",
  VERSION: "1.0.0",
  // 9Router AI API configuration read securely from .env
  NINEROUTER_API_KEY: import.meta.env.VITE_NINEROUTER_API_KEY || "sk-f040bde5ab80cf9c-nut82e-f2995b77",
  NINEROUTER_BASE_URL: import.meta.env.VITE_NINEROUTER_BASE_URL || "http://localhost:20128/v1/chat/completions",
  DEFAULT_MODEL: import.meta.env.VITE_NINEROUTER_MODEL || "gemini/gemini-3.6-flash",
  SUPPORTED_MODELS: [
    { id: "gemini/gemini-3.6-flash", name: "Gemini 3.6 Flash (Nhanh & Tối ưu nhất)" },
    { id: "gemini/gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite" },
    { id: "gemini/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview (Phân tích cao)" },
    { id: "gemini/gemma-4-31b-it", name: "Gemma 4 31B IT" },
    { id: "ds/deepseek-chat", name: "DeepSeek V3 Chat (Thông minh & Chi tiết)" },
    { id: "ds/deepseek-reasoner", name: "DeepSeek R1 Reasoner (Suy luận toán & Dinh dưỡng)" },
    { id: "ds/deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "ds/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "glm-cn/glm-5.2", name: "GLM 5.2" },
    { id: "glm-cn/glm-5", name: "GLM 5" }
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
