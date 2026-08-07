import confetti from 'canvas-confetti';
import { DataService, generate7DayMealPlan, generate7DayWorkoutRoutine, getMealRecipeDetails } from '../services/dataService.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import { Modal } from './ui/Modal.js';
import { renderGeminiIcon, renderSunIcon, renderSunsetIcon, renderMoonIcon, renderAppleIcon, renderFlameIcon, renderCalendarIcon } from './ui/Icons.js';

let selectedDateStr = new Date().toISOString().split('T')[0];
let activeWorkoutTypeSelection = null;

export async function renderPlanPage(onNavigateTab, onOpenAiCoach) {
  // Cleanup any old teleported modals from DOM to prevent duplicate ID conflicts
  ['recipe-details-modal', 'workout-guide-modal'].forEach(id => {
    document.querySelectorAll('#' + id).forEach(el => el.remove());
  });

  const profile = await DataService.getUserProfile();
  const goal = await DataService.getUserGoal();
  const plan = await DataService.getUserPlan();

  let currentWorkoutType = activeWorkoutTypeSelection || plan.workoutType || 'home';
  let currentHomeEquipment = plan.homeEquipment || 'Thảm yoga, Dây kháng lực, Tạ đơn 5kg';

  // Ensure weeklyMealPlan has entries
  if (!plan.weeklyMealPlan || Object.keys(plan.weeklyMealPlan).length === 0) {
    plan.weeklyMealPlan = generate7DayMealPlan(plan.dailyBudgetVnd || 100000, DataService.getTodayString());
    plan.weeklyWorkoutRoutine = generate7DayWorkoutRoutine(currentWorkoutType, currentHomeEquipment);
    await DataService.saveUserPlan(plan);
  }

  const dateKeys = Object.keys(plan.weeklyMealPlan).sort();
  if (!dateKeys.includes(selectedDateStr)) {
    selectedDateStr = dateKeys[0] || DataService.getTodayString();
  }

  const activeDayMealPlan = plan.weeklyMealPlan[selectedDateStr] || plan.weeklyMealPlan[dateKeys[0]];

  const totalMealCost = (activeDayMealPlan?.breakfast?.costVnd || 0) +
                        (activeDayMealPlan?.lunch?.costVnd || 0) +
                        (activeDayMealPlan?.dinner?.costVnd || 0) +
                        (activeDayMealPlan?.snack?.costVnd || 0);

  const totalMealCalories = (activeDayMealPlan?.breakfast?.calories || 0) +
                            (activeDayMealPlan?.lunch?.calories || 0) +
                            (activeDayMealPlan?.dinner?.calories || 0) +
                            (activeDayMealPlan?.snack?.calories || 0);

  const workoutOptions = [
    { value: 'home', label: 'Tập Tại Nhà (Dụng cụ đơn giản / Bodyweight)' },
    { value: 'gym', label: 'Tập Tại Phòng Gym (Đầy đủ máy tạ)' },
    { value: 'outdoor', label: 'Tập Outdoor / Chạy Bộ & Công Viên' }
  ];

  const html = `
    <div style="display: flex; flex-direction: column; gap: 1.75rem;">
      
      <!-- Hero AI Plan Generator Banner -->
      <div class="card" style="background: linear-gradient(135deg, rgba(245, 241, 255, 0.95), rgba(251, 250, 255, 0.95)); border: 1px solid var(--border-highlight);">
        <div class="card-header">
          <div>
            <h2 style="display: flex; align-items: center; gap: 0.6rem;">
              ${renderGeminiIcon({ width: 22, height: 22, strokeWidth: 1.8, color: 'var(--accent-purple)' })} Kế Hoạch 7 Ngày Theo Ngân Sách & Lịch Tập
            </h2>
            <p class="text-sm text-muted" style="margin-top: 0.25rem;">
              AI Coach lập thực đơn 7 ngày theo ngân sách (${(plan.dailyBudgetVnd || 100000).toLocaleString('vi-VN')} VNĐ/ngày) & lịch tập bài bản.
            </p>
          </div>
          <button class="btn btn-ai" id="btn-recalculate-plan">
            <i data-lucide="wand-2"></i> Lập Kế Hoạch Mới
          </button>
        </div>

        <!-- Budget & Custom Dropdown & Home Equipment Controls -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem; background: var(--bg-card); padding: 1.1rem; border-radius: 18px; border: 1px solid var(--border-color);">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Ngân Sách Ăn Uống (VNĐ / Ngày)</label>
            <input type="number" class="form-input" id="plan-budget-input" value="${plan.dailyBudgetVnd || 100000}" step="10000">
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Địa Điểm Tập Luyện</label>
            <div id="plan-workout-dropdown-container">
              ${renderDropdown({
                id: 'plan-workout-dropdown',
                options: workoutOptions,
                value: currentWorkoutType,
                placeholder: 'Chọn địa điểm tập...'
              })}
            </div>
          </div>

          <!-- Dynamic Home Equipment Input Field -->
          <div class="form-group" id="home-equipment-container" style="margin-bottom: 0; display: ${currentWorkoutType === 'home' ? 'flex' : 'none'};">
            <label class="form-label">Dụng Cụ Tập Có Sẵn Tại Nhà 🏋️‍♂️</label>
            <input type="text" class="form-input" id="plan-home-equipment-input" value="${currentHomeEquipment}" placeholder="Ví dụ: Thảm yoga, Dây kháng lực, Tạ đơn 5kg...">
          </div>

          <div style="display: flex; align-items: flex-end;">
            <button class="btn btn-primary" style="width: 100%; height: 42px;" id="btn-save-plan-controls">
              <i data-lucide="check"></i> Cập Nhật Lộ Trình 7 Ngày
            </button>
          </div>
        </div>
      </div>

      <!-- Plan Section 1: 7-Day Meal Plan Box with Date Nav -->
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: 1rem;">
          <div>
            <div class="card-title"><i data-lucide="utensils" class="text-purple"></i> Thực Đơn Bữa Ăn 7 Ngày Theo Ngân Sách</div>
            <div class="text-xs text-muted" style="margin-top: 0.2rem;">Chi phí ngày này: <b style="color: var(--accent-purple);">${totalMealCost.toLocaleString('vi-VN')} VNĐ</b> | Calo: <b>${totalMealCalories} kcal</b></div>
          </div>

          <!-- Date Navigation Bar (< prev | Date | next >) -->
          <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-subtle); padding: 0.4rem 0.8rem; border-radius: var(--radius-full); border: 1px solid var(--border-highlight);">
            <button class="btn btn-secondary btn-icon btn-sm" id="btn-plan-date-prev" title="Ngày trước đó" style="width: 32px; height: 32px;">
              <i data-lucide="chevron-left"></i>
            </button>
            <span style="font-weight: 800; font-size: 0.9rem; color: var(--accent-purple); min-width: 180px; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;">
              ${renderCalendarIcon()} ${activeDayMealPlan?.formattedDate || selectedDateStr}
            </span>
            <button class="btn btn-secondary btn-icon btn-sm" id="btn-plan-date-next" title="Ngày tiếp theo" style="width: 32px; height: 32px;">
              <i data-lucide="chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- 4 Meals Grid for Active Date -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
          ${renderMealPlanCard('breakfast', 'Bữa Sáng', activeDayMealPlan?.breakfast, renderSunIcon())}
          ${renderMealPlanCard('lunch', 'Bữa Trưa', activeDayMealPlan?.lunch, renderSunsetIcon())}
          ${renderMealPlanCard('dinner', 'Bữa Tối', activeDayMealPlan?.dinner, renderMoonIcon())}
          ${renderMealPlanCard('snack', 'Bữa Phụ', activeDayMealPlan?.snack, renderAppleIcon())}
        </div>

        <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary btn-sm" id="btn-apply-meals-to-today">
            <i data-lucide="plus-circle"></i> Ghi Nhận Thực Đơn Ngày Này Vào Nhật Ký
          </button>
        </div>
      </div>

      <!-- Plan Section 2: Weekly Workout Routine with Video & Text Guide Modal -->
      <div class="schedule-card">
        <div class="schedule-header">
          <div class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6.5 6.5h11"/>
              <path d="M6.5 17.5h11"/>
              <path d="M4 12h16"/>
              <circle cx="8" cy="6.5" r="2.2"/>
              <circle cx="16" cy="17.5" r="2.2"/>
            </svg>
          </div>
          <h2>Lịch Tập Luyện Cá Nhân Hóa 7 Ngày Trong Tuần (${currentWorkoutType === 'home' ? 'Tập Tại Nhà' : currentWorkoutType === 'gym' ? 'Phòng Gym' : 'Outdoor'})</h2>
        </div>

        <div class="days-grid">
          ${(plan.weeklyWorkoutRoutine || []).map((w, idx) => {
            const isRest = w.type === 'Rest' || w.duration === 0;
            return `
              <div class="day-card ${isRest ? 'rest' : ''}">
                <div class="day-top">
                  <span class="day-name">${w.day}</span>
                  <span class="day-duration">${w.duration} phút</span>
                </div>
                <div class="day-title">${w.title}</div>
                <div class="day-footer">
                  <span class="day-kcal"><span>Đốt:</span> ~${w.estBurn} kcal</span>
                  ${w.duration > 0 ? `
                    <button class="btn-train" data-open-workout-guide="${idx}">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      Tập Bài Này
                    </button>
                  ` : `
                    <span class="btn-rest">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a7 7 0 017 7c0 2.5-1.2 4.7-3 6.1V18a1 1 0 01-1 1h-6a1 1 0 01-1-1v-2.9A7.01 7.01 0 015 9a7 7 0 017-7z"/>
                      </svg>
                      Phục hồi
                    </span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Modal Hướng Dẫn Bài Tập Cụ Thể (Text Guide + Video YouTube) -->
    <div class="modal-overlay" id="workout-guide-modal">
      <div class="modal-card" style="max-width: 680px;">
        <div class="card-header">
          <h3 id="wg-modal-title">Hướng Dẫn Bài Tập</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-wg-modal"><i data-lucide="x"></i></button>
        </div>

        <!-- Embedded YouTube Video Container -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.5rem;">
          <span style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); display: inline-flex; align-items: center; gap: 0.45rem;">
            <i data-lucide="play-circle" style="width: 18px; height: 18px; color: var(--accent-purple);"></i> Video Hướng Dẫn Động Tác:
          </span>
          <a id="wg-youtube-search-btn" href="#" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; gap: 0.35rem; padding: 0.35rem 0.75rem; text-decoration: none;">
            <i data-lucide="external-link" style="width: 14px; height: 14px;"></i> Mở Xem Trên YouTube ↗
          </a>
        </div>
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: var(--radius-control); background: #000; margin-bottom: 0.4rem;">
          <iframe id="wg-modal-iframe" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
        <div class="text-xs text-muted" style="margin-bottom: 1.1rem; font-style: italic;">
          💡 Bấm <b>"Mở Xem Trên YouTube ↗"</b> để xem fullHD trực tiếp trên app/web YouTube.
        </div>

        <!-- Text Instructions -->
        <div style="background: var(--bg-subtle); padding: 1.1rem; border-radius: 16px; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
          <h4 style="color: var(--accent-purple); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="file-text" style="width: 18px; height: 18px;"></i> Nội Dung Hướng Dẫn Thực Hiện:
          </h4>
          <div id="wg-modal-instructions" style="font-size: 0.9rem; line-height: 1.6; white-space: pre-line; color: var(--text-main);"></div>
        </div>

        <button class="btn btn-primary" style="width: 100%;" id="btn-start-confirm-workout">
          <i data-lucide="check-circle-2"></i> Bắt Đầu Tập & Ghi Nhận Đã Tập Vào Nhật Ký
        </button>
      </div>
    </div>

    <!-- Modal Chi Tiết Thực Đơn & Công Thức Chế Biến (Nguyên liệu, Giá & Video Người Việt) -->
    <div class="modal-overlay" id="recipe-details-modal">
      <div class="modal-card" style="max-width: 680px; max-height: calc(100vh - 4rem); overflow-y: auto; margin: auto;">
        <div class="card-header">
          <div>
            <span class="badge badge-secondary" id="rd-modal-type-badge" style="margin-bottom: 0.25rem;">Bữa Ăn</span>
            <h3 id="rd-modal-title" style="color: var(--accent-purple); font-size: 1.2rem;">Tên Món Ăn</h3>
          </div>
          <button class="btn btn-secondary btn-icon" id="btn-close-rd-modal"><i data-lucide="x"></i></button>
        </div>

        <!-- Khối 1: Nguyên liệu cần mua & Giá ước tính -->
        <div class="ingredients-card">
          <div class="ing-header">
            <div class="ing-title">
              <div class="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
              </div>
              <h2>Nguyên Liệu Cần Mua & Giá Ước Tính</h2>
            </div>
            <div class="ing-total" id="rd-modal-total-cost">0 VNĐ</div>
          </div>
          <div id="rd-modal-ingredients-container"></div>
        </div>

        <!-- Khối 2: Hướng dẫn cách làm / Chế biến -->
        <div class="recipe-card">
          <div class="recipe-header">
            <div class="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 13.87A4 4 0 017.41 6a5.11 5.11 0 011.05-1.54 5 5 0 017.08 0A5.11 5.11 0 0116.59 6 4 4 0 0118 13.87V21H6z"/>
                <line x1="6" y1="17" x2="18" y2="17"/>
              </svg>
            </div>
            <h2>Hướng Dẫn Cách Làm / Chế Biến</h2>
          </div>
          <div id="rd-modal-instructions-container"></div>
        </div>

        <!-- Khối 3: Video Hướng Dẫn Chế Biến -->
        <div id="rd-modal-video-section" style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.5rem;">
            <h4 style="color: var(--text-main); font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 0.45rem; margin: 0;">
              <i data-lucide="video" style="width: 18px; height: 18px; color: #ef4444;"></i> Video Hướng Dẫn Chế Biến:
            </h4>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              <a id="rd-tiktok-search-btn" href="#" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; gap: 0.4rem; padding: 0.35rem 0.75rem; text-decoration: none; display: inline-flex; align-items: center; background: rgba(0,0,0,0.06);">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px; display: inline-block;"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M8.45095 19.7926C8.60723 18.4987 9.1379 17.7743 10.1379 17.0317C11.5688 16.0259 13.3561 16.5948 13.3561 16.5948V13.2197C13.7907 13.2085 14.2254 13.2343 14.6551 13.2966V17.6401C14.6551 17.6401 12.8683 17.0712 11.4375 18.0775C10.438 18.8196 9.90623 19.5446 9.7505 20.8385C9.74562 21.5411 9.87747 22.4595 10.4847 23.2536C10.3345 23.1766 10.1815 23.0889 10.0256 22.9905C8.68807 22.0923 8.44444 20.7449 8.45095 19.7926ZM22.0352 6.97898C21.0509 5.90039 20.6786 4.81139 20.5441 4.04639H21.7823C21.7823 4.04639 21.5354 6.05224 23.3347 8.02482L23.3597 8.05134C22.8747 7.7463 22.43 7.38624 22.0352 6.97898ZM28 10.0369V14.293C28 14.293 26.42 14.2312 25.2507 13.9337C23.6179 13.5176 22.5685 12.8795 22.5685 12.8795C22.5685 12.8795 21.8436 12.4245 21.785 12.3928V21.1817C21.785 21.6711 21.651 22.8932 21.2424 23.9125C20.709 25.246 19.8859 26.1212 19.7345 26.3001C19.7345 26.3001 18.7334 27.4832 16.9672 28.28C15.3752 28.9987 13.9774 28.9805 13.5596 28.9987C13.5596 28.9987 11.1434 29.0944 8.96915 27.6814C8.49898 27.3699 8.06011 27.0172 7.6582 26.6277L7.66906 26.6355C9.84383 28.0485 12.2595 27.9528 12.2595 27.9528C12.6779 27.9346 14.0756 27.9528 15.6671 27.2341C17.4317 26.4374 18.4344 25.2543 18.4344 25.2543C18.5842 25.0754 19.4111 24.2001 19.9423 22.8662C20.3498 21.8474 20.4849 20.6247 20.4849 20.1354V11.3475C20.5435 11.3797 21.2679 11.8347 21.2679 11.8347C21.2679 11.8347 22.3179 12.4734 23.9506 12.8889C25.1204 13.1864 26.7 13.2483 26.7 13.2483V9.91314C27.2404 10.0343 27.7011 10.0671 28 10.0369Z" fill="#EE1D52"></path> <path d="M26.7009 9.91314V13.2472C26.7009 13.2472 25.1213 13.1853 23.9515 12.8879C22.3188 12.4718 21.2688 11.8337 21.2688 11.8337C21.2688 11.8337 20.5444 11.3787 20.4858 11.3464V20.1364C20.4858 20.6258 20.3518 21.8484 19.9432 22.8672C19.4098 24.2012 18.5867 25.0764 18.4353 25.2553C18.4353 25.2553 17.4337 26.4384 15.668 27.2352C14.0765 27.9539 12.6788 27.9357 12.2604 27.9539C12.2604 27.9539 9.84473 28.0496 7.66995 26.6366L7.6591 26.6288C7.42949 26.4064 7.21336 26.1717 7.01177 25.9257C6.31777 25.0795 5.89237 24.0789 5.78547 23.7934C5.78529 23.7922 5.78529 23.791 5.78547 23.7898C5.61347 23.2937 5.25209 22.1022 5.30147 20.9482C5.38883 18.9122 6.10507 17.6625 6.29444 17.3494C6.79597 16.4957 7.44828 15.7318 8.22233 15.0919C8.90538 14.5396 9.6796 14.1002 10.5132 13.7917C11.4144 13.4295 12.3794 13.2353 13.3565 13.2197V16.5948C13.3565 16.5948 11.5691 16.028 10.1388 17.0317C9.13879 17.7743 8.60812 18.4987 8.45185 19.7926C8.44534 20.7449 8.68897 22.0923 10.0254 22.991C10.1813 23.0898 10.3343 23.1775 10.4845 23.2541C10.7179 23.5576 11.0021 23.8221 11.3255 24.0368C12.631 24.8632 13.7249 24.9209 15.1238 24.3842C16.0565 24.0254 16.7586 23.2167 17.0842 22.3206C17.2888 21.7611 17.2861 21.1978 17.2861 20.6154V4.04639H20.5417C20.6763 4.81139 21.0485 5.90039 22.0328 6.97898C22.4276 7.38624 22.8724 7.7463 23.3573 8.05134C23.5006 8.19955 24.2331 8.93231 25.1734 9.38216C25.6596 9.61469 26.1722 9.79285 26.7009 9.91314Z" fill="#000000"></path> <path d="M4.48926 22.7568V22.7594L4.57004 22.9784C4.56076 22.9529 4.53074 22.8754 4.48926 22.7568Z" fill="#69C9D0"></path> <path d="M10.5128 13.7916C9.67919 14.1002 8.90498 14.5396 8.22192 15.0918C7.44763 15.7332 6.79548 16.4987 6.29458 17.354C6.10521 17.6661 5.38897 18.9168 5.30161 20.9528C5.25223 22.1068 5.61361 23.2983 5.78561 23.7944C5.78543 23.7956 5.78543 23.7968 5.78561 23.798C5.89413 24.081 6.31791 25.0815 7.01191 25.9303C7.2135 26.1763 7.42963 26.4111 7.65924 26.6334C6.92357 26.1457 6.26746 25.5562 5.71236 24.8839C5.02433 24.0451 4.60001 23.0549 4.48932 22.7626C4.48919 22.7605 4.48919 22.7584 4.48932 22.7564V22.7527C4.31677 22.2571 3.95431 21.0651 4.00477 19.9096C4.09213 17.8736 4.80838 16.6239 4.99775 16.3108C5.4985 15.4553 6.15067 14.6898 6.92509 14.0486C7.608 13.4961 8.38225 13.0567 9.21598 12.7484C9.73602 12.5416 10.2778 12.3891 10.8319 12.2934C11.6669 12.1537 12.5198 12.1415 13.3588 12.2575V13.2196C12.3808 13.2349 11.4148 13.4291 10.5128 13.7916Z" fill="#69C9D0"></path> <path d="M20.5438 4.04635H17.2881V20.6159C17.2881 21.1983 17.2881 21.76 17.0863 22.3211C16.7575 23.2167 16.058 24.0253 15.1258 24.3842C13.7265 24.923 12.6326 24.8632 11.3276 24.0368C11.0036 23.823 10.7187 23.5594 10.4844 23.2567C11.5962 23.8251 12.5913 23.8152 13.8241 23.341C14.7558 22.9821 15.4563 22.1734 15.784 21.2774C15.9891 20.7178 15.9864 20.1546 15.9864 19.5726V3H20.4819C20.4819 3 20.4315 3.41188 20.5438 4.04635ZM26.7002 8.99104V9.9131C26.1725 9.79263 25.6609 9.61447 25.1755 9.38213C24.2352 8.93228 23.5026 8.19952 23.3594 8.0513C23.5256 8.1559 23.6981 8.25106 23.8759 8.33629C25.0192 8.88339 26.1451 9.04669 26.7002 8.99104Z" fill="#69C9D0"></path> </g></svg>
                TikTok ↗
              </a>
              <a id="rd-youtube-search-btn" href="#" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; gap: 0.4rem; padding: 0.35rem 0.75rem; text-decoration: none; display: inline-flex; align-items: center;">
                <svg viewBox="0 -7 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#000000" style="width: 16px; height: 16px; display: inline-block;"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>Youtube-color</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Icons" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Color-" transform="translate(-200.000000, -368.000000)" fill="#CE1312"> <path d="M219.044,391.269916 L219.0425,377.687742 L232.0115,384.502244 L219.044,391.269916 Z M247.52,375.334163 C247.52,375.334163 247.0505,372.003199 245.612,370.536366 C243.7865,368.610299 241.7405,368.601235 240.803,368.489448 C234.086,368 224.0105,368 224.0105,368 L223.9895,368 C223.9895,368 213.914,368 207.197,368.489448 C206.258,368.601235 204.2135,368.610299 202.3865,370.536366 C200.948,372.003199 200.48,375.334163 200.48,375.334163 C200.48,375.334163 200,379.246723 200,383.157773 L200,386.82561 C200,390.73817 200.48,394.64922 200.48,394.64922 C200.48,394.64922 200.948,397.980184 202.3865,399.447016 C204.2135,401.373084 206.612,401.312658 207.68,401.513574 C211.52,401.885191 224,402 224,402 C224,402 234.086,401.984894 240.803,401.495446 C241.7405,401.382148 243.7865,401.373084 245.612,399.447016 C247.0505,397.980184 247.52,394.64922 247.52,394.64922 C247.52,394.64922 248,390.73817 248,386.82561 L248,383.157773 C248,379.246723 247.52,375.334163 247.52,375.334163 L247.52,375.334163 Z" id="Youtube"> </path> </g> </g> </g></svg>
                YouTube ↗
              </a>
            </div>
          </div>
          <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 16px; background: #000; border: 1px solid var(--border-color);">
            <iframe id="rd-modal-iframe" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary" style="flex: 1;" id="btn-close-rd-modal-bottom">Đóng</button>
          <button class="btn btn-primary" style="flex: 1.5;" id="btn-apply-single-meal-to-today">
            <i data-lucide="plus-circle"></i> Ghi Nhận Món Này Vào Nhật Ký
          </button>
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;

    // Teleport modals to document.body so they cover the navbar 100% edge-to-edge
    ['recipe-details-modal', 'workout-guide-modal'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentNode !== document.body) {
        document.body.appendChild(el);
      }
    });

    if (window.lucide) window.lucide.createIcons();

    // Initialize custom dropdown component & toggle Home Equipment Input
    initDropdownListeners(mountNode, (selectedVal, dropdownId) => {
      if (dropdownId === 'plan-workout-dropdown' || !dropdownId) {
        currentWorkoutType = selectedVal;
        const equipContainer = document.getElementById('home-equipment-container');
        if (equipContainer) {
          equipContainer.style.display = (selectedVal === 'home') ? 'flex' : 'none';
        }
      }
    });

    // Date Navigation Controls (< prev | date | next >)
    document.getElementById('btn-plan-date-prev')?.addEventListener('click', () => {
      const idx = dateKeys.indexOf(selectedDateStr);
      if (idx > 0) {
        selectedDateStr = dateKeys[idx - 1];
        renderPlanPage(onNavigateTab, onOpenAiCoach);
      }
    });

    document.getElementById('btn-plan-date-next')?.addEventListener('click', () => {
      const idx = dateKeys.indexOf(selectedDateStr);
      if (idx < dateKeys.length - 1) {
        selectedDateStr = dateKeys[idx + 1];
        renderPlanPage(onNavigateTab, onOpenAiCoach);
      }
    });

    // Save Controls & Regenerate 7-Day Meal Plan & Workout Routine
    document.getElementById('btn-save-plan-controls')?.addEventListener('click', async () => {
      const budget = parseInt(document.getElementById('plan-budget-input').value) || 100000;
      const homeEquipInput = document.getElementById('plan-home-equipment-input');
      const homeEquipVal = homeEquipInput ? homeEquipInput.value.trim() : currentHomeEquipment;

      const chosenWorkoutType = activeWorkoutTypeSelection || currentWorkoutType || 'home';

      plan.dailyBudgetVnd = budget;
      plan.workoutType = chosenWorkoutType;
      plan.homeEquipment = homeEquipVal;
      plan.weeklyMealPlan = generate7DayMealPlan(budget, DataService.getTodayString());
      plan.weeklyWorkoutRoutine = generate7DayWorkoutRoutine(chosenWorkoutType, homeEquipVal);

      await DataService.saveUserPlan(plan);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });

      const locationName = chosenWorkoutType === 'gym' ? 'Phòng Gym' : chosenWorkoutType === 'outdoor' ? 'Outdoor / Công Viên' : 'Tập Tại Nhà';
      await Modal.success({
        title: 'Cập Nhật Lộ Trình Thành Công!',
        message: `Đã đổi địa điểm tập sang: ${locationName}\nAI Coach đã thiết kế lại 7 bài tập mới phù hợp!`
      });

      renderPlanPage(onNavigateTab, onOpenAiCoach);
    });

    document.getElementById('btn-recalculate-plan')?.addEventListener('click', onOpenAiCoach);

    // Apply active date meal plan to today's log
    document.getElementById('btn-apply-meals-to-today')?.addEventListener('click', async () => {
      const today = DataService.getTodayString();
      if (activeDayMealPlan?.breakfast) await DataService.addMealLog(today, { type: 'Breakfast', ...activeDayMealPlan.breakfast });
      if (activeDayMealPlan?.lunch) await DataService.addMealLog(today, { type: 'Lunch', ...activeDayMealPlan.lunch });
      if (activeDayMealPlan?.dinner) await DataService.addMealLog(today, { type: 'Dinner', ...activeDayMealPlan.dinner });
      if (activeDayMealPlan?.snack) await DataService.addMealLog(today, { type: 'Snack', ...activeDayMealPlan.snack });

      confetti({ particleCount: 70, spread: 90, origin: { y: 0.5 } });
      await Modal.success({
        title: 'Đã Thêm Vào Nhật Ký!',
        message: `Đã ghi nhận thực đơn ${activeDayMealPlan?.dayName} (${activeDayMealPlan?.date}) vào nhật ký hôm nay!`
      });
      onNavigateTab('meals');
    });

    // Workout Video & Text Guide Modal Handler
    const wgModal = document.getElementById('workout-guide-modal');
    let activeWorkoutItem = null;

    document.querySelectorAll('[data-open-workout-guide]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-open-workout-guide'));
        activeWorkoutItem = plan.weeklyWorkoutRoutine[idx];
        if (!activeWorkoutItem) return;

        document.getElementById('wg-modal-title').innerText = `Hướng Dẫn: ${activeWorkoutItem.title}`;
        document.getElementById('wg-modal-iframe').src = activeWorkoutItem.youtubeUrl || "https://www.youtube.com/embed/gC_L9qAHVJ8";
        document.getElementById('wg-modal-instructions').innerText = activeWorkoutItem.instructions || "Thực hiện đúng form động tác, khởi động kỹ trước khi tập.";

        const wgYtBtn = document.getElementById('wg-youtube-search-btn');
        if (wgYtBtn) {
          wgYtBtn.href = `https://www.youtube.com/results?search_query=${encodeURIComponent('Hướng dẫn bài tập ' + activeWorkoutItem.title + ' tiếng Việt')}`;
        }

        wgModal.classList.add('active');
      });
    });

    document.getElementById('btn-close-wg-modal')?.addEventListener('click', () => {
      document.getElementById('wg-modal-iframe').src = '';
      wgModal.classList.remove('active');
    });

    document.getElementById('btn-start-confirm-workout')?.addEventListener('click', async () => {
      if (activeWorkoutItem) {
        await DataService.addWorkoutLog(DataService.getTodayString(), {
          type: activeWorkoutItem.title,
          duration: activeWorkoutItem.duration || 30,
          intensity: 'Moderate',
          caloriesBurned: activeWorkoutItem.estBurn || 250
        });
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
        document.getElementById('wg-modal-iframe').src = '';
        wgModal.classList.remove('active');
        await Modal.success({
          title: 'Hoàn Thành Bài Tập!',
          message: `Xuất sắc! Đã ghi nhận hoàn thành bài tập "${activeWorkoutItem.title}" vào nhật ký hôm nay!`
        });
        onNavigateTab('workouts');
      }
    });

    // Recipe Details Modal Handler
    const rdModal = document.getElementById('recipe-details-modal');
    let activeRecipeMeal = null;

    document.querySelectorAll('[data-open-recipe-meal]').forEach(card => {
      card.addEventListener('click', () => {
        const mealTypeKey = card.getAttribute('data-open-recipe-meal');
        const rawMeal = activeDayMealPlan ? activeDayMealPlan[mealTypeKey] : null;
        if (!rawMeal) return;

        activeRecipeMeal = getMealRecipeDetails(rawMeal);

        const typeNames = { breakfast: 'Bữa Sáng', lunch: 'Bữa Trưa', dinner: 'Bữa Tối', snack: 'Bữa Phụ' };
        document.getElementById('rd-modal-type-badge').innerText = typeNames[mealTypeKey] || 'Bữa Ăn';
        document.getElementById('rd-modal-title').innerText = activeRecipeMeal.name;
        document.getElementById('rd-modal-total-cost').innerText = `${(activeRecipeMeal.costVnd || 0).toLocaleString('vi-VN')} VNĐ`;

        // Set dynamic YouTube & TikTok direct links
        const rdYtBtn = document.getElementById('rd-youtube-search-btn');
        if (rdYtBtn) {
          rdYtBtn.href = `https://www.youtube.com/results?search_query=${encodeURIComponent('Cách làm ' + activeRecipeMeal.name + ' người Việt hướng dẫn')}`;
        }
        const rdTiktokBtn = document.getElementById('rd-tiktok-search-btn');
        if (rdTiktokBtn) {
          rdTiktokBtn.href = `https://www.tiktok.com/search?q=${encodeURIComponent('cách nấu ' + activeRecipeMeal.name)}`;
        }

function formatIngredientAmount(amount) {
  if (!amount) return '';
  let str = amount.trim();
  if (str.startsWith('(') && str.endsWith(')')) {
    str = str.substring(1, str.length - 1).trim();
  }
  // Replace inner parentheses with dash: "1 lát (40g)" -> "1 lát - 40g"
  str = str.replace(/\s*\(([^)]+)\)/g, ' - $1');
  str = str.replace(/\s*-\s*/g, ' - ');
  return str;
}

        // Render Ingredients & Prices
        const ingContainer = document.getElementById('rd-modal-ingredients-container');
        if (ingContainer) {
          if (activeRecipeMeal.ingredients && activeRecipeMeal.ingredients.length > 0) {
            ingContainer.innerHTML = `
              <div class="ing-list">
                ${activeRecipeMeal.ingredients.map(ing => `
                  <div class="ing-item">
                    <div class="ing-name">${ing.name} <span class="qty">(${formatIngredientAmount(ing.amount)})</span></div>
                    <div class="ing-price">${(ing.estPriceVnd || 0).toLocaleString('vi-VN')} VNĐ</div>
                  </div>
                `).join('')}
              </div>
            `;
          } else {
            ingContainer.innerHTML = `
              <div class="ing-list">
                <div class="ing-item">
                  <div class="ing-name">Khẩu phần thực phẩm sẵn dùng <span class="qty">(Mở hộp hoặc rửa sạch)</span></div>
                  <div class="ing-price">0 VNĐ</div>
                </div>
              </div>
            `;
          }
        }

        // Render Instructions & Video
        const instContainer = document.getElementById('rd-modal-instructions-container');
        const videoSection = document.getElementById('rd-modal-video-section');

        if (instContainer) {
          if (activeRecipeMeal.isDirectEat) {
            instContainer.innerHTML = `
              <div style="background: rgba(117, 86, 217, 0.12); padding: 0.85rem 1rem; border-radius: 12px; border: 1px solid rgba(117, 86, 217, 0.25); color: var(--accent-purple); font-weight: 700; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="apple" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
                Món ăn dùng trực tiếp — Không cần chế biến đứng bếp (Rửa sạch hoặc mở hộp dùng ngay).
              </div>
            `;
            if (videoSection) videoSection.style.display = 'none';
          } else {
            if (videoSection) videoSection.style.display = 'block';
            if (activeRecipeMeal.instructions && activeRecipeMeal.instructions.length > 0) {
              instContainer.innerHTML = `
                <div class="steps">
                  ${activeRecipeMeal.instructions.map((stepText, idx) => `
                    <div class="step">
                      <div class="step-num">${idx + 1}</div>
                      <div class="step-text">${stepText.replace(/^(Bước\s*\d+|Step\s*\d+|\d+)[\.\:\s]*/i, '')}</div>
                    </div>
                  `).join('')}
                </div>
              `;
            } else {
              instContainer.innerHTML = `
                <div class="steps">
                  <div class="step">
                    <div class="step-num">1</div>
                    <div class="step-text">Chế biến theo khẩu vị gia đình, nêm vừa ăn và ưu tiên luộc/hấp hoặc áp chảo ít dầu.</div>
                  </div>
                </div>
              `;
            }

            // Set verified direct embeddable video URL
            const iframe = document.getElementById('rd-modal-iframe');
            if (iframe) {
              iframe.src = activeRecipeMeal.youtubeEmbedUrl || 'https://www.youtube.com/embed/gq3zY7y25n0';
            }
          }
        }

        if (window.lucide) window.lucide.createIcons({ el: rdModal });
        rdModal.classList.add('active');
      });
    });

    const closeRdModal = () => {
      const iframe = document.getElementById('rd-modal-iframe');
      if (iframe) iframe.src = '';
      rdModal?.classList.remove('active');
    };

    document.getElementById('btn-close-rd-modal')?.addEventListener('click', closeRdModal);
    document.getElementById('btn-close-rd-modal-bottom')?.addEventListener('click', closeRdModal);

    // Apply single meal to today
    document.getElementById('btn-apply-single-meal-to-today')?.addEventListener('click', async () => {
      if (activeRecipeMeal) {
        await DataService.addMealLog(DataService.getTodayString(), activeRecipeMeal);
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
        closeRdModal();
        await Modal.success({
          title: 'Đã Thêm Vào Nhật Ký!',
          message: `Đã ghi nhận món "${activeRecipeMeal.name}" vào nhật ký ăn uống hôm nay!`
        });
        onNavigateTab('meals');
      }
    });
  }
}

function renderMealPlanCard(typeKey, title, meal, iconSvg = '') {
  if (!meal) return '';
  return `
    <div class="card meal-plan-interactive-card" data-open-recipe-meal="${typeKey}" style="padding: 1.1rem; background: var(--bg-card); border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s ease;" title="Bấm để xem nguyên liệu, giá ước tính & video hướng dẫn cách làm">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <span style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); display: inline-flex; align-items: center; gap: 0.45rem;">
          ${title} ${iconSvg}
        </span>
        <span class="badge badge-secondary">${(meal.costVnd || 0).toLocaleString('vi-VN')} VNĐ</span>
      </div>
      <div style="font-weight: 800; font-size: 0.95rem; color: var(--accent-purple); margin-bottom: 0.5rem;">${meal.name}</div>
      <div class="text-xs text-muted" style="display: flex; justify-content: space-between; border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
        <span style="display: inline-flex; align-items: center; gap: 0.3rem;">${renderFlameIcon({ width: 14, height: 14 })} <b>${meal.calories} kcal</b></span>
        <span>P:<b>${meal.protein}g</b> | C:<b>${meal.carb}g</b> | F:<b>${meal.fat}g</b></span>
      </div>
    </div>
  `;
}
