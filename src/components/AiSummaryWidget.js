import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';

export async function renderAiSummaryWidget(containerId = 'ai-summary-widget-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const profile = await DataService.getUserProfile();
  const goal = await DataService.getUserGoal();
  const todayLog = await DataService.getDailyLog();
  const progress = await DataService.getUserProgress();

  // Daily Calculations
  const caloriesIn = todayLog.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const caloriesOut = todayLog.workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  const netCalories = caloriesIn - caloriesOut;
  const calorieTarget = goal.dailyCalorieTarget || 2000;

  const waterIntake = todayLog.waterIntake || 0;
  const waterTarget = goal.waterTarget || 2500;

  const checklistDone = todayLog.checklist.filter(c => c.done).length;
  const checklistTotal = todayLog.checklist.length;

  // Calculate Daily AI Score (0 - 100)
  let score = 0;
  if (Math.abs(netCalories - calorieTarget) <= 250) score += 40;
  else if (Math.abs(netCalories - calorieTarget) <= 450) score += 25;
  else score += 10;

  if (waterIntake >= waterTarget) score += 30;
  else score += Math.round((waterIntake / waterTarget) * 30);

  if (checklistDone === checklistTotal) score += 30;
  else score += Math.round((checklistDone / (checklistTotal || 1)) * 20);

  score = Math.min(100, Math.max(0, score));

  // Default Daily Advice
  let dailyAdvice = '';
  if (score >= 80) {
    dailyAdvice = `Tuyệt vời ${profile.name}! Bạn đã kiểm soát calo thâm hụt rất chuẩn (${netCalories}/${calorieTarget} kcal) và uống đủ nước. Tiếp tục giữ vững phong độ này nhé!`;
  } else if (score >= 50) {
    dailyAdvice = `Khá tốt! Bạn đã đạt ${score}/100 điểm kỷ luật. Tối nay hãy bổ sung thêm nước và hoàn thành nốt các việc trong checklist để trọn vẹn ngày nhé.`;
  } else {
    dailyAdvice = `Hôm nay điểm kỷ luật của bạn đang ở mức ${score}/100. Lượng calo và nước nạp vào còn thấp. Hãy cố gắng hoàn thành checklist để cải thiện nhé!`;
  }

  // Default Weekly Advice
  const weeklyAdvice = `Tuần này bạn đã duy trì chuỗi Streak ${progress.currentStreak} ngày liên tục. Cân nặng thâm hụt đúng hướng. AI Coach khuyến nghị giữ nguyên mức Calo mục tiêu ${calorieTarget} kcal và duy trì 4 buổi tập/tuần.`;

  const html = `
    <style>
      .aisw-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 24px;
        padding: 1.5rem;
        box-shadow: var(--shadow-surface);
        position: relative;
        overflow: hidden;
      }

      /* Decorative blobs */
      .aisw-blob {
        position: absolute;
        border-radius: 50%;
        pointer-events: none;
      }
      .aisw-blob-1 {
        width: 160px; height: 160px;
        top: -50px; right: -50px;
        background: radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%);
      }
      .aisw-blob-2 {
        width: 120px; height: 120px;
        bottom: -40px; left: -30px;
        background: radial-gradient(circle, rgba(217,70,239,0.12) 0%, transparent 70%);
      }

      /* Header */
      .aisw-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
        position: relative;
        z-index: 2;
      }
      .aisw-header-left {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }
      .aisw-icon-wrap {
        position: relative;
        width: 44px; height: 44px;
        flex-shrink: 0;
      }
      .aisw-icon-glow {
        position: absolute;
        inset: 0;
        background: var(--accent-purple);
        filter: blur(10px);
        opacity: 0.35;
        border-radius: 50%;
      }
      .aisw-icon-box {
        position: relative;
        width: 44px; height: 44px;
        border-radius: 14px;
        background: linear-gradient(135deg, #7C3AED, #D946EF);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 14px rgba(124,58,237,0.35);
      }
      .aisw-title-label {
        font-size: 10px;
        font-weight: 800;
        color: var(--accent-purple);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .aisw-title {
        font-family: 'Fraunces', serif;
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--text-main);
        line-height: 1.2;
      }

      /* Toggle */
      .aisw-toggle {
        background: var(--bg-subtle);
        border-radius: 14px;
        padding: 4px;
        position: relative;
        display: flex;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
        border: 1px solid var(--border-color);
        flex-shrink: 0;
      }
      .aisw-toggle-indicator {
        position: absolute;
        top: 4px; bottom: 4px;
        width: calc(50% - 4px);
        background: var(--bg-card);
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(124,58,237,0.12);
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1;
        border: 1px solid var(--border-color);
      }
      .aisw-toggle-btn {
        position: relative; z-index: 10;
        flex: 1;
        padding: 8px 16px;
        font-size: 12px; font-weight: 700;
        color: var(--text-muted);
        transition: color 0.3s ease;
        display: flex; align-items: center; justify-content: center; gap: 5px;
        cursor: pointer;
        background: transparent; border: none;
        border-radius: 10px;
        white-space: nowrap;
      }
      .aisw-toggle-btn.active { color: var(--accent-purple); }
      .aisw-toggle-btn svg { width: 14px; height: 14px; }

      /* AI Message Bubble */
      .aisw-bubble {
        background: var(--bg-subtle);
        box-shadow: inset 0 2px 6px rgba(124,58,237,0.07), inset 0 -1px 2px rgba(255,255,255,0.05);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        padding: 1.1rem 1.25rem;
        margin-bottom: 1.1rem;
        min-height: 90px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
        z-index: 2;
        transition: opacity 0.3s ease;
      }
      .aisw-bubble-quote {
        position: absolute;
        top: 14px; left: 14px;
        width: 22px; height: 22px;
        color: var(--accent-purple);
        opacity: 0.2;
      }
      .aisw-bubble-text {
        font-size: 0.9rem;
        line-height: 1.65;
        color: var(--text-main);
        font-weight: 600;
        padding-left: 1.5rem;
      }

      /* Glow Re-analyze button */
      .aisw-btn-analyze {
        width: 100%;
        background: linear-gradient(135deg, #7C3AED, #D946EF);
        color: #fff;
        font-weight: 800;
        font-size: 0.875rem;
        padding: 0.9rem 1.25rem;
        border-radius: 16px;
        border: none;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        box-shadow: 0 8px 22px -4px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.2);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative; z-index: 2;
      }
      .aisw-btn-analyze:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 28px -4px rgba(124,58,237,0.55), inset 0 1px 0 rgba(255,255,255,0.25);
      }
      .aisw-btn-analyze:active { transform: translateY(0); }
      .aisw-btn-analyze svg { width: 17px; height: 17px; }

      @keyframes aisw-spin {
        to { transform: rotate(360deg); }
      }
      .aisw-spin { animation: aisw-spin 0.8s linear infinite; }
    </style>

    <div class="aisw-card">
      <!-- Decorative blobs -->
      <div class="aisw-blob aisw-blob-1"></div>
      <div class="aisw-blob aisw-blob-2"></div>

      <!-- Header -->
      <div class="aisw-header">
        <div class="aisw-header-left">
          <div class="aisw-icon-wrap">
            <div class="aisw-icon-glow"></div>
            <div class="aisw-icon-box">
              <i data-lucide="sparkles" style="width:20px;height:20px;color:#fff;"></i>
            </div>
          </div>
          <div>
            <div class="aisw-title-label">AI Coach Insight</div>
            <div class="aisw-title">Tổng Kết &amp; Đánh Giá</div>
          </div>
        </div>

        <!-- Sliding Toggle -->
        <div class="aisw-toggle" id="aisw-toggle-wrap">
          <div class="aisw-toggle-indicator" id="aisw-indicator"></div>
          <button class="aisw-toggle-btn active" id="aisw-btn-today">
            <i data-lucide="sun"></i> Hôm nay
          </button>
          <button class="aisw-toggle-btn" id="aisw-btn-week">
            <i data-lucide="calendar-days"></i> Tuần này
          </button>
        </div>
      </div>

      <!-- Advice Content Area (Only Advice Bubble) -->
      <div class="aisw-bubble">
        <i data-lucide="quote" class="aisw-bubble-quote"></i>
        <p class="aisw-bubble-text" id="aisw-advice-text">${dailyAdvice}</p>
      </div>

      <!-- Re-analyze button -->
      <button class="aisw-btn-analyze" id="aisw-btn-reanalyze">
        <i data-lucide="refresh-cw"></i>
        <span id="aisw-btn-label">AI phân tích lại chi tiết</span>
      </button>
    </div>
  `;

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();

  // ---- Toggle logic ----
  const btnToday = document.getElementById('aisw-btn-today');
  const btnWeek = document.getElementById('aisw-btn-week');
  const indicator = document.getElementById('aisw-indicator');
  const adviceText = document.getElementById('aisw-advice-text');

  let currentMode = 'today'; // 'today' | 'week'
  let customDailyAdvice = null;

  function switchToToday() {
    currentMode = 'today';
    btnToday.classList.add('active');
    btnWeek.classList.remove('active');
    indicator.style.transform = 'translateX(0%)';
    if (adviceText) {
      adviceText.innerText = customDailyAdvice || dailyAdvice;
    }
  }

  function switchToWeek() {
    currentMode = 'week';
    btnWeek.classList.add('active');
    btnToday.classList.remove('active');
    indicator.style.transform = 'translateX(100%)';
    if (adviceText) {
      adviceText.innerText = weeklyAdvice;
    }
  }

  btnToday?.addEventListener('click', switchToToday);
  btnWeek?.addEventListener('click', switchToWeek);

  // ---- Re-analyze button ----
  document.getElementById('aisw-btn-reanalyze')?.addEventListener('click', async () => {
    const btn = document.getElementById('aisw-btn-reanalyze');
    const bubble = adviceText?.closest('.aisw-bubble');

    btn.disabled = true;
    btn.style.opacity = '0.85';
    btn.innerHTML = '<i data-lucide="loader-2" class="aisw-spin"></i><span>Đang phân tích lại dữ liệu...</span>';
    if (window.lucide) window.lucide.createIcons();
    if (bubble) bubble.style.opacity = '0.55';
    if (adviceText) adviceText.innerText = 'AI đang quét lại toàn bộ chỉ số của bạn...';

    try {
      const isWeekMode = currentMode === 'week';
      const detailedPrompt = isWeekMode
        ? `Hãy phân tích tổng kết tiến độ tuần này của tôi (${profile.name}):
- Calo ròng hôm nay = ${netCalories} kcal (Mục tiêu = ${calorieTarget} kcal)
- Nước uống hôm nay = ${waterIntake}/${waterTarget} ml
- Checklist hôm nay = ${checklistDone}/${checklistTotal} công việc
- Chuỗi Streak = ${progress.currentStreak} ngày

Yêu cầu: Đưa ra nhận xét ngắn gọn 2-3 câu về tổng quan tuần này và lời khuyên hành động định hướng tiếp theo.`
        : `Hãy phân tích sâu tiến độ hôm nay của tôi (${profile.name}):
- Calo nạp = ${caloriesIn} kcal, Calo đốt = ${caloriesOut} kcal, Calo ròng = ${netCalories} kcal (Mục tiêu = ${calorieTarget} kcal)
- Nước uống = ${waterIntake}/${waterTarget} ml (${Math.round((waterIntake / waterTarget) * 100)}%)
- Checklist kỷ luật = ${checklistDone}/${checklistTotal} công việc
- Chuỗi Streak = ${progress.currentStreak} ngày

Yêu cầu: Đánh giá ngắn gọn 2-3 câu, chỉ ra ưu/nhược điểm hôm nay và lời khuyên hành động thực tế nhất.`;

      const aiResponse = await AiCoachService.sendMessage(detailedPrompt);
      if (aiResponse && aiResponse.content) {
        const cleanAdvice = aiResponse.content.replace(/```json[\s\S]*?```/g, '').trim();
        if (adviceText) adviceText.innerText = cleanAdvice;
        if (!isWeekMode) customDailyAdvice = cleanAdvice;
      }
    } catch (e) {
      console.error(e);
      if (adviceText) adviceText.innerText = 'Không thể kết nối AI. Vui lòng thử lại.';
    } finally {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = '<i data-lucide="refresh-cw"></i><span id="aisw-btn-label">AI phân tích lại chi tiết</span>';
      if (window.lucide) window.lucide.createIcons();
      if (bubble) bubble.style.opacity = '1';
    }
  });
}
