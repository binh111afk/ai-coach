// Global Configuration & API Management — XKiro + Google AI Studio (Gemini)
export const CONFIG = {
  APP_NAME: "FitCoach AI Tracker",
  VERSION: "1.0.0",

  // XKiro AI API configuration (nguồn do app cung cấp — có hạn mức token ngày)
  XKIRO_API_KEY: import.meta.env.XKIRO_API_KEY || import.meta.env.VITE_XKIRO_API_KEY || "",
  XKIRO_BASE_URL: import.meta.env.XKIRO_BASE_URL || import.meta.env.VITE_XKIRO_BASE_URL || "https://api.xkiro.com/v1/chat/completions",

  // Google AI Studio (Gemini) — endpoint OpenAI-compatible, key do người dùng tự nhập hoặc env server
  GEMINI_API_KEY: import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || "",
  GEMINI_BASE_URL: import.meta.env.GEMINI_BASE_URL || import.meta.env.VITE_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  GEMINI_MODEL: import.meta.env.GEMINI_MODEL || import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash",

  XKIRO_MODEL: import.meta.env.XKIRO_MODEL || import.meta.env.VITE_XKIRO_MODEL || "deepseek/deepseek-v4-pro",
  DEFAULT_MODEL: import.meta.env.XKIRO_MODEL || import.meta.env.VITE_XKIRO_MODEL || "deepseek/deepseek-v4-pro",

  // ===================== DANH SÁCH MODEL TĨNH =====================
  // Model XKiro (nguồn do app cung cấp — tính token)
  SUPPORTED_MODELS: [
    // DeepSeek (qua XKiro)
    { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro (XKiro AI)" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek Chat (XKiro AI)" },
    { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash (XKiro)" },
    { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2 (XKiro)" },
    { id: "deepseek/deepseek-chat-v3.1", name: "DeepSeek Chat V3.1 (XKiro)" },

    // Gemini (Google AI Studio — cần API key riêng, KHÔNG tính token XKiro)
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash (Google AI)", isVision: true, isGemini: true },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Google AI)", isVision: true, isGemini: true },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Google AI)", isVision: true, isGemini: true },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite (Google AI)", isVision: true, isGemini: true },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Google AI)", isVision: true, isGemini: true }
  ],

  // Fallback mode if API Key is not set or network fails
  SMART_LOCAL_FALLBACK: true,
  // Hạn mức token AI mỗi người dùng mỗi ngày — chỉ áp dụng cho model XKiro (reset sang ngày mới)
  DAILY_TOKEN_LIMIT: Number(import.meta.env.VITE_DAILY_TOKEN_LIMIT || 50000),

  // Thông tin provider (dùng nội bộ cho routing)
  AI_PROVIDERS: [
    {
      id: 'xkiro',
      name: 'XKiro',
      icon: 'zap',
      desc: 'DeepSeek qua XKiro — nguồn do app cung cấp',
      models: ['deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash', 'deepseek/deepseek-chat', 'deepseek/deepseek-v3.2', 'deepseek/deepseek-chat-v3.1'],
      defaultModel: 'deepseek/deepseek-v4-pro'
    },
    {
      id: 'gemini',
      name: 'Google AI Studio (Gemini)',
      icon: 'sparkles',
      desc: 'Gemini API — cần API key riêng, không giới hạn token',
      models: ['gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
      defaultModel: 'gemini-2.5-flash',
      isVision: true
    }
  ],
  // Gamification Constants
  XP_RULES: {
    MEAL_TARGET: 30,
    PROTEIN_TARGET: 20,
    WATER_TARGET: 20,
    WORKOUT_COMPLETE: 25,
    CHECKLIST_FULL: 30,
    STREAK_BONUS_PER_DAY: 10
  }
};

/**
 * Tên hiển thị thân thiện cho model
 */
const MODEL_DISPLAY_NAMES = {
  'gemini-3.5-flash': 'Gemini 3.5 Flash (Mới nhất)',
  'gemini-2.5-pro': 'Gemini 2.5 Pro (Suy luận mạnh)',
  'gemini-2.5-flash': 'Gemini 2.5 Flash (Cân bằng, khuyên dùng)',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite (Nhẹ & nhanh)',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'deepseek/deepseek-v4-pro': 'DeepSeek V4 Pro',
  'deepseek/deepseek-v4-flash': 'DeepSeek V4 Flash (nhanh)',
  'deepseek/deepseek-chat': 'DeepSeek Chat'
};

export function getModelDisplayName(modelId = '') {
  return MODEL_DISPLAY_NAMES[modelId] || modelId;
}

/**
 * Kiểm tra model có phải Gemini (cần API key riêng, không tính token XKiro)
 */
export function isGeminiModel(modelId = '') {
  if (!modelId) return false;
  const mObj = CONFIG.SUPPORTED_MODELS.find(m => m.id === modelId);
  if (mObj && mObj.isGemini) return true;
  // Fallback: model ID bắt đầu bằng "gemini-" (không có dấu /)
  return /^gemini-/i.test(modelId);
}

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
