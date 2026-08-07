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

  // Dynamic status badge color theme
  let statusBg = "rgba(239, 68, 68, 0.12)";
  let statusColor = "#DC2626";
  let statusBorder = "rgba(239, 68, 68, 0.35)";
  let statusText = "⚠️ Cần Cố Gắng";

  if (score >= 80) {
    statusBg = "rgba(16, 185, 129, 0.12)";
    statusColor = "#059669";
    statusBorder = "rgba(16, 185, 129, 0.35)";
    statusText = "🔥 Phong Độ Trái Tim";
  } else if (score >= 50) {
    statusBg = "rgba(245, 158, 11, 0.12)";
    statusColor = "#D97706";
    statusBorder = "rgba(245, 158, 11, 0.35)";
    statusText = "💪 Khá Tốt";
  }

  const html = `
    <div class="card" style="background: linear-gradient(135deg, rgba(248, 246, 255, 0.98) 0%, rgba(255, 252, 248, 0.98) 100%); border: 1.5px solid rgba(117, 86, 217, 0.3); box-shadow: 0 16px 36px -10px rgba(117, 86, 217, 0.15); position: relative; overflow: hidden; border-radius: 24px;">
      <div class="card-header" style="margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
        <div class="card-title" style="display: flex; align-items: center; gap: 0.6rem; font-size: 1.15rem; font-weight: 800; color: #7556D9;">
          ${renderGeminiIcon({ width: 24, height: 24, strokeWidth: 1.8, color: '#7556D9' })}
          <span>Tổng Kết & Đánh Giá Tiến Độ AI Coach</span>
        </div>

        <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
          <!-- Live AI Re-analyze Button right next to tabs -->
          <button class="btn btn-secondary btn-sm" id="btn-reanalyze-ai-summary" style="padding: 0.4rem 0.85rem; font-size: 0.8rem; font-weight: 700;">
            <i data-lucide="refresh-cw"></i> AI Phân Tích Lại Chi Tiết
          </button>

          <!-- Tabs: Daily vs Weekly -->
          <div style="display: flex; gap: 0.4rem; background: var(--bg-subtle); padding: 0.3rem; border-radius: var(--radius-full); border: 1px solid var(--border-color);">
            <button class="btn btn-primary btn-sm" id="btn-summary-tab-daily" style="padding: 0.4rem 1rem; font-size: 0.825rem; font-weight: 700;">Hôm Nay</button>
            <button class="btn btn-secondary btn-sm" id="btn-summary-tab-weekly" style="padding: 0.4rem 1rem; font-size: 0.825rem; font-weight: 700;">Tuần Này</button>
          </div>
        </div>
      </div>

      <!-- Content Area 1: Daily Progress Review -->
      <div id="ai-summary-content-daily" style="display: block;">
        <div style="display: grid; grid-template-columns: minmax(0, 1fr) 150px; gap: 1.5rem; align-items: center;">
          
          <!-- Left Main Content -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            
            <!-- Header Badges Row -->
            <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
              <div style="display: inline-flex; align-items: center; gap: 0.45rem; background: #7556D9; color: #FFFFFF; padding: 0.45rem 1rem; border-radius: var(--radius-full); font-weight: 800; font-size: 0.875rem; box-shadow: 0 4px 14px rgba(117, 86, 217, 0.3);">
                <i data-lucide="award" style="width: 16px; height: 16px; color: #FFFFFF;"></i> Điểm Kỷ Luật: ${score}/100
              </div>
              <div style="display: inline-flex; align-items: center; gap: 0.35rem; background: ${statusBg}; color: ${statusColor}; border: 1.5px solid ${statusBorder}; padding: 0.45rem 1rem; border-radius: var(--radius-full); font-weight: 800; font-size: 0.85rem;">
                ${statusText}
              </div>
            </div>

            <!-- AI Advice Highlighting Card -->
            <div style="background: #FFFFFF; border-left: 4px solid #7556D9; padding: 1rem 1.25rem; border-radius: 16px; border-top: 1px solid rgba(233, 228, 243, 0.8); border-right: 1px solid rgba(233, 228, 243, 0.8); border-bottom: 1px solid rgba(233, 228, 243, 0.8); box-shadow: 0 4px 16px rgba(117, 86, 217, 0.06); position: relative;">
              <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <i data-lucide="quote" style="width: 22px; height: 22px; color: #7556D9; flex-shrink: 0; margin-top: 0.1rem;"></i>
                <div style="font-size: 0.95rem; line-height: 1.6; color: #26213C; font-weight: 600;" id="ai-daily-advice-text">
                  ${dailyAdvice}
                </div>
              </div>
            </div>

            <!-- Sub-Metrics 3 Mini Cards Row -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.65rem;">
              <div style="background: rgba(117, 86, 217, 0.08); border: 1px solid rgba(117, 86, 217, 0.22); padding: 0.65rem 0.9rem; border-radius: 14px; display: flex; align-items: center; gap: 0.65rem;">
                <div style="width: 32px; height: 32px; border-radius: 10px; background: #7556D9; color: #FFFFFF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(117, 86, 217, 0.25);">
                  <i data-lucide="flame" style="width: 18px; height: 18px;"></i>
                </div>
                <div>
                  <div class="text-xs text-muted" style="font-size: 0.725rem; font-weight: 700; color: #706A82;">Calo Ròng</div>
                  <div style="font-size: 0.875rem; font-weight: 800; color: #7556D9;">${netCalories} / ${calorieTarget} <span style="font-weight: 600; font-size: 0.725rem;">kcal</span></div>
                </div>
              </div>

              <div style="background: rgba(49, 114, 184, 0.08); border: 1px solid rgba(49, 114, 184, 0.22); padding: 0.65rem 0.9rem; border-radius: 14px; display: flex; align-items: center; gap: 0.65rem;">
                <div style="width: 32px; height: 32px; border-radius: 10px; background: #3172B8; color: #FFFFFF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(49, 114, 184, 0.25);">
                  <i data-lucide="droplet" style="width: 18px; height: 18px;"></i>
                </div>
                <div>
                  <div class="text-xs text-muted" style="font-size: 0.725rem; font-weight: 700; color: #706A82;">Nước Uống</div>
                  <div style="font-size: 0.875rem; font-weight: 800; color: #3172B8;">${waterIntake} / ${waterTarget} <span style="font-weight: 600; font-size: 0.725rem;">ml</span></div>
                </div>
              </div>

              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.22); padding: 0.65rem 0.9rem; border-radius: 14px; display: flex; align-items: center; gap: 0.65rem;">
                <div style="width: 32px; height: 32px; border-radius: 10px; background: #10B981; color: #FFFFFF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);">
                  <i data-lucide="check-circle-2" style="width: 18px; height: 18px;"></i>
                </div>
                <div>
                  <div class="text-xs text-muted" style="font-size: 0.725rem; font-weight: 700; color: #706A82;">Checklist</div>
                  <div style="font-size: 0.875rem; font-weight: 800; color: #059669;">${checklistDone} / ${checklistTotal} <span style="font-weight: 600; font-size: 0.725rem;">mục</span></div>
                </div>
              </div>
            </div>

          </div>

          <!-- Right Large Glowing Score Box -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #FFFFFF; padding: 1.25rem 1rem; border-radius: 22px; border: 1.5px solid rgba(117, 86, 217, 0.3); text-align: center; box-shadow: 0 10px 25px -5px rgba(117, 86, 217, 0.18); height: 100%;">
            <div style="font-size: 2.75rem; font-weight: 900; color: #7556D9; line-height: 1;">${score}</div>
            <div style="font-size: 0.75rem; font-weight: 800; color: #706A82; letter-spacing: 0.5px; margin-top: 0.35rem;">/ 100 ĐIỂM</div>
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
      const detailedPrompt = `Hãy lục tìm kiến thức y học thể thao, dinh dưỡng toàn diện và phân tích sâu tiến độ hôm nay của tôi (${profile.name}):
- Calo nạp = ${caloriesIn} kcal, Calo đốt = ${caloriesOut} kcal, Calo ròng = ${netCalories} kcal (Mục tiêu = ${calorieTarget} kcal)
- Nước uống = ${waterIntake}/${waterTarget} ml (${Math.round((waterIntake / waterTarget) * 100)}%)
- Checklist kỷ luật = ${checklistDone}/${checklistTotal} công việc
- Chuỗi Streak = ${progress.currentStreak} ngày

Yêu cầu: Đánh giá ngắn gọn, chỉ ra ưu điểm, nhược điểm và đưa ra lời khuyên hành động thực tế tốt nhất.`;

      const aiResponse = await AiCoachService.sendMessage(detailedPrompt);
      if (aiResponse && aiResponse.content) {
        const cleanAdvice = aiResponse.content.replace(/```json[\s\S]*?```/g, '').trim();
        const adviceEl = document.getElementById('ai-daily-advice-text');
        if (adviceEl) adviceEl.innerText = cleanAdvice;
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
