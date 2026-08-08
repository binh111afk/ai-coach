import { DataService } from './dataService.js';
import { CONFIG } from '../config.js';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterTarget } from './gamificationService.js';

export const AiCoachService = {
  /**
   * System Prompt for OpenRouter AI Coach
   */
  async getSystemPrompt() {
    const profile = await DataService.getUserProfile();
    const goal = await DataService.getUserGoal();
    const todayLog = await DataService.getDailyLog();
    const progress = await DataService.getUserProgress();
    const photos = await DataService.getPhotos();
    const photosSummary = photos.length > 0
      ? photos.map(p => `• Ngày ${p.journeyDay || 1} (${p.date}, ${p.weight || profile.currentWeight}kg)`).join('\n')
      : 'Kho ảnh hiện tại chưa có ảnh nào.';

    return `Bạn là AI Coach - "Bộ não" cố vấn sức khỏe, giảm cân, tập luyện và dinh dưỡng thông minh hàng đầu.
Nhiệm vụ của bạn là lắng nghe, hỗ trợ, phân tích thực đơn, đề xuất điều chỉnh mục tiêu và hướng dẫn người dùng.

[THÔNG TIN NGƯỜI DÙNG HỆ THỐNG]
- Tên: ${profile.name} (${profile.gender === 'male' ? 'Nam' : 'Nữ'}, ${profile.age} tuổi, ${profile.height} cm)
- Cân nặng hiện tại: ${profile.currentWeight} kg | Mục tiêu: ${goal.targetWeight} kg
- Chỉ số: BMR = ${goal.bmr} kcal | TDEE = ${goal.tdee} kcal
- Chỉ tiêu Calo/ngày hiện tại: ${goal.dailyCalorieTarget} kcal
- Chỉ tiêu Macro/ngày: Protein ${goal.macroTarget?.protein}g, Carb ${goal.macroTarget?.carb}g, Fat ${goal.macroTarget?.fat}g
- Chỉ tiêu Nước: ${goal.waterTarget} ml
- 🚫 Dị ứng / Kiêng khem thực phẩm: ${profile.foodAllergies || 'Không có (Ăn uống bình thường)'}
- Tiến độ hôm nay (${todayLog.date}): Calo nạp = ${todayLog.meals.reduce((s, m) => s + m.calories, 0)} kcal, Nước = ${todayLog.waterIntake} ml, Level = ${progress.level} (XP: ${progress.totalXp})
- 📸 Kho Ảnh Tiến Trình hiện có trong hệ thống:
${photosSummary}

[QUY TẮC ĐỊNH DẠNG VĂN BẢN TRÌNH BÀY (RICH MARKDOWN FORMATTING)]
1. Chỉ in đậm ĐÚNG con số + đơn vị cụ thể dạng: **500 kcal**, **30g Protein**, **45g Carb**, **15g Fat**, **2500 ml**, **Ngày 1**, **75 kg**. TUYỆT ĐỐI KHÔNG in đậm cả câu dài.
2. Viết câu văn ngắn gọn, súc tích, giữa các đoạn văn CHỈ CÁCH 1 DÒNG TRỐNG. TUYỆT ĐỐI KHÔNG dùng vạch kẻ ---, KHÔNG dùng quá nhiều dòng trống thừa.
3. Đặt các Lời Khuyên hay Mẹo Nhỏ trong khung trích dẫn dạng:
   > 💡 **Lời khuyên AI Coach:** [Nội dung lời khuyên đắt giá]

[QUY TẮC VỀ GỢI Ý THỰC ĐƠN & CÔNG THỨC MÓN ĂN]
Khi bạn tư vấn thực đơn hoặc đề xuất món ăn, bạn PHẢI cung cấp đầy đủ thông tin:
- Nguyên liệu cần mua: Tên nguyên liệu, số lượng cụ thể và giá ước tính (VNĐ).
- Cờ isDirectEat: true nếu món ăn trực tiếp không cần nấu (táo, chuối, sữa chua, hạt...), false nếu cần chế biến đứng bếp.
- Hướng dẫn cách làm: Các bước chế biến ngắn gọn từng bước 1, 2, 3... (nếu cần nấu).
- Giá ước tính tổng bữa ăn (costVnd).

[QUY TẮC BẮT BUỘC VỀ ĐỀ XUẤT THAY ĐỔI - APPROVAL FLOW]
BẤT CỨ KHI NÀO người dùng yêu cầu hoặc bạn muốn đề xuất BẤT KỲ thay đổi nào vào dữ liệu (bữa ăn, đổi mục tiêu nước, thêm bài tập, thay đổi mục tiêu calo, tạo checklist, lưu/gán nhãn Kho Ảnh tiến trình):
1. Lời văn trả lời của bạn PHẢI LÀ MỘT VĂN BẢN HOÀN CHỈNH, ĐẦY ĐỦ Ý NGHĨA VÀ KẾT THÚC BẰNG DẤU CÂU TRÒN TRỊA (dấu chấm .). Tuyệt đối KHÔNG được viết câu dở dang trước khi chèn khối JSON.
2. Bạn BẮT BUỘC PHẢI CHÈN KHỐI JSON chuẩn ở cuối câu trả lời dạng \`\`\`json { "proposedChange": { ... } } \`\`\` để hệ thống hiển thị thẻ Xác nhận với 2 nút [Đồng ý] và [Từ chối] cho người dùng bấm.

\`\`\`json
{
  "proposedChange": {
    "id": "prop_1700000000000",
    "type": "UPDATE_GOAL (hoặc LOG_MEAL, LOG_WORKOUT, UPDATE_WATER_GOAL, GENERATE_CHECKLIST, LOG_PROGRESS_PHOTO, UPDATE_PHOTO_TAG, COMPARE_PHOTOS)",
    "title": "Tiêu đề mô tả thay đổi",
    "details": [
      { "field": "Tên chỉ số", "from": "Giá trị cũ", "to": "Giá trị mới" }
    ],
    "payload": {
      // Dữ liệu cụ thể tương ứng với loại thay đổi
    }
  }
}
\`\`\`

[VÍ DỤ CÁC LOẠI PAYLOAD HỆ THỐNG HỖ TRỢ]
1. LOG_MEAL:
"payload": { "date": "${todayLog.date}", "meal": { "type": "Breakfast"|"Lunch"|"Dinner"|"Snack", "name": "Ức gà áp chảo + Cơm lứt", "costVnd": 45000, "calories": 450, "protein": 40, "carb": 45, "fat": 8, "isDirectEat": false, "ingredients": [{ "name": "Ức gà tươi", "amount": "150g", "estPriceVnd": 25000 }, { "name": "Gạo lứt", "amount": "80g", "estPriceVnd": 10000 }], "instructions": ["1. Áp chảo ức gà.", "2. Dùng kèm cơm lứt."] } }

2. LOG_WORKOUT:
"payload": { "date": "${todayLog.date}", "workout": { "type": "Chạy bộ", "duration": 30, "intensity": "Moderate", "caloriesBurned": 280 } }

3. UPDATE_WATER_GOAL:
"payload": { "waterTarget": 3500 }

4. UPDATE_GOAL:
"payload": { "dailyCalorieTarget": 1800, "waterTarget": 3500, "targetWeight": 65, "targetDate": "2026-10-01", "macroTarget": { "protein": 135, "carb": 180, "fat": 50 } }

5. LOG_PROGRESS_PHOTO (Lưu / Gán thẻ Ảnh Tiến Trình vào Kho Ảnh):
"payload": { "journeyDay": 1, "note": "Ảnh tiến trình Ngày 1", "weight": ${profile.currentWeight} }

6. UPDATE_PHOTO_TAG (Cập nhật thông tin / Ngày hành trình của Ảnh Tiến Trình):
"payload": { "journeyDay": 1, "note": "Gán nhãn Ảnh Tiến Trình Ngày 1" }

[QUY TẮC NGHIÊM NGẶT: THÀNH THẬT VỀ NĂNG LỰC HỆ THỐNG (HONESTY DIRECTIVE)]
1. Bạn CÓ THỂ tác động và thay đổi các dữ liệu: Bữa ăn, Bài tập, Mục tiêu Calo/Nước/Cân nặng, Checklist và KHO ẢNH TIẾN TRÌNH.
2. Nếu người dùng yêu cầu một tính năng HOÀN TOÀN KHÔNG CÓ TRONG HỆ THỐNG (ví dụ: chuyển tiền ngân hàng, mua hàng sắm đồ online, đặt lịch khám bác sĩ ngoài đời real-time, điều khiển thiết bị nhà thông minh...):
   - Bạn PHẢI THÀNH THẬT NÓI RẰNG: "Rất tiếc, tôi chưa có tính năng [tên tính năng]. Tôi là AI Coach hỗ trợ quản lý dinh dưỡng, tập luyện, chỉ số sức khỏe và Kho Ảnh tiến trình."
   - TUYỆT ĐỐI KHÔNG tự bịa ra Thẻ xác nhận giả (proposedChange) hoặc hứa hẹn làm những việc hệ thống không có khả năng thực thi.

Hãy trả lời bằng tiếng Việt thân thiện, giàu động lực, chuyên nghiệp!`;
  },

  /**
   * Send message to 9router AI API
   */
  async sendMessage(userMessage, conversationHistory = [], attachments = []) {
    const apiKey = await DataService.getNinerouterApiKey();
    const selectedModel = await DataService.getSelectedModel();

    // Fallback to Smart Local Parser if API Key is missing in .env
    if (!apiKey) {
      console.warn("9router API key missing in .env. Using Smart Local Parser Fallback.");
      return await this.smartLocalFallback(userMessage, attachments);
    }

    try {
      const systemPrompt = await this.getSystemPrompt();
      const messagesPayload = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        { role: "user", content: userMessage }
      ];

      const response = await fetch(CONFIG.NINEROUTER_BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": CONFIG.APP_NAME,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: messagesPayload,
          stream: false,
          temperature: 0.7,
          max_tokens: 3500
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error Status ${response.status}`);
      }

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        const cleanJsonStr = rawText.replace(/data:\s*\[DONE\][\s\S]*/g, '').trim();
        data = JSON.parse(cleanJsonStr);
      }

      const aiContent = data.choices[0]?.message?.content || "Xin lỗi, tôi không thể xử lý câu trả lời lúc này.";

      // Parse potential proposedChange JSON from AI text response (with intelligent fallback)
      let { textResponse, proposedChange } = await this.extractProposedChange(aiContent, userMessage);

      // If user uploaded an actual image file, attach its exact Base64 dataUrl into photo proposedChange payload
      const attachedImg = Array.isArray(attachments) ? attachments.find(f => f.dataUrl || f.url) : null;
      if (attachedImg && proposedChange && (proposedChange.type === 'LOG_PROGRESS_PHOTO' || proposedChange.type === 'UPLOAD_PHOTO' || proposedChange.type === 'UPDATE_PHOTO_TAG')) {
        proposedChange.payload = proposedChange.payload || {};
        proposedChange.payload.photoUrl = attachedImg.dataUrl || attachedImg.url;
      }

      return {
        role: "assistant",
        content: textResponse,
        proposedChange: proposedChange || null
      };

    } catch (err) {
      console.error("9router API Error:", err);
      const fallbackResult = await this.smartLocalFallback(userMessage, attachments);
      fallbackResult.content = `*(Lưu ý: Không thể gọi 9router API [${err.message}]. Hệ thống chuyển sang AI Parser nội bộ)*\n\n` + fallbackResult.content;
      return fallbackResult;
    }
  },

  /**
   * Generate 7-day meal plan & workout schedule via real 9router AI API during Onboarding
   */
  async generateFullJourneyPlan(profileData, goalData) {
    console.log("🚀 [AI Onboarding Plan] Starting API Call...");
    const apiKey = await DataService.getNinerouterApiKey();
    const selectedModel = (await DataService.getSelectedModel()) || 'google/gemini-2.5-flash';

    console.log("🔑 [AI Onboarding Plan] Key exists:", !!apiKey, "| Model:", selectedModel);

    if (!apiKey) {
      console.warn("⚠️ 9router API Key missing. Switching to Smart Local Generator.");
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const prompt = `Bạn là AI Coach thể hình & dinh dưỡng cao cấp.
Hãy tính toán và sinh ra Kế hoạch Thực đơn Dinh dưỡng 7 ngày và Lịch Tập Luyện 7 ngày dạng JSON gọn nhẹ cho người dùng Onboarding:
- Tên: ${profileData.name || 'Người dùng'}, ${profileData.gender === 'male' ? 'Nam' : 'Nữ'}, ${profileData.age} tuổi, ${profileData.height}cm
- Cân nặng hiện tại: ${profileData.currentWeight}kg, Cân nặng mục tiêu: ${goalData.targetWeight}kg
- Mục tiêu calo hàng ngày: ${goalData.dailyCalorieTarget} kcal/ngày
- Macro mục tiêu: Protein ${goalData.macroTarget?.protein}g, Carb ${goalData.macroTarget?.carb}g, Fat ${goalData.macroTarget?.fat}g
- Dị ứng / Kiêng khem: ${profileData.foodAllergies || 'Không có'}

Trả về ĐÚNG KHỐI JSON duy nhất dạng:
\`\`\`json
{
  "weeklyMealPlan": [
    {
      "dayIndex": 1,
      "dayName": "Thứ 2",
      "meals": [
        { "type": "Breakfast", "name": "Món sáng AI đề xuất", "calories": 350, "protein": 20, "carb": 40, "fat": 10, "costVnd": 25000, "isDirectEat": false },
        { "type": "Lunch", "name": "Món trưa AI đề xuất", "calories": 550, "protein": 35, "carb": 60, "fat": 15, "costVnd": 45000, "isDirectEat": false },
        { "type": "Dinner", "name": "Món tối AI đề xuất", "calories": 450, "protein": 30, "carb": 45, "fat": 12, "costVnd": 30000, "isDirectEat": false }
      ]
    }
  ],
  "weeklyWorkoutRoutine": [
    {
      "dayIndex": 1,
      "dayName": "Thứ 2",
      "workoutType": "Resistance Training",
      "duration": 45,
      "caloriesBurned": 320,
      "exercises": ["Chống đẩy 3 sets x 12", "Squat 4 sets x 15", "Plank 3 sets x 45s"]
    }
  ]
}
\`\`\``;

      const response = await fetch(CONFIG.NINEROUTER_BASE_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": CONFIG.APP_NAME,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1800
        })
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      const data = await response.json();
      const content = data.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content.match(/\{[\s\S]*\}/)?.[0];
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        if (parsed.weeklyMealPlan && parsed.weeklyWorkoutRoutine) {
          return parsed;
        }
      }
      return null;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn("AI Onboarding Plan Generation Timeout/Error:", err.message);
      return null;
    }
  },

  /**
   * Helper to extract proposedChange JSON block embedded in AI response markdown
   */
  async extractProposedChange(content = '', userMessage = '') {
    let proposedChange = null;
    let textResponse = content;

    // 1. Check for markdown codeblocks: ```json, ```JSON, ```json5, ```
    const jsonMatch = content.match(/```(?:json|JSON|json5)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.proposedChange) {
          proposedChange = parsed.proposedChange;
          textResponse = content.replace(/```(?:json|JSON|json5)?\s*[\s\S]*?\s*```/, '').trim();
        }
      } catch (e) {
        try {
          const sanitized = jsonMatch[1].replace(/,\s*([\}\]])/g, '$1');
          const parsed = JSON.parse(sanitized);
          if (parsed.proposedChange) {
            proposedChange = parsed.proposedChange;
            textResponse = content.replace(/```(?:json|JSON|json5)?\s*[\s\S]*?\s*```/, '').trim();
          }
        } catch (err) {}
      }
    }

    // 2. Check for raw {"proposedChange": ...} anywhere in text if codeblock wasn't matched
    if (!proposedChange) {
      const rawMatch = content.match(/\{\s*"proposedChange"\s*:[\s\S]*\}/);
      if (rawMatch) {
        try {
          const parsed = JSON.parse(rawMatch[0]);
          if (parsed.proposedChange) {
            proposedChange = parsed.proposedChange;
            textResponse = content.replace(rawMatch[0], '').trim();
          }
        } catch (e) {
          try {
            const sanitized = rawMatch[0].replace(/,\s*([\}\]])/g, '$1');
            const parsed = JSON.parse(sanitized);
            if (parsed.proposedChange) {
              proposedChange = parsed.proposedChange;
              textResponse = content.replace(rawMatch[0], '').trim();
            }
          } catch (err) {}
        }
      }
    }

    // 3. Fallback NLP extraction if the AI model forgot to output the JSON block for an actionable command
    if (!proposedChange && userMessage) {
      const text = userMessage.toLowerCase().trim();
      const isActionable = /ăn|uống|bữa|món|nước|tập|chạy|gym|calo|cân nặng|mục tiêu/i.test(text);
      if (isActionable) {
        const fallbackResult = await this.smartLocalFallback(userMessage);
        if (fallbackResult && fallbackResult.proposedChange) {
          proposedChange = fallbackResult.proposedChange;
        }
      }
    }

    // Intercept LOG_PROGRESS_PHOTO proposedChange to verify overwrite status against IndexedDB
    if (proposedChange && (proposedChange.type === 'LOG_PROGRESS_PHOTO' || proposedChange.type === 'UPLOAD_PHOTO')) {
      const targetDay = Number(proposedChange.payload?.journeyDay || 1);
      const existingPhotos = await DataService.getPhotos();
      const existingPhoto = existingPhotos.find((p, idx) => 
        (p.journeyDay && Number(p.journeyDay) === targetDay) || (idx + 1) === targetDay
      );
      if (existingPhoto) {
        proposedChange.title = `[⚠️ GHI ĐÈ] Thay thế Ảnh Tiến Trình Ngày ${targetDay}`;
        proposedChange.details = [
          { field: `Ảnh Tiến Trình Ngày ${targetDay}`, from: `Ảnh cũ (Tải lên ngày ${existingPhoto.date})`, to: `Bức ảnh mới (Ghi đè)` }
        ];
        if (!textResponse.includes('CẢNH BÁO GHI ĐÈ') && !textResponse.includes('thay thế')) {
          textResponse = `⚠️ **CẢNH BÁO GHI ĐÈ ẢNH TIẾN TRÌNH:**\nHệ thống phát hiện trong Kho Ảnh hiện **đã có 1 ảnh** thuộc **Ngày ${targetDay}** (tải lên ngày ${existingPhoto.date}).\n\nNếu bạn bấm **[Đồng Ý]**, hệ thống sẽ **ghi đè & thay thế** bức ảnh cũ Ngày ${targetDay} bằng bức ảnh mới này.\n\n` + textResponse;
        }
      }
    }

    // Clean up trailing incomplete phrases
    textResponse = textResponse
      .replace(/(?:Hãy nhìn|Dưới đây|Như sau|Bảng đề xuất|Chi tiết đề xuất|Sau đây|Dù ăn gà rán|Tham khảo)[\s::]*$/gi, '')
      .trim();

    return { textResponse, proposedChange };
  },

  /**
   * Smart Local Fallback Parser when API Key is not set or network fails.
   * Performs NLP pattern matching for food, water, workouts, and goal adjustments.
   */
  async smartLocalFallback(userMessage, attachments = []) {
    const text = userMessage.toLowerCase().trim();
    const today = DataService.getTodayString();
    const profile = await DataService.getUserProfile();
    const goal = await DataService.getUserGoal();
    const attachedImg = Array.isArray(attachments) ? attachments.find(f => f.dataUrl || f.url) : null;

    let replyText = "";
    let proposedChange = null;

    // Pattern 1: Water target change ("đổi mục tiêu nước 4L", "uống 3.5L nước")
    const waterMatch = text.match(/nước.*(?:thành|lên|mục tiêu)?\s*(\d+(?:\.\d+)?)\s*(l|ml|lít)/i) || 
                       text.match(/(\d+(?:\.\d+)?)\s*(l|ml|lít)\s*nước/i);
    if (waterMatch) {
      let amountMl = parseFloat(waterMatch[1]);
      const unit = waterMatch[2].toLowerCase();
      if (unit === 'l' || unit === 'lít') amountMl = Math.round(amountMl * 1000);

      replyText = `Tôi đã hiểu! Bạn muốn điều chỉnh mục tiêu nước uống hàng ngày lên ${amountMl} ml. Hãy bấm **[Đồng ý]** bên dưới để áp dụng thay đổi vào hệ thống nhé!`;
      proposedChange = {
        id: 'prop_' + Date.now(),
        type: 'UPDATE_WATER_GOAL',
        title: 'Đề xuất đổi Mục Tiêu Nước',
        details: [
          { field: 'Mục tiêu nước hàng ngày', from: `${goal.waterTarget} ml`, to: `${amountMl} ml` }
        ],
        payload: { waterTarget: amountMl }
      };
    }
    // Pattern 2: Log Meal natural language ("sáng ăn 2 quả trứng ốp la với 1 lát bánh mì đen", "trưa ăn cơm tấm 500 kcal")
    else if (text.includes("ăn") || text.includes("uống") || text.includes("bữa") || text.includes("món")) {
      // Determine meal type
      let mealType = "Breakfast";
      if (text.includes("trưa")) mealType = "Lunch";
      else if (text.includes("tối")) mealType = "Dinner";
      else if (text.includes("phụ") || text.includes("snack")) mealType = "Snack";

      // Smart estimation algorithm for basic Vietnamese foods
      let cal = 350, p = 25, c = 35, f = 10;
      let foodName = userMessage.replace(/^(sáng|trưa|tối|phụ)?\s*(tôi)?\s*(ăn|uống)\s*/i, '').trim();
      if (!foodName) foodName = "Bữa ăn dinh dưỡng";

      if (text.includes("gà rán") || text.includes("kfc") || text.includes("lotteria") || text.includes("jollibee")) {
        cal = 580; p = 32; c = 38; f = 32;
      } else if (text.includes("trứng") && text.includes("bánh mì")) {
        cal = 380; p = 18; c = 40; f = 14;
      } else if (text.includes("ức gà") || text.includes("gà luộc") || text.includes("gà áp chảo")) {
        cal = 420; p = 45; c = 30; f = 8;
      } else if (text.includes("trà sữa") || text.includes("pizza") || text.includes("burger")) {
        cal = 520; p = 12; c = 68; f = 24;
      } else if (text.includes("bún") || text.includes("phở") || text.includes("hủ tiếu")) {
        cal = 520; p = 22; c = 65; f = 16;
      } else if (text.includes("cơm tấm") || text.includes("sườn")) {
        cal = 650; p = 30; c = 75; f = 22;
      } else if (text.includes("salad") || text.includes("rau")) {
        cal = 220; p = 12; c = 20; f = 9;
      }

      // Check if user explicitly mentioned calories
      const explicitCal = text.match(/(\d+)\s*(kcal|calo)/i);
      if (explicitCal) cal = parseInt(explicitCal[1]);

      const isHighCalorie = cal >= 500;
      const adviceTip = isHighCalorie
        ? `\n\n💡 **Lời khuyên AI Coach:** Đừng lo lắng nếu lỡ ăn vượt thực đơn! Để duy trì thâm hụt calo cả tuần, bạn chỉ cần:\n1️⃣ Đi bộ nhanh / Tập nhẹ 25-30 phút hôm nay để bù ~200 kcal.\n2️⃣ Bữa sáng ngày mai ăn nhẹ nhàng (yến mạch/trứng luộc) để cân bằng lại!`
        : `\n\nBấm **[Đồng ý]** bên dưới để cập nhật bữa ăn này vào nhật ký nhé!`;

      const todayLog = await DataService.getDailyLog(today);
      const existingMeal = (todayLog.meals || []).find(m => m.type && m.type.toLowerCase() === mealType.toLowerCase());
      const mealTypeLabel = mealType === 'Breakfast' ? 'Sáng' : mealType === 'Lunch' ? 'Trưa' : mealType === 'Dinner' ? 'Tối' : 'Phụ';

      if (existingMeal) {
        replyText = `⚠️ **CẢNH BÁO GHI ĐÈ BỮA ĂN:**\nHôm nay bạn **đã ghi nhận Bữa ${mealTypeLabel}** là **"${existingMeal.name}"** (~${existingMeal.calories} kcal).\n\nBạn có muốn **thay thế / ghi đè** bằng món **"${foodName}"** (~${cal} kcal) không? Bấm **[Đồng ý]** bên dưới để xác nhận ghi đè nhé!`;
        proposedChange = {
          id: 'prop_' + Date.now(),
          type: 'LOG_MEAL',
          title: `[⚠️ GHI ĐÈ] Thay thế Bữa ${mealTypeLabel} bằng ${foodName}`,
          details: [
            { field: `Bữa ${mealTypeLabel} Hôm Nay`, from: `${existingMeal.name} (${existingMeal.calories} kcal)`, to: `${foodName} (${cal} kcal - Ghi đè)` }
          ],
          payload: {
            date: today,
            meal: { type: mealType, name: foodName, calories: cal, protein: p, carb: c, fat: f }
          }
        };
      } else {
        replyText = `Tôi đã ghi nhận bữa ăn **"${foodName}"** của bạn:\n- **Ước tính Calo:** ~${cal} kcal\n- **Macro:** Protein: ${p}g | Carb: ${c}g | Fat: ${f}g${adviceTip}`;
        proposedChange = {
          id: 'prop_' + Date.now(),
          type: 'LOG_MEAL',
          title: `Đề xuất ghi nhận Bữa ${mealTypeLabel} (${foodName})`,
          details: [
            { field: 'Món ăn thực tế', from: 'Thực đơn AI cũ', to: foodName },
            { field: 'Calo & Macro', from: '-', to: `${cal} kcal (P:${p}g, C:${c}g, F:${f}g)` }
          ],
          payload: {
            date: today,
            meal: { type: mealType, name: foodName, calories: cal, protein: p, carb: c, fat: f }
          }
        };
      }
    }
    // Pattern 3: Log Workout ("chạy bộ 30 phút", "tập gym 45 phút")
    else if (text.includes("tập") || text.includes("chạy") || text.includes("gym") || text.includes("cardio") || text.includes("bơi")) {
      const durationMatch = text.match(/(\d+)\s*(phút|p|min)/i);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 30;
      
      let workoutType = "Tập luyện tổng hợp";
      let met = 5.0; // MET value
      if (text.includes("chạy")) { workoutType = "Chạy bộ"; met = 8.0; }
      else if (text.includes("gym") || text.includes("tạ")) { workoutType = "Tập Tạ / Resistance"; met = 5.5; }
      else if (text.includes("cardio") || text.includes("hiit")) { workoutType = "Cardio HIIT"; met = 7.5; }
      else if (text.includes("đi bộ")) { workoutType = "Đi bộ nhanh"; met = 3.8; }
      else if (text.includes("bơi")) { workoutType = "Bơi lội"; met = 6.8; }

      // Burned calories = Duration(hrs) * MET * weight(kg)
      const caloriesBurned = Math.round((duration / 60) * met * profile.currentWeight);

      replyText = `Tuyệt vời! Bạn vừa hoàn thành bài tập **${workoutType}** (${duration} phút).\nLượng calo tiêu hao ước tính: **~${caloriesBurned} kcal**.\nBấm **[Đồng ý]** để cộng calo out vào Dashboard hôm nay nhé!`;
      proposedChange = {
        id: 'prop_' + Date.now(),
        type: 'LOG_WORKOUT',
        title: 'Đề xuất ghi nhận Tập Luyện',
        details: [
          { field: 'Bài tập', from: '-', to: `${workoutType} (${duration} phút)` },
          { field: 'Calo tiêu hao', from: '-', to: `+${caloriesBurned} kcal Out` }
        ],
        payload: {
          date: today,
          workout: { type: workoutType, duration, intensity: 'Moderate', caloriesBurned }
        }
      };
    }
    // Pattern 3.5: Journey Day Update ("chuyển sang ngày 30/100", "ngày 40/100", "ngày 15")
    else if (text.includes("hành trình") || (text.includes("ngày") && text.match(/\d+/))) {
      const dayMatch = text.match(/ngày\s*(\d+)(?:\/(\d+))?/i) || text.match(/(\d+)\s*\/\s*(\d+)/);
      if (dayMatch) {
        const targetDay = parseInt(dayMatch[1]);
        const totalD = dayMatch[2] ? parseInt(dayMatch[2]) : (goal.totalJourneyDays || 100);

        replyText = `Tôi sẽ cập nhật **Ngày Trong Hành Trình** của bạn thành **Ngày ${targetDay}/${totalD}**.\n\nBấm **[Đồng ý]** bên dưới để áp dụng thay đổi lên thanh điều hướng nhé!`;
        proposedChange = {
          id: 'prop_' + Date.now(),
          type: 'UPDATE_GOAL',
          title: `Đề xuất cập nhật Ngày Hành Trình (${targetDay}/${totalD})`,
          details: [
            { field: 'Ngày hành trình', from: `Ngày ${goal.currentJourneyDay || 1}/${goal.totalJourneyDays || 100}`, to: `Ngày ${targetDay}/${totalD}` }
          ],
          payload: {
            currentJourneyDay: targetDay,
            totalJourneyDays: totalD
          }
        };
      }
    }
    // Pattern 3.8: Photo Vault Actions ("lưu ảnh tiến trình ngày 1", "đây là ảnh ngày 1", "đặt làm ảnh ngày 1", "kho ảnh")
    else if (text.includes("ảnh") || text.includes("kho ảnh") || text.includes("tiến trình") || text.includes("ngày 1") || text.includes("ngày một")) {
      const dayMatch = text.match(/ngày\s*(\d+)/i);
      let dayNum = 1;
      if (dayMatch && dayMatch[1]) dayNum = parseInt(dayMatch[1]);
      else if (text.includes("ngày 1") || text.includes("ngày một")) dayNum = 1;
      else dayNum = goal.currentJourneyDay || 1;

      const existingPhotos = await DataService.getPhotos();
      const existingPhoto = existingPhotos.find(p => p.journeyDay === dayNum);

      if (existingPhoto) {
        replyText = `⚠️ **CẢNH BÁO GHI ĐÈ ẢNH TIẾN TRÌNH:**\nHệ thống phát hiện trong Kho Ảnh hiện **đã có 1 ảnh** thuộc **Ngày ${dayNum}** (tải lên ngày ${existingPhoto.date}).\n\nBạn có muốn **ghi đè & thay thế** bức ảnh cũ Ngày ${dayNum} bằng bức ảnh mới này không? Bấm **[Đồng ý]** bên dưới để xác nhận ghi đè nhé!`;
        proposedChange = {
          id: 'prop_' + Date.now(),
          type: 'LOG_PROGRESS_PHOTO',
          title: `[⚠️ GHI ĐÈ] Thay thế Ảnh Tiến Trình Ngày ${dayNum}`,
          details: [
            { field: `Ảnh Tiến Trình Ngày ${dayNum}`, from: `Ảnh cũ (Tải lên ngày ${existingPhoto.date})`, to: `Bức ảnh mới (Ghi đè)` }
          ],
          payload: {
            journeyDay: dayNum,
            photoUrl: attachedImg ? (attachedImg.dataUrl || attachedImg.url) : null,
            note: `Ảnh tiến trình Ngày ${dayNum} do AI Coach ghi nhận (Đã ghi đè)`,
            weight: profile.currentWeight,
            isOverwrite: true
          }
        };
      } else {
        replyText = `Tôi đã tiếp nhận yêu cầu về **Kho Ảnh Tiến Trình**!\nTôi đề xuất lưu / gán nhãn **Ảnh Tiến Trình Ngày ${dayNum}** vào Kho Ảnh của bạn.\n\nHãy bấm **[Đồng ý]** bên dưới để áp dụng vào Kho Ảnh ngay nhé!`;
        proposedChange = {
          id: 'prop_' + Date.now(),
          type: 'LOG_PROGRESS_PHOTO',
          title: `Đề xuất Lưu & Gán Thẻ Ảnh Tiến Trình (Ngày ${dayNum})`,
          details: [
            { field: 'Kho Ảnh Tiến Trình', from: '-', to: `Lưu Ảnh Tiến Trình Ngày ${dayNum}` },
            { field: 'Cân nặng ghi nhận', from: '-', to: `${profile.currentWeight} kg` }
          ],
          payload: {
            journeyDay: dayNum,
            photoUrl: attachedImg ? (attachedImg.dataUrl || attachedImg.url) : null,
            note: `Ảnh tiến trình Ngày ${dayNum} do AI Coach ghi nhận`,
            weight: profile.currentWeight
          }
        };
      }
    }
    // Pattern 3.9: Unsupported feature query ("chuyển tiền", "mua sắm", "bác sĩ ngoài đời", "ngân hàng")
    else if (text.includes("chuyển tiền") || text.includes("mua hàng") || text.includes("đặt hàng") || text.includes("bác sĩ") || text.includes("ngân hàng")) {
      replyText = `Rất tiếc, tôi **chưa có tính năng** xử lý các dịch vụ/giao dịch ngoài ứng dụng này. 🤖\n\nTôi có toàn quyền truy cập và hỗ trợ tốt nhất các chức năng:\n- 🥗 **Dinh Dưỡng:** Ghi nhận & Phân tích bữa ăn (Calo/Macro)\n- 🏋️‍♂️ **Tập Luyện:** Ghi nhận bài tập & calo tiêu hao\n- 💧 **Chỉ Số:** Cập nhật mục tiêu Calo, Nước & Cân nặng\n- 📸 **Kho Ảnh:** Lưu, cập nhật nhãn & quản lý Ảnh Tiến Trình theo Ngày\n- 📋 **Checklist:** Tạo danh sách công việc hàng ngày`;
      proposedChange = null;
    }
    // Pattern 4: Plan generation with daily budget & workout location ("ngân sách 100k", "lập kế hoạch 80.000đ/ngày")
    else if (text.includes("kế hoạch") || text.includes("ngân sách") || text.includes("tiền") || text.includes("vnđ") || text.includes("k/ngày")) {
      const budgetMatch = text.match(/(\d+)\s*(k|000|ngàn|trăm)/i);
      let budgetVnd = 100000;
      if (budgetMatch) {
        let rawNum = parseInt(budgetMatch[1]);
        if (rawNum < 500) budgetVnd = rawNum * 1000;
        else budgetVnd = rawNum;
      }

      replyText = `Tôi đã tính toán **Kế Hoạch Dinh Dưỡng Theo Ngân Sách (${budgetVnd.toLocaleString('vi-VN')} VNĐ/ngày)** và **Lịch Tập Luyện Cá Nhân Hóa 7 Ngày** dựa trên chỉ số của bạn:\n\n` +
                  `🍳 **Thực Đơn Đề Xuất:**\n` +
                  `- **Sáng (25.000đ):** 2 trứng ốp la + 1 lát bánh mì đen\n` +
                  `- **Trưa (45.000đ):** 150g ức gà áp chảo + 1 bát cơm lứt + rau luộc\n` +
                  `- **Tối (30.000đ):** 150g thịt nạc kho / cá thu + canh rau\n` +
                  `- **Phụ (10.000đ):** 1 quả chuối / 1 hũ sữa chua\n\n` +
                  `🏋️‍♂️ **Lịch Tập Luyện 7 Ngày:** Phân bổ luân phiên Resistance, HIIT Cardio và Phục hồi dãn cơ.\n\n` +
                  `Bạn có muốn áp dụng Lộ Trình Mới này vào Tab **Kế Hoạch AI** không?`;

      proposedChange = {
        id: 'prop_' + Date.now(),
        type: 'UPDATE_GOAL',
        title: `Đề xuất Lộ Trình AI Theo Ngân Sách ${budgetVnd.toLocaleString('vi-VN')} VNĐ/ngày`,
        details: [
          { field: 'Ngân sách ăn uống', from: 'Cũ', to: `${budgetVnd.toLocaleString('vi-VN')} VNĐ/ngày` },
          { field: 'Thực đơn AI', from: '-', to: '3 Bữa chính + 1 Bữa phụ' },
          { field: 'Lịch tập 7 ngày', from: '-', to: 'Đã tối ưu theo chỉ số cơ thể' }
        ],
        payload: {
          dailyBudgetVnd: budgetVnd
        }
      };
    }
    // Pattern 5: Goal change ("muốn giảm xuống 65kg trong 2 tháng", "muốn giảm cân")
    else if (text.includes("giảm") || text.includes("tăng") || text.includes("mục tiêu") || text.includes("kg")) {
      const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*kg/i);
      const targetWeight = weightMatch ? parseFloat(weightMatch[1]) : profile.currentWeight - 5;

      const newBmr = calculateBMR(profile.gender, profile.currentWeight, profile.height, profile.age);
      const newTdee = calculateTDEE(newBmr, profile.activityLevel);
      const calObj = calculateTargetCalories(newTdee, profile.currentWeight, targetWeight, 60);
      const newMacros = calculateMacros(calObj.targetCalories);

      replyText = `Dựa trên chỉ số cá nhân (${profile.height}cm, ${profile.currentWeight}kg) và mục tiêu mới **${targetWeight}kg**:\n` +
                  `- **TDEE hiện tại:** ${newTdee} kcal\n` +
                  `- **Calo mục tiêu mới:** **${calObj.targetCalories} kcal/ngày** (${calObj.deficit < 0 ? 'Thâm hụt ' + Math.abs(calObj.deficit) : 'Dư thừa ' + calObj.deficit} kcal)\n` +
                  `- **Macro:** Protein ${newMacros.protein}g | Carb ${newMacros.carb}g | Fat ${newMacros.fat}g\n\n` +
                  (calObj.warning ? `⚠️ *${calObj.warning}*\n\n` : '') +
                  `Bạn có muốn áp dụng mục tiêu mới này không?`;

      proposedChange = {
        id: 'prop_' + Date.now(),
        type: 'UPDATE_GOAL',
        title: 'Đề xuất tính lại Kế Hoạch & Mục Tiêu mới',
        details: [
          { field: 'Cân nặng mục tiêu', from: `${goal.targetWeight} kg`, to: `${targetWeight} kg` },
          { field: 'Calo/ngày', from: `${goal.dailyCalorieTarget} kcal`, to: `${calObj.targetCalories} kcal` },
          { field: 'Macro Protein', from: `${goal.macroTarget?.protein}g`, to: `${newMacros.protein}g` }
        ],
        payload: {
          targetWeight,
          dailyCalorieTarget: calObj.targetCalories,
          macroTarget: newMacros,
          waterTarget: calculateWaterTarget(profile.currentWeight, profile.activityLevel)
        }
      };
    }
    // General coaching response
    else {
      replyText = `Chào ${profile.name}! Tôi là AI Coach của bạn. 🏋️‍♂️\n\n` +
                  `Tôi có thể giúp bạn:\n` +
                  `1. **Phân tích món ăn:** Nhập ví dụ "Sáng ăn 2 trứng ốp la với 1 lát bánh mì đen"\n` +
                  `2. **Log bài tập:** Nhập "Tập gym 45 phút" hoặc "Chạy bộ 30 phút"\n` +
                  `3. **Đổi chỉ tiêu:** Nhập "Đổi mục tiêu nước thành 3.5L" hoặc "Muốn giảm xuống 65kg"\n` +
                  `4. **Tạo checklist hàng ngày:** Yêu cầu "Tạo checklist hôm nay"\n\n` +
                  `Bạn cần tôi hỗ trợ gì ngay bây giờ?`;
    }

    return {
      role: "assistant",
      content: replyText,
      proposedChange
    };
  }
};
