import confetti from 'canvas-confetti';
import { DataService, generate7DayMealPlan, generate7DayWorkoutRoutine } from '../services/dataService.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import { Modal } from './ui/Modal.js';
import { renderGeminiIcon, renderSunIcon, renderSunsetIcon, renderMoonIcon, renderAppleIcon, renderFlameIcon, renderCalendarIcon } from './ui/Icons.js';

let selectedDateStr = new Date().toISOString().split('T')[0];
let activeWorkoutTypeSelection = null;

export async function renderPlanPage(onNavigateTab, onOpenAiCoach) {
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
          ${renderMealPlanCard('Bữa Sáng', activeDayMealPlan?.breakfast, renderSunIcon())}
          ${renderMealPlanCard('Bữa Trưa', activeDayMealPlan?.lunch, renderSunsetIcon())}
          ${renderMealPlanCard('Bữa Tối', activeDayMealPlan?.dinner, renderMoonIcon())}
          ${renderMealPlanCard('Bữa Phụ', activeDayMealPlan?.snack, renderAppleIcon())}
        </div>

        <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary btn-sm" id="btn-apply-meals-to-today">
            <i data-lucide="plus-circle"></i> Ghi Nhận Thực Đơn Ngày Này Vào Nhật Ký
          </button>
        </div>
      </div>

      <!-- Plan Section 2: Weekly Workout Routine with Video & Text Guide Modal -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i data-lucide="dumbbell" style="color: var(--accent-amber);"></i> Lịch Tập Luyện Cá Nhân Hóa 7 Ngày Trong Tuần (${currentWorkoutType === 'home' ? 'Tập Tại Nhà' : currentWorkoutType === 'gym' ? 'Phòng Gym' : 'Outdoor'})</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
          ${(plan.weeklyWorkoutRoutine || []).map((w, idx) => `
            <div class="card" style="padding: 1.1rem; background: ${w.type === 'Rest' ? 'var(--bg-subtle)' : 'var(--bg-card)'}; border-color: ${w.type === 'Rest' ? 'var(--border-color)' : 'var(--border-highlight)'};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span class="badge ${w.type === 'Rest' ? 'badge-secondary' : 'badge-primary'}">${w.day}</span>
                <span class="text-xs text-muted"><b>${w.duration} phút</b></span>
              </div>
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-main); margin-bottom: 0.35rem;">${w.title}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.825rem; margin-top: 0.75rem;">
                <span class="text-muted">Đốt ước tính: <b style="color: var(--accent-amber);">~${w.estBurn} kcal</b></span>
                ${w.duration > 0 ? `
                  <button class="btn btn-primary btn-sm" data-open-workout-guide="${idx}">
                    <i data-lucide="play-circle" style="width: 14px; height: 14px;"></i> Tập Bài Này
                  </button>
                ` : '<span class="text-xs text-muted">🌙 Phục hồi</span>'}
              </div>
            </div>
          `).join('')}
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
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: var(--radius-control); background: #000; margin-bottom: 1.25rem;">
          <iframe id="wg-modal-iframe" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
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
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
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
  }
}

function renderMealPlanCard(title, meal, iconSvg = '') {
  if (!meal) return '';
  return `
    <div class="card" style="padding: 1.1rem; background: var(--bg-card); border: 1px solid var(--border-color);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <span style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); display: inline-flex; align-items: center; gap: 0.45rem;">
          ${title} ${iconSvg}
        </span>
        <span class="badge badge-secondary">${(meal.costVnd || 0).toLocaleString('vi-VN')} VNĐ</span>
      </div>
      <div style="font-weight: 700; font-size: 0.9rem; color: var(--accent-purple); margin-bottom: 0.5rem;">${meal.name}</div>
      <div class="text-xs text-muted" style="display: flex; justify-content: space-between; border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
        <span style="display: inline-flex; align-items: center; gap: 0.3rem;">${renderFlameIcon({ width: 14, height: 14 })} <b>${meal.calories} kcal</b></span>
        <span>P:<b>${meal.protein}g</b> | C:<b>${meal.carb}g</b> | F:<b>${meal.fat}g</b></span>
      </div>
    </div>
  `;
}
