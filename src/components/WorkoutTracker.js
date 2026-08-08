import confetti from 'canvas-confetti';
import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { Modal } from './ui/Modal.js';

export async function renderWorkoutTracker() {
  const profile = await DataService.getUserProfile();
  const todayLog = await DataService.getDailyLog();
  const totalBurned = todayLog.workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

  const html = `
    <div style="display: flex; flex-direction: column; gap: 1.75rem;">
      <!-- Header Banner & Rest Day Toggle -->
      <div class="card" style="background: linear-gradient(135deg, rgba(245, 241, 255, 0.9), rgba(251, 250, 255, 0.9)); border: 1px solid var(--border-highlight);">
        <div class="card-header">
          <div>
            <h2 style="display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="dumbbell" style="color: var(--accent-amber);"></i> Theo Dõi Tập Luyện & Vận Động</h2>
            <p class="text-sm text-muted" style="margin-top: 0.25rem;">Ghi nhận bài tập, tính toán Calo Out chính xác dựa trên chỉ số cơ thể (${profile.currentWeight}kg).</p>
          </div>
          <div style="display: flex; gap: 0.75rem;">
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
          <div class="text-xs text-muted" style="margin-top: 0.25rem;">Hôm nay từ ${todayLog.workouts.length} hoạt động</div>
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
          <div class="card-title"><i data-lucide="list"></i> Danh Sách Bài Tập Hôm Nay</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${todayLog.workouts.length === 0 ? '<div class="text-muted text-sm" style="font-style: italic; padding: 1rem 0; text-align: center;">Chưa có bài tập nào được ghi nhận hôm nay. Hãy thêm bài tập hoặc gõ câu mô tả tự nhiên ở trên!</div>' : ''}
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

    <!-- Modal Form Thêm Bài Tập -->
    <div class="modal-overlay" id="add-workout-modal">
      <div class="modal-card" style="max-width: 480px;">
        <div class="card-header">
          <h3>Ghi Nhận Bài Tập Mới</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-workout-modal"><i data-lucide="x"></i></button>
        </div>
        <div class="form-group">
          <label class="form-label">Loại Bài Tập</label>
          <select class="form-select" id="workout-type-input">
            <option value="Chạy Bộ Outdoor">Chạy Bộ Outdoor (MET ~8.0)</option>
            <option value="Tập Tạ / Gym Resistance">Tập Tạ / Gym Resistance (MET ~5.5)</option>
            <option value="Cardio HIIT">Cardio HIIT (MET ~7.5)</option>
            <option value="Đi Bộ Nhanh">Đi Bộ Nhanh (MET ~3.8)</option>
            <option value="Bơi Lội">Bơi Lội (MET ~6.8)</option>
            <option value="Đạp Xe">Đạp Xe (MET ~6.0)</option>
            <option value="Yoga / Stretching">Yoga / Stretching (MET ~2.5)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Thời Lượng (Phút)</label>
          <input type="number" class="form-input" id="workout-duration-input" value="30" min="5" max="300">
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" id="btn-save-workout">Lưu Bài Tập</button>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

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

      const parsed = await AiCoachService.smartLocalFallback(prompt);
      if (parsed.proposedChange && parsed.proposedChange.payload) {
        await DataService.addWorkoutLog(todayLog.date, parsed.proposedChange.payload.workout);
        renderWorkoutTracker();
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

    // Modal controls
    const modal = document.getElementById('add-workout-modal');
    document.getElementById('btn-open-workout-modal')?.addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('btn-close-workout-modal')?.addEventListener('click', () => modal.classList.remove('active'));

    document.getElementById('btn-save-workout')?.addEventListener('click', async () => {
      const type = document.getElementById('workout-type-input').value;
      const duration = parseInt(document.getElementById('workout-duration-input').value) || 30;

      // Calculate MET burn
      let met = 5.0;
      if (type.includes('Chạy')) met = 8.0;
      else if (type.includes('Cardio')) met = 7.5;
      else if (type.includes('Gym')) met = 5.5;
      else if (type.includes('Bơi')) met = 6.8;
      else if (type.includes('Đi Bộ')) met = 3.8;

      const caloriesBurned = Math.round((duration / 60) * met * profile.currentWeight);

      await DataService.addWorkoutLog(todayLog.date, { type, duration, intensity: 'Moderate', caloriesBurned });
      modal.classList.remove('active');
      renderWorkoutTracker();
    });
  }
}
