import confetti from 'canvas-confetti';
import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { Modal } from './ui/Modal.js';
import { renderSunIcon, renderSunsetIcon, renderMoonIcon, renderAppleIcon, renderFlameIcon } from './ui/Icons.js';

export async function renderMealTracker(onOpenAiCoach) {
  const goal = await DataService.getUserGoal();
  const todayLog = await DataService.getDailyLog();

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
        <div class="card-header">
          <div>
            <h2 style="display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="utensils" class="text-purple"></i> Theo Dõi Bữa Ăn & Dinh Dưỡng</h2>
            <p class="text-sm text-muted" style="margin-top: 0.25rem;">Nhập thủ công hoặc gõ mô tả tự nhiên để AI tự phân tích calo & macro!</p>
          </div>
          <button class="btn btn-primary" id="btn-open-add-meal-modal">
            <i data-lucide="plus"></i> Thêm Món Ăn Mới
          </button>
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

    <!-- Modal Form Thêm Món Ăn -->
    <div class="modal-overlay" id="add-meal-modal">
      <div class="modal-card" style="max-width: 500px;">
        <div class="card-header">
          <h3>Thêm Món Ăn Mới</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-meal-modal"><i data-lucide="x"></i></button>
        </div>
        <div class="form-group">
          <label class="form-label">Bữa Ăn</label>
          <select class="form-select" id="meal-type-input">
            <option value="Breakfast">Bữa Sáng</option>
            <option value="Lunch" selected>Bữa Trưa</option>
            <option value="Dinner">Bữa Tối</option>
            <option value="Snack">Bữa Phụ / Snack</option>
          </select>
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

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

    // Natural Language Food Quick Parse
    document.getElementById('btn-quick-parse-food')?.addEventListener('click', async () => {
      const prompt = document.getElementById('quick-food-nlp-input')?.value;
      if (!prompt) {
        return Modal.warning({
          title: 'Thiếu Mô Tả',
          message: 'Vui lòng nhập mô tả món ăn trước khi bấm phân tích AI!'
        });
      }

      const parsed = await AiCoachService.smartLocalFallback(prompt);
      if (parsed.proposedChange && parsed.proposedChange.payload) {
        await DataService.addMealLog(todayLog.date, parsed.proposedChange.payload.meal);
        renderMealTracker(onOpenAiCoach);
      }
    });

    // Delete meal buttons
    document.querySelectorAll('[data-delete-meal]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-delete-meal');
        await DataService.removeMealLog(todayLog.date, id);
        renderMealTracker(onOpenAiCoach);
      });
    });

    // Modal controls
    const modal = document.getElementById('add-meal-modal');
    document.getElementById('btn-open-add-meal-modal')?.addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('btn-close-meal-modal')?.addEventListener('click', () => modal.classList.remove('active'));

    document.getElementById('btn-save-meal')?.addEventListener('click', async () => {
      const type = document.getElementById('meal-type-input').value;
      const name = document.getElementById('meal-name-input').value || 'Món ăn dinh dưỡng';
      const calories = parseInt(document.getElementById('meal-cal-input').value) || 0;
      const protein = parseInt(document.getElementById('meal-p-input').value) || 0;
      const carb = parseInt(document.getElementById('meal-c-input').value) || 0;
      const fat = parseInt(document.getElementById('meal-f-input').value) || 0;

      await DataService.addMealLog(todayLog.date, { type, name, calories, protein, carb, fat });
      modal.classList.remove('active');
      renderMealTracker(onOpenAiCoach);
    });
  }
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
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle); padding: 0.75rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
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
