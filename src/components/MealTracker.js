import confetti from 'canvas-confetti';
import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { Modal } from './ui/Modal.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import { renderSunIcon, renderSunsetIcon, renderMoonIcon, renderAppleIcon, renderFlameIcon } from './ui/Icons.js';

let selectedMealJourneyDay = null; // 1-based journey day navigation

export async function renderMealTracker(onOpenAiCoach) {
  const goal = await DataService.getUserGoal();
  const plan = await DataService.getUserPlan();
  const totalJourneyDays = goal.totalJourneyDays || goal.targetDays || 60;
  const todayStr = DataService.getTodayString();

  // Calculate current journey day (1-based) from goal.startDate
  const currentJourneyDay = DataService.calculateCurrentJourneyDay(goal.startDate);

  if (selectedMealJourneyDay === null) {
    selectedMealJourneyDay = Math.min(currentJourneyDay, totalJourneyDays);
  }

  // Clamp selectedMealJourneyDay
  if (selectedMealJourneyDay < 1) selectedMealJourneyDay = 1;
  if (selectedMealJourneyDay > totalJourneyDays) selectedMealJourneyDay = totalJourneyDays;

  // Resolve active date string for selected journey day
  const activeDateStr = DataService.getDateStrForJourneyDay(goal.startDate, selectedMealJourneyDay);
  const todayLog = await DataService.getDailyLog(activeDateStr);
  const dailyBudget = plan.dailyBudgetVnd || 100000;

  const caloriesIn = (todayLog.meals || []).reduce((sum, m) => sum + (m.calories || m.kcal || 0), 0);
  const caloriesOut = (todayLog.workouts || []).reduce((sum, w) => sum + (w.caloriesBurned || w.calories || w.caloBurned || 0), 0);
  const netCalories = caloriesIn - caloriesOut;
  const totalProtein = todayLog.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarb = todayLog.meals.reduce((sum, m) => sum + (m.carb || 0), 0);
  const totalFat = todayLog.meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  const calTarget = goal.dailyCalorieTarget || 2000;
  const pTarget = goal.macroTarget?.protein || 120;
  const cTarget = goal.macroTarget?.carb || 160;
  const fTarget = goal.macroTarget?.fat || 50;

  // Spent budget calculation
  const spentVnd = todayLog.meals.reduce((sum, m) => sum + (m.costVnd || (m.calories ? Math.round(m.calories * 40) : 0)), 0);
  const budgetLeft = Math.max(0, dailyBudget - spentVnd);
  const spentPercent = Math.min(100, Math.round((spentVnd / dailyBudget) * 100));

  // Date formatting
  const dateObj = new Date(activeDateStr);
  const daysOfWeekVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const daysOfWeekShortVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayNameVi = daysOfWeekVi[dateObj.getDay()];
  const dateFormatted = `${dayNameVi} · Ngày ${dateObj.getDate()} Tháng ${dateObj.getMonth() + 1}, ${dateObj.getFullYear()}`;

  // Date Pills Generator (7 days around selectedMealJourneyDay)
  let datePillsHtml = '';
  for (let i = -3; i <= 3; i++) {
    const pillDay = selectedMealJourneyDay + i;
    if (pillDay >= 1 && pillDay <= totalJourneyDays) {
      const pillDateStr = DataService.getDateStrForJourneyDay(goal.startDate, pillDay);
      const pDate = new Date(pillDateStr);
      const pDayShort = daysOfWeekShortVi[pDate.getDay()];
      const isActive = pillDay === selectedMealJourneyDay;
      datePillsHtml += `
        <div class="date-pill ${isActive ? 'active' : ''}" data-select-day="${pillDay}" title="Chuyển sang Ngày ${pillDay}">
          <span class="text-[10px] font-bold uppercase tracking-wider ${isActive ? 'opacity-90' : 'opacity-70'}">${pDayShort}</span>
          <span class="day-num display text-base font-semibold">${pDate.getDate()}</span>
        </div>
      `;
    }
  }

  // Dual-segment Calorie Ring Calculations (In vs Out Ratio)
  const totalCal = caloriesIn + caloriesOut;
  let inLen = 267;
  let outLen = 267;
  if (totalCal > 0) {
    inLen = Math.round(534 * (caloriesIn / totalCal));
    if (caloriesIn > 0 && inLen < 15) inLen = 15;
    if (caloriesOut > 0 && (534 - inLen) < 15) inLen = 534 - 15;
    outLen = 534 - inLen;
  }
  const diffCal = Math.abs(caloriesIn - caloriesOut);

  // Macro percentages
  const pPercent = Math.min(100, Math.round((totalProtein / pTarget) * 100));
  const cPercent = Math.min(100, Math.round((totalCarb / cTarget) * 100));
  const fPercent = Math.min(100, Math.round((totalFat / fTarget) * 100));

  // Dynamic AI Insight Text
  let aiInsightMessage = '';
  if (pPercent < 60) {
    aiInsightMessage = `Bạn đang thiếu <strong>protein</strong> (${pPercent}%). Gợi ý thêm <strong>ức gà áp chảo (~150g, 240 kcal)</strong> hoặc <strong>trứng luộc (2 quả)</strong> cho bữa tiếp theo — vừa đủ đạm, vừa trong ngân sách còn lại.`;
  } else if (caloriesIn < calTarget * 0.5) {
    aiInsightMessage = `Lượng calo nạp vào hôm nay mới đạt ${Math.round((caloriesIn / calTarget) * 100)}%. Hãy bổ sung đầy đủ năng lượng cho các hoạt động thể chất nhé!`;
  } else {
    aiInsightMessage = `Chế độ dinh dưỡng ngày hôm nay rất cân bằng (${caloriesIn}/${calTarget} kcal)! Duy trì kỷ luật để sớm hoàn thành mục tiêu vóc dáng!`;
  }

  const mealsByCategory = {
    Breakfast: todayLog.meals.filter(m => m.type === 'Breakfast'),
    Lunch: todayLog.meals.filter(m => m.type === 'Lunch'),
    Dinner: todayLog.meals.filter(m => m.type === 'Dinner'),
    Snack: todayLog.meals.filter(m => m.type === 'Snack')
  };

  const html = `
    <div class="max-w-6xl mx-auto py-2 fade-up">

      <!-- Header Title & Interactive Date Strip -->
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
        <div>
          <div class="text-sm text-muted mb-2 flex items-center gap-2" style="color: var(--text-muted);">
            <i data-lucide="calendar" class="w-4 h-4" style="color: var(--accent-purple);"></i>
            ${dateFormatted}
          </div>
          <h1 class="display text-4xl md:text-5xl font-medium leading-[1.05]" style="color: var(--text-main);">
            Theo Dõi Bữa Ăn<br>
            <span class="italic" style="color: var(--accent-purple);">& Dinh Dưỡng</span>
          </h1>
        </div>

        <!-- Date Switcher Wow Component -->
        <div class="date-switcher">
          <div class="glow-center"></div>
          <button id="btn-meal-day-prev" class="arrow-btn" ${selectedMealJourneyDay <= 1 ? 'disabled' : ''} aria-label="Ngày trước">
            <i data-lucide="chevron-left" class="w-5 h-5"></i>
          </button>
          <div class="date-display" id="meal-date-display">
            <div class="date-content slide-active">
              <div class="text-[10px] font-bold tracking-widest uppercase mb-0.5" style="color: var(--accent-purple);">${dayNameVi} · Ngày ${selectedMealJourneyDay}/${totalJourneyDays}</div>
              <div class="display text-sm font-bold leading-none" style="color: var(--text-main);">${dateObj.getDate()} Tháng ${String(dateObj.getMonth() + 1).padStart(2, '0')}</div>
            </div>
          </div>
          <button id="btn-meal-day-next" class="arrow-btn" ${selectedMealJourneyDay >= totalJourneyDays ? 'disabled' : ''} aria-label="Ngày sau">
            <i data-lucide="chevron-right" class="w-5 h-5"></i>
          </button>
        </div>
      </div>

      <!-- Quick AI Food Parser Bar -->
      <div class="card p-4 mb-6 flex flex-col md:flex-row gap-3 items-center">
        <div class="relative flex-1 w-full">
          <i data-lucide="sparkles" class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style="color: var(--accent-purple);"></i>
          <input type="text" class="form-input w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium" id="quick-food-nlp-input" placeholder="Ví dụ: Sáng ăn 2 quả trứng ốp la với 1 lát bánh mì đen..." style="background: var(--bg-input); color: var(--text-main);">
        </div>
        <button class="btn btn-ai px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap w-full md:w-auto" id="btn-quick-parse-food">
          <i data-lucide="wand-2" class="w-4 h-4"></i> AI Phân Tích Kcal
        </button>
      </div>

      <!-- Budget Banner Card -->
      <div class="card p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 fade-up">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center" style="background: rgba(124, 58, 237, 0.12); color: var(--accent-purple);">
            <i data-lucide="wallet" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-[10px] text-muted font-bold uppercase tracking-wider" style="color: var(--text-muted);">Ngân sách hôm nay</div>
            <div class="display text-2xl font-semibold leading-tight" style="color: var(--text-main);">${dailyBudget.toLocaleString('vi-VN')}<span class="text-base text-muted" style="color: var(--text-muted);">₫</span></div>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <div class="text-right">
            <div class="text-[10px] text-muted font-bold uppercase tracking-wider" style="color: var(--text-muted);">Đã chi</div>
            <div class="font-semibold" style="color: #D946EF;">${spentVnd.toLocaleString('vi-VN')}₫</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-muted font-bold uppercase tracking-wider" style="color: var(--text-muted);">Còn lại</div>
            <div class="font-semibold" style="color: var(--accent-purple);">${budgetLeft.toLocaleString('vi-VN')}₫</div>
          </div>
          <div class="hidden sm:block w-28">
            <div class="macro-bar mb-1"><div class="macro-fill" style="width: ${spentPercent}%; background: linear-gradient(90deg, #D946EF, var(--accent-purple));"></div></div>
            <div class="text-[10px] text-muted text-right" style="color: var(--text-muted);">${spentPercent}%</div>
          </div>
        </div>
      </div>

      <!-- Hero Section: Calorie Ring + Macros Cards + AI Insight -->
      <section class="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-10">
        
        <!-- Calorie Ring Card -->
        <div class="card p-7 lg:col-span-2 flex flex-col items-center justify-center fade-up">
          <div class="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-5" style="color: var(--text-muted);" id="meal-cal-card-title">ĐỘ CHÊNH LỆCH CALO (IN vs OUT)</div>
          <div class="relative w-60 h-60">
            <svg viewBox="0 0 200 200" class="w-full h-full cursor-pointer">
              <!-- Background ring fallback -->
              <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(124, 58, 237, 0.1)" stroke-width="14"/>
              
              <!-- In Segment (Tím #7C3AED) -->
              <circle id="meal-ring-in" cx="100" cy="100" r="85" fill="none" stroke="#7C3AED" stroke-width="14" 
                      stroke-dasharray="${inLen} ${534 - inLen}" stroke-dashoffset="0" transform="rotate(-90 100 100)"
                      class="transition-all duration-300 hover:stroke-[18px]"/>
                      
              <!-- Out Segment (Hồng #D946EF) -->
              <circle id="meal-ring-out" cx="100" cy="100" r="85" fill="none" stroke="#D946EF" stroke-width="14" 
                      stroke-dasharray="${outLen} ${534 - outLen}" stroke-dashoffset="-${inLen}" transform="rotate(-90 100 100)"
                      class="transition-all duration-300 hover:stroke-[18px]"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div class="display text-4xl md:text-5xl font-semibold leading-none transition-all duration-200" style="color: var(--text-main);" id="meal-cal-center-num">${diffCal}</div>
              <div class="text-xs font-medium text-muted mt-1 transition-all duration-200" style="color: var(--text-muted);" id="meal-cal-center-label">/ ${calTarget.toLocaleString('vi-VN')} kcal</div>
            </div>
          </div>
          <div class="flex items-center gap-4 mt-6 text-xs font-semibold">
            <span class="flex items-center gap-1.5 cursor-pointer transition hover:scale-105" id="meal-tag-in" style="color: var(--text-main);">
              <span class="w-2.5 h-2.5 rounded-full" style="background: #7C3AED;"></span>
              <span>In: ${caloriesIn.toLocaleString('vi-VN')}</span>
            </span>
            <span class="flex items-center gap-1.5 cursor-pointer transition hover:scale-105" id="meal-tag-out" style="color: var(--text-main);">
              <span class="w-2.5 h-2.5 rounded-full" style="background: #D946EF;"></span>
              <span>Out: ${caloriesOut.toLocaleString('vi-VN')}</span>
            </span>
          </div>
        </div>

        <!-- 3 Macros + AI Insight Card Grid -->
        <div class="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <!-- Protein Card -->
          <div class="card card-hover p-5 fade-up">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full" style="background:#EC4899"></div>
                <span class="text-sm font-semibold" style="color: var(--text-main);">Protein</span>
              </div>
              <div class="w-8 h-8 rounded-xl flex items-center justify-center" style="background:#FCE7F3">
                <i data-lucide="beef" class="w-4 h-4" style="color:#EC4899"></i>
              </div>
            </div>
            <div class="flex items-baseline gap-1 mb-1">
              <span class="display text-3xl font-semibold" style="color: var(--text-main);">${totalProtein}</span>
              <span class="text-sm text-muted" style="color: var(--text-muted);">/ ${pTarget}g</span>
            </div>
            <div class="text-xs text-muted mb-3" style="color: var(--text-muted);">${pPercent}% mục tiêu · thiếu ${Math.max(0, pTarget - totalProtein)}g</div>
            <div class="macro-bar"><div class="macro-fill" style="width: ${pPercent}%; background:#EC4899;"></div></div>
          </div>

          <!-- Carbs Card -->
          <div class="card card-hover p-5 fade-up">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full" style="background:#F59E0B"></div>
                <span class="text-sm font-semibold" style="color: var(--text-main);">Carbs</span>
              </div>
              <div class="w-8 h-8 rounded-xl flex items-center justify-center" style="background:#FEF3C7">
                <i data-lucide="wheat" class="w-4 h-4" style="color:#F59E0B"></i>
              </div>
            </div>
            <div class="flex items-baseline gap-1 mb-1">
              <span class="display text-3xl font-semibold" style="color: var(--text-main);">${totalCarb}</span>
              <span class="text-sm text-muted" style="color: var(--text-muted);">/ ${cTarget}g</span>
            </div>
            <div class="text-xs text-muted mb-3" style="color: var(--text-muted);">${cPercent}% mục tiêu · thiếu ${Math.max(0, cTarget - totalCarb)}g</div>
            <div class="macro-bar"><div class="macro-fill" style="width: ${cPercent}%; background:#F59E0B;"></div></div>
          </div>

          <!-- Fat Card -->
          <div class="card card-hover p-5 fade-up">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full" style="background:#3B82F6"></div>
                <span class="text-sm font-semibold" style="color: var(--text-main);">Fat</span>
              </div>
              <div class="w-8 h-8 rounded-xl flex items-center justify-center" style="background:#DBEAFE">
                <i data-lucide="droplet" class="w-4 h-4" style="color:#3B82F6"></i>
              </div>
            </div>
            <div class="flex items-baseline gap-1 mb-1">
              <span class="display text-3xl font-semibold" style="color: var(--text-main);">${totalFat}</span>
              <span class="text-sm text-muted" style="color: var(--text-muted);">/ ${fTarget}g</span>
            </div>
            <div class="text-xs text-muted mb-3" style="color: var(--text-muted);">${fPercent}% mục tiêu · thiếu ${Math.max(0, fTarget - totalFat)}g</div>
            <div class="macro-bar"><div class="macro-fill" style="width: ${fPercent}%; background:#3B82F6;"></div></div>
          </div>

          <!-- AI Insight Card -->
          <div class="card p-5 sm:col-span-3 bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white fade-up relative overflow-hidden">
            <div class="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#D946EF]/20 blur-3xl"></div>
            <div class="absolute -left-8 -bottom-12 w-32 h-32 rounded-full bg-[#8B5CF6]/15 blur-3xl"></div>
            <div class="relative flex items-start gap-4">
              <div class="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
                <i data-lucide="sparkles" class="w-5 h-5 text-white"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[10px] uppercase tracking-[0.18em] opacity-80 font-bold">Phân Tích AI Coach</span>
                  <span class="flex items-center gap-0.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-white/80 dot" style="animation-delay:0s"></span>
                    <span class="w-1.5 h-1.5 rounded-full bg-white/80 dot" style="animation-delay:0.2s"></span>
                    <span class="w-1.5 h-1.5 rounded-full bg-white/80 dot" style="animation-delay:0.4s"></span>
                  </span>
                </div>
                <div class="text-sm leading-relaxed">${aiInsightMessage}</div>
                <div class="flex items-center gap-2 mt-4">
                  <button class="text-xs font-semibold bg-white text-[var(--accent-purple)] hover:bg-[var(--accent-purple-light)] transition px-4 py-2 rounded-full flex items-center gap-1.5 shadow-md" id="btn-ai-apply-recommendation">
                    Khám phá gợi ý <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                  </button>
                  <button class="text-xs font-medium bg-white/10 hover:bg-white/20 transition px-3.5 py-2 rounded-full text-white" id="btn-ai-ask-coach">Hỏi AI Coach</button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- Meals Log Section -->
      <section>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 class="display text-2xl font-semibold" style="color: var(--text-main);">Bữa ăn trong ngày</h2>
            <div class="text-sm text-muted mt-0.5" style="color: var(--text-muted);">${todayLog.meals.length} bữa · ${caloriesIn.toLocaleString('vi-VN')} kcal đã ghi nhận</div>
          </div>
          <div class="flex items-center gap-3">
            <button class="btn btn-primary px-4 py-2 text-xs font-semibold rounded-xl" id="btn-open-add-meal-top">
              <i data-lucide="plus" class="w-4 h-4"></i> Thêm Món Ăn
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          ${renderMealCategoryCard('Breakfast', 'Bữa Sáng', 'sunrise', mealsByCategory.Breakfast, '#FCE7F3', '#EC4899', 'Đủ chất', '07:30')}
          ${renderMealCategoryCard('Lunch', 'Bữa Trưa', 'sun', mealsByCategory.Lunch, '#FEF3C7', '#F59E0B', 'Năng lượng', '12:15')}
          ${renderMealCategoryCard('Dinner', 'Bữa Tối', 'moon', mealsByCategory.Dinner, '#DBEAFE', '#3B82F6', 'Phục hồi', '19:00')}
          ${renderMealCategoryCard('Snack', 'Bữa Phụ', 'cookie', mealsByCategory.Snack, '#EDE9FE', '#8B5CF6', 'Nhẹ nhàng', '15:30')}
        </div>
      </section>

    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

    // Date Switcher Prev & Next Listeners with slide animation
    document.getElementById('btn-meal-day-prev')?.addEventListener('click', () => {
      if (selectedMealJourneyDay > 1) {
        const dateText = document.querySelector('#meal-date-display .date-content');
        if (dateText) {
          dateText.classList.add('slide-out-right');
          dateText.classList.remove('slide-active');
        }
        setTimeout(() => {
          selectedMealJourneyDay--;
          renderMealTracker(onOpenAiCoach);
        }, 200);
      }
    });

    document.getElementById('btn-meal-day-next')?.addEventListener('click', () => {
      if (selectedMealJourneyDay < totalJourneyDays) {
        const dateText = document.querySelector('#meal-date-display .date-content');
        if (dateText) {
          dateText.classList.add('slide-out-left');
          dateText.classList.remove('slide-active');
        }
        setTimeout(() => {
          selectedMealJourneyDay++;
          renderMealTracker(onOpenAiCoach);
        }, 200);
      }
    });

    // Calorie Ring Hover Event Handlers
    const mealRingIn = document.getElementById('meal-ring-in');
    const mealRingOut = document.getElementById('meal-ring-out');
    const mealTagIn = document.getElementById('meal-tag-in');
    const mealTagOut = document.getElementById('meal-tag-out');
    const mealCenterNum = document.getElementById('meal-cal-center-num');
    const mealCenterLabel = document.getElementById('meal-cal-center-label');

    const defaultMealNum = diffCal;
    const defaultMealLabel = `/ ${calTarget.toLocaleString('vi-VN')} kcal`;

    const showMealIn = () => {
      if (mealCenterNum) { mealCenterNum.textContent = caloriesIn.toLocaleString('vi-VN'); mealCenterNum.style.color = '#7C3AED'; }
      if (mealCenterLabel) mealCenterLabel.textContent = 'Calo Nạp Vào (In)';
    };

    const showMealOut = () => {
      if (mealCenterNum) { mealCenterNum.textContent = caloriesOut.toLocaleString('vi-VN'); mealCenterNum.style.color = '#D946EF'; }
      if (mealCenterLabel) mealCenterLabel.textContent = 'Calo Tiêu Hao (Out)';
    };

    const resetMealDefault = () => {
      if (mealCenterNum) { mealCenterNum.textContent = defaultMealNum; mealCenterNum.style.color = 'var(--text-main)'; }
      if (mealCenterLabel) mealCenterLabel.textContent = defaultMealLabel;
    };

    mealRingIn?.addEventListener('mouseenter', showMealIn);
    mealRingIn?.addEventListener('mouseleave', resetMealDefault);
    mealTagIn?.addEventListener('mouseenter', showMealIn);
    mealTagIn?.addEventListener('mouseleave', resetMealDefault);

    mealRingOut?.addEventListener('mouseenter', showMealOut);
    mealRingOut?.addEventListener('mouseleave', resetMealDefault);
    mealTagOut?.addEventListener('mouseenter', showMealOut);
    mealTagOut?.addEventListener('mouseleave', resetMealDefault);

    // Quick AI Food NLP Parser
    document.getElementById('btn-quick-parse-food')?.addEventListener('click', async () => {
      const prompt = document.getElementById('quick-food-nlp-input')?.value;
      if (!prompt) {
        return Modal.warning({
          title: 'Thiếu Mô Tả',
          message: 'Vui lòng nhập mô tả món ăn trước khi bấm phân tích AI!'
        });
      }

      const btn = document.getElementById('btn-quick-parse-food');
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 spin"></i> Đang phân tích...`;

      try {
        const parsedMeal = await AiCoachService.parseMealText(prompt);
        if (parsedMeal) {
          await DataService.addMealLog(activeDateStr, parsedMeal);
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
          const inputEl = document.getElementById('quick-food-nlp-input');
          if (inputEl) inputEl.value = '';
          renderMealTracker(onOpenAiCoach);
        }
      } catch (err) {
        console.warn('AI Food parse error:', err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="wand-2" class="w-4 h-4"></i> AI Phân Tích Kcal`;
      }
    });

    // AI Insight Card Action Buttons
    document.getElementById('btn-ai-apply-recommendation')?.addEventListener('click', () => {
      openAddMealModal(activeDateStr, 'Dinner', () => renderMealTracker(onOpenAiCoach));
    });

    document.getElementById('btn-ai-ask-coach')?.addEventListener('click', () => {
      if (onOpenAiCoach) onOpenAiCoach();
    });

    // Delete meal buttons
    mountNode.querySelectorAll('[data-delete-meal]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-delete-meal');
        const itemCard = btn.closest('.food-row');
        if (itemCard) {
          itemCard.style.transition = 'all 0.3s ease';
          itemCard.style.opacity = '0';
          itemCard.style.transform = 'translateX(20px)';
          setTimeout(async () => {
            await DataService.removeMealLog(todayLog.date, id);
            renderMealTracker(onOpenAiCoach);
          }, 300);
        } else {
          await DataService.removeMealLog(todayLog.date, id);
          renderMealTracker(onOpenAiCoach);
        }
      });
    });

    // Open Modal Handlers
    document.getElementById('btn-open-add-meal-top')?.addEventListener('click', () => {
      openAddMealModal(activeDateStr, 'Lunch', () => renderMealTracker(onOpenAiCoach));
    });

    mountNode.querySelectorAll('[data-open-add-meal-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const catKey = btn.getAttribute('data-open-add-meal-cat');
        openAddMealModal(activeDateStr, catKey, () => renderMealTracker(onOpenAiCoach));
      });
    });
  }
}

function renderMealCategoryCard(typeKey, title, iconName, mealsList = [], iconBg = '#EDE9FE', iconColor = '#8B5CF6', tagText = 'Đủ chất', timeStr = '12:00') {
  const catCalories = mealsList.reduce((s, m) => s + (m.calories || 0), 0);
  const catCost = mealsList.reduce((s, m) => s + (m.costVnd || (m.calories ? Math.round(m.calories * 40) : 0)), 0);

  return `
    <article class="card card-hover meal-card p-5 fade-up">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs" style="background:${iconBg}; color:${iconColor}">
            <i data-lucide="${iconName}" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="font-semibold flex items-center gap-2" style="color: var(--text-main);">
              ${title} 
              <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full" style="background:${iconBg}; color:${iconColor}">
                ${tagText}
              </span>
            </div>
            <div class="text-xs text-muted mt-0.5" style="color: var(--text-muted);">${mealsList.length} món · ${catCost > 0 ? catCost.toLocaleString('vi-VN') + '₫' : timeStr}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="display text-2xl font-semibold leading-none" style="color: var(--text-main);">${catCalories}</div>
          <div class="text-[10px] text-muted mt-1 uppercase tracking-wider" style="color: var(--text-muted);">kcal</div>
        </div>
      </div>

      ${mealsList.length === 0 ? `
        <div class="empty-bowl rounded-2xl py-6 px-5 text-center mb-4 border border-dashed border-color">
          <div class="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center shadow-xs" style="background: var(--bg-card);">
            <i data-lucide="utensils-crossed" class="w-5 h-5" style="color: var(--accent-purple);"></i>
          </div>
          <div class="text-sm font-semibold mb-1" style="color: var(--text-main);">Chưa ghi nhận món ăn nào</div>
          <div class="text-xs text-muted max-w-[220px] mx-auto" style="color: var(--text-muted);">Gõ mô tả AI ở trên hoặc bấm nút dưới để thêm món</div>
        </div>
        <button class="btn btn-primary w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" data-open-add-meal-cat="${typeKey}">
          <i data-lucide="plus" class="w-4 h-4"></i> Thêm món cho ${title.toLowerCase()}
        </button>
      ` : `
        <div class="mb-4">
          ${mealsList.map(m => `
            <div class="food-row">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${iconBg}">
                  <i data-lucide="utensils" class="w-4 h-4" style="color:${iconColor}"></i>
                </div>
                <div>
                  <div class="text-sm font-medium" style="color: var(--text-main);">${m.name}</div>
                  <div class="text-[11px] text-muted" style="color: var(--text-muted);">P:${m.protein || 0}g · C:${m.carb || 0}g · F:${m.fat || 0}g</div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-sm font-semibold" style="color: var(--text-main);">${m.calories} <span class="text-muted font-normal text-xs" style="color: var(--text-muted);">kcal</span></div>
                <button class="btn btn-secondary btn-sm btn-icon w-7 h-7 p-0" data-delete-meal="${m.id}" title="Xóa món này"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="text-xs font-semibold flex items-center gap-1.5 transition group" style="color: var(--accent-purple);" data-open-add-meal-cat="${typeKey}">
          <span class="w-5 h-5 rounded-full flex items-center justify-center transition" style="background: rgba(124, 58, 237, 0.12);">
            <i data-lucide="plus" class="w-3 h-3"></i>
          </span>
          Thêm món vào ${title.toLowerCase()}
        </button>
      `}
    </article>
  `;
}

function openAddMealModal(dateStr, defaultType = 'Lunch', onSaveSuccess) {
  const modalMount = document.getElementById('modal-mount');
  if (!modalMount) return;

  let currentType = defaultType;

  const mealOptions = [
    { value: 'Breakfast', label: 'Bữa Sáng (Breakfast)' },
    { value: 'Lunch', label: 'Bữa Trưa (Lunch)' },
    { value: 'Dinner', label: 'Bữa Tối (Dinner)' },
    { value: 'Snack', label: 'Bữa Phụ (Snack)' }
  ];

  const popularFoods = [
    { name: 'Cá hồi áp chảo', desc: '180g · 36g protein · 416 kcal', icon: 'fish', color: '#EC4899', bg: '#FCE7F3', kcal: 416, p: 36, c: 0, f: 22, cost: 65000 },
    { name: 'Cơm lứt', desc: '1 bát · 45g carbs · 160 kcal', icon: 'wheat', color: '#F59E0B', bg: '#FEF3C7', kcal: 160, p: 4, c: 45, f: 1, cost: 10000 },
    { name: 'Ức gà nướng', desc: '150g · 35g protein · 240 kcal', icon: 'beef', color: '#EC4899', bg: '#FCE7F3', kcal: 240, p: 35, c: 0, f: 5, cost: 35000 },
    { name: 'Salad rau trộn', desc: '1 đĩa · nhiều vitamin · 90 kcal', icon: 'leaf', color: '#3B82F6', bg: '#DBEAFE', kcal: 90, p: 2, c: 12, f: 3, cost: 20000 },
    { name: 'Trứng luộc 2 quả', desc: '2 quả · 12g protein · 140 kcal', icon: 'egg', color: '#F59E0B', bg: '#FEF3C7', kcal: 140, p: 12, c: 1, f: 10, cost: 10000 },
    { name: 'Sữa hạnh nhân', desc: '1 ly · không đường · 40 kcal', icon: 'milk', color: '#8B5CF6', bg: '#EDE9FE', kcal: 40, p: 2, c: 3, f: 2, cost: 15000 },
  ];

  const modalHtml = `
    <div class="modal-overlay active" id="add-meal-modal">
      <div class="modal-card" style="max-width: 540px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
        
        <!-- Header -->
        <div class="p-6 border-b border-color" style="border-bottom: 1px solid var(--border-color);">
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="text-[10px] uppercase tracking-[0.18em] text-muted font-bold mb-1" style="color: var(--text-muted);">Thêm món ăn</div>
              <h3 class="display text-2xl font-semibold" style="color: var(--text-main);">Tìm hoặc nhập món ăn</h3>
            </div>
            <button class="btn btn-secondary btn-icon" id="btn-close-meal-modal"><i data-lucide="x"></i></button>
          </div>

          <div class="form-group mb-3">
            <label class="form-label text-xs font-bold uppercase tracking-wider" style="color: var(--text-muted);">Bữa ăn ghi nhận</label>
            <div id="meal-type-dropdown-container">
              ${renderDropdown({
    id: 'meal-type-dropdown',
    options: mealOptions,
    value: currentType,
    placeholder: 'Chọn bữa ăn...'
  })}
            </div>
          </div>

          <div class="flex flex-wrap gap-2 mt-3">
            <div class="chip" data-filter-chip="low-cal"><i data-lucide="flame" class="w-3 h-3" style="color:#D946EF"></i> Calories thấp</div>
            <div class="chip" data-filter-chip="high-p"><i data-lucide="beef" class="w-3 h-3" style="color:#EC4899"></i> Nhiều protein</div>
            <div class="chip" data-filter-chip="quick"><i data-lucide="zap" class="w-3 h-3" style="color:#8B5CF6"></i> Nhanh & dễ</div>
          </div>
        </div>

        <!-- Popular Suggestions List -->
        <div class="p-6 overflow-y-auto flex-1">
          <div class="text-[10px] uppercase tracking-[0.18em] text-muted font-bold mb-3" style="color: var(--text-muted);">Gợi ý phổ biến (Bấm để thêm nhanh)</div>
          <div class="space-y-2" id="foodSuggestionsList">
            ${popularFoods.map(f => `
              <div class="flex items-center justify-between p-3 rounded-2xl hover:bg-[var(--bg-subtle)] cursor-pointer transition group" data-quick-add-food="${f.name}">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${f.bg}">
                    <i data-lucide="${f.icon}" class="w-4 h-4" style="color:${f.color}"></i>
                  </div>
                  <div>
                    <div class="text-sm font-semibold" style="color: var(--text-main);">${f.name}</div>
                    <div class="text-xs text-muted" style="color: var(--text-muted);">${f.desc}</div>
                  </div>
                </div>
                <button class="w-8 h-8 rounded-full border border-color flex items-center justify-center transition group-hover:bg-[var(--accent-purple)] group-hover:text-white group-hover:border-[var(--accent-purple)]" style="background: var(--bg-card);">
                  <i data-lucide="plus" class="w-4 h-4"></i>
                </button>
              </div>
            `).join('')}
          </div>

          <!-- Manual Custom Form Accordion -->
          <div class="mt-6 pt-4 border-t border-color" style="border-top: 1px dashed var(--border-color);">
            <div class="text-xs font-bold text-muted uppercase tracking-wider mb-3" style="color: var(--text-muted);">Hoặc nhập tùy chỉnh món ăn khác</div>
            
            <div class="form-group">
              <label class="form-label">Tên Món Ăn</label>
              <input type="text" class="form-input" id="meal-name-input" placeholder="Ví dụ: Phở bò tái hoặc Ức gà nướng">
            </div>

            <div class="grid grid-cols-4 gap-2">
              <div class="form-group mb-0">
                <label class="form-label">Calo</label>
                <input type="number" class="form-input" id="meal-cal-input" placeholder="350">
              </div>
              <div class="form-group mb-0">
                <label class="form-label">Protein(g)</label>
                <input type="number" class="form-input" id="meal-p-input" placeholder="30">
              </div>
              <div class="form-group mb-0">
                <label class="form-label">Carb(g)</label>
                <input type="number" class="form-input" id="meal-c-input" placeholder="40">
              </div>
              <div class="form-group mb-0">
                <label class="form-label">Fat(g)</label>
                <input type="number" class="form-input" id="meal-f-input" placeholder="8">
              </div>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">Giá tiền (VNĐ)</label>
              <input type="number" class="form-input" id="meal-cost-input" placeholder="35000">
            </div>

            <div class="form-group mt-3">
              <label class="form-label">Link Video Hướng Dẫn Nấu Ăn (TikTok / YouTube)</label>
              <input type="text" class="form-input" id="meal-video-input" onfocus="this.select()" placeholder="Dán link video TikTok hoặc YouTube vào đây...">
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-4 border-t border-color" style="border-top: 1px solid var(--border-color); background: var(--bg-subtle);">
          <button class="btn btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" id="btn-save-custom-meal">
            <i data-lucide="check" class="w-4 h-4"></i> Xác Nhận Lưu Món Ăn
          </button>
        </div>
      </div>
    </div>
  `;

  modalMount.innerHTML = modalHtml;
  if (window.lucide) window.lucide.createIcons();

  initDropdownListeners(modalMount, (val) => {
    currentType = val;
  });

  const modal = document.getElementById('add-meal-modal');
  const closeModal = () => {
    modal.remove();
  };

  document.getElementById('btn-close-meal-modal')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Quick Add Popular Food Click Listeners
  modalMount.querySelectorAll('[data-quick-add-food]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const foodName = btn.getAttribute('data-quick-add-food');
      const item = popularFoods.find(f => f.name === foodName);
      if (item) {
        await DataService.addMealLog(dateStr, {
          type: currentType,
          name: item.name,
          calories: item.kcal,
          protein: item.p,
          carb: item.c,
          fat: item.f,
          costVnd: item.cost
        });
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        closeModal();
        if (onSaveSuccess) onSaveSuccess();
      }
    });
  });

  // Save Custom Meal Handler
  document.getElementById('btn-save-custom-meal')?.addEventListener('click', async () => {
    const name = document.getElementById('meal-name-input').value.trim() || 'Món ăn dinh dưỡng';
    const calories = parseInt(document.getElementById('meal-cal-input').value) || 0;
    const protein = parseInt(document.getElementById('meal-p-input').value) || 0;
    const carb = parseInt(document.getElementById('meal-c-input').value) || 0;
    const fat = parseInt(document.getElementById('meal-f-input').value) || 0;
    const costVnd = parseInt(document.getElementById('meal-cost-input').value) || 0;
    const videoUrl = document.getElementById('meal-video-input').value.trim() || '';

    await DataService.addMealLog(dateStr, { type: currentType, name, calories, protein, carb, fat, costVnd, videoUrl });
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    closeModal();
    if (onSaveSuccess) onSaveSuccess();
  });
}
