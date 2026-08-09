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
  let currentJourneyDay = 1;
  if (goal.startDate) {
    const start = new Date(goal.startDate);
    const today = new Date(todayStr);
    currentJourneyDay = Math.max(1, Math.floor((today - start) / 86400000) + 1);
  }

  if (selectedWorkoutJourneyDay === null) {
    selectedWorkoutJourneyDay = Math.min(currentJourneyDay, totalJourneyDays);
  }

  // Clamp selectedWorkoutJourneyDay
  if (selectedWorkoutJourneyDay < 1) selectedWorkoutJourneyDay = 1;
  if (selectedWorkoutJourneyDay > totalJourneyDays) selectedWorkoutJourneyDay = totalJourneyDays;

  // Resolve active date string for selected journey day
  let activeDateStr = todayStr;
  if (goal.startDate) {
    const d = new Date(goal.startDate);
    d.setDate(d.getDate() + (selectedWorkoutJourneyDay - 1));
    activeDateStr = d.toISOString().split('T')[0];
  }

  const todayLog = await DataService.getDailyLog(activeDateStr);
  const totalBurned = todayLog.workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

  const html = `
    <div style="display: flex; flex-direction: column; gap: 1.75rem;">
      <!-- Header Banner & Rest Day Toggle -->
      <div class="card" style="background: linear-gradient(135deg, rgba(245, 241, 255, 0.9), rgba(251, 250, 255, 0.9)); border: 1px solid var(--border-highlight);">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h2 style="display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="dumbbell" style="color: var(--accent-amber);"></i> Theo Dõi Tập Luyện & Vận Động</h2>
            <p class="text-sm text-muted" style="margin-top: 0.25rem;">Ghi nhận bài tập, tính toán Calo Out chính xác dựa trên chỉ số cơ thể (${profile.currentWeight}kg).</p>
          </div>
          
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <!-- Day Switcher Navigation Widget (Capsule Pill Style) -->
            <div class="day-nav">
              <button class="btn-nav" id="btn-workout-day-prev" ${selectedWorkoutJourneyDay <= 1 ? 'disabled' : ''} title="Ngày trước">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>

              <div class="label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Ngày ${selectedWorkoutJourneyDay}/${totalJourneyDays}
              </div>

              <button class="btn-nav" id="btn-workout-day-next" ${selectedWorkoutJourneyDay >= totalJourneyDays ? 'disabled' : ''} title="Ngày sau">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            <button class="btn ${todayLog.isRestDay ? 'btn-primary' : 'btn-secondary'}" id="btn-toggle-rest-day">
              <i data-lucide="moon"></i> ${todayLog.isRestDay ? 'Đang Đánh Dấu Ngày Nghỉ' : 'Đánh Dấu Ngày Nghỉ'}
            </button>
            <button class="btn btn-secondary" id="btn-open-workout-modal">
              <i data-lucide="plus"></i> Thêm Bài Tập Mới
            </button>
          </div>
        </div>

        <!-- Natural Language Workout Parser -->
        <div style="margin-top: 1rem; display: flex; gap: 0.6rem;">
          <input type="text" class="form-input" id="quick-workout-nlp-input" placeholder="Ví dụ: Chạy bộ 30 phút hoặc Tập gym 45 phút..." style="background: var(--bg-card);">
          <button class="btn btn-ai" id="btn-quick-parse-workout"><i data-lucide="zap"></i> AI Tính Calo Out</button>
        </div>
      </div>

      <!-- Workout Summary Stats -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem;">
        <div class="card">
          <span class="text-xs text-muted" style="font-weight: 800;">TỔNG CALO TIÊU HAO (OUT)</span>
          <div style="font-size: 1.8rem; font-weight: 900; color: var(--accent-amber);">${totalBurned} <span class="text-xs text-muted">kcal</span></div>
          <div class="text-xs text-muted" style="margin-top: 0.25rem;">Ngày ${selectedWorkoutJourneyDay} từ ${todayLog.workouts.length} hoạt động</div>
        </div>
        <div class="card">
          <span class="text-xs text-muted" style="font-weight: 800;">TRẠNG THÁI STREAK</span>
          <div style="font-size: 1.35rem; font-weight: 900; color: var(--accent-purple); display: flex; align-items: center; gap: 0.4rem; margin-top: 0.2rem;">
            <i data-lucide="${todayLog.workouts.length > 0 ? 'flame' : todayLog.isRestDay ? 'moon' : 'clock'}" style="width: 22px; height: 22px;"></i>
            ${todayLog.workouts.length > 0 ? 'Đã Tập Luyện' : todayLog.isRestDay ? 'Ngày Nghỉ Phục Hồi' : 'Chưa Ghi Nhận'}
          </div>
          <div class="text-xs text-muted" style="margin-top: 0.25rem;">Không bị ngắt chuỗi Streak kỷ luật!</div>
        </div>
      </div>

      <!-- Logged Workouts List -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i data-lucide="list"></i> Danh Sách Bài Tập Ngày ${selectedWorkoutJourneyDay}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${todayLog.workouts.length === 0 ? '<div class="text-muted text-sm" style="font-style: italic; padding: 1rem 0; text-align: center;">Chưa có bài tập nào được ghi nhận cho ngày này. Hãy thêm bài tập hoặc gõ câu mô tả tự nhiên ở trên!</div>' : ''}
          ${todayLog.workouts.map(w => `
            <div class="workout-item-card" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle); padding: 0.85rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
              <div>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">${w.type}</div>
                <div class="text-xs text-muted">Thời lượng: <b>${w.duration} phút</b> | Cường độ: ${w.intensity || 'Medium'} | Giờ tập: ${w.time || 'Hôm nay'}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-weight: 900; font-size: 1.05rem; color: var(--accent-amber);">+${w.caloriesBurned} kcal Out</span>
                <button class="btn btn-secondary btn-sm btn-icon" data-delete-workout="${w.id}"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

    // Day Switcher Navigation Handlers
    document.getElementById('btn-workout-day-prev')?.addEventListener('click', () => {
      if (selectedWorkoutJourneyDay > 1) {
        selectedWorkoutJourneyDay--;
        renderWorkoutTracker();
      }
    });

    document.getElementById('btn-workout-day-next')?.addEventListener('click', () => {
      if (selectedWorkoutJourneyDay < totalJourneyDays) {
        selectedWorkoutJourneyDay++;
        renderWorkoutTracker();
      }
    });

    // Toggle Rest Day
    document.getElementById('btn-toggle-rest-day')?.addEventListener('click', async () => {
      await DataService.toggleRestDay(todayLog.date);
      renderWorkoutTracker();
    });

    // Quick Natural Language Workout Parse
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
      btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Đang tính toán...`;

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
        btn.innerHTML = `<i data-lucide="zap"></i> AI Tính Calo Out`;
      }
    });

    // Delete workout with smooth notification-swipe animation for individual item card
    document.querySelectorAll('[data-delete-workout]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-delete-workout');
        const itemCard = btn.closest('.workout-item-card');
        if (itemCard) {
          itemCard.classList.add('item-deleting');
          setTimeout(async () => {
            await DataService.removeWorkoutLog(todayLog.date, id);
            renderWorkoutTracker();
          }, 400);
        } else {
          await DataService.removeWorkoutLog(todayLog.date, id);
          renderWorkoutTracker();
        }
      });
    });

    // Open Modal Teleported to #modal-mount
    document.getElementById('btn-open-workout-modal')?.addEventListener('click', () => {
      openAddWorkoutModal(todayLog.date, profile.currentWeight, () => renderWorkoutTracker());
    });
  }
}

function openAddWorkoutModal(dateStr, userWeight, onSaveSuccess) {
  const modalMount = document.getElementById('modal-mount');
  if (!modalMount) return;

  let currentWorkoutType = 'Chạy Bộ Outdoor';

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
      <div class="modal-card" style="max-width: 480px;">
        <div class="card-header">
          <h3>Ghi Nhận Bài Tập Mới</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-workout-modal"><i data-lucide="x"></i></button>
        </div>
        <div class="form-group">
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
        <div class="form-group">
          <label class="form-label">Thời Lượng (Phút)</label>
          <input type="number" class="form-input" id="workout-duration-input" value="30" min="5" max="300">
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" id="btn-save-workout">Lưu Bài Tập</button>
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

  document.getElementById('btn-save-workout')?.addEventListener('click', async () => {
    const type = currentWorkoutType;
    const duration = parseInt(document.getElementById('workout-duration-input').value) || 30;

    // Calculate MET burn
    let met = 5.0;
    if (type.includes('Chạy')) met = 8.0;
    else if (type.includes('Cardio')) met = 7.5;
    else if (type.includes('Gym')) met = 5.5;
    else if (type.includes('Bơi')) met = 6.8;
    else if (type.includes('Đi Bộ')) met = 3.8;

    const caloriesBurned = Math.round((duration / 60) * met * (userWeight || 70));

    await DataService.addWorkoutLog(dateStr, { type, duration, intensity: 'Moderate', caloriesBurned });
    closeModal();
    if (onSaveSuccess) onSaveSuccess();
  });
}
