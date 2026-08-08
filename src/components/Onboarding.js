import { DataService, generate7DayMealPlan, generate7DayWorkoutRoutine } from '../services/dataService.js';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterTarget, generateJourneyLevelsAndBadges, ACTIVITY_MULTIPLIERS } from '../services/gamificationService.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import { renderGeminiIcon } from './ui/Icons.js';

export function renderOnboarding(onComplete) {
  const formData = {
    gender: 'male',
    age: null,
    height: null,
    currentWeight: null,
    targetWeight: null,
    targetDays: 60,
    activityLevel: 'moderate'
  };

  const activityOptions = Object.keys(ACTIVITY_MULTIPLIERS).map(key => ({
    value: key,
    label: ACTIVITY_MULTIPLIERS[key].label
  }));

  const modalHtml = `
    <div class="modal-overlay active" id="onboarding-modal">
      <div class="modal-card" style="max-width: 560px;">
        <div style="text-align: center; margin-bottom: 1.25rem;">
          <div style="width: 54px; height: 54px; background: var(--primary-gradient); border-radius: 16px; margin: 0 auto 0.75rem auto; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 8px 20px rgba(117, 86, 217, 0.3);">
            ${renderGeminiIcon({ width: 28, height: 28, strokeWidth: 1.8, color: '#fff' })}
          </div>
          <h2>Thiết Lập Hành Trình Fitness</h2>
          <p class="text-sm text-muted">Vui lòng tự nhập các chỉ số cá nhân. AI Coach sẽ tự động lập toàn bộ thực đơn & lịch tập luyện cho hành trình của bạn.</p>
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
              <label class="form-label">Tuổi *</label>
              <input type="number" class="form-input" id="ob-age" value="" placeholder="Ví dụ: 25" min="12" max="90">
            </div>
            <div class="form-group">
              <label class="form-label">Chiều cao (cm) *</label>
              <input type="number" class="form-input" id="ob-height" value="" placeholder="Ví dụ: 170" min="100" max="230">
            </div>
            <div class="form-group">
              <label class="form-label">Cân nặng (kg) *</label>
              <input type="number" class="form-input" id="ob-weight" value="" placeholder="Ví dụ: 70" step="0.1" min="30" max="250">
            </div>
          </div>
          <div id="ob-step1-error" style="color: var(--danger); font-size: 0.825rem; font-weight: 700; margin-top: 0.5rem; display: none;"></div>
          <button class="btn btn-primary" style="width: 100%; margin-top: 1.25rem;" id="btn-step1-next">Tiếp Theo <i data-lucide="arrow-right"></i></button>
        </div>

        <!-- Step 2: Goal & Activity -->
        <div class="onboarding-step" id="step-2" style="display: none;">
          <h4 style="margin-bottom: 1rem; color: var(--accent-purple);">Bước 2/3: Mục tiêu & Thời gian hành trình</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Cân nặng mục tiêu (kg) *</label>
              <input type="number" class="form-input" id="ob-target-weight" value="" placeholder="Ví dụ: 65" step="0.1">
            </div>
            <div class="form-group">
              <label class="form-label">Thời gian hành trình (ngày) *</label>
              <input type="number" class="form-input" id="ob-target-days" value="60" placeholder="Ví dụ: 60" min="10" max="365">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Mức độ vận động hàng ngày</label>
            <div id="ob-activity-dropdown-container">
              ${renderDropdown({
                id: 'ob-activity-dropdown',
                options: activityOptions,
                value: formData.activityLevel,
                placeholder: 'Chọn mức độ vận động...'
              })}
            </div>
          </div>
          
          <div id="ob-step2-error" style="color: var(--danger); font-size: 0.825rem; font-weight: 700; margin-top: 0.5rem; display: none;"></div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
            <button class="btn btn-secondary" style="flex: 1;" id="btn-step2-back"><i data-lucide="arrow-left"></i> Quay lại</button>
            <button class="btn btn-primary" style="flex: 1;" id="btn-step2-next">Tính Toán AI <i data-lucide="cpu"></i></button>
          </div>
        </div>

        <!-- Step 3: AI Calculations & Journey Plan Summary -->
        <div class="onboarding-step" id="step-3" style="display: none;">
          <h4 style="margin-bottom: 1rem; color: var(--accent-purple);">Bước 3/3: Kế hoạch AI & Lập toàn bộ lộ trình</h4>
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

    // Step 1 -> Step 2 validation
    document.getElementById('btn-step1-next').addEventListener('click', () => {
      const ageVal = document.getElementById('ob-age').value.trim();
      const heightVal = document.getElementById('ob-height').value.trim();
      const weightVal = document.getElementById('ob-weight').value.trim();
      const errDiv = document.getElementById('ob-step1-error');

      if (!ageVal || !heightVal || !weightVal) {
        errDiv.textContent = '⚠️ Vui lòng tự nhập đầy đủ thông tin Tuổi, Chiều cao và Cân nặng!';
        errDiv.style.display = 'block';
        return;
      }

      errDiv.style.display = 'none';
      formData.age = parseInt(ageVal);
      formData.height = parseFloat(heightVal);
      formData.currentWeight = parseFloat(weightVal);

      document.getElementById('step-1').style.display = 'none';
      document.getElementById('step-2').style.display = 'block';
    });

    // Step 2 Back & Next
    document.getElementById('btn-step2-back').addEventListener('click', () => {
      document.getElementById('step-2').style.display = 'none';
      document.getElementById('step-1').style.display = 'block';
    });

    const calculateAndShowSummary = () => {
      const targetWeightVal = document.getElementById('ob-target-weight').value.trim();
      const targetDaysVal = document.getElementById('ob-target-days').value.trim();
      const errDiv = document.getElementById('ob-step2-error');

      if (!targetWeightVal) {
        errDiv.textContent = '⚠️ Vui lòng tự nhập Cân nặng mục tiêu!';
        errDiv.style.display = 'block';
        return false;
      }

      errDiv.style.display = 'none';
      formData.targetWeight = parseFloat(targetWeightVal);
      formData.targetDays = parseInt(targetDaysVal) || 60;

      // Calculate BMR, TDEE, Deficit, Macros, Water
      const bmr = calculateBMR(formData.gender, formData.currentWeight, formData.height, formData.age);
      const tdee = calculateTDEE(bmr, formData.activityLevel);
      const targetCalObj = calculateTargetCalories(tdee, formData.currentWeight, formData.targetWeight, formData.targetDays);
      const macros = calculateMacros(targetCalObj.targetCalories);
      const water = calculateWaterTarget(formData.currentWeight, formData.activityLevel);

      // Check weight loss speed safety
      const diffKg = formData.currentWeight - formData.targetWeight;
      let recommendedDays = formData.targetDays;
      let isTooFast = false;

      if (diffKg > 0) {
        // Safe rate: max ~0.75kg - 1.0kg / week (approx 0.1kg/day)
        recommendedDays = Math.max(30, Math.ceil((diffKg * 7700) / 500));
        if (formData.targetDays < recommendedDays || targetCalObj.targetCalories <= 1200) {
          isTooFast = true;
        }
      }

      formData.bmr = bmr;
      formData.tdee = tdee;
      formData.dailyCalorieTarget = targetCalObj.targetCalories;
      formData.macroTarget = macros;
      formData.waterTarget = water;

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

          ${isTooFast ? `
            <div style="margin-top: 0.85rem; background: #fef2f2; border: 1.5px solid #fecaca; padding: 0.85rem; border-radius: 12px; color: #991b1b; font-size: 0.825rem; line-height: 1.5;">
              <div style="font-weight: 800; color: #dc2626; font-size: 0.875rem; margin-bottom: 0.3rem;">
                ⚠️ Lời Nhắc Nhở An Toàn Sức Khỏe AI Coach
              </div>
              Mục tiêu giảm <b>${diffKg.toFixed(1)} kg</b> trong <b>${formData.targetDays} ngày</b> là quá nhanh, dễ dẫn đến mệt mỏi và mất cơ!
              <br>
              💡 <b>Thời gian khuyến nghị phù hợp: ${recommendedDays} ngày</b> (để giảm an toàn ~0.5kg - 0.7kg/tuần).
              <div style="margin-top: 0.6rem;">
                <button type="button" id="btn-apply-recommended-days" class="btn btn-secondary btn-sm" style="font-weight: 700; color: #dc2626; border-color: #fca5a5; background: #fff;">
                  ⚡ Áp dụng ngay ${recommendedDays} ngày
                </button>
              </div>
            </div>
          ` : ''}

          <div style="margin-top: 0.85rem; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.08)); border: 1.5px solid rgba(245, 158, 11, 0.3); padding: 0.75rem; border-radius: 12px; font-size: 0.825rem; color: #d97706; display: flex; align-items: center; gap: 0.55rem;">
            <i data-lucide="crown" style="width: 22px; height: 22px; flex-shrink: 0; color: #f59e0b;"></i>
            <div>
              🏆 <b>Hệ Thống Level AI Cá Nhân Hóa:</b> Tự động sinh <b>${Math.max(5, Math.round(formData.targetDays / 10))} Cấp Độ</b> (~1 Level / 10 ngày) & <b>5 Huy Hiệu Cột Mốc</b> cho hành trình <b>${formData.targetDays} Ngày</b>!
            </div>
          </div>

          <div style="margin-top: 0.75rem; background: rgba(124, 58, 237, 0.08); border: 1px solid var(--border-highlight); padding: 0.75rem; border-radius: 12px; font-size: 0.825rem; color: var(--accent-purple);">
            ✨ <b>AI Auto-Planner:</b> Sau khi xác nhận, AI Coach sẽ tự động thiết lập toàn bộ thực đơn 7 ngày, lịch tập luyện & danh sách công việc hàng ngày cho hành trình <b>${formData.targetDays} ngày</b> của bạn!
          </div>
        </div>
      `;

      document.getElementById('ai-calc-results').innerHTML = resultsHtml;

      // Attach button handler if warning exists
      const applyBtn = document.getElementById('btn-apply-recommended-days');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          document.getElementById('ob-target-days').value = recommendedDays;
          calculateAndShowSummary();
        });
      }

      document.getElementById('step-2').style.display = 'none';
      document.getElementById('step-3').style.display = 'block';
      if (window.lucide) window.lucide.createIcons();
      return true;
    };

    document.getElementById('btn-step2-next').addEventListener('click', calculateAndShowSummary);

    // Step 3 Back
    document.getElementById('btn-step3-back').addEventListener('click', () => {
      document.getElementById('step-3').style.display = 'none';
      document.getElementById('step-2').style.display = 'block';
    });

    // Confirm & Save -> Auto generate full meal plan, workout schedule & checklist via Real AI API
    document.getElementById('btn-confirm-onboarding').addEventListener('click', async () => {
      const selectedModel = (await DataService.getSelectedModel()) || 'google/gemini-2.5-flash';
      const step3El = document.getElementById('step-3');
      if (step3El) {
        step3El.innerHTML = `
          <div style="text-align: center; padding: 2.5rem 1rem;">
            <div style="width: 52px; height: 52px; border: 4px solid var(--border-color, #e2e8f0); border-top-color: var(--accent-purple, #7c3aed); border-radius: 50%; animation: spin 0.85s linear infinite; margin: 0 auto 1.5rem auto; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);"></div>
            <h3 style="color: var(--accent-purple); font-weight: 900; font-size: 1.25rem;">✨ AI Coach Đang Gọi Mô Hình AI Online...</h3>
            <div style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.9rem; border-radius: 20px; background: rgba(124, 58, 237, 0.12); color: var(--accent-purple); font-weight: 700; font-size: 0.85rem; margin: 0.75rem 0; border: 1px solid rgba(124, 58, 237, 0.25);">
              🤖 Mô hình: ${selectedModel}
            </div>
            <p class="text-sm text-muted" style="margin-top: 0.5rem; max-width: 420px; margin-left: auto; margin-right: auto; line-height: 1.5;">
              Đang kết nối 9router AI API để phân tích chỉ số cá nhân và tự động sinh ra Kế Hoạch 7 Ngày dành riêng cho bạn...
            </p>
          </div>
        `;
      }

      const profile = await DataService.getUserProfile();
      profile.gender = formData.gender;
      profile.age = formData.age;
      profile.height = formData.height;
      profile.currentWeight = formData.currentWeight;
      profile.activityLevel = formData.activityLevel;
      profile.isOnboarded = true;
      await DataService.saveUserProfile(profile);

      const journeyGamification = generateJourneyLevelsAndBadges(formData.targetDays);

      const goal = await DataService.getUserGoal();
      goal.startWeight = formData.currentWeight;
      goal.targetWeight = formData.targetWeight;
      goal.dailyCalorieTarget = formData.dailyCalorieTarget;
      goal.macroTarget = formData.macroTarget;
      goal.waterTarget = formData.waterTarget;
      goal.bmr = formData.bmr;
      goal.tdee = formData.tdee;
      goal.startDate = DataService.getTodayString();
      goal.targetDate = new Date(Date.now() + formData.targetDays * 86400000).toISOString().split('T')[0];
      goal.totalJourneyDays = formData.targetDays;
      goal.targetDays = formData.targetDays;
      goal.currentJourneyDay = 1;
      goal.journeyLevels = journeyGamification.levels;
      goal.journeyBadges = journeyGamification.badges;
      await DataService.saveUserGoal(goal);

      const today = DataService.getTodayString();

      // Attempt Real Online AI Generation via AiCoachService
      let weeklyMealPlan = null;
      let weeklyWorkoutRoutine = null;

      const aiPlan = await AiCoachService.generateFullJourneyPlan(profile, goal);
      if (aiPlan && aiPlan.weeklyMealPlan && aiPlan.weeklyWorkoutRoutine) {
        weeklyMealPlan = aiPlan.weeklyMealPlan;
        weeklyWorkoutRoutine = aiPlan.weeklyWorkoutRoutine;
      } else {
        // Smart Local Generator Failsafe
        weeklyMealPlan = generate7DayMealPlan(100000, today, profile.foodAllergies);
        weeklyWorkoutRoutine = generate7DayWorkoutRoutine('home', 'Thảm yoga, Dây kháng lực, Tạ đơn 5kg');
      }

      const plan = {
        id: 'current_plan',
        dailyBudgetVnd: 100000,
        workoutType: 'home',
        homeEquipment: 'Thảm yoga, Dây kháng lực, Tạ đơn 5kg',
        createdAt: today,
        targetDays: formData.targetDays,
        weeklyMealPlan,
        weeklyWorkoutRoutine
      };
      await DataService.saveUserPlan(plan);

      // Pre-populate daily checklist
      const dailyLog = await DataService.getDailyLog(today);
      dailyLog.checklist = [
        { id: 'ch_water', task: `Uống đủ ${formData.waterTarget} ml nước`, done: false },
        { id: 'ch_calo', task: `Duy trì chỉ tiêu ${formData.dailyCalorieTarget} kcal/ngày`, done: false },
        { id: 'ch_workout', task: `Hoàn thành bài tập theo lịch trình`, done: false },
        { id: 'ch_photo', task: `Upload ảnh tiến trình ngày đầu tiên`, done: false }
      ];
      await DataService.saveDailyLog(dailyLog);

      // Close modal & trigger celebration callback
      const modalEl = document.getElementById('onboarding-modal');
      if (modalEl) modalEl.remove();
      confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
      if (onComplete) onComplete();
    });
  }
}
