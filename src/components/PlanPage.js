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

      <!-- Control Panel: Budget, Location Dropdown, Equipment & Update Button -->
      <div class="card p-6 mb-6 fade-up" style="border: 1px solid rgba(124, 58, 237, 0.18) !important;">
        <div class="text-xs font-bold uppercase tracking-wider mb-4" style="color: var(--accent-purple);">⚙️ Cấu Hình Ngân Sách & Địa Điểm Tập Luyện</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div class="w-full min-w-0">
            <label class="text-xs font-bold text-muted mb-1 block" style="color: var(--text-muted);">Ngân Sách (VNĐ/Ngày)</label>
            <input type="number" class="form-input text-sm rounded-xl px-3 py-2 w-full truncate" id="plan-budget-input" value="${plan.dailyBudgetVnd || 100000}" step="10000" style="background: var(--bg-input); color: var(--text-main);" title="${plan.dailyBudgetVnd || 100000}">
          </div>

          <div class="w-full min-w-0">
            <label class="text-xs font-bold text-muted mb-1 block" style="color: var(--text-muted);">Địa Điểm Tập</label>
            <div id="plan-workout-dropdown-container" class="w-full min-w-0">
              ${renderDropdown({
                id: 'plan-workout-dropdown',
                options: workoutOptions,
                value: currentWorkoutType,
                placeholder: 'Chọn địa điểm tập...'
              })}
            </div>
          </div>

          <div class="w-full min-w-0" id="home-equipment-container" style="display: ${currentWorkoutType === 'home' ? 'block' : 'none'};">
            <label class="text-xs font-bold text-muted mb-1 block" style="color: var(--text-muted);">Dụng Cụ Có Sẵn</label>
            <input type="text" class="form-input text-sm rounded-xl px-3 py-2 w-full truncate" id="plan-home-equipment-input" value="${currentHomeEquipment}" placeholder="Ví dụ: Thảm yoga, Tạ 5kg..." style="background: var(--bg-input); color: var(--text-main);" title="${currentHomeEquipment}">
          </div>

          <div class="w-full min-w-0">
            <button class="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" id="btn-save-plan-controls">
              <i data-lucide="refresh-cw" class="w-4 h-4 flex-shrink-0"></i> <span class="truncate">Cập Nhật Kế Hoạch</span>
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
        <div class="flex justify-between items-center mb-6 pb-4 border-b border-color" style="border-bottom: 1px solid var(--border-color);">
          <div>
            <h2 class="display text-xl font-semibold" style="color: var(--text-main);">Lịch Trình Hôm Nay (${activeDayName})</h2>
            <p class="text-xs text-muted mt-1" style="color: var(--text-muted);">Thực đơn & Tập luyện chi tiết theo giờ (Bấm mốc để xem chi tiết)</p>
          </div>

          <!-- Day selector navigation -->
          <div class="flex items-center gap-2">
            <button class="btn-ghost w-8 h-8 rounded-lg flex items-center justify-center" id="btn-plan-day-prev" ${selectedJourneyDay <= 1 ? 'disabled' : ''}>
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>
            <span class="text-xs font-bold px-3 py-1.5 rounded-full" style="background: var(--primary-soft); color: var(--accent-purple);">
              Ngày ${selectedJourneyDay}/${totalJourneyDays}
            </span>
            <button class="btn-ghost w-8 h-8 rounded-lg flex items-center justify-center" id="btn-plan-day-next" ${selectedJourneyDay >= totalJourneyDays ? 'disabled' : ''}>
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
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
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                      <div>
                        <div class="text-xs font-bold" style="color: #D946EF;">${item.time} · Tập Luyện Chính</div>
                        <h3 class="display text-lg font-semibold" style="color: var(--accent-purple);">${item.activity}</h3>
                      </div>
                      <div class="flex gap-2">
                        <span class="text-xs font-bold px-2.5 py-1 rounded-full shadow-xs" style="background: var(--bg-card); color: var(--text-main);">30 phút</span>
                        <span class="text-xs font-bold text-white px-2.5 py-1 rounded-full shadow-xs" style="background: #EC4899;">~280 kcal</span>
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
                <span class="text-xs font-semibold" style="color: #D946EF;">${currentDayWorkout.type || 'HIIT'} · ${currentDayWorkout.estBurn} kcal</span>
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

    <!-- POPUP 1: Modal Hướng Dẫn Bài Tập Cụ Thể (Workout Guide Modal) -->
    <div class="modal-overlay" id="workout-guide-modal">
      <div class="modal-card card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" style="background: var(--bg-card); border-radius: 28px; position: relative; z-index: 1;">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 id="wg-modal-title" class="display text-xl font-bold" style="color: var(--text-main);">Hướng Dẫn Bài Tập</h3>
          </div>
          <button class="btn-ghost w-8 h-8 rounded-full flex items-center justify-center" id="btn-close-wg-modal">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
          <span class="font-bold text-sm flex items-center gap-2" style="color: var(--text-main);">
            <i data-lucide="play-circle" class="w-4 h-4 text-[var(--accent-purple)]"></i> Video Hướng Dẫn Động Tác:
          </span>
          <a id="wg-youtube-search-btn" href="#" target="_blank" rel="noopener" class="btn-ghost px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1">
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Mở Xem Trên YouTube ↗
          </a>
        </div>

        <div class="mb-4 p-3.5 rounded-2xl border border-dashed border-[var(--accent-purple)]" style="background: var(--primary-soft);">
          <label class="text-xs font-bold block mb-2" style="color: var(--accent-purple);">
            <i data-lucide="link" class="w-3.5 h-3.5 inline mr-1"></i> Dán Link Video TikTok / YouTube Đổi Video Hướng Dẫn:
          </label>
          <div class="flex gap-2 items-center flex-wrap">
            <input type="text" class="form-input text-xs flex-1 rounded-xl px-3 py-2" id="wg-custom-video-input" onfocus="this.select()" placeholder="Dán link TikTok hoặc YouTube..." style="background: var(--bg-input); color: var(--text-main);" />
            <button type="button" class="btn-primary btn-sm text-xs font-bold px-4 py-2 rounded-xl" id="btn-wg-apply-video">
              ✓ Xác Nhận Đổi Video
            </button>
          </div>
        </div>

        <div class="relative pb-[56.25%] h-0 overflow-hidden rounded-2xl bg-black mb-2 shadow-sm">
          <iframe id="wg-modal-iframe" class="absolute top-0 left-0 w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
        <div class="text-xs text-muted mb-4 italic" style="color: var(--text-muted);">
          <i data-lucide="info" class="w-3.5 h-3.5 inline mr-1"></i> Bạn có thể dán link video YouTube/TikTok bất kỳ và bấm <b>"Xác Nhận Đổi Video"</b> để phát trực tiếp!
        </div>

        <div class="p-4 rounded-2xl mb-5" style="background: rgba(217, 70, 239, 0.06); border: 1px solid rgba(217, 70, 239, 0.15);">
          <h4 class="font-bold text-sm mb-2 flex items-center gap-2" style="color: var(--accent-purple);">
            <i data-lucide="file-text" class="w-4 h-4"></i> Nội Dung Hướng Dẫn Thực Hiện:
          </h4>
          <div id="wg-modal-instructions" class="text-xs leading-relaxed space-y-1" style="color: var(--text-main);"></div>
        </div>

        <button class="btn-primary w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2" id="btn-start-confirm-workout">
          <i data-lucide="check-circle" class="w-4 h-4"></i> Bắt Đầu Tập & Ghi Nhận Đã Tập Vào Nhật Ký
        </button>
      </div>
    </div>

    <!-- POPUP 2: Modal Chi Tiết Thực Đơn & Công Thức Chế Biến (Recipe Details Modal) -->
    <div class="modal-overlay" id="recipe-details-modal">
      <div class="modal-card card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" style="background: var(--bg-card); border-radius: 28px; position: relative; z-index: 1;">
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="text-xs font-bold px-3 py-1 rounded-full inline-block mb-1" style="background: #FEF3C7; color: #F59E0B;" id="rd-modal-type-badge">Bữa Sáng</span>
            <h3 id="rd-modal-title" class="display text-2xl font-semibold" style="color: var(--accent-purple);">1 bát phở gà nạc kho gừng</h3>
          </div>
          <button class="btn-ghost w-8 h-8 rounded-full flex items-center justify-center" id="btn-close-rd-modal">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Khối 1: Nguyên liệu cần mua & Giá ước tính -->
        <div class="p-4 rounded-2xl mb-4" style="background: rgba(124, 58, 237, 0.04); border: 1px solid var(--border-color);">
          <div class="flex justify-between items-center mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-white" style="background: var(--accent-purple);">
                <i data-lucide="shopping-bag" class="w-4 h-4"></i>
              </div>
              <h4 class="font-bold text-sm" style="color: var(--text-main);">Nguyên Liệu Cần Mua & Giá Ước Tính</h4>
            </div>
            <div class="text-xs font-bold px-3 py-1 rounded-full" style="background: var(--primary-soft); color: var(--accent-purple);" id="rd-modal-total-cost">30.000 VNĐ</div>
          </div>
          <div class="space-y-2" id="rd-modal-ingredients-container"></div>
        </div>

        <!-- Khối 2: Hướng dẫn cách làm / Chế biến (Numbered Steps) -->
        <div class="p-4 rounded-2xl mb-4" style="background: rgba(124, 58, 237, 0.04); border: 1px solid var(--border-color);">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-white" style="background: var(--accent-purple);">
              <i data-lucide="utensils" class="w-4 h-4"></i>
            </div>
            <h4 class="font-bold text-sm" style="color: var(--text-main);">Hướng Dẫn Cách Làm / Chế Biến</h4>
          </div>
          <div class="space-y-2 relative pl-2" id="rd-modal-instructions-container"></div>
        </div>

        <!-- Khối 3: Video Hướng Dẫn Chế Biến -->
        <div id="rd-modal-video-section" class="mb-4">
          <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
            <h4 class="font-bold text-sm flex items-center gap-2" style="color: var(--text-main);">
              <i data-lucide="video" class="w-4 h-4 text-red-500"></i> Video Hướng Dẫn Chế Biến:
            </h4>
            <div class="flex gap-2">
              <a id="rd-tiktok-search-btn" href="#" target="_blank" rel="noopener" class="btn-ghost px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1">
                🎵 TikTok ↗
              </a>
              <a id="rd-youtube-search-btn" href="#" target="_blank" rel="noopener" class="btn-ghost px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1">
                ▶ YouTube ↗
              </a>
            </div>
          </div>

          <div class="p-3.5 rounded-2xl border border-dashed border-[var(--accent-purple)] mb-3" style="background: var(--primary-soft);">
            <label class="text-xs font-bold block mb-2" style="color: var(--accent-purple);">
              <i data-lucide="link" class="w-3.5 h-3.5 inline mr-1"></i> Dán Link Video TikTok / YouTube Đổi Video Chế Biến:
            </label>
            <div class="flex gap-2 items-center flex-wrap">
              <input type="text" class="form-input text-xs flex-1 rounded-xl px-3 py-2" id="rd-custom-video-input" onfocus="this.select()" placeholder="Dán link TikTok hoặc YouTube..." style="background: var(--bg-input); color: var(--text-main);" />
              <button type="button" class="btn-primary btn-sm text-xs font-bold px-4 py-2 rounded-xl" id="btn-rd-apply-video">
                ✓ Xác Nhận Đổi Video
              </button>
            </div>
          </div>

          <div class="relative pb-[56.25%] h-0 overflow-hidden rounded-2xl bg-black shadow-sm">
            <iframe id="rd-modal-iframe" class="absolute top-0 left-0 w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button class="btn-ghost flex-1 py-3 rounded-2xl text-xs font-semibold" id="btn-close-rd-modal-bottom">Đóng</button>
          <button class="btn-primary flex-1 py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5" id="btn-apply-single-meal-to-today">
            <i data-lucide="plus-circle" class="w-4 h-4"></i> Ghi Nhận Món Này Vào Nhật Ký
          </button>
        </div>
      </div>
    </div>

    <!-- POPUP 3: Modal Chi Tiết Mốc Lịch Trình Sinh Hoạt AI (Schedule Details Modal) -->
    <div class="modal-overlay" id="schedule-details-modal">
      <div class="modal-card card p-6 w-full max-w-lg" style="background: var(--bg-card); border-radius: 28px; position: relative; z-index: 1;">
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="text-xs font-bold px-3 py-1 rounded-full inline-block mb-1" style="background: #DBEAFE; color: #3B82F6;" id="sd-modal-badge">⏰ Sinh Hoạt</span>
            <h3 id="sd-modal-title" class="display text-2xl font-semibold" style="color: var(--accent-purple);">Thức Dậy & Uống Nước Ấm Khởi Động</h3>
          </div>
          <button class="btn-ghost w-8 h-8 rounded-full flex items-center justify-center" id="btn-close-sd-modal">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="p-4 rounded-2xl mb-4" style="background: rgba(124, 58, 237, 0.04); border: 1px solid var(--border-color);">
          <div class="flex items-center gap-3 mb-3">
            <span class="font-mono font-bold text-sm px-3 py-1 rounded-xl" style="background: var(--primary-soft); color: var(--accent-purple);" id="sd-modal-time">05:30</span>
            <span class="text-xs text-muted font-bold" style="color: var(--text-muted);" id="sd-modal-day-label">Lịch trình Ngày ${selectedJourneyDay}/${totalJourneyDays}</span>
          </div>

          <h4 class="font-bold text-base mb-2" style="color: var(--text-main);" id="sd-modal-activity">Thức Dậy & Uống Nước Ấm Khởi Động</h4>
          <p class="text-xs leading-relaxed mb-4 text-muted" style="color: var(--text-muted);" id="sd-modal-desc"></p>
          
          <div class="p-3.5 rounded-2xl text-xs leading-relaxed border-l-4 border-[var(--accent-purple)]" style="background: var(--primary-soft); color: var(--text-main);" id="sd-modal-tip">
            💧 <b>Bổ sung nước đầu ngày:</b> 300 - 500ml nước ấm ngay sau khi thức dậy giúp bù lại lượng nước đã mất qua đêm.
          </div>
        </div>

        <button class="btn-primary w-full py-3.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2" id="btn-confirm-schedule-habit">
          <i data-lucide="check-circle" class="w-4 h-4"></i> Hoàn Thành & Đã Thực Hiện Thói Quen Này
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

    // Initialize custom dropdown component & toggle Home Equipment Input
    initDropdownListeners(mountNode, (selectedVal, dropdownId) => {
      if (dropdownId === 'plan-workout-dropdown' || !dropdownId) {
        currentWorkoutType = selectedVal;
        activeWorkoutTypeSelection = selectedVal;
        const equipContainer = document.getElementById('home-equipment-container');
        if (equipContainer) {
          equipContainer.style.display = (selectedVal === 'home') ? 'block' : 'none';
        }
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
      const budget = parseInt(document.getElementById('plan-budget-input').value) || 100000;
      const homeEquipInput = document.getElementById('plan-home-equipment-input');
      const homeEquipVal = homeEquipInput ? homeEquipInput.value.trim() : currentHomeEquipment;

      const chosenWorkoutType = activeWorkoutTypeSelection || currentWorkoutType || 'home';

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
        document.getElementById('wg-modal-title').innerText = `Hướng Dẫn: ${activeWorkoutItem.title}`;
        document.getElementById('wg-modal-instructions').innerText = activeWorkoutItem.description || '1. Jumping Jacks 3 phút.\n2. Burpees: 45s tập, 15s nghỉ x 4 vòng.\n3. Mountain Climbers: 45s x 4 vòng.\n4. High Knees nâng cao đùi: 45s x 4 vòng.';

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
          <div class="flex justify-between items-center p-3 rounded-2xl" style="background: rgba(124, 58, 237, 0.06);">
            <span class="text-xs font-semibold" style="color: var(--text-main);">${ing.name} <span class="text-muted font-normal">(${ing.amount})</span></span>
            <span class="text-xs font-bold" style="color: var(--accent-purple);">${((ing.estPriceVnd || ing.estCostVnd || 0)).toLocaleString('vi-VN')} VNĐ</span>
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
          return `
            <div class="flex items-start gap-3 p-3 rounded-2xl" style="background: rgba(124, 58, 237, 0.06);">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style="background: var(--accent-purple);">
                ${i + 1}
              </div>
              <div class="text-xs leading-relaxed pt-0.5" style="color: var(--text-main); font-weight: 500;">
                ${stepText}
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

      let embedUrl = parseEmbedVideoUrl(details.youtubeEmbedUrl);
      if (!embedUrl) embedUrl = 'https://www.youtube.com/embed/a7GXmE-D4uE';

      const iframeEl = document.getElementById('rd-modal-iframe');
      if (iframeEl) iframeEl.src = embedUrl;

      const customInput = document.getElementById('rd-custom-video-input');
      if (customInput) customInput.value = details.youtubeEmbedUrl || '';

      rdModal.classList.add('active');
    };

    document.getElementById('btn-rd-apply-video')?.addEventListener('click', () => {
      const customInput = document.getElementById('rd-custom-video-input');
      const val = customInput ? customInput.value.trim() : '';
      const iframeEl = document.getElementById('rd-modal-iframe');

      if (val && iframeEl) {
        const parsed = parseEmbedVideoUrl(val);
        if (parsed) {
          iframeEl.src = parsed;
          confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
        } else {
          Modal.alert({ title: 'Link không hợp lệ', message: 'Vui lòng dán đường dẫn link YouTube hoặc TikTok hợp lệ!' });
        }
      }
    });

    const closeRdModal = () => {
      if (rdModal) {
        rdModal.classList.remove('active');
        const iframe = document.getElementById('rd-modal-iframe');
        if (iframe) iframe.src = '';
      }
    };

    document.getElementById('btn-close-rd-modal')?.addEventListener('click', closeRdModal);
    document.getElementById('btn-close-rd-modal-bottom')?.addEventListener('click', closeRdModal);
    rdModal?.addEventListener('click', (e) => { if (!e.target.closest('.modal-card')) closeRdModal(); });

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
            document.getElementById('sd-modal-time').innerText = item.time || '05:30';
            document.getElementById('sd-modal-activity').innerText = item.activity || 'Thói quen sinh hoạt';
            document.getElementById('sd-modal-desc').innerText = item.desc || 'Uống 300 - 500ml nước ấm để kích hoạt hệ tiêu hóa, thực hiện 5 phút dẫn cơ nhẹ nhàng.';
            document.getElementById('sd-modal-title').innerText = item.activity;
            document.getElementById('sd-modal-day-label').innerText = `Lịch trình Ngày ${selectedJourneyDay}/${totalJourneyDays}`;

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
    sdModal?.addEventListener('click', (e) => { if (!e.target.closest('.modal-card')) closeSdModal(); });

    document.getElementById('btn-confirm-schedule-habit')?.addEventListener('click', async () => {
      if (activeScheduleItem) {
        const today = DataService.getTodayString();
        await DataService.addChecklistItem(today, `Hoàn thành ${activeScheduleItem.activity} (${activeScheduleItem.time})`);
        closeSdModal();
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        await Modal.success({
          title: 'Đã Ghi Nhận Thói Quen!',
          message: `Đã thêm mốc "${activeScheduleItem.activity}" vào Checklist Kỷ Luật hôm nay!`
        });
      }
    });
  }
}
