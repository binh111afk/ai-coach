import confetti from 'canvas-confetti';
import { DataService, getPlanForJourneyDay } from '../services/dataService.js';
import { renderWeightChart, renderCalorieChart, renderMacroChart } from '../utils/chartUtils.js';
import { renderAiSummaryWidget } from './AiSummaryWidget.js';
import { renderCheckbox, initCheckboxListeners } from './ui/Checkbox.js';
import { renderGeminiIcon } from './ui/Icons.js';
import { Modal } from './ui/Modal.js';
import { showLevelRoadmapModal } from './ui/LevelRoadmapModal.js';

export async function renderDashboard(onNavigateTab, onOpenAiCoach) {
  const profile = await DataService.getUserProfile();
  const goal = await DataService.getUserGoal();
  const plan = await DataService.getUserPlan();
  const todayLog = await DataService.getDailyLog();
  const progress = await DataService.getUserProgress();

  const todayStr = DataService.getTodayString();
  const currentJourneyDay = DataService.calculateCurrentJourneyDay(goal.startDate);

  const { mealEntry: todayRecommendedMeals, workout: todayRecommendedWorkout, phase: currentPhase } = getPlanForJourneyDay(plan, currentJourneyDay);

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

  const mascotStatus = 'active'; // Logic for mascot state

  const dashboardHtml = `
    <div style="display: flex; flex-direction: column; gap: 1.75rem;">
      
      <!-- Signature Hero Journal Card with Vector Mascot SVG -->
      <div class="card hero-banner-card" style="position: relative; overflow: hidden;">
        <div style="display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr); gap: 1.5rem; align-items: center;" class="dash-grid">
          <div>
            <div class="status-badges-v2">
              <!-- Date – Indigo -->
              <div class="status-badge date">
                <div class="icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <span class="text">${dateFormatted}</span>
              </div>

              <!-- Level – Vàng -->
              <div class="status-badge level" id="dash-level-badge" style="cursor: pointer;" title="Xem Lộ Trình Cấp Độ">
                <div class="icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 17.2 5.7 21l2.3-7-6-4.8h7.6L12 2z"/>
                  </svg>
                </div>
                <span class="text">Lv. ${progress.level} · ${progress.totalXp} XP</span>
              </div>

              <!-- Streak – Lửa tím -->
              <div class="status-badge streak">
                <div class="icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 23c-4.5 0-7-3.2-7-7 0-2.8 1.5-5 3-6.5.4 2.5 1.8 3.8 1.8 3.8C9.2 9.5 10.5 5 12 2c2 3.5 3 7 3 10 0 0 2-1.2 2-4 2 2 3 4.5 3 7.5 0 3.8-2.5 7-8 7z"/>
                  </svg>
                </div>
                <span class="text">Streak: ${progress.currentStreak} Ngày</span>
              </div>
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

          <!-- Today AI Recommendation Quick-Log Card -->
          <div class="card" style="border: 1px solid var(--border-color); background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98)); border-radius: 20px;">
            <div class="card-header" style="margin-bottom: 0.85rem;">
              <div>
                <div class="card-title" style="display: flex; align-items: center; gap: 0.5rem; color: var(--accent-purple); font-size: 1.05rem;">
                  ${renderGeminiIcon({ width: 18, height: 18, color: 'var(--accent-purple)' })} Gợi Ý Thực Đơn & Tập Luyện AI Hôm Nay (Ngày ${currentJourneyDay})
                </div>
                <div class="text-xs text-muted" style="margin-top: 0.2rem;">${currentPhase?.phaseLabel || 'Kế hoạch hành trình'} · Bấm để ghi nhận nhanh vào nhật ký</div>
              </div>
              <button class="btn btn-secondary btn-sm" id="dash-btn-view-full-plan" style="font-size: 0.78rem;">
                Xem Kế Hoạch ↗
              </button>
            </div>

            <!-- 2 Column Layout: Left Meals, Right Workout -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;" class="dash-grid">
              <!-- Left: 4 Meals Summary -->
              <div style="background: var(--bg-card); padding: 0.9rem; border-radius: 14px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; gap: 0.6rem;">
                <div>
                  <div style="font-size: 0.8rem; font-weight: 800; color: var(--accent-purple); display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
                    <span>🥗 Thực Đơn AI Gợi Ý</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">~${(todayRecommendedMeals?.breakfast?.calories || 0) + (todayRecommendedMeals?.lunch?.calories || 0) + (todayRecommendedMeals?.dinner?.calories || 0) + (todayRecommendedMeals?.snack?.calories || 0)} kcal</span>
                  </div>
                  <div style="font-size: 0.8rem; line-height: 1.45; color: var(--text-main);">
                    <div>• <b>Sáng:</b> ${todayRecommendedMeals?.breakfast?.name || 'Chưa chọn'}</div>
                    <div>• <b>Trưa:</b> ${todayRecommendedMeals?.lunch?.name || 'Chưa chọn'}</div>
                    <div>• <b>Tối:</b> ${todayRecommendedMeals?.dinner?.name || 'Chưa chọn'}</div>
                    <div>• <b>Phụ:</b> ${todayRecommendedMeals?.snack?.name || 'Chưa chọn'}</div>
                  </div>
                </div>
                <button class="btn btn-primary btn-sm" id="dash-btn-quick-log-meals" style="font-size: 0.78rem; padding: 0.45rem; justify-content: center; width: 100%;">
                  <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i> Ghi Nhận Thực Đơn Hôm Nay
                </button>
              </div>

              <!-- Right: Today Workout Card -->
              <div style="background: var(--bg-card); padding: 0.9rem; border-radius: 14px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; gap: 0.6rem;">
                <div>
                  <div style="font-size: 0.8rem; font-weight: 800; color: var(--accent-amber); display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
                    <span>🏋️ Lịch Tập AI Gợi Ý</span>
                    <span class="badge badge-secondary" style="font-size: 0.7rem;">${todayRecommendedWorkout?.duration || 0} phút</span>
                  </div>
                  <div style="font-weight: 800; font-size: 0.925rem; color: var(--text-main); line-height: 1.35;">
                    ${todayRecommendedWorkout?.title || 'Ngày Nghỉ Phục Hồi'}
                  </div>
                  <div class="text-xs text-muted" style="margin-top: 0.35rem;">
                    Đốt ~<b>${todayRecommendedWorkout?.estBurn || 0} kcal</b> Out · Cường độ Moderate
                  </div>
                </div>

                <button class="btn btn-secondary btn-sm" id="dash-btn-quick-log-workout" style="font-size: 0.78rem; padding: 0.45rem; justify-content: center; width: 100%;">
                  <i data-lucide="check-circle-2" style="width: 14px; height: 14px; color: var(--accent-green);"></i> Ghi Nhận Hoàn Thành Tập
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Widgets -->
        <div style="display: flex; flex-direction: column; gap: 1.75rem;">
          <!-- Improved Water Tracker Card -->
          <div class="water-card ${waterIntake >= waterTarget ? 'goal-reached' : ''}" id="waterCard">
            <!-- Header -->
            <div class="water-header">
              <div class="water-title">
                <div class="icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z"/>
                  </svg>
                </div>
                <h2>Theo Dõi Nước Uống</h2>
              </div>
              <div class="water-total" id="water-badge-display">${waterIntake} / ${waterTarget} ml</div>
            </div>

            <!-- Progress -->
            <div class="water-progress">
              <div class="glass-icon">
                <div class="glass-fill" id="glassFill" style="height: ${waterPercent}%;"></div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 2h8l1 14a4 4 0 01-4 4h-2a4 4 0 01-4-4L8 2z"/>
                  <path d="M8 6h8"/>
                </svg>
              </div>

              <div class="progress-info">
                <div class="progress-text">
                  <span class="progress-percent" id="water-text-display">${waterPercent}%</span>
                  <span class="progress-label">Đã Uống</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" id="water-progress-fill" style="width: ${waterPercent}%;"></div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="water-actions">
              <button class="water-btn add-250" id="btn-water-250">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 2h8l1 14a4 4 0 01-4 4h-2a4 4 0 01-4-4L8 2z"/>
                  <path d="M8 6h8"/>
                </svg>
                +250ml
              </button>

              <button class="water-btn add-500" id="btn-water-500">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z"/>
                </svg>
                +500ml
              </button>

              <button class="water-btn reset" id="btn-water-reset">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px; flex-shrink: 0;"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M13.7071 1.29289C14.0976 1.68342 14.0976 2.31658 13.7071 2.70711L12.4053 4.00896C17.1877 4.22089 21 8.16524 21 13C21 17.9706 16.9706 22 12 22C7.02944 22 3 17.9706 3 13C3 12.4477 3.44772 12 4 12C4.55228 12 5 12.4477 5 13C5 16.866 8.13401 20 12 20C15.866 20 19 16.866 19 13C19 9.2774 16.0942 6.23349 12.427 6.01281L13.7071 7.29289C14.0976 7.68342 14.0976 8.31658 13.7071 8.70711C13.3166 9.09763 12.6834 9.09763 12.2929 8.70711L9.29289 5.70711C9.10536 5.51957 9 5.26522 9 5C9 4.73478 9.10536 4.48043 9.29289 4.29289L12.2929 1.29289C12.6834 0.902369 13.3166 0.902369 13.7071 1.29289Z" fill="currentColor"></path> </g></svg>
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

    // Render ApexCharts with complete daily logs history & start milestone
    const allLogs = await DataService.getAllDailyLogs();
    const historyLogs = allLogs.length > 0 ? allLogs : [todayLog];
    renderWeightChart('chart-weight-trend', historyLogs, targetW, goal);
    renderCalorieChart('chart-calorie-io', historyLogs, calorieTarget);
    renderMacroChart('chart-macro-doughnut', { protein: currentProtein, carb: currentCarb, fat: currentFat }, goal.macroTarget);

    // Handlers
    document.getElementById('dash-level-badge')?.addEventListener('click', () => showLevelRoadmapModal());
    document.getElementById('dash-btn-ai-coach')?.addEventListener('click', onOpenAiCoach);
    document.getElementById('btn-quick-update-journal')?.addEventListener('click', () => onNavigateTab('meals'));
    document.getElementById('dash-btn-view-full-plan')?.addEventListener('click', () => onNavigateTab('plan'));

    document.getElementById('dash-btn-quick-log-meals')?.addEventListener('click', async () => {
      const today = DataService.getTodayString();
      if (todayRecommendedMeals?.breakfast) await DataService.addMealLog(today, { type: 'Breakfast', ...todayRecommendedMeals.breakfast });
      if (todayRecommendedMeals?.lunch) await DataService.addMealLog(today, { type: 'Lunch', ...todayRecommendedMeals.lunch });
      if (todayRecommendedMeals?.dinner) await DataService.addMealLog(today, { type: 'Dinner', ...todayRecommendedMeals.dinner });
      if (todayRecommendedMeals?.snack) await DataService.addMealLog(today, { type: 'Snack', ...todayRecommendedMeals.snack });

      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
      const updatedLog = await DataService.getDailyLog(today);
      updateDashboardRealtime(updatedLog);
      await Modal.success({
        title: 'Đã Thêm Thực Đơn Hôm Nay!',
        message: 'Đã ghi nhận đủ 4 bữa ăn của thực đơn gợi ý AI hôm nay vào nhật ký!'
      });
    });

    document.getElementById('dash-btn-quick-log-workout')?.addEventListener('click', async () => {
      if (todayRecommendedWorkout) {
        const today = DataService.getTodayString();
        await DataService.addWorkoutLog(today, {
          type: todayRecommendedWorkout.title || 'Bài tập hôm nay',
          duration: todayRecommendedWorkout.duration || 30,
          intensity: 'Moderate',
          caloriesBurned: todayRecommendedWorkout.estBurn || 250
        });
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
        const updatedLog = await DataService.getDailyLog(today);
        updateDashboardRealtime(updatedLog);
        await Modal.success({
          title: 'Hoàn Thành Bài Tập!',
          message: `Đã ghi nhận bài tập "${todayRecommendedWorkout.title}" vào nhật ký hôm nay!`
        });
      }
    });

    // Smooth Water Tracker Animation Handler
    function animateWaterUpdate(newMl, waterTarget) {
      const newPercent = Math.min(100, Math.round((newMl / waterTarget) * 100));
      const fillEl = document.getElementById('water-progress-fill');
      const textEl = document.getElementById('water-text-display');
      const badgeEl = document.getElementById('water-badge-display');
      const glassFillEl = document.getElementById('glassFill');
      const waterCard = document.getElementById('waterCard');

      if (fillEl) fillEl.style.width = `${newPercent}%`;
      if (glassFillEl) glassFillEl.style.height = `${newPercent}%`;
      if (badgeEl) badgeEl.innerText = `${newMl} / ${waterTarget} ml`;
      if (textEl) textEl.innerText = `${newPercent}%`;
      if (waterCard) waterCard.classList.toggle('goal-reached', newMl >= waterTarget);
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
          // Add notification-style swipe & collapse delete animation class
          itemRow.classList.add('item-deleting');

          // Wait 400ms for swipe transition before removing DOM element and updating IndexedDB
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
          }, 400);
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

    // Quick log weight custom Modal prompt
    document.getElementById('btn-quick-log-weight')?.addEventListener('click', async () => {
      const input = await Modal.prompt({
        title: '⚖️ Cập Nhật Cân Nặng Thực Tế',
        message: 'Nhập số cân nặng hiện tại hôm nay của bạn (kg):',
        placeholder: 'Ví dụ: 65.5',
        defaultValue: currentW || '',
        confirmText: 'Lưu Cân Nặng',
        cancelText: 'Hủy Bỏ'
      });

      if (input && !isNaN(parseFloat(input))) {
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
