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
  let currentJourneyDay = 1;
  if (goal.startDate) {
    const start = new Date(goal.startDate);
    const today = new Date(todayStr);
    currentJourneyDay = Math.max(1, Math.floor((today - start) / 86400000) + 1);
  }

  if (selectedMealJourneyDay === null) {
    selectedMealJourneyDay = Math.min(currentJourneyDay, totalJourneyDays);
  }

  // Clamp selectedMealJourneyDay
  if (selectedMealJourneyDay < 1) selectedMealJourneyDay = 1;
  if (selectedMealJourneyDay > totalJourneyDays) selectedMealJourneyDay = totalJourneyDays;

  // Resolve active date string for selected journey day
  let activeDateStr = todayStr;
  if (goal.startDate) {
    const d = new Date(goal.startDate);
    d.setDate(d.getDate() + (selectedMealJourneyDay - 1));
    activeDateStr = d.toISOString().split('T')[0];
  }

  const todayLog = await DataService.getDailyLog(activeDateStr);
  const dailyBudget = plan.dailyBudgetVnd || 100000;

  const caloriesIn = todayLog.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = todayLog.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarb = todayLog.meals.reduce((sum, m) => sum + (m.carb || 0), 0);
  const totalFat = todayLog.meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  const calTarget = goal.dailyCalorieTarget || 2000;
  const pTarget = goal.macroTarget?.protein || 120;
  const cTarget = goal.macroTarget?.carb || 160;
  const fTarget = goal.macroTarget?.fat || 50;

  const mealsByCategory = {
    Breakfast: todayLog.meals.filter(m => m.type === 'Breakfast'),
    Lunch: todayLog.meals.filter(m => m.type === 'Lunch'),
    Dinner: todayLog.meals.filter(m => m.type === 'Dinner'),
    Snack: todayLog.meals.filter(m => m.type === 'Snack')
  };

  const html = `
    <div style="display: flex; flex-direction: column; gap: 1.75rem;">
      <!-- Header Banner & AI Natural Language Prompt Box -->
      <div class="card" style="background: linear-gradient(135deg, rgba(245, 241, 255, 0.9), rgba(251, 250, 255, 0.9)); border: 1px solid var(--border-highlight);">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h2 style="display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="utensils" class="text-purple"></i> Theo Dõi Bữa Ăn & Dinh Dưỡng</h2>
            <p class="text-sm text-muted" style="margin-top: 0.25rem;">
              Ngân sách ăn uống: <b style="color: var(--accent-purple);">${dailyBudget.toLocaleString('vi-VN')} VNĐ/ngày</b> | Nhập thủ công hoặc gõ mô tả tự nhiên để AI tự phân tích calo & macro!
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <!-- Day Switcher Navigation Widget (Capsule Pill Style) -->
            <div class="day-nav">
              <button class="btn-nav" id="btn-meal-day-prev" ${selectedMealJourneyDay <= 1 ? 'disabled' : ''} title="Ngày trước">
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
                Ngày ${selectedMealJourneyDay}/${totalJourneyDays}
              </div>

              <button class="btn-nav" id="btn-meal-day-next" ${selectedMealJourneyDay >= totalJourneyDays ? 'disabled' : ''} title="Ngày sau">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            <button class="btn btn-primary" id="btn-open-add-meal-modal">
              <i data-lucide="plus"></i> Thêm Món Ăn Mới
            </button>
          </div>
        </div>

        <!-- Quick AI Food Parser Bar -->
        <div style="margin-top: 1rem; display: flex; gap: 0.6rem;">
          <input type="text" class="form-input" id="quick-food-nlp-input" placeholder="Ví dụ: Sáng ăn 2 quả trứng ốp la với 1 lát bánh mì đen..." style="background: var(--bg-card);">
          <button class="btn btn-ai" id="btn-quick-parse-food"><i data-lucide="wand-2"></i> AI Phân Tích</button>
        </div>
      </div>

      <!-- Macro Adherence Progress Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem;">
        <div class="card">
          <span class="text-xs text-muted" style="font-weight: 800;">CALO NẠP VÀO</span>
          <div style="font-size: 1.6rem; font-weight: 900; color: var(--accent-purple);">${caloriesIn} / ${calTarget} kcal</div>
          <div class="progress-bar-bg" style="margin-top: 0.5rem;"><div class="progress-bar-fill" style="width: ${Math.min(100, Math.round((caloriesIn / calTarget) * 100))}%;"></div></div>
          <div class="text-xs text-muted" style="margin-top: 0.35rem;">Còn lại: <b>${calTarget - caloriesIn} kcal</b></div>
        </div>

        <div class="card">
          <span class="text-xs text-muted" style="font-weight: 800;">PROTEIN (ĐẠM)</span>
          <div style="font-size: 1.6rem; font-weight: 900; color: var(--accent-purple);">${totalProtein} / ${pTarget}g</div>
          <div class="progress-bar-bg" style="margin-top: 0.5rem;"><div class="progress-bar-fill" style="width: ${Math.min(100, Math.round((totalProtein / pTarget) * 100))}%;"></div></div>
          <div class="text-xs text-muted" style="margin-top: 0.35rem;">Còn lại: <b>${Math.max(0, pTarget - totalProtein)}g</b></div>
        </div>

        <div class="card">
          <span class="text-xs text-muted" style="font-weight: 800;">CARB (TINH BỘT)</span>
          <div style="font-size: 1.6rem; font-weight: 900; color: var(--accent-blue);">${totalCarb} / ${cTarget}g</div>
          <div class="progress-bar-bg" style="margin-top: 0.5rem;"><div class="progress-bar-fill" style="width: ${Math.min(100, Math.round((totalCarb / cTarget) * 100))}%; background: var(--accent-blue);"></div></div>
          <div class="text-xs text-muted" style="margin-top: 0.35rem;">Còn lại: <b>${Math.max(0, cTarget - totalCarb)}g</b></div>
        </div>

        <div class="card">
          <span class="text-xs text-muted" style="font-weight: 800;">FAT (CHẤT BÉO)</span>
          <div style="font-size: 1.6rem; font-weight: 900; color: var(--accent-amber);">${totalFat} / ${fTarget}g</div>
          <div class="progress-bar-bg" style="margin-top: 0.5rem;"><div class="progress-bar-fill" style="width: ${Math.min(100, Math.round((totalFat / fTarget) * 100))}%; background: var(--accent-amber);"></div></div>
          <div class="text-xs text-muted" style="margin-top: 0.35rem;">Còn lại: <b>${Math.max(0, fTarget - totalFat)}g</b></div>
        </div>
      </div>

      <!-- Meals Log Grid (4 Categories: Sáng, Trưa, Tối, Phụ) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.75rem;" class="dash-grid">
        ${renderMealCategoryCard('Bữa Sáng', renderSunIcon({ width: 22, height: 22 }), mealsByCategory.Breakfast)}
        ${renderMealCategoryCard('Bữa Trưa', renderSunsetIcon({ width: 22, height: 22 }), mealsByCategory.Lunch)}
        ${renderMealCategoryCard('Bữa Tối', renderMoonIcon({ width: 22, height: 22 }), mealsByCategory.Dinner)}
        ${renderMealCategoryCard('Bữa Phụ / Snack', renderAppleIcon({ width: 22, height: 22 }), mealsByCategory.Snack)}
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

    // Day Switcher Navigation Handlers
    document.getElementById('btn-meal-day-prev')?.addEventListener('click', () => {
      if (selectedMealJourneyDay > 1) {
        selectedMealJourneyDay--;
        renderMealTracker(onOpenAiCoach);
      }
    });

    document.getElementById('btn-meal-day-next')?.addEventListener('click', () => {
      if (selectedMealJourneyDay < totalJourneyDays) {
        selectedMealJourneyDay++;
        renderMealTracker(onOpenAiCoach);
      }
    });

    // Natural Language Food Quick Parse
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
      btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Đang phân tích...`;

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
        btn.innerHTML = `<i data-lucide="wand-2"></i> AI Phân Tích`;
      }
    });

    // Delete meal buttons with smooth notification-swipe animation for individual meal item card
    document.querySelectorAll('[data-delete-meal]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-delete-meal');
        const itemCard = btn.closest('.meal-item-card');
        if (itemCard) {
          itemCard.classList.add('item-deleting');
          setTimeout(async () => {
            await DataService.removeMealLog(todayLog.date, id);
            renderMealTracker(onOpenAiCoach);
          }, 400);
        } else {
          await DataService.removeMealLog(todayLog.date, id);
          renderMealTracker(onOpenAiCoach);
        }
      });
    });

    // Open Modal Teleported to #modal-mount
    document.getElementById('btn-open-add-meal-modal')?.addEventListener('click', () => {
      openAddMealModal(todayLog.date, () => renderMealTracker(onOpenAiCoach));
    });
  }
}

