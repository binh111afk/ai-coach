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
  const calorieTarget = goal.dailyCalorieTarget || 2214;

  // Calorie ring progress
  const calRingProgress = Math.min(1, Math.max(0, netCalories / calorieTarget));
  const calDashOffset = Math.round(534 * (1 - calRingProgress));

  // Macros
  const currentProtein = todayLog.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const currentCarb = todayLog.meals.reduce((sum, m) => sum + (m.carb || 0), 0);
  const currentFat = todayLog.meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  const pTarget = goal.macroTarget?.protein || 166;
  const cTarget = goal.macroTarget?.carb || 221;
  const fTarget = goal.macroTarget?.fat || 74;

  // Weight
  const currentW = todayLog.weight || profile.currentWeight;
  const targetW = goal.targetWeight || 65;

  // Water
  const waterIntake = todayLog.waterIntake || 0;
  const waterTarget = goal.waterTarget || 2695;
  const waterPercent = Math.min(100, Math.round((waterIntake / waterTarget) * 100));

  // Check-in Touchpoints & Discipline Score
  const hasMeal = todayLog.meals.length > 0;
  const hasWater = waterIntake > 0;
  const hasWorkout = todayLog.workouts.length > 0 || todayLog.isRestDay;
  const hasChecklist = todayLog.checklist.some(t => t.done);

  const checkins = [hasMeal, hasWater, hasWorkout, hasChecklist];
  const completeCount = checkins.filter(Boolean).length;
  const disciplineScore = Math.min(100, Math.round((completeCount / 4) * 80 + (waterPercent / 100) * 20));

  // Date String in Vietnamese
  const dateFormatted = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  const dashboardHtml = `
    <div class="max-w-6xl mx-auto py-2 fade-up">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8 fade-up">
        <div>
          <div class="text-sm text-muted mb-2 flex items-center gap-2" style="color: var(--text-muted);">
            <i data-lucide="calendar" class="w-4 h-4" style="color: var(--accent-purple);"></i> ${dateFormatted}
          </div>
          <h1 class="display text-4xl md:text-5xl font-medium leading-[1.05]" style="color: var(--text-main);">
            Nhật Ký Hôm Nay<br><span class="italic" style="color: var(--accent-purple);">Chiến Binh ${profile.name || 'Fitness'}</span>
          </h1>
          <div class="flex flex-wrap gap-2 mt-4">
            <div class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer" style="background: rgba(217, 70, 239, 0.12); color: #D946EF;" id="dash-level-badge" title="Xem Lộ Trình Cấp Độ">
              <i data-lucide="star" class="w-3.5 h-3.5"></i> Lv.${progress.level} · ${progress.totalXp} XP
            </div>
            <div class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style="background: rgba(245, 158, 11, 0.12); color: #F59E0B;">
              <i data-lucide="flame" class="w-3.5 h-3.5"></i> Streak: ${progress.currentStreak} Ngày
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button class="btn-ghost px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold" id="btn-quick-checkin">
            <i data-lucide="check-circle" class="w-4 h-4"></i> Ghi Bữa Ăn Nhanh
          </button>
          <button class="btn-accent ai-glow px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold" id="dash-btn-ai-coach">
            <i data-lucide="sparkles" class="w-4 h-4"></i> Phân Tích AI Coach
          </button>
        </div>
      </div>

      <!-- Overview Grid (Top Stats - 3 Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        
        <!-- 1. Calorie Ring -->
        <div class="card p-6 flex flex-col items-center justify-center fade-up" style="animation-delay: 0.1s">
          <div class="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-4" style="color: var(--text-muted);">CALO RÒNG HÔM NAY</div>
          <div class="relative w-48 h-48">
            <svg viewBox="0 0 200 200" class="w-full h-full">
              <defs>
                <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#7C3AED"/>
                  <stop offset="100%" stop-color="#D946EF"/>
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="85" fill="none" class="ring-bg" stroke-width="14"/>
              <circle cx="100" cy="100" r="85" fill="none" stroke="url(#calGrad)" stroke-width="14" stroke-linecap="round" 
                      stroke-dasharray="534" stroke-dashoffset="${calDashOffset}" transform="rotate(-90 100 100)" class="ring-fg"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <div class="display text-4xl font-semibold" style="color: var(--text-main);" id="dash-net-calories">${netCalories}</div>
              <div class="text-sm text-muted mt-1" style="color: var(--text-muted);">/ ${calorieTarget} kcal</div>
            </div>
          </div>
          <div class="mt-4 flex gap-4 text-xs font-semibold">
            <span class="flex items-center gap-1.5" style="color: var(--text-main);"><div class="w-2.5 h-2.5 rounded-full" style="background: var(--accent-purple);"></div> In: ${caloriesIn}</span>
            <span class="flex items-center gap-1.5" style="color: var(--text-main);"><div class="w-2.5 h-2.5 rounded-full" style="background: #D946EF;"></div> Out: ${caloriesOut}</span>
          </div>
        </div>

        <!-- 2. Discipline & Water Stack -->
        <div class="grid grid-cols-1 gap-5">
          <!-- Discipline Score -->
          <div class="card p-6 fade-up" style="animation-delay: 0.15s">
            <div class="flex justify-between items-start mb-3">
              <div class="text-[10px] uppercase tracking-[0.18em] text-muted font-bold" style="color: var(--text-muted);">ĐIỂM KỶ LUẬT</div>
              <span class="text-xs font-bold px-2 py-1 rounded-full" style="background: rgba(217, 70, 239, 0.12); color: #D946EF;">
                ${disciplineScore >= 80 ? 'Xuất sắc' : disciplineScore >= 50 ? 'Khá tốt' : 'Cần cố gắng'}
              </span>
            </div>
            <div class="flex items-end gap-2 mb-3">
              <span class="display text-4xl font-semibold" style="color: #D946EF;" id="dash-discipline-score">${disciplineScore}</span>
              <span class="text-lg text-muted mb-1" style="color: var(--text-muted);">/ 100</span>
            </div>
            <div class="macro-bar">
              <div class="macro-fill" style="width: ${disciplineScore}%; background: #D946EF;" id="dash-discipline-fill"></div>
            </div>
            <p class="text-xs text-muted mt-3 flex items-center gap-1.5" style="color: var(--text-muted);">
              <i data-lucide="bot" class="w-3.5 h-3.5" style="color: var(--accent-purple);"></i> 
              AI Coach: ${disciplineScore >= 80 ? 'Bạn đang duy trì chuỗi phong độ xuất sắc!' : 'Hãy tiếp tục hoàn thành checklist để tăng điểm kỷ luật!'}
            </p>
          </div>

          <!-- Water Tracker -->
          <div class="card p-6 fade-up" style="animation-delay: 0.2s" id="waterCard">
            <div class="flex justify-between items-center mb-3">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center" style="background: #DBEAFE;">
                  <i data-lucide="droplet" class="w-4 h-4 text-[#3B82F6]"></i>
                </div>
                <span class="text-sm font-semibold" style="color: var(--text-main);">Nước Uống</span>
              </div>
              <div class="text-right text-xs font-bold text-[#3B82F6]" id="water-text-display">${waterPercent}%</div>
            </div>
            <div class="flex items-baseline gap-1 mb-2">
              <span class="display text-2xl font-semibold" style="color: var(--text-main);" id="water-badge-display-val">${waterIntake}</span>
              <span class="text-sm text-muted" style="color: var(--text-muted);">/ ${waterTarget} ml</span>
            </div>
            <div class="macro-bar mb-3">
              <div class="macro-fill" id="water-progress-fill" style="width: ${waterPercent}%; background: #3B82F6;"></div>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn btn-secondary btn-sm flex-1 text-xs py-1.5 rounded-lg" id="btn-water-250">+250ml</button>
              <button class="btn btn-secondary btn-sm flex-1 text-xs py-1.5 rounded-lg" id="btn-water-500">+500ml</button>
              <button class="btn btn-secondary btn-sm text-xs py-1.5 rounded-lg px-2" id="btn-water-reset" title="Đặt lại">Reset</button>
            </div>
          </div>
        </div>

        <!-- 3. Checklist Progress -->
        <div class="card p-6 fade-up" style="animation-delay: 0.25s">
          <div class="flex justify-between items-center mb-4">
            <div class="text-[10px] uppercase tracking-[0.18em] text-muted font-bold" style="color: var(--text-muted);">CHECKLIST KỶ LUẬT</div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background: rgba(124, 58, 237, 0.12); color: var(--accent-purple);" id="checklist-badge-count">
              ${todayLog.checklist.filter(t => t.done).length}/${todayLog.checklist.length} Tick
            </span>
          </div>

          <div class="space-y-3 max-h-60 overflow-y-auto pr-1" id="dash-checklist-container">
            ${todayLog.checklist.map(item => `
              <div class="checklist-item-row flex items-center justify-between">
                <div style="flex: 1;">
                  ${renderCheckbox({ taskId: item.id, checked: item.done, labelText: item.task })}
                </div>
                <button class="btn btn-secondary btn-icon btn-sm" data-delete-task-id="${item.id}" style="width: 24px; height: 24px; border: 0; padding: 0; color: var(--text-muted);" title="Xóa">
                  <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                </button>
              </div>
            `).join('')}
          </div>

          <!-- Quick Add Daily Task Input -->
          <form id="form-add-daily-task" class="flex gap-2 mt-4 pt-3 border-t border-color">
            <input type="text" class="form-input text-xs flex-1 rounded-xl px-3 py-2" id="input-new-daily-task" placeholder="+ Thêm việc kỷ luật..." style="background: var(--bg-input); color: var(--text-main);" required>
            <button type="submit" class="btn btn-primary btn-sm px-3 rounded-xl"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button>
          </form>
        </div>

      </div>

      <!-- Dedicated AI Summary Widget -->
      <div id="dashboard-ai-summary-container" class="mb-6"></div>

      <!-- Charts Row (ApexCharts preserved with new display title style as requested) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        
        <!-- Weight Trend Chart -->
        <div class="card p-6 fade-up" style="animation-delay: 0.3s">
          <div class="flex justify-between items-center mb-4">
            <h2 class="display text-xl font-semibold" style="color: var(--text-main);">Cân Nặng Thực Tế vs Mục Tiêu</h2>
            <button class="btn btn-secondary btn-sm text-xs rounded-xl" id="btn-quick-log-weight"><i data-lucide="plus" class="w-3.5 h-3.5"></i> Ghi Cân Nặng</button>
          </div>
          <div id="chart-weight-trend" style="min-height: 250px;"></div>
        </div>

        <!-- Calorie In/Out Chart -->
        <div class="card p-6 fade-up" style="animation-delay: 0.35s">
          <div class="flex justify-between items-center mb-4">
            <h2 class="display text-xl font-semibold" style="color: var(--text-main);">Biểu Đồ Calo Nạp & Đốt</h2>
            <div class="flex gap-3 text-xs font-semibold">
              <span class="flex items-center gap-1.5" style="color: var(--text-main);"><div class="w-2.5 h-2.5 rounded-full" style="background: var(--accent-purple);"></div> In</span>
              <span class="flex items-center gap-1.5" style="color: var(--text-main);"><div class="w-2.5 h-2.5 rounded-full" style="background: #D946EF;"></div> Out</span>
            </div>
          </div>
          <div id="chart-calorie-io" style="min-height: 250px;"></div>
        </div>

      </div>

      <!-- AI Plan & Macros Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        
        <!-- AI Plan Card -->
        <div class="card p-6 lg:col-span-2 fade-up" style="animation-delay: 0.4s">
          <div class="flex justify-between items-center mb-4 pb-4 border-b border-color" style="border-bottom: 1px solid var(--border-color);">
            <h2 class="display text-xl font-semibold" style="color: var(--text-main);">Gợi Ý Thực Đơn & Tập Luyện AI Hôm Nay (Ngày ${currentJourneyDay})</h2>
            <button class="btn-ghost px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5" id="dash-btn-view-full-plan">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Thay đổi
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <!-- Left: Meals List Cards -->
            <div class="space-y-3">
              <div class="flex items-center gap-3 p-3 bg-[var(--primary-soft)] rounded-xl cursor-pointer hover:opacity-90 transition" id="dash-btn-quick-log-meals" title="Bấm để ghi nhận thực đơn hôm nay">
                <div class="w-10 h-10 rounded-xl bg-white dark:bg-[var(--bg-card)] flex items-center justify-center text-[var(--accent-purple)] shadow-xs">
                  <i data-lucide="coffee" class="w-5 h-5"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase font-bold text-muted tracking-wider" style="color: var(--text-muted);">Bữa Sáng</div>
                  <div class="text-sm font-semibold truncate" style="color: var(--text-main);">${todayRecommendedMeals?.breakfast?.name || 'Yến mạch + Trứng luộc'}</div>
                </div>
                <div class="text-xs font-bold" style="color: var(--accent-purple);">${todayRecommendedMeals?.breakfast?.calories || 320} kcal</div>
              </div>

              <div class="flex items-center gap-3 p-3 bg-[var(--primary-soft)] rounded-xl cursor-pointer hover:opacity-90 transition" id="dash-btn-quick-log-meals-2" title="Bấm để ghi nhận thực đơn hôm nay">
                <div class="w-10 h-10 rounded-xl bg-white dark:bg-[var(--bg-card)] flex items-center justify-center text-[var(--accent-purple)] shadow-xs">
                  <i data-lucide="utensils" class="w-5 h-5"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase font-bold text-muted tracking-wider" style="color: var(--text-muted);">Bữa Trưa</div>
                  <div class="text-sm font-semibold truncate" style="color: var(--text-main);">${todayRecommendedMeals?.lunch?.name || 'Ức gà + Cơm gạo lứt'}</div>
                </div>
                <div class="text-xs font-bold" style="color: var(--accent-purple);">${todayRecommendedMeals?.lunch?.calories || 450} kcal</div>
              </div>
            </div>

            <!-- Right: Workouts List Cards -->
            <div class="space-y-3">
              <div class="flex items-center gap-3 p-3 border border-color rounded-xl hover:bg-[var(--primary-soft)] transition cursor-pointer" id="dash-btn-quick-log-workout">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: #FCE7F3;">
                  <i data-lucide="dumbbell" class="w-5 h-5 text-[#EC4899]"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase font-bold text-muted tracking-wider" style="color: var(--text-muted);">Tập Luyện AI</div>
                  <div class="text-sm font-semibold truncate" style="color: var(--text-main);">${todayRecommendedWorkout?.title || 'Full Body HIIT'}</div>
                </div>
                <div class="text-xs font-bold text-[#EC4899]">${todayRecommendedWorkout?.duration || 45} phút</div>
              </div>

              <div class="flex items-center gap-3 p-3 border border-color rounded-xl hover:bg-[var(--primary-soft)] transition cursor-pointer" id="dash-btn-quick-log-workout-2">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: #DBEAFE;">
                  <i data-lucide="footprints" class="w-5 h-5 text-[#3B82F6]"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase font-bold text-muted tracking-wider" style="color: var(--text-muted);">Cardio Tiêu Hao</div>
                  <div class="text-sm font-semibold truncate" style="color: var(--text-main);">Đi bộ nhẹ nhàng</div>
                </div>
                <div class="text-xs font-bold text-[#3B82F6]">30 phút</div>
              </div>
            </div>

          </div>
        </div>

        <!-- Macros Card matching template -->
        <div class="card p-6 fade-up" style="animation-delay: 0.45s">
          <div class="flex justify-between items-center mb-4">
            <h2 class="display text-xl font-semibold" style="color: var(--text-main);">Phân Bổ Macro</h2>
            <span class="text-xs text-muted font-bold" style="color: var(--text-muted);">Tổng: ${currentProtein + currentCarb + currentFat}g</span>
          </div>
          <div class="flex flex-col items-center justify-center py-4">
            <div class="relative w-32 h-32 mb-4">
              <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(124, 58, 237, 0.08)" stroke-width="12"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#EC4899" stroke-width="12" 
                        stroke-dasharray="251.2" stroke-dashoffset="${(251.2 * (1 - Math.min(1, currentProtein / pTarget))).toFixed(1)}" stroke-linecap="round"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#F59E0B" stroke-width="12" 
                        stroke-dasharray="251.2" stroke-dashoffset="${(251.2 * (1 - Math.min(1, currentCarb / cTarget))).toFixed(1)}" stroke-linecap="round" style="opacity: 0.85;"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" stroke-width="12" 
                        stroke-dasharray="251.2" stroke-dashoffset="${(251.2 * (1 - Math.min(1, currentFat / fTarget))).toFixed(1)}" stroke-linecap="round" style="opacity: 0.7;"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="display text-xl font-semibold" style="color: var(--text-main);">${Math.min(100, Math.round(((currentProtein + currentCarb + currentFat) / (pTarget + cTarget + fTarget)) * 100))}%</span>
                <span class="text-[10px] text-muted uppercase font-bold" style="color: var(--text-muted);">Hoàn thành</span>
              </div>
            </div>
            <div class="w-full space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="flex items-center gap-2 font-medium" style="color: var(--text-main);"><div class="w-2.5 h-2.5 rounded-full bg-[#EC4899]"></div> Protein</span>
                <span class="text-muted font-semibold" style="color: var(--text-muted);">${currentProtein} / ${pTarget}g</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="flex items-center gap-2 font-medium" style="color: var(--text-main);"><div class="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></div> Carbs</span>
                <span class="text-muted font-semibold" style="color: var(--text-muted);">${currentCarb} / ${cTarget}g</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="flex items-center gap-2 font-medium" style="color: var(--text-main);"><div class="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></div> Fat</span>
                <span class="text-muted font-semibold" style="color: var(--text-muted);">${currentFat} / ${fTarget}g</span>
              </div>
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

    // Navigation and Action Event Handlers
    document.getElementById('dash-level-badge')?.addEventListener('click', () => showLevelRoadmapModal());
    document.getElementById('dash-btn-ai-coach')?.addEventListener('click', onOpenAiCoach);
    document.getElementById('btn-quick-checkin')?.addEventListener('click', () => onNavigateTab('meals'));
    document.getElementById('dash-btn-view-full-plan')?.addEventListener('click', () => onNavigateTab('plan'));

    // Quick Log Meals Handler
    const handleQuickLogMeals = async () => {
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
    };

    document.getElementById('dash-btn-quick-log-meals')?.addEventListener('click', handleQuickLogMeals);
    document.getElementById('dash-btn-quick-log-meals-2')?.addEventListener('click', handleQuickLogMeals);

    // Quick Log Workout Handler
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

    function updateDashboardRealtime(updatedLog) {
      const cIn = updatedLog.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      const cOut = updatedLog.workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
      const net = cIn - cOut;
      const wIntake = updatedLog.waterIntake || 0;

      const hMeal = updatedLog.meals.length > 0;
      const hWater = wIntake > 0;
      const hWorkout = updatedLog.workouts.length > 0 || updatedLog.isRestDay;
      const hChecklist = updatedLog.checklist.some(t => t.done);

      const cIns = [hMeal, hWater, hWorkout, hChecklist];
      const cCount = cIns.filter(Boolean).length;
      const discScore = Math.min(100, Math.round((cCount / 4) * 80 + (Math.min(100, (wIntake / waterTarget) * 100) / 100) * 20));

      const netCalEl = document.getElementById('dash-net-calories');
      if (netCalEl) netCalEl.innerText = `${net}`;

      const discScoreEl = document.getElementById('dash-discipline-score');
      if (discScoreEl) discScoreEl.innerText = `${discScore}`;

      const discFillEl = document.getElementById('dash-discipline-fill');
      if (discFillEl) discFillEl.style.width = `${discScore}%`;

      renderAiSummaryWidget('dashboard-ai-summary-container');
    }

    // Water quick buttons + smooth animation
    document.getElementById('btn-water-250')?.addEventListener('click', async () => {
      const updatedLog = await DataService.addWaterIntake(todayLog.date, 250);
      const wMl = updatedLog.waterIntake || 0;
      const wPct = Math.min(100, Math.round((wMl / waterTarget) * 100));

      const wText = document.getElementById('water-text-display');
      const wVal = document.getElementById('water-badge-display-val');
      const wFill = document.getElementById('water-progress-fill');

      if (wText) wText.innerText = `${wPct}%`;
      if (wVal) wVal.innerText = `${wMl}`;
      if (wFill) wFill.style.width = `${wPct}%`;

      updateDashboardRealtime(updatedLog);
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
    });

    document.getElementById('btn-water-500')?.addEventListener('click', async () => {
      const updatedLog = await DataService.addWaterIntake(todayLog.date, 500);
      const wMl = updatedLog.waterIntake || 0;
      const wPct = Math.min(100, Math.round((wMl / waterTarget) * 100));

      const wText = document.getElementById('water-text-display');
      const wVal = document.getElementById('water-badge-display-val');
      const wFill = document.getElementById('water-progress-fill');

      if (wText) wText.innerText = `${wPct}%`;
      if (wVal) wVal.innerText = `${wMl}`;
      if (wFill) wFill.style.width = `${wPct}%`;

      updateDashboardRealtime(updatedLog);
      confetti({ particleCount: 50, spread: 80, origin: { y: 0.8 } });
    });

    document.getElementById('btn-water-reset')?.addEventListener('click', async () => {
      const updatedLog = await DataService.resetWaterIntake(todayLog.date);

      const wText = document.getElementById('water-text-display');
      const wVal = document.getElementById('water-badge-display-val');
      const wFill = document.getElementById('water-progress-fill');

      if (wText) wText.innerText = `0%`;
      if (wVal) wVal.innerText = `0`;
      if (wFill) wFill.style.width = `0%`;

      updateDashboardRealtime(updatedLog);
    });

    // Custom Checkbox toggles
    initCheckboxListeners(mountNode, async (taskId, isChecked) => {
      const updatedLog = await DataService.toggleChecklistItem(todayLog.date, taskId);
      
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

    // Delete checklist item
    document.querySelectorAll('[data-delete-task-id]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const taskId = btn.getAttribute('data-delete-task-id');
        const itemRow = btn.closest('.checklist-item-row');

        if (itemRow) {
          itemRow.style.transition = 'all 0.3s ease';
          itemRow.style.opacity = '0';
          itemRow.style.transform = 'translateX(20px)';

          setTimeout(async () => {
            itemRow.remove();
            const updatedLog = await DataService.deleteChecklistItem(todayLog.date, taskId);

            const badgeCountEl = document.getElementById('checklist-badge-count');
            if (badgeCountEl) {
              const doneCount = updatedLog.checklist.filter(t => t.done).length;
              badgeCountEl.innerText = `${doneCount}/${updatedLog.checklist.length} Tick`;
            }

            updateDashboardRealtime(updatedLog);
          }, 300);
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
