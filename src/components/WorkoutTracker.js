import confetti from 'canvas-confetti';
import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { Modal } from './ui/Modal.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';

let selectedWorkoutJourneyDay = null; // 1-based journey day navigation

export async function renderWorkoutTracker() {
  const profile = await DataService.getUserProfile();
  const goal = await DataService.getUserGoal();
  const totalJourneyDays = goal.totalJourneyDays || goal.targetDays || 60;
  const todayStr = DataService.getTodayString();

  // Calculate current journey day (1-based) from goal.startDate
  const currentJourneyDay = DataService.calculateCurrentJourneyDay(goal.startDate);

  if (selectedWorkoutJourneyDay === null) {
    selectedWorkoutJourneyDay = Math.min(currentJourneyDay, totalJourneyDays);
  }

  // Clamp selectedWorkoutJourneyDay
  if (selectedWorkoutJourneyDay < 1) selectedWorkoutJourneyDay = 1;
  if (selectedWorkoutJourneyDay > totalJourneyDays) selectedWorkoutJourneyDay = totalJourneyDays;

  // Resolve active date string for selected journey day
  const activeDateStr = DataService.getDateStrForJourneyDay(goal.startDate, selectedWorkoutJourneyDay);
  const todayLog = await DataService.getDailyLog(activeDateStr);
  const totalBurned = todayLog.workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

  // Date formatting
  const dateObj = new Date(activeDateStr);
  const daysOfWeekVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const daysOfWeekShortVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayNameVi = daysOfWeekVi[dateObj.getDay()];
  const dateFormatted = `${dayNameVi} · Ngày ${dateObj.getDate()} Tháng ${dateObj.getMonth() + 1}, ${dateObj.getFullYear()}`;

  // Date Pills Generator (7 days around selectedWorkoutJourneyDay)
  let datePillsHtml = '';
  for (let i = -3; i <= 3; i++) {
    const pillDay = selectedWorkoutJourneyDay + i;
    if (pillDay >= 1 && pillDay <= totalJourneyDays) {
      const pillDateStr = DataService.getDateStrForJourneyDay(goal.startDate, pillDay);
      const pDate = new Date(pillDateStr);
      const pDayShort = daysOfWeekShortVi[pDate.getDay()];
      const isActive = pillDay === selectedWorkoutJourneyDay;
      datePillsHtml += `
        <div class="date-pill ${isActive ? 'active' : ''}" data-select-workout-day="${pillDay}" title="Chuyển sang Ngày ${pillDay}">
          <span class="text-[10px] font-bold uppercase tracking-wider ${isActive ? 'opacity-90' : 'opacity-70'}">${pDayShort}</span>
          <span class="day-num display text-base font-semibold">${pDate.getDate()}</span>
        </div>
      `;
    }
  }

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
            Theo Dõi Tập Luyện<br>
            <span class="italic" style="color: var(--accent-purple);">& Vận Động</span>
          </h1>
        </div>

        <!-- Date Strip Widget -->
        <div class="flex gap-1 bg-card p-2 rounded-2xl border border-color shadow-sm" id="workoutDateStrip" style="background: var(--bg-card); border: 1px solid var(--border-color);">
          ${datePillsHtml}
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="flex flex-wrap gap-3 mb-6 fade-up" style="animation-delay: 0.14s">
        <button class="btn-ghost px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold ${todayLog.isRestDay ? 'bg-[var(--accent-purple-light)] text-[var(--accent-purple)] border-[var(--accent-purple)]' : ''}" id="btn-toggle-rest-day">
          <i data-lucide="bed" class="w-4 h-4"></i> ${todayLog.isRestDay ? 'Bỏ Đánh Dấu Ngày Nghỉ' : 'Đánh Dấu Ngày Nghỉ'}
        </button>
        <button class="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold" id="btn-open-workout-modal-top">
          <i data-lucide="plus-circle" class="w-4 h-4"></i> Thêm Bài Tập Mới
        </button>
        <button class="btn-accent ai-glow px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold" id="btn-trigger-ai-cal-out">
          <i data-lucide="sparkles" class="w-4 h-4"></i> AI Tính Calo Out
        </button>
      </div>

      <!-- Quick AI Natural Language Parser Bar (Hidden by default, toggled via AI button or displayed cleanly) -->
      <div class="card p-4 mb-6 flex flex-col md:flex-row gap-3 items-center" id="quick-workout-nlp-box">
        <div class="relative flex-1 w-full">
          <i data-lucide="sparkles" class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style="color: var(--accent-purple);"></i>
          <input type="text" class="form-input w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium" id="quick-workout-nlp-input" placeholder="Ví dụ: Chạy bộ 30 phút hoặc Tập gym 45 phút..." style="background: var(--bg-input); color: var(--text-main);">
        </div>
        <button class="btn btn-ai px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap w-full md:w-auto" id="btn-quick-parse-workout">
          <i data-lucide="zap" class="w-4 h-4"></i> Tính Calo Tự Động
        </button>
      </div>

      <!-- Stats Grid (2 Cards) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        
        <!-- Card 1: Tổng Calo Tiêu Hao (Out) -->
        <div class="card p-6 fade-up" style="animation-delay: 0.2s">
          <div class="text-[10px] uppercase tracking-[0.18em] text-muted font-bold mb-4" style="color: var(--text-muted);">TỔNG CALO TIÊU HAO (OUT)</div>
          <div class="flex items-end gap-2">
            <span class="display text-5xl font-semibold leading-none" style="color: var(--accent-purple);">${totalBurned.toLocaleString('vi-VN')}</span>
            <span class="text-lg text-muted mb-1" style="color: var(--text-muted);">kcal</span>
          </div>
          <div class="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style="background: rgba(124, 58, 237, 0.12); color: var(--accent-purple);">
            ${todayLog.isRestDay ? `
              <i data-lucide="moon" class="w-3.5 h-3.5"></i> Hôm nay là ngày nghỉ
            ` : todayLog.workouts.length > 0 ? `
              <i data-lucide="flame" class="w-3.5 h-3.5"></i> ${todayLog.workouts.length} hoạt động tập luyện
            ` : `
              <i data-lucide="clock" class="w-3.5 h-3.5"></i> Chưa có hoạt động
            `}
          </div>
        </div>

        <!-- Card 2: Trạng Thái Streak -->
        <div class="card p-6 fade-up" style="animation-delay: 0.26s">
          <div class="text-[10px] uppercase tracking-[0.18em] text-muted font-bold mb-4" style="color: var(--text-muted);">TRẠNG THÁI STREAK KỶ LUẬT</div>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs" style="background: #FFF6D6;">
              <i data-lucide="flame" class="w-6 h-6 text-[#E0B800]"></i>
            </div>
            <div>
              <div class="display text-2xl font-semibold leading-tight" style="color: var(--text-main);">
                ${todayLog.workouts.length > 0 ? 'Đã Tập Luyện' : todayLog.isRestDay ? 'Ngày Nghỉ Phục Hồi' : 'Chưa Ghi Nhận'}
              </div>
              <div class="text-xs text-muted mt-1" style="color: var(--text-muted);">
                ${todayLog.isRestDay ? 'Ngày nghỉ vẫn bảo toàn chuỗi Streak kỷ luật!' : 'Hoàn thành bài tập để giữ vững ngọn lửa Streak!'}
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Workout List Section -->
      <div class="card p-6 fade-up" style="animation-delay: 0.32s">
        <div class="flex justify-between items-center mb-5 pb-4 border-b border-color" style="border-bottom: 1px solid var(--border-color);">
          <div>
            <h2 class="display text-xl font-semibold" style="color: var(--text-main);">Danh Sách Bài Tập Ngày ${selectedWorkoutJourneyDay}</h2>
            <div class="text-xs text-muted mt-0.5" style="color: var(--text-muted);">${todayLog.workouts.length} bài tập · ${totalBurned} kcal tiêu hao</div>
          </div>
          ${!todayLog.isRestDay ? `
            <button class="btn btn-primary px-4 py-2 text-xs font-semibold rounded-xl" id="btn-open-workout-modal-list">
              <i data-lucide="plus" class="w-4 h-4"></i> Thêm Bài Tập
            </button>
          ` : ''}
        </div>

        <!-- REST DAY ANIMATED STATE -->
        ${todayLog.isRestDay ? `
          <div class="rest-day-card card p-8 text-center flex flex-col items-center justify-center border border-dashed border-color animate-rest-day" style="background: radial-gradient(circle at 50% 30%, rgba(124, 58, 237, 0.08), transparent 70%); border-radius: 20px;">
            <div class="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-sm" style="background: rgba(124, 58, 237, 0.14); color: var(--accent-purple);">
              <i data-lucide="moon" class="w-8 h-8"></i>
            </div>
            <h3 class="display text-2xl font-semibold mb-2" style="color: var(--text-main);">Hôm Nay Là Ngày Nghỉ Phục Hồi</h3>
            <p class="text-sm text-muted max-w-md mb-6" style="color: var(--text-muted);">
              Cơ thể đang trong quá trình tổng hợp glycogen và phục hồi sợi cơ. Hãy thư giãn và chuẩn bị sẵn sàng cho buổi tập tiếp theo!
            </p>
            <button class="btn btn-secondary text-xs font-semibold px-5 py-2.5 rounded-xl border-color" id="btn-cancel-rest-day">
              Hủy Đánh Dấu Ngày Nghỉ & Bắt Đầu Tập
            </button>
          </div>
        ` : todayLog.workouts.length === 0 ? `
          <!-- EMPTY WORKOUT STATE -->
          <div class="flex flex-col items-center justify-center py-12 text-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-xs" style="background: rgba(124, 58, 237, 0.12); color: var(--accent-purple);">
              <i data-lucide="dumbbell" class="w-8 h-8"></i>
            </div>
            <p class="text-sm font-semibold mb-1" style="color: var(--text-main);">Chưa có bài tập nào</p>
            <p class="text-xs text-muted max-w-xs mb-6" style="color: var(--text-muted);">Thêm các bài tập thể dục của bạn để theo dõi lượng calo tiêu hao chính xác nhất.</p>
            <button class="btn btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2" id="btn-open-workout-modal-empty">
              <i data-lucide="plus" class="w-4 h-4"></i> Thêm Bài Tập Mới
            </button>
          </div>
        ` : `
          <!-- WORKOUT ITEMS LIST -->
          <div class="flex flex-col gap-3">
            ${todayLog.workouts.map(w => `
              <div class="workout-item-card food-row p-4 rounded-2xl border border-color hover:bg-[var(--bg-subtle)] transition" style="background: var(--bg-card);">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(124, 58, 237, 0.12); color: var(--accent-purple);">
                    <i data-lucide="activity" class="w-5 h-5"></i>
                  </div>
                  <div>
                    <div class="font-semibold text-sm" style="color: var(--text-main);">${w.type}</div>
                    <div class="text-xs text-muted" style="color: var(--text-muted);">Thời lượng: <b>${w.duration} phút</b> · Cường độ: ${w.intensity || 'Vừa phải'} · Giờ: ${w.time || 'Hôm nay'}</div>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <span class="font-bold text-base" style="color: var(--accent-purple);">+${w.caloriesBurned} <span class="text-xs font-normal text-muted" style="color: var(--text-muted);">kcal Out</span></span>
                  <button class="btn btn-secondary btn-sm btn-icon w-8 h-8 p-0" data-delete-workout="${w.id}" title="Xóa bài tập này"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

    // Date Strip Pill Click Listeners
    mountNode.querySelectorAll('[data-select-workout-day]').forEach(pill => {
      pill.addEventListener('click', () => {
        const targetDay = parseInt(pill.getAttribute('data-select-workout-day'));
        if (targetDay && targetDay !== selectedWorkoutJourneyDay) {
          selectedWorkoutJourneyDay = targetDay;
          renderWorkoutTracker();
        }
      });
    });

    // Rest Day Toggle
    const handleRestDayToggle = async () => {
      const isRest = await DataService.toggleRestDay(todayLog.date);
      if (isRest) {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      }
      renderWorkoutTracker();
    };

    document.getElementById('btn-toggle-rest-day')?.addEventListener('click', handleRestDayToggle);
    document.getElementById('btn-cancel-rest-day')?.addEventListener('click', handleRestDayToggle);

    // Quick AI Workout NLP Parser
    document.getElementById('btn-quick-parse-workout')?.addEventListener('click', async () => {
      const prompt = document.getElementById('quick-workout-nlp-input')?.value;
      if (!prompt) {
        return Modal.warning({
          title: 'Thiếu Mô Tả',
          message: 'Vui lòng nhập mô tả bài tập trước khi bấm phân tích AI!'
        });
      }

      const btn = document.getElementById('btn-quick-parse-workout');
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 spin"></i> Đang tính toán...`;

      try {
        const parsedWorkout = await AiCoachService.parseWorkoutText(prompt, profile.currentWeight);
        if (parsedWorkout) {
          await DataService.addWorkoutLog(activeDateStr, parsedWorkout);
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
          const inputEl = document.getElementById('quick-workout-nlp-input');
          if (inputEl) inputEl.value = '';
          renderWorkoutTracker();
        }
      } catch (err) {
        console.warn('AI Workout parse error:', err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="zap" class="w-4 h-4"></i> Tính Calo Tự Động`;
      }
    });

    // Delete workout button handler
    mountNode.querySelectorAll('[data-delete-workout]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-delete-workout');
        const itemCard = btn.closest('.workout-item-card');
        if (itemCard) {
          itemCard.style.transition = 'all 0.3s ease';
          itemCard.style.opacity = '0';
          itemCard.style.transform = 'translateX(20px)';
          setTimeout(async () => {
            await DataService.removeWorkoutLog(todayLog.date, id);
            renderWorkoutTracker();
          }, 300);
        } else {
          await DataService.removeWorkoutLog(todayLog.date, id);
          renderWorkoutTracker();
        }
      });
    });

    // Open Modal Teleported to #modal-mount
    const handleOpenModal = () => {
      openAddWorkoutModal(activeDateStr, profile.currentWeight, () => renderWorkoutTracker());
    };

    document.getElementById('btn-open-workout-modal-top')?.addEventListener('click', handleOpenModal);
    document.getElementById('btn-open-workout-modal-list')?.addEventListener('click', handleOpenModal);
    document.getElementById('btn-open-workout-modal-empty')?.addEventListener('click', handleOpenModal);

    // AI Calo Out button focuses NLP input
    document.getElementById('btn-trigger-ai-cal-out')?.addEventListener('click', () => {
      const input = document.getElementById('quick-workout-nlp-input');
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
}

function openAddWorkoutModal(dateStr, userWeight = 70, onSaveSuccess) {
  const modalMount = document.getElementById('modal-mount');
  if (!modalMount) return;

  let currentWorkoutType = 'Chạy Bộ Outdoor';

  const popularWorkouts = [
    { name: 'Chạy bộ Outdoor', desc: '30 phút · ~300 kcal Out', icon: 'footprints', color: '#3B82F6', bg: '#DBEAFE', duration: 30, met: 8.0 },
    { name: 'Gập bụng / Core', desc: '15 phút · ~150 kcal Out', icon: 'dumbbell', color: '#EC4899', bg: '#FCE7F3', duration: 15, met: 5.0 },
    { name: 'Tập Gym Resistance', desc: '45 phút · ~250 kcal Out', icon: 'flame', color: '#F59E0B', bg: '#FEF3C7', duration: 45, met: 5.5 },
    { name: 'Cardio HIIT', desc: '30 phút · ~320 kcal Out', icon: 'zap', color: '#8B5CF6', bg: '#EDE9FE', duration: 30, met: 7.5 },
    { name: 'Đi bộ nhanh', desc: '30 phút · ~120 kcal Out', icon: 'activity', color: '#10B981', bg: '#D1FAE5', duration: 30, met: 3.8 },
  ];

  const workoutOptions = [
    { value: 'Chạy Bộ Outdoor', label: 'Chạy Bộ Outdoor (MET ~8.0)' },
    { value: 'Tập Tạ / Gym Resistance', label: 'Tập Tạ / Gym Resistance (MET ~5.5)' },
    { value: 'Cardio HIIT', label: 'Cardio HIIT (MET ~7.5)' },
    { value: 'Đi Bộ Nhanh', label: 'Đi Bộ Nhanh (MET ~3.8)' },
    { value: 'Bơi Lội', label: 'Bơi Lội (MET ~6.8)' },
    { value: 'Đạp Xe', label: 'Đạp Xe (MET ~6.0)' },
    { value: 'Yoga / Stretching', label: 'Yoga / Stretching (MET ~2.5)' }
  ];

  const modalHtml = `
    <div class="modal-overlay active" id="add-workout-modal">
      <div class="modal-card" style="max-width: 500px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
        
        <!-- Header -->
        <div class="p-6 border-b border-color" style="border-bottom: 1px solid var(--border-color);">
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="text-[10px] uppercase tracking-[0.18em] text-muted font-bold mb-1" style="color: var(--text-muted);">Thêm tập luyện</div>
              <h3 class="display text-2xl font-semibold" style="color: var(--text-main);">Tìm hoặc chọn bài tập</h3>
            </div>
            <button class="btn btn-secondary btn-icon" id="btn-close-workout-modal"><i data-lucide="x"></i></button>
          </div>

          <div class="relative">
            <i data-lucide="search" class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" style="color: var(--text-muted);"></i>
            <input type="text" placeholder="Tìm bài tập (VD: Chạy bộ, Gập bụng...)" class="search-input w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium" style="background: var(--bg-input); color: var(--text-main);">
          </div>
        </div>

        <!-- Popular Suggestions List -->
        <div class="p-6 overflow-y-auto flex-1">
          <div class="text-[10px] uppercase tracking-[0.18em] text-muted font-bold mb-3" style="color: var(--text-muted);">Gợi ý phổ biến (Bấm để thêm nhanh)</div>
          <div class="space-y-2">
            ${popularWorkouts.map(w => `
              <div class="flex items-center justify-between p-3 rounded-2xl hover:bg-[var(--bg-subtle)] cursor-pointer transition group" data-quick-add-workout="${w.name}">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${w.bg}">
                    <i data-lucide="${w.icon}" class="w-4 h-4" style="color:${w.color}"></i>
                  </div>
                  <div>
                    <div class="text-sm font-semibold" style="color: var(--text-main);">${w.name}</div>
                    <div class="text-xs text-muted" style="color: var(--text-muted);">${w.desc}</div>
                  </div>
                </div>
                <button class="w-8 h-8 rounded-full border border-color flex items-center justify-center transition group-hover:bg-[var(--accent-purple)] group-hover:text-white group-hover:border-[var(--accent-purple)]" style="background: var(--bg-card);">
                  <i data-lucide="plus" class="w-4 h-4"></i>
                </button>
              </div>
            `).join('')}
          </div>

          <!-- Custom Workout Form -->
          <div class="mt-6 pt-4 border-t border-color" style="border-top: 1px dashed var(--border-color);">
            <div class="text-xs font-bold text-muted uppercase tracking-wider mb-3" style="color: var(--text-muted);">Tùy chỉnh thông số bài tập</div>
            
            <div class="form-group mb-3">
              <label class="form-label">Loại Bài Tập</label>
              <div id="workout-type-dropdown-container">
                ${renderDropdown({
                  id: 'workout-type-dropdown',
                  options: workoutOptions,
                  value: currentWorkoutType,
                  placeholder: 'Chọn bài tập...'
                })}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="form-group mb-0">
                <label class="form-label">Thời Lượng (Phút)</label>
                <input type="number" class="form-input" id="workout-duration-input" value="30" min="5" max="300">
              </div>
              <div class="form-group mb-0">
                <label class="form-label">Link Video (Nguồn)</label>
                <input type="text" class="form-input" id="workout-video-input" onfocus="this.select()" placeholder="Link video hướng dẫn...">
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-4 border-t border-color" style="border-top: 1px solid var(--border-color); background: var(--bg-subtle);">
          <button class="btn btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" id="btn-save-custom-workout">
            <i data-lucide="check" class="w-4 h-4"></i> Xác Nhận Lưu Bài Tập
          </button>
        </div>
      </div>
    </div>
  `;

  modalMount.innerHTML = modalHtml;
  if (window.lucide) window.lucide.createIcons();

  initDropdownListeners(modalMount, (val) => {
    currentWorkoutType = val;
  });

  const modal = document.getElementById('add-workout-modal');
  const closeModal = () => {
    modal.remove();
  };

  document.getElementById('btn-close-workout-modal')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Quick Add Workout Click Listeners
  modalMount.querySelectorAll('[data-quick-add-workout]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const wName = btn.getAttribute('data-quick-add-workout');
      const item = popularWorkouts.find(w => w.name === wName);
      if (item) {
        const caloriesBurned = Math.round((item.duration / 60) * item.met * (userWeight || 70));
        await DataService.addWorkoutLog(dateStr, {
          type: item.name,
          duration: item.duration,
          caloriesBurned,
          intensity: 'Vừa phải'
        });
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        closeModal();
        if (onSaveSuccess) onSaveSuccess();
      }
    });
  });

  // Save Custom Workout Handler
  document.getElementById('btn-save-custom-workout')?.addEventListener('click', async () => {
    const type = currentWorkoutType;
    const duration = parseInt(document.getElementById('workout-duration-input').value) || 30;
    const videoUrl = document.getElementById('workout-video-input')?.value?.trim() || '';

    let met = 5.0;
    if (type.includes('Chạy')) met = 8.0;
    else if (type.includes('Cardio')) met = 7.5;
    else if (type.includes('Gym')) met = 5.5;
    else if (type.includes('Bơi')) met = 6.8;
    else if (type.includes('Đi Bộ')) met = 3.8;

    const caloriesBurned = Math.round((duration / 60) * met * (userWeight || 70));

    await DataService.addWorkoutLog(dateStr, { type, duration, caloriesBurned, intensity: 'Vừa phải', videoUrl });
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    closeModal();
    if (onSaveSuccess) onSaveSuccess();
  });
}
