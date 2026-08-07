import confetti from 'canvas-confetti';
import { DataService } from '../services/dataService.js';
import { renderWeightChart, renderCalorieChart, renderMacroChart } from '../utils/chartUtils.js';
import { renderAiSummaryWidget } from './AiSummaryWidget.js';
import { renderCheckbox, initCheckboxListeners } from './ui/Checkbox.js';
import { renderGeminiIcon } from './ui/Icons.js';

export async function renderDashboard(onNavigateTab, onOpenAiCoach) {
  const profile = await DataService.getUserProfile();
  const goal = await DataService.getUserGoal();
  const todayLog = await DataService.getDailyLog();
  const progress = await DataService.getUserProgress();

  // Calorie calculations
  const caloriesIn = todayLog.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const caloriesOut = todayLog.workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  const netCalories = caloriesIn - caloriesOut;
  const calorieTarget = goal.dailyCalorieTarget || 2000;
  const remainingCalories = calorieTarget - netCalories;

  // Macros
  const currentProtein = todayLog.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const currentCarb = todayLog.meals.reduce((sum, m) => sum + (m.carb || 0), 0);
  const currentFat = todayLog.meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  // Weight
  const initialWeight = goal.startWeight || profile.currentWeight;
  const currentW = todayLog.weight || profile.currentWeight;
  const targetW = goal.targetWeight || 65;
  const totalWeightDiff = initialWeight - targetW;
  const weightLost = initialWeight - currentW;
  let weightProgressPercent = 0;
  if (totalWeightDiff !== 0) {
    weightProgressPercent = Math.min(100, Math.max(0, Math.round((weightLost / totalWeightDiff) * 100)));
  }

  // Water
  const waterIntake = todayLog.waterIntake || 0;
  const waterTarget = goal.waterTarget || 2500;
  const waterPercent = Math.min(100, Math.round((waterIntake / waterTarget) * 100));

  // Check-in Touchpoints
  const hasMeal = todayLog.meals.length > 0;
  const hasWater = waterIntake > 0;
  const hasWorkout = todayLog.workouts.length > 0 || todayLog.isRestDay;
  const hasChecklist = todayLog.checklist.some(t => t.done);

  const checkins = [hasMeal, hasWater, hasWorkout, hasChecklist];
  const completeCount = checkins.filter(Boolean).length;
  const checkinPercent = Math.round((completeCount / 4) * 100);

  // Date String in Vietnamese
  const dateFormatted = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  const dashboardHtml = `
    <div style="display: flex; flex-direction: column; gap: 1.75rem;">
      
      <!-- Signature Hero Journal Card with Vector Mascot SVG -->
      <div class="card" style="background: linear-gradient(135deg, rgba(245, 241, 255, 0.9), rgba(251, 250, 255, 0.9)); border: 1px solid var(--border-highlight); position: relative; overflow: hidden;">
        <div style="display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr); gap: 1.5rem; align-items: center;" class="dash-grid">
          <div>
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <span class="badge badge-primary"><i data-lucide="calendar"></i> ${dateFormatted}</span>
              <span class="badge badge-secondary"><i data-lucide="sparkles"></i> Lv. ${progress.level} · ${progress.totalXp} XP</span>
              <span class="badge badge-blue"><i data-lucide="flame"></i> Streak: ${progress.currentStreak} Ngày</span>
            </div>
            
            <h1 style="font-size: 1.85rem; font-weight: 900; color: var(--text-main); margin-bottom: 0.5rem;">
              Nhật ký hôm nay của ${profile.name}
            </h1>
            <p class="text-sm text-muted" style="margin-bottom: 1.25rem;">
              Mỗi ghi nhận nhỏ đều góp phần tạo nên chuỗi thói quen bền vững. Bạn đã hoàn thành <strong style="color: var(--accent-purple);" id="dash-hero-touchpoint-count">${completeCount}/4</strong> điểm chạm hôm nay.
            </p>

            <!-- 4 Touchpoint Pills -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 1.25rem;" id="dash-hero-touchpoint-pills">
              ${renderTouchpointPill('Dinh dưỡng', hasMeal, 'utensils')}
              ${renderTouchpointPill('Nước uống', hasWater, 'droplets')}
              ${renderTouchpointPill('Tập luyện', hasWorkout, 'dumbbell')}
              ${renderTouchpointPill('Checklist', hasChecklist, 'check-square')}
            </div>

            <div style="display: flex; gap: 0.75rem;">
              <button class="btn btn-primary" id="btn-quick-update-journal">
                <i data-lucide="plus-circle"></i> Cập Nhật Hôm Nay
              </button>
              <button class="btn btn-ai" id="dash-btn-ai-coach">
                ${renderGeminiIcon({ width: 17, height: 17 })} AI Coach Cố Vấn
              </button>
            </div>
          </div>

          <!-- Right Hero Widget with SVG Mascot Icon -->
          <div style="background: var(--bg-card); padding: 1.25rem; border-radius: 20px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem; position: relative;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div class="text-xs text-muted" style="font-weight: 800; text-transform: uppercase;">Tiến độ check-in</div>
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);" id="dash-hero-checkin-remaining">Còn ${4 - completeCount} mục để trọn ngày</div>
              </div>
              <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--accent-purple-light); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 900; color: var(--accent-purple); border: 3px solid var(--accent-purple);" id="dash-hero-checkin-percent">
                ${checkinPercent}%
              </div>
            </div>

            <!-- Compact Metrics Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; text-align: center;">
              <div style="background: var(--bg-subtle); padding: 0.6rem; border-radius: 12px; border: 1px solid var(--border-color);">
                <div class="text-xs text-muted">Năng lượng</div>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--accent-purple);" id="dash-hero-calories">${caloriesIn} kcal</div>
              </div>
              <div style="background: var(--bg-subtle); padding: 0.6rem; border-radius: 12px; border: 1px solid var(--border-color);">
                <div class="text-xs text-muted">Nước</div>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--accent-blue);" id="dash-hero-water">${(waterIntake / 1000).toFixed(1)} L</div>
              </div>
              <div style="background: var(--bg-subtle); padding: 0.6rem; border-radius: 12px; border: 1px solid var(--border-color);">
                <div class="text-xs text-muted">Chuỗi ngày</div>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--accent-amber);">${progress.currentStreak} ngày</div>
              </div>
            </div>

            <!-- AI Coach Message Card (No robot head icon) -->
            <div class="dash-coach-msg">
              <div class="msg-label">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 12px; height: 12px;">
                  <path d="M12 2L9.5 8.5 3 9.5l5 4.5L6.5 21 12 17.5 17.5 21 16 14l5-4.5-6.5-1L12 2z"/>
                </svg>
                AI Coach
              </div>
              <p class="msg-text" id="dash-hero-coach-text">
                "Cố lên <strong>${profile.name}</strong>! Chỉ còn <span class="highlight">${remainingCalories} kcal</span> nữa là hoàn thành mục tiêu ngày!"
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Dedicated AI Summary & Progress Review Card (Daily / Weekly Tabs) -->
      <div id="dashboard-ai-summary-container"></div>

      <!-- Main Dashboard Content Grid -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.75rem;" class="dash-grid">
        <!-- Left Column: ApexCharts -->
        <div style="display: flex; flex-direction: column; gap: 1.75rem;">
          <!-- Weight Trendline ApexChart -->
          <div class="card">
            <div class="card-header">
              <div class="card-title"><i data-lucide="trending-down" class="text-purple"></i> Hành Trình Cân Nặng (Thực tế vs Mục tiêu)</div>
              <button class="btn btn-secondary btn-sm" id="btn-quick-log-weight"><i data-lucide="plus"></i> Ghi Cân Nặng</button>
            </div>
            <div id="chart-weight-trend" style="min-height: 270px;"></div>
          </div>

          <!-- Calorie In / Out ApexChart -->
          <div class="card">
            <div class="card-header">
              <div class="card-title"><i data-lucide="bar-chart-3" style="color: var(--accent-blue);"></i> Biểu Đồ Calo Nạp & Đốt Theo Ngày</div>
            </div>
            <div id="chart-calorie-io" style="min-height: 250px;"></div>
          </div>
        </div>

        <!-- Right Column: Widgets -->
        <div style="display: flex; flex-direction: column; gap: 1.75rem;">
          <!-- Water Intake Widget with Crisp SVG Water Glass Illustration -->
          <div class="card">
            <div class="card-header">
              <div class="card-title"><i data-lucide="droplet" style="color: var(--accent-blue);"></i> Theo Dõi Nước Uống</div>
              <span class="badge badge-blue" id="water-badge-display">${waterIntake} / ${waterTarget} ml</span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
              <!-- Crisp SVG Vector Water Glass with Dynamic Liquid Level -->
              <div style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: var(--accent-blue-light); border-radius: 14px; border: 1px solid rgba(49, 114, 184, 0.25); flex-shrink: 0;">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 3L6.5 19.5C6.6 20.9 7.8 22 9.2 22H14.8C16.2 22 17.4 20.9 17.5 19.5L19 3" stroke="var(--accent-blue)" stroke-width="2" stroke-linecap="round"/>
                  <path id="water-svg-liquid" d="M7 9C9 8 11 10 13 9C15 8 17 9 17 9V18C17 19.1 16.1 20 15 20H9C7.9 20 7 19.1 7 18V9Z" fill="var(--accent-blue)" fill-opacity="${waterPercent > 0 ? 0.4 : 0.05}" style="transition: fill-opacity 0.6s ease;"/>
                  <circle cx="10" cy="13" r="1" fill="var(--accent-blue)"/>
                  <circle cx="13" cy="15" r="1.5" fill="var(--accent-blue)"/>
                </svg>
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 800; font-size: 1.2rem; color: var(--accent-blue);" id="water-text-display">${waterPercent}% Đã Uống</div>
                <div class="progress-bar-bg" style="margin-top: 0.35rem;">
                  <div class="progress-bar-fill" id="water-progress-fill" style="width: ${waterPercent}%; background: var(--accent-blue); transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);"></div>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" id="btn-water-250" style="padding: 0.5rem 0.4rem; font-size: 0.8rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M7 2h10l1 7H6L7 2z"/>
                  <path d="M6 9l1.5 12.5a2 2 0 0 0 2 1.5h5a2 2 0 0 0 2-1.5L18 9"/>
                </svg>
                +250ml
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-water-500" style="padding: 0.5rem 0.4rem; font-size: 0.8rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v6"/>
                  <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
                </svg>
                +500ml
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-water-reset" style="padding: 0.5rem 0.4rem; font-size: 0.8rem; color: var(--text-muted);" title="Đặt lại mực nước uống">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                Đặt lại
              </button>
            </div>
          </div>

          <!-- Daily AI Checklist -->
          <div class="card">
            <div class="card-header">
              <div class="card-title"><i data-lucide="check-circle-2" class="text-purple"></i> Checklist Kỷ Luật</div>
              <span class="badge badge-primary" id="checklist-badge-count">${todayLog.checklist.filter(t => t.done).length}/${todayLog.checklist.length} Tick</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.65rem;" id="dash-checklist-container">
              ${todayLog.checklist.map(item => `
                <div class="checklist-item-row">
                  <div style="flex: 1;">
                    ${renderCheckbox({ taskId: item.id, checked: item.done, labelText: item.task })}
                  </div>
                  <button class="btn btn-secondary btn-icon btn-sm" data-delete-task-id="${item.id}" style="width: 26px; height: 26px; border: 0; padding: 0; color: var(--text-muted);" title="Xóa">
                    <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                  </button>
                </div>
              `).join('')}
            </div>

            <!-- Quick Add Daily Task Input -->
            <form id="form-add-daily-task" style="display: flex; gap: 0.5rem; margin-top: 0.85rem;">
              <input type="text" class="form-input" id="input-new-daily-task" placeholder="+ Thêm việc kỷ luật hôm nay..." style="padding: 0.45rem 0.75rem; font-size: 0.825rem;" required>
              <button type="submit" class="btn btn-primary btn-sm" style="padding: 0.45rem 0.85rem;"><i data-lucide="plus"></i> Thêm</button>
            </form>
          </div>

          <!-- Macro ApexChart Donut Widget -->
          <div class="card">
            <div class="card-header">
              <div class="card-title"><i data-lucide="pie-chart" class="text-purple"></i> Phân Bổ Macro</div>
            </div>
            <div id="chart-macro-doughnut" style="min-height: 200px;"></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; margin-top: 0.5rem; font-size: 0.8rem;">
              <div><span style="color: var(--accent-purple); font-weight: 700;">Protein:</span><br><b>${currentProtein}/${goal.macroTarget?.protein || 120}g</b></div>
              <div><span style="color: var(--accent-blue); font-weight: 700;">Carb:</span><br><b>${currentCarb}/${goal.macroTarget?.carb || 160}g</b></div>
              <div><span style="color: var(--accent-amber); font-weight: 700;">Fat:</span><br><b>${currentFat}/${goal.macroTarget?.fat || 50}g</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = dashboardHtml;
    if (window.lucide) window.lucide.createIcons();

    // Render AI Progress Evaluation Summary Widget
    await renderAiSummaryWidget('dashboard-ai-summary-container');

    // Render ApexCharts
    const allLogs = [todayLog];
    renderWeightChart('chart-weight-trend', allLogs, targetW);
    renderCalorieChart('chart-calorie-io', allLogs, calorieTarget);
    renderMacroChart('chart-macro-doughnut', { protein: currentProtein, carb: currentCarb, fat: currentFat }, goal.macroTarget);

    // Handlers
    document.getElementById('dash-btn-ai-coach')?.addEventListener('click', onOpenAiCoach);
    document.getElementById('btn-quick-update-journal')?.addEventListener('click', () => onNavigateTab('meals'));

    // Smooth Water Tracker Animation Handler (No Full Page Re-render Flash!)
    function animateWaterUpdate(newMl, waterTarget) {
      const newPercent = Math.min(100, Math.round((newMl / waterTarget) * 100));
      const fillEl = document.getElementById('water-progress-fill');
      const textEl = document.getElementById('water-text-display');
      const badgeEl = document.getElementById('water-badge-display');
      const svgLiquid = document.getElementById('water-svg-liquid');

      if (fillEl) fillEl.style.width = `${newPercent}%`;
      if (badgeEl) badgeEl.innerText = `${newMl} / ${waterTarget} ml`;
      if (svgLiquid) svgLiquid.style.fillOpacity = newPercent > 0 ? '0.4' : '0.05';

      if (textEl) {
        let startVal = parseInt(textEl.innerText) || 0;
        let endVal = newPercent;
        let duration = 500;
        let startTime = null;

        function step(timestamp) {
          if (!startTime) startTime = timestamp;
          let progress = Math.min((timestamp - startTime) / duration, 1);
          let currentVal = Math.round(startVal + (endVal - startVal) * progress);
          textEl.innerText = `${currentVal}% Đã Uống`;
          if (progress < 1) {
            requestAnimationFrame(step);
          }
        }
        requestAnimationFrame(step);
      }
    }

    function updateDashboardRealtime(updatedLog) {
      const cIn = updatedLog.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      const cOut = updatedLog.workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
      const net = cIn - cOut;
      const rem = calorieTarget - net;
      const wIntake = updatedLog.waterIntake || 0;

      const hMeal = updatedLog.meals.length > 0;
      const hWater = wIntake > 0;
      const hWorkout = updatedLog.workouts.length > 0 || updatedLog.isRestDay;
      const hChecklist = updatedLog.checklist.some(t => t.done);

      const cIns = [hMeal, hWater, hWorkout, hChecklist];
      const cCount = cIns.filter(Boolean).length;
      const cPercent = Math.round((cCount / 4) * 100);

      const countEl = document.getElementById('dash-hero-touchpoint-count');
      if (countEl) countEl.innerText = `${cCount}/4`;

      const pillsEl = document.getElementById('dash-hero-touchpoint-pills');
      if (pillsEl) {
        pillsEl.innerHTML = `
          ${renderTouchpointPill('Dinh dưỡng', hMeal, 'utensils')}
          ${renderTouchpointPill('Nước uống', hWater, 'droplets')}
          ${renderTouchpointPill('Tập luyện', hWorkout, 'dumbbell')}
          ${renderTouchpointPill('Checklist', hChecklist, 'check-square')}
        `;
        if (window.lucide) window.lucide.createIcons({ el: pillsEl });
      }

      const remEl = document.getElementById('dash-hero-checkin-remaining');
      if (remEl) remEl.innerText = `Còn ${4 - cCount} mục để trọn ngày`;

      const pctEl = document.getElementById('dash-hero-checkin-percent');
      if (pctEl) pctEl.innerText = `${cPercent}%`;

      const calEl = document.getElementById('dash-hero-calories');
      if (calEl) calEl.innerText = `${cIn} kcal`;

      const waterEl = document.getElementById('dash-hero-water');
      if (waterEl) waterEl.innerText = `${(wIntake / 1000).toFixed(1)} L`;

      const msgEl = document.getElementById('dash-hero-coach-text');
      if (msgEl) {
        msgEl.innerHTML = `"Cố lên <strong>${profile.name}</strong>! Chỉ còn <span class="highlight">${rem} kcal</span> nữa là hoàn thành mục tiêu ngày!"`;
      }

      // Live refresh AI Summary Widget
      renderAiSummaryWidget('dashboard-ai-summary-container');
    }

    // Water quick buttons + smooth animation
    document.getElementById('btn-water-250')?.addEventListener('click', async () => {
      const updatedLog = await DataService.addWaterIntake(todayLog.date, 250);
      animateWaterUpdate(updatedLog.waterIntake, waterTarget);
      updateDashboardRealtime(updatedLog);
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
    });

    document.getElementById('btn-water-500')?.addEventListener('click', async () => {
      const updatedLog = await DataService.addWaterIntake(todayLog.date, 500);
      animateWaterUpdate(updatedLog.waterIntake, waterTarget);
      updateDashboardRealtime(updatedLog);
      confetti({ particleCount: 50, spread: 80, origin: { y: 0.8 } });
    });

    document.getElementById('btn-water-reset')?.addEventListener('click', async () => {
      const updatedLog = await DataService.resetWaterIntake(todayLog.date);
      animateWaterUpdate(0, waterTarget);
      updateDashboardRealtime(updatedLog);
    });

    // Custom Circular Checkbox toggles + Smooth SVG Path Drawing (NO Full Page Re-render Flash!)
    initCheckboxListeners(mountNode, async (taskId, isChecked) => {
      const updatedLog = await DataService.toggleChecklistItem(todayLog.date, taskId);
      
      // Update badge count dynamically
      const badgeCountEl = document.getElementById('checklist-badge-count');
      if (badgeCountEl) {
        const doneCount = updatedLog.checklist.filter(t => t.done).length;
        badgeCountEl.innerText = `${doneCount}/${updatedLog.checklist.length} Tick`;
      }

      updateDashboardRealtime(updatedLog);

      if (isChecked) {
        confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
      }
    });

    // Delete checklist item with Smooth Slide-Up Animation for items below
    document.querySelectorAll('[data-delete-task-id]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const taskId = btn.getAttribute('data-delete-task-id');
        const itemRow = btn.closest('.checklist-item-row');

        if (itemRow) {
          // 1. Add removing animation class (fades out, shrinks height to 0, elements below slide up smoothly)
          itemRow.classList.add('checklist-item-removing');

          // 2. Wait 350ms for transition before removing DOM element and updating IndexedDB
          setTimeout(async () => {
            itemRow.remove();
            const updatedLog = await DataService.deleteChecklistItem(todayLog.date, taskId);

            // Update badge count dynamically
            const badgeCountEl = document.getElementById('checklist-badge-count');
            if (badgeCountEl) {
              const doneCount = updatedLog.checklist.filter(t => t.done).length;
              badgeCountEl.innerText = `${doneCount}/${updatedLog.checklist.length} Tick`;
            }

            updateDashboardRealtime(updatedLog);
          }, 350);
        }
      });
    });

    // Add new custom daily task form submit
    document.getElementById('form-add-daily-task')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('input-new-daily-task');
      const val = input.value.trim();
      if (val) {
        await DataService.addChecklistItem(todayLog.date, val);
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
        renderDashboard(onNavigateTab, onOpenAiCoach);
      }
    });

    // Quick log weight prompt
    document.getElementById('btn-quick-log-weight')?.addEventListener('click', async () => {
      const input = prompt("Nhập cân nặng thực tế hôm nay (kg):", currentW);
      if (input && !isNaN(input)) {
        await DataService.updateWeightLog(todayLog.date, parseFloat(input));
        confetti({ particleCount: 60, spread: 90, origin: { y: 0.5 } });
        renderDashboard(onNavigateTab, onOpenAiCoach);
      }
    });
  }
}

function renderTouchpointPill(label, isDone, iconName) {
  return `
    <div style="display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.6rem; border-radius: 12px; border: 1px solid ${isDone ? '#CFC0FF' : 'var(--border-color)'}; background: ${isDone ? 'var(--accent-purple-light)' : 'var(--bg-card)'}; font-size: 0.775rem; font-weight: 700; color: ${isDone ? 'var(--accent-purple)' : 'var(--text-subtle)'};">
      <div style="width: 18px; height: 18px; border-radius: 50%; background: ${isDone ? 'var(--accent-purple)' : 'var(--bg-subtle)'}; color: ${isDone ? '#fff' : 'var(--text-subtle)'}; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="${isDone ? 'check' : iconName}" style="width: 11px; height: 11px;"></i>
      </div>
      <span>${label}</span>
    </div>
  `;
}
