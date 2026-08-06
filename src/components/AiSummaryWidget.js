import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { renderGeminiIcon } from './ui/Icons.js';

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
  let dailyAdvice = "";
  if (score >= 80) {
    dailyAdvice = `Tuyệt vời ${profile.name}! Bạn đã kiểm soát calo thâm hụt rất chuẩn (${netCalories}/${calorieTarget} kcal) và uống đủ nước. Tiếp tục giữ vững phong độ này nhé!`;
  } else if (score >= 50) {
    dailyAdvice = `Khá tốt! Bạn đã đạt ${score}/100 điểm kỷ luật. Tối nay hãy bổ sung thêm nước và hoàn thành nốt các việc trong checklist để trọn vẹn ngày nhé.`;
  } else {
    dailyAdvice = `Hôm nay tiến độ hơi chậm một chút. Đừng lo lắng! Hãy tập nhẹ 15 phút hoặc chọn thực đơn ít calo cho bữa tối để bù lại nhé.`;
  }

  // Default Weekly Advice
  const weeklyAdvice = `Tuần này bạn đã duy trì chuỗi Streak ${progress.currentStreak} ngày liên tục. Cân nặng thâm hụt đúng hướng. AI Coach khuyến nghị giữ nguyên mức Calo mục tiêu ${calorieTarget} kcal và duy trì 4 buổi tập/tuần.`;

  const html = `
    <div class="card" style="background: linear-gradient(135deg, rgba(245, 241, 255, 0.95), rgba(255, 253, 250, 0.95)); border: 1px solid var(--border-highlight); position: relative; overflow: hidden;">
      <div class="card-header" style="margin-bottom: 0.85rem;">
        <div class="card-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; color: var(--accent-purple);">
          ${renderGeminiIcon({ width: 22, height: 22, strokeWidth: 1.8, color: 'var(--accent-purple)' })}
          <span>Tổng Kết & Đánh Giá Tiến Độ AI Coach</span>
        </div>

        <!-- Tabs: Daily vs Weekly -->
        <div style="display: flex; gap: 0.4rem; background: var(--bg-subtle); padding: 0.25rem; border-radius: var(--radius-full); border: 1px solid var(--border-color);">
          <button class="btn btn-primary btn-sm" id="btn-summary-tab-daily" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;">Hôm Nay</button>
          <button class="btn btn-secondary btn-sm" id="btn-summary-tab-weekly" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;">Tuần Này</button>
        </div>
      </div>

      <!-- Content Area 1: Daily Progress Review -->
      <div id="ai-summary-content-daily" style="display: block;">
        <div style="display: grid; grid-template-columns: minmax(0, 1fr) 140px; gap: 1.25rem; align-items: center;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
              <span class="badge badge-primary"><i data-lucide="award"></i> Điểm Kỷ Luật: ${score}/100</span>
              <span class="badge badge-secondary">${score >= 80 ? '🔥 Rất Tốt' : score >= 50 ? '⚡ Đạt Yêu Cầu' : '⚠️ Cần Cố Gắng'}</span>
            </div>
            <div style="font-size: 0.925rem; line-height: 1.6; color: var(--text-main); font-weight: 600; margin-bottom: 0.75rem;" id="ai-daily-advice-text">
              "${dailyAdvice}"
            </div>
            <div class="text-xs text-muted" style="display: flex; gap: 1rem;">
              <span>Calo Ròng: <b>${netCalories} / ${calorieTarget} kcal</b></span>
              <span>Nước: <b>${waterIntake} / ${waterTarget} ml</b></span>
              <span>Checklist: <b>${checklistDone}/${checklistTotal}</b></span>
            </div>
          </div>

          <!-- Circular Score Badge -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-card); padding: 1rem; border-radius: 20px; border: 1px solid var(--border-color); text-align: center;">
            <div style="font-size: 2rem; font-weight: 900; color: var(--accent-purple); line-height: 1;">${score}</div>
            <div class="text-xs text-muted" style="font-weight: 800; margin-top: 0.2rem;">/ 100 ĐIỂM</div>
          </div>
        </div>
      </div>

      <!-- Content Area 2: Weekly Progress Review -->
      <div id="ai-summary-content-weekly" style="display: none;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
          <div style="background: var(--bg-card); padding: 0.75rem 1rem; border-radius: 14px; border: 1px solid var(--border-color);">
            <div class="text-xs text-muted">Chuỗi Streak Tuần</div>
            <div style="font-weight: 900; font-size: 1.1rem; color: var(--accent-amber);">${progress.currentStreak} Ngày Thấu Hiểu</div>
          </div>
          <div style="background: var(--bg-card); padding: 0.75rem 1rem; border-radius: 14px; border: 1px solid var(--border-color);">
            <div class="text-xs text-muted">Tổng Calo Tiêu Hao Tuần</div>
            <div style="font-weight: 900; font-size: 1.1rem; color: var(--accent-purple);">~${caloriesOut * 7 || 2100} kcal</div>
          </div>
          <div style="background: var(--bg-card); padding: 0.75rem 1rem; border-radius: 14px; border: 1px solid var(--border-color);">
            <div class="text-xs text-muted">Tiến Độ Cân Nặng</div>
            <div style="font-weight: 900; font-size: 1.1rem; color: var(--accent-blue);">Đúng Lộ Trình</div>
          </div>
        </div>

        <div style="font-size: 0.925rem; line-height: 1.6; color: var(--text-main); font-weight: 600; background: var(--bg-card); padding: 0.9rem 1.1rem; border-radius: 14px; border: 1px solid var(--border-color);" id="ai-weekly-advice-text">
          "${weeklyAdvice}"
        </div>
      </div>

      <!-- Live AI Re-analyze Button -->
      <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
        <button class="btn btn-secondary btn-sm" id="btn-reanalyze-ai-summary">
          <i data-lucide="refresh-cw"></i> AI Phân Tích Lại Chi Tiết
        </button>
      </div>
    </div>
  `;

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();

  // Tab switching event
  const btnDaily = document.getElementById('btn-summary-tab-daily');
  const btnWeekly = document.getElementById('btn-summary-tab-weekly');
  const contentDaily = document.getElementById('ai-summary-content-daily');
  const contentWeekly = document.getElementById('ai-summary-content-weekly');

  btnDaily?.addEventListener('click', () => {
    btnDaily.className = 'btn btn-primary btn-sm';
    btnWeekly.className = 'btn btn-secondary btn-sm';
    contentDaily.style.display = 'block';
    contentWeekly.style.display = 'none';
  });

  btnWeekly?.addEventListener('click', () => {
    btnWeekly.className = 'btn btn-primary btn-sm';
    btnDaily.className = 'btn btn-secondary btn-sm';
    contentDaily.style.display = 'none';
    contentWeekly.style.display = 'block';
  });

  // AI Live Re-analyze button click
  document.getElementById('btn-reanalyze-ai-summary')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-reanalyze-ai-summary');
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Đang Phân Tích...`;

    try {
      const aiResponse = await AiCoachService.sendMessage(`Hãy nhận xét tổng kết ngắn gọn tiến độ hôm nay và tuần này của tôi dựa trên dữ liệu nhật ký calo, nước uống và bài tập.`);
      if (aiResponse && aiResponse.content) {
        document.getElementById('ai-daily-advice-text').innerText = aiResponse.content.substring(0, 280) + "...";
      }
    } catch (e) {
      console.error(e);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="refresh-cw"></i> AI Phân Tích Lại Chi Tiết`;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}
