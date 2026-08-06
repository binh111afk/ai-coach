import { DataService } from '../services/dataService.js';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterTarget, ACTIVITY_MULTIPLIERS } from '../services/gamificationService.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import { renderGeminiIcon } from './ui/Icons.js';

export function renderOnboarding(onComplete) {
  const formData = {
    gender: 'male',
    age: 25,
    height: 170,
    currentWeight: 70,
    targetWeight: 65,
    activityLevel: 'moderate'
  };

  const activityOptions = Object.keys(ACTIVITY_MULTIPLIERS).map(key => ({
    value: key,
    label: ACTIVITY_MULTIPLIERS[key].label
  }));

  const modalHtml = `
    <div class="modal-overlay active" id="onboarding-modal">
      <div class="modal-card" style="max-width: 560px;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="width: 54px; height: 54px; background: var(--primary-gradient); border-radius: 16px; margin: 0 auto 0.75rem auto; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 8px 20px rgba(117, 86, 217, 0.3);">
            ${renderGeminiIcon({ width: 28, height: 28, strokeWidth: 1.8, color: '#fff' })}
          </div>
          <h2>Thiết Lập Hành Trình Fitness</h2>
          <p class="text-sm text-muted">AI Coach sẽ tự động tính toán chỉ số BMR, TDEE & thiết kế lộ trình chuẩn cá nhân hóa cho bạn.</p>
        </div>

        <!-- Step 1: Physical Parameters -->
        <div class="onboarding-step" id="step-1">
          <h4 style="margin-bottom: 1rem; color: var(--accent-purple);">Bước 1/3: Chỉ số cơ thể</h4>
          <div class="form-group">
            <label class="form-label">Giới tính</label>
            <div style="display: flex; gap: 0.75rem;">
              <label class="btn btn-secondary" style="flex: 1; justify-content: center; cursor: pointer;" id="label-gender-male">
                <input type="radio" name="gender" value="male" checked style="display: none;"> <i data-lucide="user"></i> Nam
              </label>
              <label class="btn btn-secondary" style="flex: 1; justify-content: center; cursor: pointer;" id="label-gender-female">
                <input type="radio" name="gender" value="female" style="display: none;"> <i data-lucide="user-check"></i> Nữ
              </label>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Tuổi</label>
              <input type="number" class="form-input" id="ob-age" value="25" min="12" max="90">
            </div>
            <div class="form-group">
              <label class="form-label">Chiều cao (cm)</label>
              <input type="number" class="form-input" id="ob-height" value="170" min="100" max="230">
            </div>
            <div class="form-group">
              <label class="form-label">Cân nặng (kg)</label>
              <input type="number" class="form-input" id="ob-weight" value="70" step="0.1" min="30" max="250">
            </div>
          </div>
          <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" id="btn-step1-next">Tiếp Theo <i data-lucide="arrow-right"></i></button>
        </div>

        <!-- Step 2: Goal & Activity -->
        <div class="onboarding-step" id="step-2" style="display: none;">
          <h4 style="margin-bottom: 1rem; color: var(--accent-purple);">Bước 2/3: Mục tiêu & Vận động</h4>
          <div class="form-group">
            <label class="form-label">Cân nặng mục tiêu (kg)</label>
            <input type="number" class="form-input" id="ob-target-weight" value="65" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Mức độ vận động hàng ngày (Custom Dropdown)</label>
            <div id="ob-activity-dropdown-container">
              ${renderDropdown({
                id: 'ob-activity-dropdown',
                options: activityOptions,
                value: formData.activityLevel,
                placeholder: 'Chọn mức độ vận động...'
              })}
            </div>
          </div>
          <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
            <button class="btn btn-secondary" style="flex: 1;" id="btn-step2-back"><i data-lucide="arrow-left"></i> Quay lại</button>
            <button class="btn btn-primary" style="flex: 1;" id="btn-step2-next">Tính Toán AI <i data-lucide="cpu"></i></button>
          </div>
        </div>

        <!-- Step 3: AI Calculations Summary -->
        <div class="onboarding-step" id="step-3" style="display: none;">
          <h4 style="margin-bottom: 1rem; color: var(--accent-purple);">Bước 3/3: Kế hoạch AI đề xuất</h4>
          <div id="ai-calc-results"></div>
          <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
            <button class="btn btn-secondary" style="flex: 1;" id="btn-step3-back"><i data-lucide="arrow-left"></i> Sửa lại</button>
            <button class="btn btn-primary" style="flex: 1.5;" id="btn-confirm-onboarding">Bắt Đầu Hành Trình! <i data-lucide="rocket"></i></button>
          </div>
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('modal-mount');
  if (mountNode) {
    mountNode.innerHTML = modalHtml;
    if (window.lucide) window.lucide.createIcons();

    // Init custom dropdown
    initDropdownListeners(mountNode, (val) => {
      formData.activityLevel = val;
    });

    // Gender toggle
    const maleLabel = document.getElementById('label-gender-male');
    const femaleLabel = document.getElementById('label-gender-female');
    maleLabel.addEventListener('click', () => {
      formData.gender = 'male';
      maleLabel.className = 'btn btn-primary';
      femaleLabel.className = 'btn btn-secondary';
    });
    femaleLabel.addEventListener('click', () => {
      formData.gender = 'female';
      femaleLabel.className = 'btn btn-primary';
      maleLabel.className = 'btn btn-secondary';
    });
    maleLabel.click();

    // Step 1 -> Step 2
    document.getElementById('btn-step1-next').addEventListener('click', () => {
      formData.age = parseInt(document.getElementById('ob-age').value) || 25;
      formData.height = parseFloat(document.getElementById('ob-height').value) || 170;
      formData.currentWeight = parseFloat(document.getElementById('ob-weight').value) || 70;

      document.getElementById('step-1').style.display = 'none';
      document.getElementById('step-2').style.display = 'block';
    });

    // Step 2 Back & Next
    document.getElementById('btn-step2-back').addEventListener('click', () => {
      document.getElementById('step-2').style.display = 'none';
      document.getElementById('step-1').style.display = 'block';
    });

    document.getElementById('btn-step2-next').addEventListener('click', () => {
      formData.targetWeight = parseFloat(document.getElementById('ob-target-weight').value) || 65;

      // Calculate BMR, TDEE, Deficit, Macros, Water
      const bmr = calculateBMR(formData.gender, formData.currentWeight, formData.height, formData.age);
      const tdee = calculateTDEE(bmr, formData.activityLevel);
      const targetCalObj = calculateTargetCalories(tdee, formData.currentWeight, formData.targetWeight, 60);
      const macros = calculateMacros(targetCalObj.targetCalories);
      const water = calculateWaterTarget(formData.currentWeight, formData.activityLevel);

      formData.bmr = bmr;
      formData.tdee = tdee;
      formData.dailyCalorieTarget = targetCalObj.targetCalories;
      formData.macroTarget = macros;
      formData.waterTarget = water;
      formData.warning = targetCalObj.warning;

      // Render summary
      const resultsHtml = `
        <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-card); border: 1px solid var(--border-color); font-size: 0.9rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div>
              <span class="text-muted text-xs">BMR (Calo nền):</span>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--accent-blue);">${bmr} kcal</div>
            </div>
            <div>
              <span class="text-muted text-xs">TDEE (Calo duy trì):</span>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--accent-amber);">${tdee} kcal</div>
            </div>
          </div>
          <div style="margin-bottom: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color);">
            <span class="text-muted text-xs">Mục tiêu Calo hàng ngày:</span>
            <div style="font-weight: 900; font-size: 1.4rem; color: var(--accent-purple);">${targetCalObj.targetCalories} kcal/ngày</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; text-align: center; background: var(--bg-card); padding: 0.6rem; border-radius: 12px; border: 1px solid var(--border-color);">
            <div><span class="text-xs text-muted">Protein</span><div style="font-weight: 800; color: var(--accent-purple);">${macros.protein}g</div></div>
            <div><span class="text-xs text-muted">Carb</span><div style="font-weight: 800; color: var(--accent-blue);">${macros.carb}g</div></div>
            <div><span class="text-xs text-muted">Fat</span><div style="font-weight: 800; color: var(--accent-amber);">${macros.fat}g</div></div>
          </div>
          <div style="margin-top: 0.75rem; font-size: 0.85rem;">
            💧 Mục tiêu nước uống: <b>${water} ml</b> / ngày
          </div>
          ${targetCalObj.warning ? `<div style="margin-top: 0.75rem; background: rgba(199, 70, 101, 0.12); color: var(--danger); padding: 0.5rem; border-radius: 8px; font-size: 0.8rem;">⚠️ ${targetCalObj.warning}</div>` : ''}
        </div>
      `;

      document.getElementById('ai-calc-results').innerHTML = resultsHtml;
      document.getElementById('step-2').style.display = 'none';
      document.getElementById('step-3').style.display = 'block';
    });

    // Step 3 Back
    document.getElementById('btn-step3-back').addEventListener('click', () => {
      document.getElementById('step-3').style.display = 'none';
      document.getElementById('step-2').style.display = 'block';
    });

    // Confirm & Save
    document.getElementById('btn-confirm-onboarding').addEventListener('click', async () => {
      const profile = await DataService.getUserProfile();
      profile.gender = formData.gender;
      profile.age = formData.age;
      profile.height = formData.height;
      profile.currentWeight = formData.currentWeight;
      profile.activityLevel = formData.activityLevel;
      profile.isOnboarded = true;
      await DataService.saveUserProfile(profile);

      const goal = await DataService.getUserGoal();
      goal.startWeight = formData.currentWeight;
      goal.targetWeight = formData.targetWeight;
      goal.dailyCalorieTarget = formData.dailyCalorieTarget;
      goal.macroTarget = formData.macroTarget;
      goal.waterTarget = formData.waterTarget;
      goal.bmr = formData.bmr;
      goal.tdee = formData.tdee;
      await DataService.saveUserGoal(goal);

      // Close modal & trigger callback
      document.getElementById('onboarding-modal').remove();
      if (onComplete) onComplete();
    });
  }
}
