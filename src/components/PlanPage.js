import confetti from 'canvas-confetti';
import { DataService, generate7DayMealPlan, generate7DayWorkoutRoutine, generateFullJourneyPhases, getPlanForJourneyDay, getMealRecipeDetails } from '../services/dataService.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import { Modal } from './ui/Modal.js';
import { renderGeminiIcon, renderSunIcon, renderSunsetIcon, renderMoonIcon, renderAppleIcon, renderFlameIcon, renderCalendarIcon } from './ui/Icons.js';

let selectedJourneyDay = null; // 1-based journey day navigation
let activeWorkoutTypeSelection = null;

export function parseEmbedVideoUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const str = urlStr.trim();

  // YouTube matchers (watch?v=, embed/, shorts/, youtu.be/)
  const ytMatch = str.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // TikTok matchers (@user/video/ID or embed/v2/ID)
  const ttMatch = str.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|embed\/v2\/)(\d+)/i);
  if (ttMatch && ttMatch[1]) {
    return `https://www.tiktok.com/embed/v2/${ttMatch[1]}`;
  }

  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }

  return null;
}

export async function renderPlanPage(onNavigateTab, onOpenAiCoach) {
  // Cleanup any old teleported modals from DOM to prevent duplicate ID conflicts
  ['recipe-details-modal', 'workout-guide-modal', 'schedule-details-modal'].forEach(id => {
    document.querySelectorAll('#' + id).forEach(el => el.remove());
  });

  const profile = await DataService.getUserProfile();
  const goal = await DataService.getUserGoal();
  const plan = await DataService.getUserPlan();
  const totalJourneyDays = goal.totalJourneyDays || goal.targetDays || 60;

  // Calculate current journey day based on goal.startDate and today's date
  const currentJourneyDay = DataService.calculateCurrentJourneyDay(goal.startDate);

  // Default to today's current journey day if user hasn't explicitly selected another day
  if (selectedJourneyDay === null) {
    selectedJourneyDay = Math.min(currentJourneyDay, totalJourneyDays);
  }

  let currentWorkoutType = activeWorkoutTypeSelection || plan.workoutType || 'home';
  let currentHomeEquipment = plan.homeEquipment || 'Thảm yoga, Dây kháng lực, Tạ đơn 5kg';

  // Ensure weeklyMealPlan has entries
  if (!plan.weeklyMealPlan || Object.keys(plan.weeklyMealPlan).length === 0) {
    plan.weeklyMealPlan = generate7DayMealPlan(plan.dailyBudgetVnd || 100000, DataService.getTodayString());
    plan.weeklyWorkoutRoutine = generate7DayWorkoutRoutine(currentWorkoutType, currentHomeEquipment);
    await DataService.saveUserPlan(plan);
  }

  // Clamp selectedJourneyDay
  if (selectedJourneyDay < 1) selectedJourneyDay = 1;
  if (selectedJourneyDay > totalJourneyDays) selectedJourneyDay = totalJourneyDays;

  // Resolve meal & workout for selected journey day using phase system
  const { mealEntry: activeDayMealPlan, workout: activeWorkout, phase: activePhase, dailySchedule: activeDailySchedule } = getPlanForJourneyDay(plan, selectedJourneyDay);

  // Current phase info for display
  const phaseLabel = activePhase?.phaseLabel || (plan.journeyPhases?.length > 0 ? plan.journeyPhases[0].phaseLabel : 'Kế Hoạch Hành Trình');

  // Active workout list: normalize to Array
  const rawRoutine = activePhase?.weeklyWorkoutRoutine || plan.weeklyWorkoutRoutine || [];
  const activeWorkoutRoutine = Array.isArray(rawRoutine)
    ? rawRoutine
    : (rawRoutine && typeof rawRoutine === 'object')
      ? Object.values(rawRoutine)
      : [];

  const activeWorkoutIndex = (selectedJourneyDay - 1) % 7;
  const currentDayWorkout = activeWorkoutRoutine[activeWorkoutIndex] || activeWorkout || null;

  const totalMealCost = (activeDayMealPlan?.breakfast?.costVnd || 0) +
                        (activeDayMealPlan?.lunch?.costVnd || 0) +
                        (activeDayMealPlan?.dinner?.costVnd || 0) +
                        (activeDayMealPlan?.snack?.costVnd || 0);

  const totalMealCalories = (activeDayMealPlan?.breakfast?.calories || 0) +
                            (activeDayMealPlan?.lunch?.calories || 0) +
                            (activeDayMealPlan?.dinner?.calories || 0) +
                            (activeDayMealPlan?.snack?.calories || 0);

  const dayOfWeek = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ Nhật'][(selectedJourneyDay - 1) % 7];
  const activeDayName = activeDayMealPlan?.dayName || dayOfWeek;

  const workoutOptions = [
    { value: 'home', label: 'Tập Tại Nhà' },
    { value: 'gym', label: 'Tập Tại Phòng Gym (Đầy đủ máy tạ)' },
    { value: 'outdoor', label: 'Tập Outdoor / Chạy Bộ & Công Viên' }
  ];

  const html = `
    <div class="max-w-6xl mx-auto py-2 fade-up">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8 fade-up">
        <div>
          <div class="text-sm text-muted mb-2 flex items-center gap-2" style="color: var(--text-muted);">
            <i data-lucide="route" class="w-4 h-4" style="color: var(--accent-purple);"></i> Kế Hoạch Toàn Bộ Hành Trình · ${totalJourneyDays} Ngày
          </div>
          <h1 class="display text-4xl md:text-5xl font-medium leading-[1.05]" style="color: var(--text-main);">
            Lộ Trình Tập &<br><span class="italic" style="color: var(--accent-purple);">Dinh Dưỡng AI</span>
          </h1>
          <div class="flex flex-wrap gap-2 mt-4">
            <div class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style="background: var(--primary-soft); color: var(--accent-purple);">
              <i data-lucide="calendar-days" class="w-3.5 h-3.5"></i> Ngày ${selectedJourneyDay} / ${totalJourneyDays} · Phase ${activePhase?.phaseIndex + 1 || 1}
            </div>
            <div class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style="background: rgba(217, 70, 239, 0.12); color: #D946EF;">
              <i data-lucide="trending-up" class="w-3.5 h-3.5"></i> ${phaseLabel}
            </div>
          </div>
        </div>
        <button id="btn-recalculate-plan" class="ai-glow px-4 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-sm transition hover:shadow-md cursor-pointer" style="background: var(--bg-card); border: 1.5px solid rgba(124, 58, 237, 0.2); color: var(--text-main);">
          <i data-lucide="sparkles" class="w-4 h-4 text-[var(--accent-purple)]"></i> Lập Kế Hoạch AI Mới
        </button>
      </div>

      <!-- Control Panel: Budget, Location Toggle, Equipment & Update Button -->
      <div class="w-full glass-card rounded-[32px] p-6 relative overflow-hidden mb-6 border border-color fade-up">
        <!-- Đốm sáng trang trí -->
        <div class="blob bg-[var(--accent-purple)] w-40 h-40 -top-10 -right-10"></div>
        <div class="blob bg-[var(--accent)] w-32 h-32 -bottom-10 -left-10 opacity-20"></div>

        <div class="relative z-10 flex flex-col lg:flex-row gap-5 items-stretch lg:items-end min-w-0">
          
          <!-- Nhóm Input Bên Trái -->
          <div class="flex flex-col md:flex-row gap-4 flex-1 items-end min-w-0">
            
            <!-- 1. Ngân Sách -->
            <div class="w-full md:w-52 flex-shrink-0">
              <label class="form-label text-xs font-bold text-muted uppercase tracking-wider" style="color: var(--text-muted);">
                <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                Ngân Sách / Ngày
              </label>
              <div class="input-field rounded-xl flex items-center px-4 py-3.5">
                <span class="text-gray-400 font-bold mr-2">₫</span>
                <input id="plan-budget-input" type="text" value="${(plan.dailyBudgetVnd || 100000).toLocaleString('de-DE')}" class="font-bold text-base" style="color: var(--text-main);">
              </div>
            </div>

            <!-- 2. Địa Điểm -->
            <div class="w-full md:w-64 flex-shrink-0">
              <label class="form-label text-xs font-bold text-muted uppercase tracking-wider" style="color: var(--text-muted);">
                <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                Địa Điểm Tập
              </label>
              <div class="toggle-container">
                <div id="toggle-indicator-plan" class="toggle-indicator" style="transform: ${currentWorkoutType === 'gym' ? 'translateX(100%)' : 'translateX(0%)'};"></div>
                <button id="btn-loc-home" type="button" class="toggle-btn ${currentWorkoutType !== 'gym' ? 'active' : ''}">
                  <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  Tại Nhà
                </button>
                <button id="btn-loc-gym" type="button" class="toggle-btn ${currentWorkoutType === 'gym' ? 'active' : ''}">
                  <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>
                  Phòng Gym
                </button>
              </div>
            </div>

            <!-- 3. Dụng Cụ Cơ Bản -->
            <div id="home-equipment-container" class="equip-wrapper ${currentWorkoutType !== 'gym' ? 'active' : 'inactive'} w-full min-w-0">
              <label class="form-label text-xs font-bold text-muted uppercase tracking-wider" style="color: var(--text-muted);">
                <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                Dụng Cụ Cơ Bản
              </label>
              <div class="input-field rounded-xl flex items-center px-4 py-3.5 overflow-hidden">
                <input id="plan-home-equipment-input" type="text" value="${currentHomeEquipment}" placeholder="Ví dụ: Thảm yoga, Dây kháng lực, Tạ tay..." class="font-medium text-base whitespace-nowrap overflow-hidden text-ellipsis min-w-0" style="color: var(--text-main);">
              </div>
            </div>

          </div>

          <!-- Nhóm Nút Bấm Bên Phải -->
          <div class="flex-shrink-0 w-full md:w-auto">
            <div class="hidden md:block h-[28px] mb-2"></div>
            <button id="btn-save-plan-controls" type="button" class="btn-glow w-full md:w-auto text-white font-bold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2.5 text-[15px] cursor-pointer">
              <span>Cập Nhật Kế Hoạch</span>
              <svg class="icon-svg-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>

        </div>
      </div>

      <!-- Info Overview Grid (3 Cards) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div class="card p-5 flex items-center gap-4 fade-up" style="animation-delay: 0.1s; border: 1px solid rgba(124, 58, 237, 0.18) !important;">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-[var(--accent-purple)] flex-shrink-0" style="background: var(--primary-soft);">
            <i data-lucide="wallet" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[10px] text-muted font-bold uppercase tracking-wider" style="color: var(--text-muted);">Ngân Sách / Ngày</div>
            <div class="display text-2xl font-semibold truncate" style="color: var(--text-main);" id="disp-card-budget" title="${(plan.dailyBudgetVnd || 100000).toLocaleString('vi-VN')}₫">${(plan.dailyBudgetVnd || 100000).toLocaleString('vi-VN')}₫</div>
          </div>
        </div>

        <div class="card p-5 flex items-center gap-4 fade-up" style="animation-delay: 0.15s; border: 1px solid rgba(124, 58, 237, 0.18) !important;">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-[#3B82F6] flex-shrink-0" style="background: #DBEAFE;">
            <i data-lucide="home" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[10px] text-muted font-bold uppercase tracking-wider" style="color: var(--text-muted);">Địa Điểm Tập</div>
            <div class="display text-xl font-semibold leading-tight truncate" style="color: var(--text-main);" id="disp-card-location">
              ${currentWorkoutType === 'home' ? 'Tập Tại Nhà' : currentWorkoutType === 'gym' ? 'Phòng Gym' : 'Outdoor'}
            </div>
          </div>
        </div>

        <div class="card p-5 flex items-center gap-4 fade-up" style="animation-delay: 0.2s; border: 1px solid rgba(124, 58, 237, 0.18) !important;">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-[#EC4899] flex-shrink-0" style="background: #FCE7F3;">
            <i data-lucide="dumbbell" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[10px] text-muted font-bold uppercase tracking-wider" style="color: var(--text-muted);">Dụng Cụ Tập</div>
            <div class="display text-sm font-semibold leading-tight mt-1 truncate" style="color: var(--text-main);" id="disp-card-equipment" title="${currentHomeEquipment || 'Bodyweight'}">
              ${currentHomeEquipment || 'Bodyweight'}
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Schedule Timeline (Scrollable with Segment Vertical Lines) -->
      <div class="card p-6 mb-6 fade-up" style="animation-delay: 0.25s">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-color" style="border-bottom: 1px solid var(--border-color);">
          <div>
            <h2 class="display text-xl font-semibold" style="color: var(--text-main);">Lịch Trình Hôm Nay (${activeDayName})</h2>
            <p class="text-xs text-muted mt-1" style="color: var(--text-muted);">Thực đơn & Tập luyện chi tiết theo giờ (Bấm mốc để xem chi tiết)</p>
          </div>

          <!-- Day selector navigation (Date Switcher Wow) -->
          <div class="date-switcher">
            <div class="glow-center"></div>
            <button id="btn-plan-day-prev" class="arrow-btn" ${selectedJourneyDay <= 1 ? 'disabled' : ''} aria-label="Ngày trước">
              <i data-lucide="chevron-left" class="w-5 h-5"></i>
            </button>
            <div class="date-display" id="plan-date-display">
              <div class="date-content slide-active">
                <div class="text-[10px] font-bold tracking-widest uppercase mb-0.5" style="color: var(--accent-purple);">${activeDayName} · Ngày ${selectedJourneyDay}/${totalJourneyDays}</div>
                <div class="display text-sm font-bold leading-none" style="color: var(--text-main);">${DataService.parseLocalDate(DataService.getDateStrForJourneyDay(goal.startDate, selectedJourneyDay)).getDate()} Tháng ${String(DataService.parseLocalDate(DataService.getDateStrForJourneyDay(goal.startDate, selectedJourneyDay)).getMonth() + 1).padStart(2, '0')}</div>
              </div>
            </div>
            <button id="btn-plan-day-next" class="arrow-btn" ${selectedJourneyDay >= totalJourneyDays ? 'disabled' : ''} aria-label="Ngày sau">
              <i data-lucide="chevron-right" class="w-5 h-5"></i>
            </button>
          </div>
        </div>

        <!-- Scrollable Timeline with Per-Item Segment Connecting Lines -->
        <div class="relative pl-14 pr-2 overflow-y-auto max-h-[480px]">
          ${(activeDailySchedule || []).map((item, idx) => {
            const isWorkout = item.category === 'workout';
            const isMeal = item.category === 'meal';
            const iconName = isWorkout ? 'flame' : isMeal ? 'coffee' : 'droplet';
            const iconBg = isWorkout ? '#FCE7F3' : isMeal ? 'var(--primary-soft)' : '#DBEAFE';
            const iconColor = isWorkout ? '#EC4899' : isMeal ? 'var(--accent-purple)' : '#3B82F6';
            const isLastItem = idx === ((activeDailySchedule || []).length - 1);

            return `
              <div class="relative mb-8 cursor-pointer group" data-open-schedule-item="${idx}">
                <!-- Icon Badge Circle -->
                <div class="absolute left-[-44px] top-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-[var(--bg-card)] shadow-md z-10" style="background: ${iconBg}; color: ${iconColor};">
                  <i data-lucide="${iconName}" class="w-4 h-4"></i>
                </div>

                <!-- Per-Item Segment Connecting Line (No overlap, 100% continuous) -->
                ${!isLastItem ? `
                  <div class="absolute left-[-25px] top-10 bottom-[-32px] w-[2px] z-0" 
                       style="background: linear-gradient(to bottom, #7C3AED, #8B5CF6, #D946EF);"></div>
                ` : ''}

                ${isWorkout ? `
                  <div class="p-4 rounded-2xl border border-color hover:border-[var(--accent-purple)] transition" style="background: var(--primary-soft);">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                      <div class="flex-1 min-w-0 pr-2">
                        <div class="text-xs font-bold" style="color: #D946EF;">${item.time} · Tập Luyện Chính</div>
                        <h3 class="display text-lg font-semibold leading-snug" style="color: var(--accent-purple);">${item.activity}</h3>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0 whitespace-nowrap self-start md:self-center">
                        <span class="text-xs font-bold px-3 py-1 rounded-full shadow-xs whitespace-nowrap flex-shrink-0" style="background: var(--bg-card); color: var(--text-main);">${item.duration || 30} phút</span>
                        <span class="text-xs font-bold text-white px-3 py-1 rounded-full shadow-xs whitespace-nowrap flex-shrink-0" style="background: #EC4899;">~${item.estBurn || 280} kcal</span>
                      </div>
                    </div>
                    <p class="text-xs opacity-80 mb-3" style="color: var(--text-main);">${item.desc || 'Tập luyện cường độ cao ngắt quãng'}</p>
                    <button class="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 w-fit" data-open-workout-guide="${activeWorkoutIndex}">
                      <i data-lucide="play" class="w-3.5 h-3.5"></i> Bắt Đầu Tập
                    </button>
                  </div>
                ` : `
                  <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3.5 rounded-2xl border border-color hover:border-[var(--accent-purple)] hover:bg-[var(--bg-subtle)] transition" style="background: var(--bg-card);">
                    <div>
                      <div class="text-xs font-bold text-muted" style="color: var(--text-muted);">${item.time}</div>
                      <h3 class="font-semibold text-sm" style="color: var(--text-main);">${item.activity}</h3>
                      <p class="text-xs text-muted mt-0.5" style="color: var(--text-muted);">${item.desc || ''}</p>
                    </div>
                    <button class="btn-ghost px-3 py-1.5 rounded-lg text-xs font-semibold w-fit">Xem Chi Tiết</button>
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Weekly Schedule Grid & 4 Phases Roadmap -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        
        <!-- Weekly Schedule (Col 3) -->
        <div class="card p-6 lg:col-span-3 fade-up" style="animation-delay: 0.3s">
          <div class="flex justify-between items-center mb-5 pb-4 border-b border-color" style="border-bottom: 1px solid var(--border-color);">
            <div>
              <h2 class="display text-xl font-semibold" style="color: var(--text-main);">Lịch Tập Tuần</h2>
              <p class="text-xs text-muted mt-1" style="color: var(--text-muted);">${phaseLabel}</p>
            </div>
          </div>

          <!-- Days Grid (7 Days) -->
          <div class="grid grid-cols-7 gap-2 mb-4">
            ${(activeWorkoutRoutine || []).map((w, idx) => {
              const isActiveDay = idx === activeWorkoutIndex;
              const isRest = w.type === 'Rest' || w.duration === 0;
              const dotBg = isRest ? '#D1D5DB' : isActiveDay ? '#D946EF' : '#10B981';

              return `
                <div class="cursor-pointer text-center p-2 rounded-xl transition ${isActiveDay ? 'bg-[var(--primary)] text-white shadow-md' : 'hover:bg-[var(--primary-soft)]'}"
                     data-select-routine-day="${idx}">
                  <div class="text-[10px] font-bold ${isActiveDay ? 'opacity-80' : 'text-muted'}" style="${!isActiveDay ? 'color: var(--text-muted);' : ''}">${w.day}</div>
                  <div class="text-sm font-semibold mt-1">${idx + 1}</div>
                  <div class="w-1.5 h-1.5 rounded-full mx-auto mt-2" style="background: ${isActiveDay ? '#FFFFFF' : dotBg};"></div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Active Day Workout Detail Box -->
          ${currentDayWorkout ? `
            <div class="p-4 rounded-2xl border border-color" style="background: var(--primary-soft);">
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-bold uppercase" style="color: var(--accent-purple);">Ngày ${selectedJourneyDay} Đang Chọn</span>
                <span class="text-xs font-semibold whitespace-nowrap flex-shrink-0" style="color: #D946EF;">${currentDayWorkout.type || 'HIIT'} · ${currentDayWorkout.estBurn} kcal</span>
              </div>
              <h3 class="display text-lg font-semibold" style="color: var(--text-main);">${currentDayWorkout.title}</h3>
              <p class="text-xs text-muted mt-1 mb-4" style="color: var(--text-muted);">Tập luyện cường độ cao ngắt quãng, thời lượng ${currentDayWorkout.duration} phút.</p>
              <button class="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 w-full justify-center" data-open-workout-guide="${activeWorkoutIndex}">
                <i data-lucide="play-circle" class="w-4 h-4"></i> Vào Tập Ngay
              </button>
            </div>
          ` : ''}
        </div>

        <!-- 4 Phases Roadmap (Col 2) -->
        <div class="card p-6 lg:col-span-2 fade-up" style="animation-delay: 0.35s">
          <div class="mb-5 pb-4 border-b border-color" style="border-bottom: 1px solid var(--border-color);">
            <h2 class="display text-xl font-semibold" style="color: var(--text-main);">Lộ Trình 4 Giai Đoạn</h2>
            <p class="text-xs text-muted mt-1" style="color: var(--text-muted);">Tổng số ${totalJourneyDays} ngày chuyển đổi</p>
          </div>

          <div class="space-y-6">
            ${(plan.journeyPhases || []).map((p, idx) => {
              const isCurrentPhase = activePhase?.phaseIndex === p.phaseIndex;
              const isLast = idx === (plan.journeyPhases.length - 1);

              return `
                <div class="relative pl-8 cursor-pointer group" data-select-phase-start="${p.startDay}">
                  <!-- Dot Icon -->
                  <div class="absolute left-0 top-0 w-6 h-6 rounded-full border-4 border-white dark:border-[var(--bg-card)] shadow-md flex items-center justify-center z-10"
                       style="background: ${isCurrentPhase ? 'var(--accent-purple)' : '#D1D5DB'};">
                    <div class="w-1.5 h-1.5 rounded-full" style="background: ${isCurrentPhase ? '#FFFFFF' : '#6B7280'};"></div>
                  </div>

                  <!-- Phase Vertical Connecting Line Segment -->
                  ${!isLast ? `
                    <div class="absolute left-[11px] top-6 bottom-[-24px] w-[2px] z-0" 
                         style="background: ${isCurrentPhase ? 'linear-gradient(to bottom, #7C3AED, #8B5CF6)' : 'rgba(124, 58, 237, 0.25)'};"></div>
                  ` : ''}

                  <div>
                    <div class="flex justify-between items-center mb-1">
                      <h4 class="font-semibold text-sm" style="color: ${isCurrentPhase ? 'var(--accent-purple)' : 'var(--text-main)'};">${p.phaseLabel}</h4>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" style="background: ${isCurrentPhase ? 'var(--primary-soft)' : 'var(--bg-subtle)'}; color: ${isCurrentPhase ? 'var(--accent-purple)' : 'var(--text-muted)'};">
                        Ngày ${p.startDay} - ${p.endDay}
                      </span>
                    </div>
                    <p class="text-xs text-muted" style="color: var(--text-muted);">Tập luyện và dinh dưỡng được tối ưu hóa cho giai đoạn này.</p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>

    </div>

    <!-- POPUP 1: Modal Hướng Dẫn Bài Tập Cụ Thể (Workout Guide Bottom Sheet Popup) -->
    <div class="workout-popup-overlay" id="workout-guide-modal">
      <div class="workout-popup-sheet" onclick="event.stopPropagation()">
        <div class="drag-handle"></div>
        
        <div class="p-6">
          <!-- Header -->
          <div class="flex justify-between items-start mb-4">
            <div>
              <span id="wg-modal-type-badge" class="text-[10px] font-bold text-[var(--accent-purple)] bg-[var(--primary-soft)] px-2.5 py-1 rounded-md uppercase tracking-wider">Cardio · HIIT</span>
              <h2 id="wg-modal-title" class="display text-2xl font-semibold mt-2 leading-tight" style="color: var(--text-main);">Đốt Mỡ Tại Nhà <br>Cường Độ Cao</h2>
            </div>
            <button id="btn-close-wg-modal" class="w-9 h-9 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-muted hover:bg-gray-200 transition cursor-pointer flex-shrink-0">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <!-- Video Paste Input Bar (Retains YouTube/TikTok URL pasting feature) -->
          <div class="mb-4 p-3 rounded-2xl border border-dashed border-[var(--accent-purple)]" style="background: var(--primary-soft);">
            <div class="flex justify-between items-center mb-1.5 flex-wrap gap-1">
              <label class="text-xs font-bold text-[var(--accent-purple)]">
                <i data-lucide="link" class="w-3.5 h-3.5 inline mr-1"></i> Dán Link Video TikTok / YouTube Đổi Video:
              </label>
              <a id="wg-youtube-search-btn" href="#" target="_blank" rel="noopener" class="text-xs font-semibold hover:underline text-[var(--accent-purple)] flex items-center gap-1">
                Tìm trên YouTube <i data-lucide="external-link" class="w-3 h-3"></i>
              </a>
            </div>
            <div class="flex gap-2 items-center flex-wrap">
              <input type="text" class="form-input text-xs flex-1 rounded-xl px-3 py-2" id="wg-custom-video-input" onfocus="this.select()" placeholder="Dán link TikTok hoặc YouTube..." style="background: var(--bg-card); color: var(--text-main);" />
              <button type="button" class="btn-primary btn-sm text-xs font-bold px-3.5 py-2 rounded-xl whitespace-nowrap cursor-pointer" id="btn-wg-apply-video">
                ✓ Đổi Video
              </button>
            </div>
          </div>

          <!-- Video Frame Thumbnail Container -->
          <div class="video-thumb mb-6 relative">
            <iframe id="wg-modal-iframe" class="w-full h-full border-0 absolute inset-0 z-10" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>

          <!-- Exercise Instructions List -->
          <div class="mb-6">
            <h3 class="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style="color: var(--text-muted);">
              <i data-lucide="list-checks" class="w-4 h-4 text-[var(--accent-purple)]"></i> Nội Dung & Động Tác Thực Hiện
            </h3>
            <div id="wg-modal-instructions" class="space-y-2.5">
              <!-- Exercise items rendered dynamically -->
            </div>
          </div>

          <!-- Start Button -->
          <button class="btn-start w-full text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base mb-2 cursor-pointer" id="btn-start-confirm-workout">
            <i data-lucide="play-circle" class="w-5 h-5"></i>
            Bắt Đầu Tập & Ghi Nhận Vào Nhật Ký
          </button>
          <p class="text-center text-[10px] text-muted font-medium" style="color: var(--text-muted);">Đảm bảo bạn đã khởi động kỹ trước khi bắt đầu.</p>

        </div>
      </div>
    </div>

    <!-- POPUP 2: Modal Chi Tiết Thực Đơn & Công Thức Chế Biến (Recipe Details Popup Sheet) -->
    <div class="recipe-popup-overlay" id="recipe-details-modal">
      <div class="recipe-popup-sheet" onclick="event.stopPropagation()">
        <div class="drag-handle"></div>
        
        <!-- Hero Image Header -->
        <div class="relative">
          <img id="rd-modal-hero-img" src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80" alt="Recipe Hero" class="hero-img">
          <div class="hero-overlay"></div>
          <button id="btn-close-rd-modal" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-gray-700 hover:bg-white transition cursor-pointer flex-shrink-0 shadow-md z-30">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="p-6 pt-4 -mt-16 relative z-10">
          <!-- Header Title -->
          <div class="mb-5">
            <span id="rd-modal-type-badge" class="text-[10px] font-bold text-[var(--accent-purple)] bg-[var(--primary-soft)] px-2.5 py-1 rounded-md uppercase tracking-wider">Bữa Snack · 5 Phút</span>
            <h2 id="rd-modal-title" class="display text-2xl font-semibold mt-2 leading-tight" style="color: var(--text-main);">Sinh Tố Dâu Tây <br>Ít Đường (1 Phần)</h2>
          </div>

          <!-- Media Link Inputs (Image & Video Realtime Updates with Both-Required Validation) -->
          <div class="mb-6 p-3.5 rounded-2xl border border-dashed border-[var(--accent-purple)]" style="background: var(--primary-soft);">
            <div class="flex justify-between items-center mb-2 flex-wrap gap-1">
              <label class="text-xs font-bold text-[var(--accent-purple)] flex items-center gap-1">
                <i data-lucide="image-plus" class="w-3.5 h-3.5"></i> Cập Nhật Link Ảnh & Link Video Thực Đơn:
              </label>
              <div class="flex gap-2 text-xs">
                <a id="rd-tiktok-search-btn" href="#" target="_blank" rel="noopener" class="font-semibold text-[var(--accent-purple)] hover:underline">🎵 TikTok</a>
                <a id="rd-youtube-search-btn" href="#" target="_blank" rel="noopener" class="font-semibold text-[var(--accent-purple)] hover:underline">▶ YouTube</a>
              </div>
            </div>
            <div class="space-y-2 mb-2">
              <div class="flex items-center gap-2 bg-[var(--bg-card)] rounded-xl px-3 py-1.5 border border-gray-200">
                <i data-lucide="image" class="w-4 h-4 text-gray-400 flex-shrink-0"></i>
                <input type="text" id="rd-custom-image-input" placeholder="Dán link Ảnh minh họa (URL image / Unsplash)..." class="text-xs flex-1 bg-transparent border-none focus:outline-none font-medium py-1" style="color: var(--text-main);" />
              </div>
              <div class="flex items-center gap-2 bg-[var(--bg-card)] rounded-xl px-3 py-1.5 border border-gray-200">
                <i data-lucide="video" class="w-4 h-4 text-gray-400 flex-shrink-0"></i>
                <input type="text" id="rd-custom-video-input" placeholder="Dán link Video TikTok / YouTube..." class="text-xs flex-1 bg-transparent border-none focus:outline-none font-medium py-1" style="color: var(--text-main);" />
              </div>
            </div>
            <button type="button" id="btn-rd-apply-media" class="btn-primary w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
              <i data-lucide="check" class="w-4 h-4"></i> Xác Nhận Cập Nhật Ảnh & Video Realtime
            </button>
          </div>

          <!-- Video Frame Display -->
          <div class="video-thumb mb-6 relative">
            <iframe id="rd-modal-iframe" class="w-full h-full border-0 absolute inset-0 z-10" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>

          <!-- Ingredients & Estimated Cost Breakdown -->
          <div class="mb-6">
            <h3 class="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2" style="color: var(--text-muted);">
              <i data-lucide="shopping-basket" class="w-4 h-4 text-[var(--accent-purple)]"></i> Nguyên Liệu & Chi Phí
            </h3>
            <div class="space-y-2" id="rd-modal-ingredients-container">
              <!-- Ingredients rendered dynamically -->
            </div>
            <div class="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-gray-200">
              <span class="text-xs font-bold uppercase" style="color: var(--text-muted);">Tổng chi phí ước tính</span>
              <span class="display text-xl font-bold" style="color: var(--accent-purple);" id="rd-modal-total-cost">35.000 VNĐ</span>
            </div>
          </div>

          <!-- Step-by-Step Timeline Instructions -->
          <div class="mb-6">
            <h3 class="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-2" style="color: var(--text-muted);">
              <i data-lucide="list-checks" class="w-4 h-4 text-[var(--accent-purple)]"></i> Các Bước Thực Hiện
            </h3>
            <div id="rd-modal-instructions-container">
              <!-- Timeline items rendered dynamically -->
            </div>
          </div>

          <!-- Actions -->
          <button class="btn-primary w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer" id="btn-apply-single-meal-to-today">
            <i data-lucide="plus-circle" class="w-5 h-5"></i> Ghi Nhận Món Này Vào Nhật Ký
          </button>

        </div>
      </div>
    </div>

    <!-- POPUP 3: Modal Chi Tiết Mốc Lịch Trình Sinh Hoạt AI (Schedule Habit Popup) -->
    <div class="habit-popup-overlay" id="schedule-details-modal">
      <div class="habit-popup-card" onclick="event.stopPropagation()">
        <div class="bg-glow-orange"></div>
        <div class="bg-glow-blue"></div>

        <!-- Close Button -->
        <button id="btn-close-sd-modal" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition z-20 cursor-pointer">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <!-- Header -->
        <div class="relative flex items-center gap-4 mb-6">
          <div class="habit-icon-box" id="sd-modal-icon-box">
            <i data-lucide="droplets" class="w-8 h-8 text-[#3B82F6]" id="sd-modal-icon"></i>
          </div>
          <div>
            <span class="text-[10px] font-bold text-[#3B82F6] bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider" id="sd-modal-badge">Sinh Hoạt</span>
            <h2 class="display text-xl font-semibold mt-1 leading-tight" id="sd-modal-title" style="color: var(--text-main);">Thức Dậy & <br>Uống Nước Ấm</h2>
          </div>
        </div>

        <!-- Meta Info (Time & Day) -->
        <div class="relative flex gap-3 mb-5">
          <div class="flex-1 bg-gray-50 rounded-xl p-3 flex items-center gap-2 border border-gray-100">
            <i data-lucide="alarm-clock" class="w-4 h-4 text-[#F59E0B]"></i>
            <div>
              <div class="text-[9px] text-gray-400 font-bold uppercase">Giờ Gợi Ý</div>
              <div class="text-sm font-bold" id="sd-modal-time">05:30 Sáng</div>
            </div>
          </div>
          <div class="flex-1 bg-gray-50 rounded-xl p-3 flex items-center gap-2 border border-gray-100">
            <i data-lucide="calendar-check" class="w-4 h-4 text-[var(--accent-purple)]"></i>
            <div>
              <div class="text-[9px] text-gray-400 font-bold uppercase">Lịch Trình</div>
              <div class="text-sm font-bold" id="sd-modal-day-label">Ngày 2/124</div>
            </div>
          </div>
        </div>

        <!-- Metric Highlight -->
        <div class="relative metric-box p-4 mb-5 flex items-center justify-between" id="sd-modal-metric-container">
          <div>
            <div class="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1" id="sd-modal-metric-label">Lượng Nước Gợi Ý</div>
            <div class="display text-2xl font-bold text-[#3B82F6]" id="sd-modal-metric-val">300 - 500 ml</div>
          </div>
          <div class="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm" id="sd-modal-metric-icon-box">
            <i data-lucide="glass-water" class="w-6 h-6 text-[#3B82F6]" id="sd-modal-metric-icon"></i>
          </div>
        </div>

        <!-- Instructions -->
        <div class="relative mb-6">
          <h3 class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Hướng Dẫn Thực Hiện</h3>
          <div class="border-t border-gray-100" id="sd-modal-checklist">
            <div class="check-item border-b border-gray-100">
              <div class="check-icon"><i data-lucide="check" class="w-3 h-3"></i></div>
              <p class="text-sm text-gray-700">Uống 300 - 500ml nước ấm ngay sau khi thức dậy.</p>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <button id="btn-confirm-schedule-habit" class="btn-complete w-full text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base relative z-10 cursor-pointer">
          <i data-lucide="check-circle" class="w-5 h-5"></i>
          <span id="sd-btn-text">Hoàn Thành & Ghi Nhận Thói Quen</span>
        </button>

      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;

    // Teleport popup modals to document.body
    ['recipe-details-modal', 'workout-guide-modal', 'schedule-details-modal'].forEach(id => {
      const existingInBody = document.body.querySelector(`#${id}`);
      const newInMount = mountNode.querySelector(`#${id}`);
      if (existingInBody) existingInBody.remove();
      if (newInMount) document.body.appendChild(newInMount);
    });

    if (window.lucide) window.lucide.createIcons();

    // Location toggle buttons & Equipment wrapper collapsible animation
    const btnLocHome = document.getElementById('btn-loc-home');
    const btnLocGym = document.getElementById('btn-loc-gym');
    const indicatorPlan = document.getElementById('toggle-indicator-plan');
    const equipWrapper = document.getElementById('home-equipment-container');

    btnLocHome?.addEventListener('click', () => {
      activeWorkoutTypeSelection = 'home';
      currentWorkoutType = 'home';
      btnLocHome.classList.add('active');
      btnLocGym?.classList.remove('active');
      if (indicatorPlan) indicatorPlan.style.transform = 'translateX(0%)';
      if (equipWrapper) {
        equipWrapper.classList.add('active');
        equipWrapper.classList.remove('inactive');
      }
    });

    btnLocGym?.addEventListener('click', () => {
      activeWorkoutTypeSelection = 'gym';
      currentWorkoutType = 'gym';
      btnLocGym.classList.add('active');
      btnLocHome?.classList.remove('active');
      if (indicatorPlan) indicatorPlan.style.transform = 'translateX(100%)';
      if (equipWrapper) {
        equipWrapper.classList.remove('active');
        equipWrapper.classList.add('inactive');
      }
    });

    // Format budget input with thousand separators in real-time
    const budgetInput = document.getElementById('plan-budget-input');
    budgetInput?.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value) {
        e.target.value = new Intl.NumberFormat('de-DE').format(value);
      } else {
        e.target.value = '';
      }
    });

    // Select routine day handler
    document.querySelectorAll('[data-select-routine-day]').forEach(pill => {
      pill.addEventListener('click', () => {
        const idx = parseInt(pill.getAttribute('data-select-routine-day'));
        selectedJourneyDay = (Math.floor((selectedJourneyDay - 1) / 7) * 7) + idx + 1;
        renderPlanPage(onNavigateTab, onOpenAiCoach);
      });
    });

    // Phase selection handler
    document.querySelectorAll('[data-select-phase-start]').forEach(card => {
      card.addEventListener('click', () => {
        const startDay = parseInt(card.getAttribute('data-select-phase-start'));
        if (startDay) {
          selectedJourneyDay = startDay;
          renderPlanPage(onNavigateTab, onOpenAiCoach);
        }
      });
    });

    // Journey Day Navigation Controls (< prev | day | next >)
    document.getElementById('btn-plan-day-prev')?.addEventListener('click', () => {
      if (selectedJourneyDay > 1) {
        selectedJourneyDay--;
        renderPlanPage(onNavigateTab, onOpenAiCoach);
      }
    });

    document.getElementById('btn-plan-day-next')?.addEventListener('click', () => {
      if (selectedJourneyDay < totalJourneyDays) {
        selectedJourneyDay++;
        renderPlanPage(onNavigateTab, onOpenAiCoach);
      }
    });

    // Save Controls & Regenerate full journey phases
    document.getElementById('btn-save-plan-controls')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-save-plan-controls');
      const rawBudgetValue = document.getElementById('plan-budget-input')?.value || '100000';
      const budget = parseInt(rawBudgetValue.replace(/\D/g, '')) || 100000;
      const homeEquipInput = document.getElementById('plan-home-equipment-input');
      const homeEquipVal = homeEquipInput ? homeEquipInput.value.trim() : currentHomeEquipment;

      const chosenWorkoutType = activeWorkoutTypeSelection || currentWorkoutType || 'home';

      if (btn) {
        btn.style.opacity = '0.85';
        btn.style.pointerEvents = 'none';
        btn.innerHTML = `<svg class="icon-svg-lg animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> <span>Đang lưu...</span>`;
      }

      const profile = await DataService.getUserProfile();
      const allergies = profile.foodAllergies || '';
      plan.dailyBudgetVnd = budget;
      plan.workoutType = chosenWorkoutType;
      plan.homeEquipment = homeEquipVal;
      plan.weeklyMealPlan = generate7DayMealPlan(budget, DataService.getTodayString(), allergies);
      plan.weeklyWorkoutRoutine = generate7DayWorkoutRoutine(chosenWorkoutType, homeEquipVal);
      plan.journeyPhases = generateFullJourneyPhases(totalJourneyDays, budget, chosenWorkoutType, homeEquipVal, allergies);

      await DataService.saveUserPlan(plan);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });

      const locationName = chosenWorkoutType === 'gym' ? 'Phòng Gym' : chosenWorkoutType === 'outdoor' ? 'Outdoor' : 'Tập Tại Nhà';

      // Update 3 display boxes in real-time
      const budgetEl = document.getElementById('disp-card-budget');
      const locationEl = document.getElementById('disp-card-location');
      const equipmentEl = document.getElementById('disp-card-equipment');

      if (budgetEl) {
        budgetEl.textContent = `${budget.toLocaleString('vi-VN')}₫`;
        budgetEl.setAttribute('title', `${budget.toLocaleString('vi-VN')}₫`);
      }
      if (locationEl) {
        locationEl.textContent = locationName;
      }
      if (equipmentEl) {
        equipmentEl.textContent = homeEquipVal || 'Bodyweight';
        equipmentEl.setAttribute('title', homeEquipVal || 'Bodyweight');
      }

      await Modal.success({
        title: 'Cập Nhật Lộ Trình Thành Công!',
        message: `Đã đổi địa điểm tập sang: ${locationName}\nAI Coach đã thiết kế lại ${plan.journeyPhases.length} giai đoạn cho ${totalJourneyDays} ngày hành trình!`
      });

      renderPlanPage(onNavigateTab, onOpenAiCoach);
    });

    document.getElementById('btn-recalculate-plan')?.addEventListener('click', onOpenAiCoach);

    // Workout Video & Text Guide Modal Handler (POPUP 1)
    const wgModal = document.getElementById('workout-guide-modal');
    let activeWorkoutItem = null;

    const openWorkoutModal = (workoutObj) => {
      activeWorkoutItem = workoutObj;
      if (activeWorkoutItem && wgModal) {
        const titleEl = document.getElementById('wg-modal-title');
        if (titleEl) titleEl.innerText = activeWorkoutItem.title || 'Bài Tập Cụ Thể';

        const badgeEl = document.getElementById('wg-modal-type-badge');
        if (badgeEl) badgeEl.innerText = activeWorkoutItem.type || 'Cardio · HIIT';

        const instructionsContainer = document.getElementById('wg-modal-instructions');
        if (instructionsContainer) {
          const rawText = activeWorkoutItem.instructions || activeWorkoutItem.description || '1. Jumping Jacks: 3 phút liên tục\n2. Burpees: 4 vòng · 45s tập / 15s nghỉ\n3. Mountain Climbers: 4 lần · 45s / lần\n4. High Knees (Nâng cao đầu gối): 4 lần · 45s / lần';
          const lines = rawText.split('\n').filter(l => l.trim().length > 0);
          const icons = [
            { name: 'flame', bg: 'bg-[#FFEDD5]', color: 'text-[var(--amber)]' },
            { name: 'zap', bg: 'bg-[#FCE7F3]', color: 'text-[var(--pink)]' },
            { name: 'mountain', bg: 'bg-[#DBEAFE]', color: 'text-[#3B82F6]' },
            { name: 'footprints', bg: 'bg-[var(--primary-soft)]', color: 'text-[var(--accent-purple)]' }
          ];

          instructionsContainer.innerHTML = lines.map((line, idx) => {
            const iconObj = icons[idx % icons.length];
            const cleanLine = line.replace(/^\d+[\.\s]*/, '');
            const parts = cleanLine.split(/[:·\-\|]/);
            const exTitle = parts[0] ? parts[0].trim() : cleanLine;
            const exSub = parts.length > 1 ? parts.slice(1).join(' · ').trim() : 'Động tác chuẩn kỹ thuật';

            return `
              <div class="exercise-item">
                <div class="ex-icon ${iconObj.bg} ${iconObj.color}">
                  <i data-lucide="${iconObj.name}"></i>
                </div>
                <div class="flex-1">
                  <div class="font-bold text-sm" style="color: var(--text-main);">${exTitle}</div>
                  <div class="text-xs text-muted flex items-center gap-1 mt-0.5" style="color: var(--text-muted);">
                    <i data-lucide="clock" class="w-3 h-3"></i> ${exSub}
                  </div>
                </div>
                <i data-lucide="chevron-right" class="w-5 h-5 text-gray-300"></i>
              </div>
            `;
          }).join('');

          if (window.lucide) window.lucide.createIcons();
        }

        const searchQuery = encodeURIComponent(`${activeWorkoutItem.title} hướng dẫn tập luyện`);
        const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
        const searchBtn = document.getElementById('wg-youtube-search-btn');
        if (searchBtn) searchBtn.href = youtubeSearchUrl;

        let embedUrl = parseEmbedVideoUrl(activeWorkoutItem.videoUrl);
        if (!embedUrl) embedUrl = 'https://www.youtube.com/embed/ml6cT4AZdql';

        const iframeEl = document.getElementById('wg-modal-iframe');
        if (iframeEl) iframeEl.src = embedUrl;

        const customInput = document.getElementById('wg-custom-video-input');
        if (customInput) customInput.value = activeWorkoutItem.videoUrl || '';

        wgModal.classList.add('active');
      }
    };

    document.querySelectorAll('[data-open-workout-guide]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-open-workout-guide'));
        const targetW = activeWorkoutRoutine[idx] || currentDayWorkout;
        if (targetW) openWorkoutModal(targetW);
      });
    });

    document.getElementById('btn-wg-apply-video')?.addEventListener('click', () => {
      const customInput = document.getElementById('wg-custom-video-input');
      const val = customInput ? customInput.value.trim() : '';
      const iframeEl = document.getElementById('wg-modal-iframe');

      if (val && iframeEl) {
        const parsed = parseEmbedVideoUrl(val);
        if (parsed) {
          iframeEl.src = parsed;
          if (activeWorkoutItem) activeWorkoutItem.videoUrl = val;
          confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
        } else {
          Modal.alert({ title: 'Link không hợp lệ', message: 'Vui lòng dán đường dẫn link YouTube hoặc TikTok hợp lệ!' });
        }
      }
    });

    const closeWgModal = () => {
      if (wgModal) {
        wgModal.classList.remove('active');
        const iframe = document.getElementById('wg-modal-iframe');
        if (iframe) iframe.src = '';
      }
    };

    document.getElementById('btn-close-wg-modal')?.addEventListener('click', closeWgModal);
    wgModal?.addEventListener('click', (e) => { if (!e.target.closest('.modal-card')) closeWgModal(); });

    document.getElementById('btn-start-confirm-workout')?.addEventListener('click', async () => {
      if (activeWorkoutItem) {
        const today = DataService.getTodayString();
        await DataService.addWorkoutLog(today, {
          type: activeWorkoutItem.title,
          duration: activeWorkoutItem.duration || 30,
          intensity: 'Moderate',
          caloriesBurned: activeWorkoutItem.estBurn || 280
        });
        closeWgModal();
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
        await Modal.success({
          title: 'Đã Hoàn Thành Bài Tập!',
          message: `Đã ghi nhận bài tập "${activeWorkoutItem.title}" vào nhật ký hôm nay!`
        });
        onNavigateTab('workout');
      }
    });

    // Recipe details modal handler (POPUP 2)
    const rdModal = document.getElementById('recipe-details-modal');
    let activeRecipeMeal = null;

    const openRecipeModalForMeal = async (mealObj, typeLabel) => {
      if (!mealObj || !rdModal) return;
      activeRecipeMeal = mealObj;

      const heroImg = document.getElementById('rd-modal-hero-img');
      if (heroImg) {
        heroImg.src = mealObj.imageUrl || mealObj.photoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80';
      }

      document.getElementById('rd-modal-type-badge').innerText = typeLabel || 'Bữa Ăn';
      document.getElementById('rd-modal-title').innerText = mealObj.name || 'Thực đơn AI';
      document.getElementById('rd-modal-total-cost').innerText = `${(mealObj.costVnd || 30000).toLocaleString('vi-VN')} VNĐ`;

      const details = getMealRecipeDetails(mealObj) || {
        ingredients: [],
        instructions: [],
        youtubeSearchQuery: mealObj.name || '',
        youtubeEmbedUrl: ''
      };

      const ingContainer = document.getElementById('rd-modal-ingredients-container');
      if (ingContainer) {
        const ingList = (details.ingredients && details.ingredients.length > 0) ? details.ingredients : [
          { name: mealObj.name || 'Nguyên liệu chính', amount: '1 khẩu phần', estPriceVnd: Math.round((mealObj.costVnd || 30000) * 0.7) },
          { name: 'Rau củ / Gia vị đi kèm', amount: 'Vừa đủ', estPriceVnd: Math.round((mealObj.costVnd || 30000) * 0.3) }
        ];
        ingContainer.innerHTML = ingList.map(ing => `
          <div class="price-tag">
            <span class="text-sm font-medium flex items-center gap-2" style="color: var(--text-main);">
              <span class="w-2 h-2 rounded-full bg-[var(--accent-purple)]"></span> ${ing.name} <span class="text-xs text-muted font-normal">(${ing.amount})</span>
            </span>
            <span class="text-sm font-bold text-[var(--accent-purple)]">${((ing.estPriceVnd || ing.estCostVnd || 0)).toLocaleString('vi-VN')} VNĐ</span>
          </div>
        `).join('');
      }

      const instContainer = document.getElementById('rd-modal-instructions-container');
      if (instContainer) {
        const stepList = (details.instructions && details.instructions.length > 0) ? details.instructions : [
          'Sơ chế nguyên liệu sạch sẽ và nêm ướp gia vị vừa ăn.',
          'Chế biến chín tới (luộc, hấp, nướng hoặc xào nhẹ ít dầu).',
          'Bày ra đĩa và thưởng thức khi còn nóng.'
        ];
        instContainer.innerHTML = stepList.map((st, i) => {
          const stepText = typeof st === 'string' ? st.replace(/^\d+\.\s*/, '') : st;
          const parts = stepText.split(/[:·\-\|]/);
          const stepTitle = parts.length > 1 ? parts[0].trim() : `Bước ${i + 1}`;
          const stepBody = parts.length > 1 ? parts.slice(1).join(' · ').trim() : stepText;

          return `
            <div class="timeline-item">
              <div class="timeline-icon">${i + 1}</div>
              <div class="bg-[var(--primary-soft)] rounded-xl p-3 border border-[var(--border)]">
                <div class="font-bold text-sm text-[var(--accent-purple)]">${stepTitle}</div>
                <p class="text-xs text-gray-600 mt-1">${stepBody}</p>
              </div>
            </div>
          `;
        }).join('');
      }

      const searchQuery = details.youtubeSearchQuery || mealObj.name || 'thực đơn lành mạnh';
      const ttSearchUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(searchQuery)}`;
      const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

      const ttBtn = document.getElementById('rd-tiktok-search-btn');
      if (ttBtn) ttBtn.href = ttSearchUrl;
      const ytBtn = document.getElementById('rd-youtube-search-btn');
      if (ytBtn) ytBtn.href = ytSearchUrl;

      let embedUrl = parseEmbedVideoUrl(details.youtubeEmbedUrl || mealObj.videoUrl);
      if (!embedUrl) embedUrl = 'https://www.youtube.com/embed/a7GXmE-D4uE';

      const iframeEl = document.getElementById('rd-modal-iframe');
      if (iframeEl) iframeEl.src = embedUrl;

      const customImgInput = document.getElementById('rd-custom-image-input');
      if (customImgInput) customImgInput.value = mealObj.imageUrl || mealObj.photoUrl || '';

      const customVidInput = document.getElementById('rd-custom-video-input');
      if (customVidInput) customVidInput.value = details.youtubeEmbedUrl || mealObj.videoUrl || '';

      rdModal.classList.add('active');
    };

    // Realtime Media Links (Image & Video) Submit Handler with Both-Required Validation
    const btnApplyMedia = document.getElementById('btn-rd-apply-media');
    if (btnApplyMedia) {
      btnApplyMedia.onclick = () => {
        const imgInput = document.getElementById('rd-custom-image-input');
        const vidInput = document.getElementById('rd-custom-video-input');
        const imgVal = imgInput ? imgInput.value.trim() : '';
        const vidVal = vidInput ? vidInput.value.trim() : '';

        // Validation: BOTH image URL AND video URL are required (thiếu 1 trong 2 thì hiện cảnh báo)
        if (!imgVal || !vidVal) {
          return Modal.warning({
            title: 'Thiếu Thông Tin Link',
            message: 'Vui lòng dán ĐẦY ĐỦ cả Link Ảnh minh họa và Link Video trước khi bấm xác nhận!'
          });
        }

        const parsedVid = parseEmbedVideoUrl(vidVal);
        if (!parsedVid) {
          return Modal.warning({
            title: 'Link Video Không Hợp Lệ',
            message: 'Vui lòng dán đường dẫn link YouTube hoặc TikTok hợp lệ!'
          });
        }

        // Realtime Updates
        const heroImg = document.getElementById('rd-modal-hero-img');
        if (heroImg) heroImg.src = imgVal;

        const iframeEl = document.getElementById('rd-modal-iframe');
        if (iframeEl) iframeEl.src = parsedVid;

        if (activeRecipeMeal) {
          activeRecipeMeal.imageUrl = imgVal;
          activeRecipeMeal.photoUrl = imgVal;
          activeRecipeMeal.youtubeEmbedUrl = vidVal;
          activeRecipeMeal.videoUrl = vidVal;
        }

        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        Modal.success({
          title: 'Cập Nhật Thành Công!',
          message: 'Đã cập nhật cả Ảnh minh họa và Video hướng dẫn Realtime thành công!'
        });
      };
    }

    const closeRdModal = () => {
      if (rdModal) {
        rdModal.classList.remove('active');
        const iframe = document.getElementById('rd-modal-iframe');
        if (iframe) iframe.src = '';
      }
    };

    document.getElementById('btn-close-rd-modal')?.addEventListener('click', closeRdModal);
    rdModal?.addEventListener('click', (e) => { if (e.target === rdModal) closeRdModal(); });

    document.getElementById('btn-apply-single-meal-to-today')?.addEventListener('click', async () => {
      if (activeRecipeMeal) {
        const today = DataService.getTodayString();
        await DataService.addMealLog(today, { type: 'Meal', ...activeRecipeMeal });
        closeRdModal();
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        await Modal.success({
          title: 'Đã Thêm Vào Nhật Ký!',
          message: `Đã ghi nhận món "${activeRecipeMeal.name}" vào nhật ký ăn uống hôm nay!`
        });
        onNavigateTab('meals');
      }
    });

    // POPUP 3: Schedule Habit Guide Modal Handler
    const sdModal = document.getElementById('schedule-details-modal');
    let activeScheduleItem = null;

    // Smart Click Router for Daily Schedule Items
    document.querySelectorAll('[data-open-schedule-item]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-open-workout-guide]')) return;

        const idx = parseInt(card.getAttribute('data-open-schedule-item'));
        const item = (activeDailySchedule || [])[idx];
        if (!item) return;

        if (item.category === 'workout') {
          openWorkoutModal(currentDayWorkout || { title: item.activity, duration: 30, estBurn: 280 });
        } else if (item.category === 'meal') {
          let mealObj = { name: item.activity, costVnd: 30000, calories: 400 };
          let typeLabel = 'Bữa Ăn';

          const actLower = item.activity.toLowerCase();
          if (actLower.includes('sáng') || item.time.startsWith('06') || item.time.startsWith('07')) {
            typeLabel = 'Bữa Sáng';
            mealObj = activeDayMealPlan?.breakfast || mealObj;
          } else if (actLower.includes('trưa') || item.time.startsWith('11') || item.time.startsWith('12')) {
            typeLabel = 'Bữa Trưa';
            mealObj = activeDayMealPlan?.lunch || mealObj;
          } else if (actLower.includes('tối') || item.time.startsWith('18') || item.time.startsWith('19')) {
            typeLabel = 'Bữa Tối';
            mealObj = activeDayMealPlan?.dinner || mealObj;
          } else if (actLower.includes('phụ') || item.time.startsWith('15') || item.time.startsWith('16')) {
            typeLabel = 'Bữa Phụ';
            mealObj = activeDayMealPlan?.snack || mealObj;
          }
          openRecipeModalForMeal(mealObj, typeLabel);
        } else {
          activeScheduleItem = item;
          if (sdModal) {
            const timeEl = document.getElementById('sd-modal-time');
            if (timeEl) timeEl.innerText = item.time ? `${item.time} Sáng` : '05:30 Sáng';

            const titleEl = document.getElementById('sd-modal-title');
            if (titleEl) titleEl.innerText = item.activity || 'Thức Dậy & Uống Nước Ấm';

            const dayLabelEl = document.getElementById('sd-modal-day-label');
            if (dayLabelEl) dayLabelEl.innerText = `Ngày ${selectedJourneyDay}/${totalJourneyDays}`;

            const actLower = (item.activity || '').toLowerCase();
            const desc = item.desc || item.instructions || 'Uống 300 - 500ml nước ấm ngay sau khi thức dậy để kích hoạt tiêu hóa và thanh lọc cơ thể.';

            // Dynamic Icons & Metrics based on activity content
            let iconName = 'droplets';
            let metricLabel = 'Lượng Nước Gợi Ý';
            let metricVal = '300 - 500 ml';
            let metricIcon = 'glass-water';

            if (actLower.includes('ngủ') || actLower.includes('nghỉ')) {
              iconName = 'moon';
              metricLabel = 'Thời Gian Giấc Ngủ';
              metricVal = '7 - 8 Tiếng';
              metricIcon = 'bed';
            } else if (actLower.includes('dãn') || actLower.includes('khởi động')) {
              iconName = 'sparkles';
              metricLabel = 'Mục Tiêu Phục Hồi';
              metricVal = '5 - 10 Phút';
              metricIcon = 'zap';
            } else if (actLower.includes('bước') || actLower.includes('tản bộ')) {
              iconName = 'footprints';
              metricLabel = 'Mục Tiêu Vận Động';
              metricVal = '1.000 - 2.000 Bước';
              metricIcon = 'activity';
            }

            const iconEl = document.getElementById('sd-modal-icon');
            if (iconEl) {
              iconEl.setAttribute('data-lucide', iconName);
            }
            const mLabelEl = document.getElementById('sd-modal-metric-label');
            if (mLabelEl) mLabelEl.innerText = metricLabel;
            const mValEl = document.getElementById('sd-modal-metric-val');
            if (mValEl) mValEl.innerText = metricVal;
            const mIconEl = document.getElementById('sd-modal-metric-icon');
            if (mIconEl) mIconEl.setAttribute('data-lucide', metricIcon);

            // Instructions checklist generator
            const checklistContainer = document.getElementById('sd-modal-checklist');
            if (checklistContainer) {
              const lines = desc.split(/[\n\.]/).filter(s => s.trim().length > 3);
              if (lines.length === 0) lines.push(desc);
              checklistContainer.innerHTML = lines.map((line, idx) => `
                <div class="check-item ${idx < lines.length - 1 ? 'border-b border-gray-100' : ''}">
                  <div class="check-icon"><i data-lucide="check" class="w-3 h-3"></i></div>
                  <p class="text-sm text-gray-700">${line.trim()}.</p>
                </div>
              `).join('');
            }

            if (window.lucide) window.lucide.createIcons();
            sdModal.classList.add('active');
          }
        }
      });
    });

    const closeSdModal = () => {
      if (sdModal) {
        sdModal.classList.remove('active');
      }
    };

    document.getElementById('btn-close-sd-modal')?.addEventListener('click', closeSdModal);
    sdModal?.addEventListener('click', (e) => { if (e.target === sdModal) closeSdModal(); });

    const habitBtn = document.getElementById('btn-confirm-schedule-habit');
    if (habitBtn) {
      habitBtn.onclick = async () => {
        if (!activeScheduleItem) return;

        // 1. Loading State
        habitBtn.classList.add('loading');
        habitBtn.innerHTML = `<div class="habit-spinner"></div> <span>Đang ghi nhận...</span>`;

        const today = DataService.getTodayString();
        await DataService.addChecklistItem(today, `Hoàn thành ${activeScheduleItem.activity} (${activeScheduleItem.time})`);

        // 2. Success State after 800ms
        setTimeout(() => {
          habitBtn.classList.remove('loading');
          habitBtn.classList.add('success');
          habitBtn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> <span>Đã hoàn thành thói quen!</span>`;
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
          if (window.lucide) window.lucide.createIcons();

          // 3. Close modal after 1s
          setTimeout(() => {
            closeSdModal();
            setTimeout(() => {
              habitBtn.classList.remove('success', 'loading');
              habitBtn.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5"></i> <span id="sd-btn-text">Hoàn Thành & Ghi Nhận Thói Quen</span>`;
              if (window.lucide) window.lucide.createIcons();
            }, 500);
          }, 1000);
        }, 800);
      };
    }
  }
}
