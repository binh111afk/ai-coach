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
  const currentJourneyDay = DataService.calculateCurrentJourneyDay(goal.startDate);
  const activeDateStr = DataService.getDateStrForJourneyDay(goal.startDate, currentJourneyDay);
  const todayLog = await DataService.getDailyLog(activeDateStr);
  const progress = await DataService.getUserProgress();

  const { mealEntry: todayRecommendedMeals, workout: todayRecommendedWorkout, phase: currentPhase } = getPlanForJourneyDay(plan, currentJourneyDay);

  // Calorie calculations for Calorie Deficit VS Bar
  const caloriesIn = (todayLog.meals || []).reduce((sum, m) => sum + (m.calories || m.kcal || 0), 0);
  const caloriesOut = (todayLog.workouts || []).reduce((sum, w) => sum + (w.caloriesBurned || w.calories || w.caloBurned || 0), 0);
  const calorieTarget = goal.dailyCalorieTarget || 2214;

  const totalVsCal = caloriesIn + caloriesOut;
  let inPercent = 50;
  let outPercent = 50;
  if (totalVsCal > 0) {
    inPercent = Math.min(90, Math.max(10, Math.round((caloriesIn / totalVsCal) * 100)));
    outPercent = 100 - inPercent;
  }

  const calorieDeficit = caloriesOut - caloriesIn;
  const isDeficit = calorieDeficit >= 0;

  // Macros
  const currentProtein = todayLog.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const currentCarb = todayLog.meals.reduce((sum, m) => sum + (m.carb || 0), 0);
  const currentFat = todayLog.meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  const pTarget = goal.macroTarget?.protein || 166;
  const cTarget = goal.macroTarget?.carb || 221;
  const fTarget = goal.macroTarget?.fat || 74;

  // Macro Donut SVG Segment Arc Calculations (Proportional & Non-overlapping)
  const totalConsumedMacros = currentProtein + currentCarb + currentFat;
  const C_MACRO = 251.3; // Circumference for r=40
  let pLen = 0, cLen = 0, fLen = 0;
  let pOffset = 0, cOffset = 0, fOffset = 0;

  if (totalConsumedMacros > 0) {
    pLen = Math.round(C_MACRO * (currentProtein / totalConsumedMacros));
    cLen = Math.round(C_MACRO * (currentCarb / totalConsumedMacros));
    if (currentProtein > 0 && pLen < 12) pLen = 12;
    if (currentCarb > 0 && cLen < 12) cLen = 12;
    fLen = C_MACRO - pLen - cLen;
    if (currentFat > 0 && fLen < 12) {
      fLen = 12;
      cLen = C_MACRO - pLen - fLen;
    }

    pOffset = 0;
    cOffset = -pLen;
    fOffset = -(pLen + cLen);
  }

  // Weight
  const currentW = todayLog.weight || profile.currentWeight;
  const targetW = goal.targetWeight || 65;

  // Water
  const waterIntake = todayLog.waterIntake || 0;
  const waterTarget = goal.waterTarget || 2695;
  const waterPercent = Math.min(100, Math.round((waterIntake / waterTarget) * 100));

  // Auto-check checklist items if target criteria are met
  todayLog.checklist.forEach(item => {
    const textLower = (item.task || '').toLowerCase();
    let isAchieved = false;

    if (textLower.includes('nước') || textLower.includes('water') || textLower.includes('lit') || textLower.includes('2.7l')) {
      isAchieved = waterIntake >= waterTarget && waterTarget > 0;
    } else if (textLower.includes('cal') || textLower.includes('kcal') || textLower.includes('calo')) {
      isAchieved = caloriesIn >= calorieTarget && calorieTarget > 0;
    } else if (textLower.includes('protein') || textLower.includes('đạm')) {
      isAchieved = currentProtein >= pTarget && pTarget > 0;
    } else if (textLower.includes('carb') || textLower.includes('tinh bột')) {
      isAchieved = currentCarb >= cTarget && cTarget > 0;
    } else if (textLower.includes('fat') || textLower.includes('chất béo')) {
      isAchieved = currentFat >= fTarget && fTarget > 0;
    } else if (textLower.includes('tập') || textLower.includes('workout') || textLower.includes('ai plan') || textLower.includes('lịch ai')) {
      isAchieved = (todayLog.workouts || []).length > 0 || !!todayLog.isRestDay;
    } else if (textLower.includes('ghi nhật ký') || textLower.includes('bữa ăn')) {
      isAchieved = (todayLog.meals || []).length > 0;
    }

    if (isAchieved && !item.done) {
      item.done = true;
      DataService.toggleChecklistItem(todayLog.date, item.id);
    }
  });

  // Version 3 Stat Info calculation (matching Image 1 exactly: plain colored text, NO background pill)
  const getVersion3StatInfo = (taskText, itemDone) => {
    const textLower = (taskText || '').toLowerCase();
    
    if (textLower.includes('nước') || textLower.includes('water') || textLower.includes('2.7l') || textLower.includes('lit')) {
      const currentL = (waterIntake / 1000).toFixed(1);
      const targetL = (waterTarget / 1000).toFixed(1);
      const val = (waterIntake >= waterTarget || itemDone) ? `${targetL}L` : `${currentL}L`;
      return { text: val, colorClass: 'text-blue-500 font-semibold text-xs' };
    }
    
    if (textLower.includes('cal') || textLower.includes('kcal') || textLower.includes('calo')) {
      const val = (caloriesIn >= calorieTarget || itemDone) ? `${calorieTarget} kcal` : `${caloriesIn} kcal`;
      return { text: val, colorClass: 'text-orange-500 font-semibold text-xs' };
    }
    
    if (textLower.includes('protein') || textLower.includes('đạm')) {
      const val = (currentProtein >= pTarget || itemDone) ? `${pTarget}g` : `${currentProtein}g`;
      return { text: val, colorClass: 'text-pink-500 font-semibold text-xs' };
    }

    if (textLower.includes('carb') || textLower.includes('tinh bột')) {
      const val = (currentCarb >= cTarget || itemDone) ? `${cTarget}g` : `${currentCarb}g`;
      return { text: val, colorClass: 'text-amber-500 font-semibold text-xs' };
    }

    if (textLower.includes('fat') || textLower.includes('chất béo')) {
      const val = (currentFat >= fTarget || itemDone) ? `${fTarget}g` : `${currentFat}g`;
      return { text: val, colorClass: 'text-sky-500 font-semibold text-xs' };
    }

    if (textLower.includes('tập') || textLower.includes('workout') || textLower.includes('ai plan') || textLower.includes('lịch ai')) {
      return { text: 'AI Plan', colorClass: 'text-purple-500 font-semibold text-xs' };
    }

    return { 
      text: itemDone ? 'Đã xong' : 'Chưa xong', 
      colorClass: itemDone ? 'text-emerald-500 font-semibold text-xs' : 'text-purple-500 font-semibold text-xs' 
    };
  };

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

        <div class="flex flex-wrap gap-2.5">
          <button class="px-4 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-sm transition hover:shadow-md cursor-pointer" id="btn-quick-checkin" style="background: var(--bg-card); border: 1.5px solid rgba(124, 58, 237, 0.2); color: var(--text-main);">
            <i data-lucide="check-circle" class="w-4 h-4 text-[var(--accent-purple)]"></i> Ghi Bữa Ăn Nhanh
          </button>
          <button class="ai-glow px-4 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-md transition hover:shadow-lg cursor-pointer" id="dash-btn-ai-coach" style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: #ffffff; border: 1.5px solid rgba(255, 255, 255, 0.25);">
            <i data-lucide="sparkles" class="w-4 h-4"></i> Phân Tích AI Coach
          </button>
        </div>
      </div>

      <!-- Overview Grid (Top Stats - 3 Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        
        <!-- 1. Calorie Deficit (IN vs OUT VS Bar) -->
        <div class="card p-6 flex flex-col justify-between fade-up" style="animation-delay: 0.1s">
          <!-- Header -->
          <div class="flex items-center justify-between w-full mb-4">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-widest text-muted" style="color: var(--text-muted);">Độ Chênh Lệch</p>
              <h2 class="display text-xl font-semibold mt-0.5" style="color: var(--text-main);">Calo IN vs OUT</h2>
            </div>
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0" style="background: rgba(124, 58, 237, 0.12); color: #7C3AED;">
              <i data-lucide="scale" class="w-5 h-5"></i>
            </div>
          </div>

          <!-- Middle Section (Stats Row + VS Bar) Centered Vertically -->
          <div class="my-auto py-3">
            <!-- Stats Row (Left vs Right) -->
            <div class="flex justify-between items-end mb-5">
              <!-- Cột Trái: IN -->
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-[#EDE9FE] dark:bg-purple-950/60 flex items-center justify-center mt-1 flex-shrink-0">
                  <i data-lucide="utensils" class="w-5 h-5 text-[#7C3AED]"></i>
                </div>
                <div>
                  <span class="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">In</span>
                  <p class="display text-2xl md:text-3xl font-bold leading-none mt-1" style="color: var(--text-main);">${caloriesIn.toLocaleString()}</p>
                  <p class="text-[10px] text-muted mt-1" style="color: var(--text-muted);">kcal nạp vào</p>
                </div>
              </div>
              
              <!-- Cột Phải: OUT -->
              <div class="flex items-start gap-3 text-right">
                <div>
                  <span class="text-xs font-bold text-[#D946EF] uppercase tracking-wider">Out</span>
                  <p class="display text-2xl md:text-3xl font-bold leading-none mt-1" style="color: var(--text-main);">${caloriesOut.toLocaleString()}</p>
                  <p class="text-[10px] text-muted mt-1" style="color: var(--text-muted);">kcal đốt ra (tập luyện)</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-[#FCE7F3] dark:bg-pink-950/60 flex items-center justify-center mt-1 flex-shrink-0">
                  <i data-lucide="flame" class="w-5 h-5 text-[#D946EF]"></i>
                </div>
              </div>
            </div>

            <!-- Thanh đối đầu VS (Dynamic percentages) -->
            <div class="relative w-full h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
              <!-- Mảng Tím (IN) -->
              <div class="relative h-full bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] transition-all duration-700" style="width: ${inPercent}%;">
                <div class="shine-sweep"></div>
              </div>
              <!-- Mảng Hồng (OUT) -->
              <div class="relative h-full bg-gradient-to-l from-[#D946EF] to-[#EC4899] transition-all duration-700" style="width: ${outPercent}%;">
                <div class="shine-sweep"></div>
              </div>
              
              <!-- Biển báo VS ở giữa -->
              <div class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white dark:bg-[#1E1B2E] border-2 border-purple-200 dark:border-purple-800 shadow-md flex items-center justify-center z-10 transition-all duration-700" style="left: ${inPercent}%;">
                <span class="text-[9px] font-extrabold text-[#7C3AED]">VS</span>
              </div>
            </div>
          </div>

          <!-- Kết quả Thâm hụt / Dư thừa -->
          <div class="bg-gradient-to-r from-[#F5F3FF] to-[#FCE7F3] dark:from-purple-950/40 dark:to-pink-950/40 border border-[#EDE9FE] dark:border-purple-900/40 p-4 rounded-2xl flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white dark:bg-[#1E1B2E] flex items-center justify-center shadow-sm flex-shrink-0">
                ${isDeficit ? `
                  <i data-lucide="trending-down" class="w-5 h-5 text-[#7C3AED]"></i>
                ` : `
                  <i data-lucide="trending-up" class="w-5 h-5 text-amber-500"></i>
                `}
              </div>
              <div>
                <span class="text-sm font-semibold block leading-tight" style="color: var(--text-main);">${isDeficit ? 'Thâm hụt Calo' : 'Dư thừa Calo'}</span>
                <span class="text-[10px] text-muted" style="color: var(--text-muted);">${isDeficit ? '(Out trừ đi In)' : '(In vượt hơn Out)'}</span>
              </div>
            </div>
            <!-- Chữ gradient Tím-Hồng rất sang -->
            <div class="display text-2xl font-bold ${isDeficit ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#D946EF]' : 'text-amber-500'}">
              ${Math.abs(calorieDeficit).toLocaleString()} <span class="text-xs font-sans text-muted" style="color: var(--text-muted);">kcal</span>
            </div>
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

        <!-- 3. Checklist Progress (Version 3 iOS Minimalist Style) -->
        <div class="card p-6 fade-up flex flex-col justify-between" style="animation-delay: 0.25s">
          <div>
            <!-- Header INSIDE the main card box -->
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-color" style="border-bottom: 1px solid var(--border-color, rgba(124, 58, 237, 0.12));">
              <h2 class="display text-xl font-semibold" style="color: var(--text-main);">Checklist Kỷ Luật</h2>
              <span class="text-xs font-bold text-muted opacity-80" style="color: var(--text-muted);" id="checklist-badge-count">
                ${todayLog.checklist.filter(t => t.done).length}/${todayLog.checklist.length} Tick
              </span>
            </div>

            <!-- List inside rounded container with divide lines (matching Image 1 Version 3) -->
            <div class="rounded-3xl border border-gray-200/80 dark:border-gray-800 overflow-hidden max-h-72 overflow-y-auto bg-white dark:bg-[#181524]" id="dash-checklist-container">
              <div class="divide-y divide-gray-100 dark:divide-gray-800">
                ${todayLog.checklist.map(item => {
                  const cleanTaskName = (item.task || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim();
                  const { text: statText, colorClass } = getVersion3StatInfo(item.task, item.done);
                  return `
                    <label class="group check-item flex items-center justify-between gap-4 p-4 cursor-pointer !bg-transparent !rounded-none !border-0 hover:!bg-gray-50/80 dark:hover:!bg-gray-800/50 transition-colors">
                      <div class="flex items-center gap-4 min-w-0 flex-1">
                        <input type="checkbox" class="custom-checkbox-input" data-task-id="${item.id}" ${item.done ? 'checked' : ''}>
                        <div class="custom-check">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span class="task-text text-sm font-medium ${item.done ? 'line-through opacity-50' : ''}" style="color: var(--text-main);">
                          ${cleanTaskName}
                        </span>
                      </div>

                      <div class="flex items-center justify-end flex-shrink-0 min-w-[60px]">
                        <!-- Stat text (NO pill background, plain colored text as in Image 1!) -->
                        <span class="group-hover:hidden ${colorClass}">
                          ${statText}
                        </span>
                        <!-- Delete button (visible ONLY on hover) -->
                        <button type="button" class="hidden group-hover:flex items-center justify-center w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors" data-delete-task-id="${item.id}" title="Xóa">
                          <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                      </div>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Bottom "+ Thêm việc kỷ luật" Button (Exact Version 3 layout) -->
          <form id="form-add-daily-task" class="mt-4 flex items-center gap-3 pt-2">
            <div class="w-6 h-6 rounded-md border-2 border-[#C4B5FD] flex items-center justify-center flex-shrink-0 text-[#7C3AED]">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            </div>
            <input type="text" class="form-input text-sm flex-1 border-0 bg-transparent px-1 py-1 focus:ring-0" id="input-new-daily-task" placeholder="Thêm việc kỷ luật..." style="color: var(--text-main);" required>
            <button type="submit" class="btn btn-primary btn-sm px-3 py-1.5 rounded-xl text-xs font-semibold">Thêm</button>
          </form>
        </div>

      </div>

      <!-- Dedicated AI Summary Widget -->
      <div id="dashboard-ai-summary-container" class="mb-6"></div>

      <!-- Charts Row (ApexCharts preserved with new display title style as requested) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        
        <!-- Weight Trend Chart -->
        <div class="card p-6 fade-up h-full flex flex-col justify-between" style="animation-delay: 0.3s">
          <div>
            <div class="flex justify-between items-center mb-4">
              <h2 class="display text-xl font-semibold whitespace-nowrap" style="color: var(--text-main);">Biểu Đồ Cân Nặng</h2>
              <button class="btn btn-secondary btn-sm text-xs rounded-xl flex items-center gap-1.5 whitespace-nowrap" id="btn-quick-log-weight">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Ghi Cân Nặng
              </button>
            </div>
            <div id="chart-weight-trend" style="min-height: 250px;"></div>
          </div>
          <div class="mt-3 pt-2 flex items-center justify-center gap-2 text-xs font-bold whitespace-nowrap flex-nowrap">
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0" style="background: rgba(117, 86, 217, 0.1); color: #7556D9;">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background: #7556D9;"></span> Thực Tế
            </span>
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0" style="background: rgba(245, 158, 11, 0.1); color: #F59E0B;">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background: #F59E0B;"></span> Mục Tiêu
            </span>
          </div>
        </div>

        <!-- Calorie In/Out Chart -->
        <div class="card p-6 fade-up h-full flex flex-col justify-between" style="animation-delay: 0.35s">
          <div>
            <div class="flex justify-between items-center mb-4">
              <h2 class="display text-xl font-semibold whitespace-nowrap" style="color: var(--text-main);">Biểu Đồ Calo</h2>
            </div>
            <div id="chart-calorie-io" style="min-height: 250px;"></div>
          </div>
          <div class="mt-3 pt-2 flex items-center justify-center gap-2 text-xs font-bold whitespace-nowrap flex-nowrap">
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0" style="background: rgba(124, 58, 237, 0.1); color: var(--accent-purple);">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background: var(--accent-purple);"></span> Calo Nạp
            </span>
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0" style="background: rgba(217, 70, 239, 0.1); color: #D946EF;">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background: #D946EF;"></span> Calo Đốt
            </span>
          </div>
        </div>

      </div>

      <!-- AI Plan & Macros Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        
        <!-- AI Plan Card with 6 Bordered Suggestions -->
        <div class="card p-6 lg:col-span-2 fade-up" style="animation-delay: 0.4s">
          <div class="flex justify-between items-center mb-4 pb-4 border-b border-color" style="border-bottom: 1px solid rgba(124, 58, 237, 0.14);">
            <h2 class="display text-xl font-semibold" style="color: var(--text-main);">Gợi Ý Thực Đơn & Tập Luyện AI Hôm Nay (Ngày ${currentJourneyDay})</h2>
            <button class="btn-ghost px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5" id="dash-btn-view-full-plan" style="border: 1px solid rgba(124, 58, 237, 0.16);">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Thay đổi
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            <!-- Left Column: 3 Meal Items (all with rounded border boxes) -->
            <div class="space-y-3">
              <!-- 1. Bữa Sáng -->
              <div class="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition hover:shadow-md" style="background: var(--bg-card); border: 1px solid rgba(124, 58, 237, 0.16) !important;" id="dash-btn-quick-log-meals" title="Bấm để ghi bữa sáng">
                <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[var(--accent-purple)] flex-shrink-0">
                  <i data-lucide="coffee" class="w-5 h-5"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Bữa Sáng</div>
                  <div class="text-sm font-semibold truncate" style="color: var(--text-main);">${todayRecommendedMeals?.breakfast?.name || '1 bát phở gà nạc kho gừng'}</div>
                </div>
                <div class="text-xs font-bold" style="color: var(--accent-purple);">${todayRecommendedMeals?.breakfast?.calories || 420} kcal</div>
              </div>

              <!-- 2. Bữa Trưa -->
              <div class="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition hover:shadow-md" style="background: var(--bg-card); border: 1px solid rgba(124, 58, 237, 0.16) !important;" id="dash-btn-quick-log-meals-2" title="Bấm để ghi bữa trưa">
                <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[var(--accent-purple)] flex-shrink-0">
                  <i data-lucide="utensils" class="w-5 h-5"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Bữa Trưa</div>
                  <div class="text-sm font-semibold truncate" style="color: var(--text-main);">${todayRecommendedMeals?.lunch?.name || '150g thăn bò xào cần tây + 1 bát cơm gạo lứt'}</div>
                </div>
                <div class="text-xs font-bold" style="color: var(--accent-purple);">${todayRecommendedMeals?.lunch?.calories || 510} kcal</div>
              </div>

              <!-- 3. Bữa Tối -->
              <div class="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition hover:shadow-md" style="background: var(--bg-card); border: 1px solid rgba(124, 58, 237, 0.16) !important;" id="dash-btn-quick-log-meals-3" title="Bấm để ghi bữa tối">
                <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[var(--accent-purple)] flex-shrink-0">
                  <i data-lucide="moon" class="w-5 h-5"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Bữa Tối</div>
                  <div class="text-sm font-semibold truncate" style="color: var(--text-main);">${todayRecommendedMeals?.dinner?.name || 'Cá hồi áp chảo + Xà lách trộn dấm bơ'}</div>
                </div>
                <div class="text-xs font-bold" style="color: var(--accent-purple);">${todayRecommendedMeals?.dinner?.calories || 480} kcal</div>
              </div>
            </div>

            <!-- Right Column: 3 Workout/Activity Items (all with rounded border boxes) -->
            <div class="space-y-3">
              <!-- 4. Tập Luyện AI -->
              <div class="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition hover:shadow-md" style="background: var(--bg-card); border: 1px solid rgba(124, 58, 237, 0.16) !important;" id="dash-btn-quick-log-workout">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: #FCE7F3;">
                  <i data-lucide="dumbbell" class="w-5 h-5 text-[#EC4899]"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Tập Luyện AI</div>
                  <div class="text-sm font-semibold truncate" style="color: var(--text-main);">${todayRecommendedWorkout?.title || 'Cardio HIIT Đốt Mỡ Tại Nhà'}</div>
                </div>
                <div class="text-xs font-bold text-[#EC4899]">${todayRecommendedWorkout?.duration || 30} phút</div>
              </div>

              <!-- 5. Cardio Tiêu Hao -->
              <div class="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition hover:shadow-md" style="background: var(--bg-card); border: 1px solid rgba(124, 58, 237, 0.16) !important;" id="dash-btn-quick-log-workout-2">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: #DBEAFE;">
                  <i data-lucide="footprints" class="w-5 h-5 text-[#3B82F6]"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Cardio Tiêu Hao</div>
                  <div class="text-sm font-semibold truncate" style="color: var(--text-main);">Đi bộ nhẹ nhàng 5.000 bước</div>
                </div>
                <div class="text-xs font-bold text-[#3B82F6]">30 phút</div>
              </div>

              <!-- 6. Phục Hồi & Giãn Cơ -->
              <div class="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition hover:shadow-md" style="background: var(--bg-card); border: 1px solid rgba(124, 58, 237, 0.16) !important;" id="dash-btn-quick-log-workout-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: #FEF3C7;">
                  <i data-lucide="heart-pulse" class="w-5 h-5 text-[#F59E0B]"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Phục Hồi & Giãn Cơ</div>
                  <div class="text-sm font-semibold truncate" style="color: var(--text-main);">Bài tập giãn cơ & thả lỏng toàn thân</div>
                </div>
                <div class="text-xs font-bold text-[#F59E0B]">15 phút</div>
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
                <!-- Track background ring -->
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(124, 58, 237, 0.08)" stroke-width="12"/>
                
                ${totalConsumedMacros > 0 ? `
                  <!-- Protein Arc (Hồng #EC4899) -->
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#EC4899" stroke-width="12" 
                          stroke-dasharray="${pLen} ${C_MACRO - pLen}" stroke-dashoffset="${pOffset}" class="transition-all duration-300"/>
                  
                  <!-- Carbs Arc (Vàng #F59E0B) -->
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#F59E0B" stroke-width="12" 
                          stroke-dasharray="${cLen} ${C_MACRO - cLen}" stroke-dashoffset="${cOffset}" class="transition-all duration-300"/>
                  
                  <!-- Fat Arc (Xanh Dương #3B82F6) -->
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" stroke-width="12" 
                          stroke-dasharray="${fLen} ${C_MACRO - fLen}" stroke-dashoffset="${fOffset}" class="transition-all duration-300"/>
                ` : ''}
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
    await renderAiSummaryWidget('dashboard-ai-summary-container', disciplineScore, todayLog);

    // Render ApexCharts with complete daily logs history & start milestone
    const allLogs = await DataService.getAllDailyLogs();
    const historyLogs = allLogs.length > 0 ? allLogs : [todayLog];
    renderWeightChart('chart-weight-trend', historyLogs, targetW, goal);
    renderCalorieChart('chart-calorie-io', historyLogs, calorieTarget);
    // Render Charts

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
    document.getElementById('dash-btn-quick-log-meals-3')?.addEventListener('click', handleQuickLogMeals);

    // Quick Log Workout Handler
    const handleQuickLogWorkout = async (title = 'Bài tập hôm nay', duration = 30, estBurn = 250) => {
      const today = DataService.getTodayString();
      await DataService.addWorkoutLog(today, {
        type: todayRecommendedWorkout?.title || title,
        duration: todayRecommendedWorkout?.duration || duration,
        intensity: 'Moderate',
        caloriesBurned: todayRecommendedWorkout?.estBurn || estBurn
      });
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
      const updatedLog = await DataService.getDailyLog(today);
      updateDashboardRealtime(updatedLog);
      await Modal.success({
        title: 'Hoàn Thành Vận Động!',
        message: `Đã ghi nhận bài tập/hoạt động vận động vào nhật ký hôm nay!`
      });
    };

    document.getElementById('dash-btn-quick-log-workout')?.addEventListener('click', () => handleQuickLogWorkout());
    document.getElementById('dash-btn-quick-log-workout-2')?.addEventListener('click', () => handleQuickLogWorkout('Đi bộ nhẹ nhàng 5.000 bước', 30, 180));
    document.getElementById('dash-btn-quick-log-workout-3')?.addEventListener('click', () => handleQuickLogWorkout('Giãn cơ & Thả lỏng', 15, 90));

    async function updateDashboardRealtime(updatedLog) {
      const cIn = updatedLog.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      const cOut = updatedLog.workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
      const cProt = updatedLog.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
      const cCarb = updatedLog.meals.reduce((sum, m) => sum + (m.carb || 0), 0);
      const cFat = updatedLog.meals.reduce((sum, m) => sum + (m.fat || 0), 0);
      const wIntake = updatedLog.waterIntake || 0;

      // Auto check targets
      let checklistChanged = false;
      for (const item of updatedLog.checklist) {
        const textLower = (item.task || '').toLowerCase();
        let achieved = false;

        if (textLower.includes('nước') || textLower.includes('water') || textLower.includes('lit') || textLower.includes('2.7l')) {
          achieved = wIntake >= waterTarget && waterTarget > 0;
        } else if (textLower.includes('cal') || textLower.includes('kcal') || textLower.includes('calo')) {
          achieved = cIn >= calorieTarget && calorieTarget > 0;
        } else if (textLower.includes('protein') || textLower.includes('đạm')) {
          achieved = cProt >= pTarget && pTarget > 0;
        } else if (textLower.includes('carb') || textLower.includes('tinh bột')) {
          achieved = cCarb >= cTarget && cTarget > 0;
        } else if (textLower.includes('fat') || textLower.includes('chất béo')) {
          achieved = cFat >= fTarget && fTarget > 0;
        } else if (textLower.includes('tập') || textLower.includes('workout') || textLower.includes('ai plan') || textLower.includes('lịch ai')) {
          achieved = (updatedLog.workouts || []).length > 0 || !!updatedLog.isRestDay;
        } else if (textLower.includes('ghi nhật ký') || textLower.includes('bữa ăn')) {
          achieved = (updatedLog.meals || []).length > 0;
        }

        if (achieved && !item.done) {
          item.done = true;
          checklistChanged = true;
          await DataService.toggleChecklistItem(todayLog.date, item.id);
        }
      }

      if (checklistChanged) {
        const container = document.getElementById('dash-checklist-container');
        if (container) {
          updatedLog.checklist.forEach(item => {
            const input = container.querySelector(`[data-task-id="${item.id}"]`);
            if (input) {
              input.checked = item.done;
              const row = input.closest('.check-item');
              const textSpan = row?.querySelector('.task-text');
              if (textSpan) {
                if (item.done) textSpan.classList.add('line-through', 'opacity-50');
                else textSpan.classList.remove('line-through', 'opacity-50');
              }
            }
          });
        }
      }

      const hMeal = updatedLog.meals.length > 0;
      const hWater = wIntake > 0;
      const hWorkout = updatedLog.workouts.length > 0 || updatedLog.isRestDay;
      const hChecklist = updatedLog.checklist.some(t => t.done);

      const cIns = [hMeal, hWater, hWorkout, hChecklist];
      const cCount = cIns.filter(Boolean).length;
      const discScore = Math.min(100, Math.round((cCount / 4) * 80 + (Math.min(100, (wIntake / waterTarget) * 100) / 100) * 20));

      const netCalEl = document.getElementById('dash-net-calories');
      if (netCalEl) netCalEl.innerText = `${cIn - cOut}`;

      const discScoreEl = document.getElementById('dash-discipline-score');
      if (discScoreEl) discScoreEl.innerText = `${discScore}`;

      const discFillEl = document.getElementById('dash-discipline-fill');
      if (discFillEl) discFillEl.style.width = `${discScore}%`;

      const badgeCountEl = document.getElementById('checklist-badge-count');
      if (badgeCountEl) {
        const doneCount = updatedLog.checklist.filter(t => t.done).length;
        badgeCountEl.innerText = `${doneCount}/${updatedLog.checklist.length} Tick`;
      }

      renderAiSummaryWidget('dashboard-ai-summary-container', discScore, updatedLog);
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