function openAddMealModal(dateStr, onSaveSuccess) {
  const modalMount = document.getElementById('modal-mount');
  if (!modalMount) return;

  let currentType = 'Lunch';

  const mealOptions = [
    { value: 'Breakfast', label: 'Bữa Sáng (Breakfast)' },
    { value: 'Lunch', label: 'Bữa Trưa (Lunch)' },
    { value: 'Dinner', label: 'Bữa Tối (Dinner)' },
    { value: 'Snack', label: 'Bữa Phụ (Snack)' }
  ];

  const modalHtml = `
    <div class="modal-overlay active" id="add-meal-modal">
      <div class="modal-card" style="max-width: 500px;">
        <div class="card-header">
          <h3>Thêm Món Ăn Mới</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-meal-modal"><i data-lucide="x"></i></button>
        </div>
        <div class="form-group">
          <label class="form-label">Loại Bữa Ăn</label>
          <div id="meal-type-dropdown-container">
            ${renderDropdown({
              id: 'meal-type-dropdown',
              options: mealOptions,
              value: currentType,
              placeholder: 'Chọn bữa ăn...'
            })}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Tên Món Ăn</label>
          <input type="text" class="form-input" id="meal-name-input" placeholder="Ví dụ: Ức gà áp chảo + Cơm lứt">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.5rem;">
          <div class="form-group">
            <label class="form-label">Calo</label>
            <input type="number" class="form-input" id="meal-cal-input" placeholder="350">
          </div>
          <div class="form-group">
            <label class="form-label">Protein(g)</label>
            <input type="number" class="form-input" id="meal-p-input" placeholder="30">
          </div>
          <div class="form-group">
            <label class="form-label">Carb(g)</label>
            <input type="number" class="form-input" id="meal-c-input" placeholder="40">
          </div>
          <div class="form-group">
            <label class="form-label">Fat(g)</label>
            <input type="number" class="form-input" id="meal-f-input" placeholder="8">
          </div>
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" id="btn-save-meal">Lưu Bữa Ăn</button>
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

  document.getElementById('btn-save-meal')?.addEventListener('click', async () => {
    const name = document.getElementById('meal-name-input').value.trim() || 'Món ăn dinh dưỡng';
    const calories = parseInt(document.getElementById('meal-cal-input').value) || 0;
    const protein = parseInt(document.getElementById('meal-p-input').value) || 0;
    const carb = parseInt(document.getElementById('meal-c-input').value) || 0;
    const fat = parseInt(document.getElementById('meal-f-input').value) || 0;

    await DataService.addMealLog(dateStr, { type: currentType, name, calories, protein, carb, fat });
    closeModal();
    if (onSaveSuccess) onSaveSuccess();
  });
}

function renderMealCategoryCard(title, iconSvg = '', mealsList = []) {
  const catCalories = mealsList.reduce((s, m) => s + (m.calories || 0), 0);

  return `
    <div class="card">
      <div class="card-header" style="margin-bottom: 0.85rem;">
        <div class="card-title" style="display: flex; align-items: center; gap: 0.45rem;">
          <span>${title}</span> ${iconSvg}
        </div>
        <span class="badge badge-primary" style="font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.3rem;">
          ${renderFlameIcon({ width: 14, height: 14, color: '#FFFFFF' })} ${catCalories} kcal
        </span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.6rem;">
        ${mealsList.length === 0 ? '<div class="text-xs text-muted" style="font-style: italic; padding: 0.5rem 0;">Chưa ghi nhận món ăn nào</div>' : ''}
        ${mealsList.map(m => `
          <div class="meal-item-card" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle); padding: 0.75rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem;">${m.name}</div>
              <div class="text-xs text-muted">P:${m.protein}g | C:${m.carb}g | F:${m.fat}g</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-weight: 800; color: var(--accent-purple); font-size: 0.95rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                ${renderFlameIcon({ width: 14, height: 14 })} ${m.calories} kcal
              </span>
              <button class="btn btn-secondary btn-sm btn-icon" data-delete-meal="${m.id}" style="width: 32px; height: 32px;"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
