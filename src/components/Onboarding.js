import { DataService, generate7DayMealPlan, generate7DayWorkoutRoutine, generateFullJourneyPhases } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
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
    activityLevel: 'moderate',
    foodAllergies: ''
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
          <h4 style="margin-bottom: 1rem; color: var(--accent-purple);">Bước 1/5: Chỉ số cơ thể</h4>
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
          <h4 style="margin-bottom: 1rem; color: var(--accent-purple);">Bước 2/5: Mục tiêu &amp; Thời gian hành trình</h4>
          
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
            <button class="btn btn-primary" style="flex: 1;" id="btn-step2-next">Tiếp Theo <i data-lucide="arrow-right"></i></button>
          </div>
        </div>

        <!-- Step 2b: Food Allergies & Preferences -->
        <div class="onboarding-step" id="step-2b" style="display: none;">
          <h4 style="margin-bottom: 0.5rem; color: var(--accent-purple);">Bước 3/5: Dị ứng &amp; Sở thích ăn uống</h4>
          <p class="text-sm text-muted" style="margin-bottom: 1rem;">AI Coach sẽ tự động <b>loại bỏ</b> các món có chứa thực phẩm bạn không dùng được khỏi toàn bộ thực đơn hành trình.</p>

          <!-- Quick-select allergy chips -->
          <div class="form-group">
            <label class="form-label">Chọn nhanh dị ứng / kiêng khem (có thể chọn nhiều)</label>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.4rem;" id="allergy-chips">
              ${[
                { id: 'alg_seafood',  label: '🦐 Hải sản', value: 'hải sản' },
                { id: 'alg_egg',     label: '🥚 Trứng',    value: 'trứng' },
                { id: 'alg_milk',    label: '🥛 Sữa / Lactose', value: 'sữa' },
                { id: 'alg_gluten',  label: '🌾 Gluten',   value: 'gluten' },
                { id: 'alg_peanut',  label: '🥜 Đậu phộng', value: 'đậu phộng' },
                { id: 'alg_soy',     label: '🫘 Đậu nành', value: 'đậu nành' },
                { id: 'alg_pork',    label: '🐷 Thịt heo', value: 'thịt heo' },
                { id: 'alg_beef',    label: '🐄 Thịt bò',  value: 'thịt bò' },
                { id: 'alg_spicy',   label: '🌶️ Cay',      value: 'đồ cay' },
                { id: 'alg_vegan',   label: '🥦 Ăn chay',  value: 'ăn chay (không thịt cá)' }
              ].map(chip => `
                <button type="button" class="allergy-chip" id="${chip.id}" data-value="${chip.value}"
                  style="padding: 0.35rem 0.85rem; border-radius: 20px; border: 1.5px solid var(--border-color); background: var(--bg-card); color: var(--text-main); font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.18s; white-space: nowrap;">
                  ${chip.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Free-text additional restrictions -->
          <div class="form-group" style="margin-top: 0.75rem;">
            <label class="form-label">Ghi thêm dị ứng / kiêng khem khác <span class="text-muted">(tuỳ chọn)</span></label>
            <input type="text" class="form-input" id="ob-allergy-custom"
              placeholder="Ví dụ: không ăn cà tím, kiêng đồ ngọt, không ăn nấm..."
              style="margin-top: 0.35rem;">
          </div>

          <div id="ob-step2b-allergy-preview" style="margin-top: 0.65rem; font-size: 0.82rem; color: var(--accent-purple); min-height: 1.5rem;"></div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
            <button class="btn btn-secondary" style="flex: 1;" id="btn-step2b-back"><i data-lucide="arrow-left"></i> Quay lại</button>
            <button class="btn btn-primary" style="flex: 1;" id="btn-step2b-next">Tính Toán AI <i data-lucide="cpu"></i></button>
          </div>
        </div>

        <!-- Step 3: AI Calculations & Journey Plan Summary -->
        <div class="onboarding-step" id="step-3" style="display: none;">
          <h4 style="margin-bottom: 1rem; color: var(--accent-purple);">Bước 4/5: Kết quả tính toán AI &amp; Chỉ số</h4>
          <div id="ai-calc-results"></div>
          <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
            <button class="btn btn-secondary" style="flex: 1;" id="btn-step3-back"><i data-lucide="arrow-left"></i> Quay lại</button>
            <button class="btn btn-primary" style="flex: 1.5;" id="btn-step3-next">Kiểm Tra Thông Tin <i data-lucide="arrow-right"></i></button>
          </div>
        </div>

        <!-- Step 4: Review All Entered & Selected Information -->
        <div class="onboarding-step" id="step-4" style="display: none;">
          <h4 style="margin-bottom: 0.5rem; color: var(--accent-purple);">Bước 5/5: Kiểm tra &amp; Xác nhận thông tin</h4>
          <p class="text-sm text-muted" style="margin-bottom: 1rem;">Vui lòng rà soát lại các chỉ số bạn đã nhập/chọn trước khi AI Coach thiết lập toàn bộ hành trình.</p>
          
          <div id="ob-review-content"></div>

          <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
            <button class="btn btn-secondary" style="flex: 1;" id="btn-step4-back"><i data-lucide="arrow-left"></i> Quay lại</button>
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

    // Step 2 Back & Next (→ Step 2b allergy)
    document.getElementById('btn-step2-back').addEventListener('click', () => {
      document.getElementById('step-2').style.display = 'none';
      document.getElementById('step-1').style.display = 'block';
    });

    document.getElementById('btn-step2-next').addEventListener('click', () => {
      const targetWeightVal = document.getElementById('ob-target-weight').value.trim();
      const targetDaysVal = document.getElementById('ob-target-days').value.trim();
      const errDiv = document.getElementById('ob-step2-error');
      if (!targetWeightVal) {
        errDiv.textContent = '⚠️ Vui lòng tự nhập Cân nặng mục tiêu!';
        errDiv.style.display = 'block';
        return;
      }
      errDiv.style.display = 'none';
      if (targetDaysVal) {
        formData.targetDays = Math.max(10, parseInt(targetDaysVal) || 60);
      }
      document.getElementById('step-2').style.display = 'none';
      document.getElementById('step-2b').style.display = 'block';
      if (window.lucide) window.lucide.createIcons();
    });

    // Step 2b: Allergy chips logic
    const selectedAllergies = new Set();
    const updateAllergyPreview = () => {
      const custom = (document.getElementById('ob-allergy-custom')?.value || '').trim();
      const chips = [...selectedAllergies].join(', ');
      const all = [chips, custom].filter(Boolean).join(', ');
      formData.foodAllergies = all;
      const preview = document.getElementById('ob-step2b-allergy-preview');
      if (preview) {
        preview.textContent = all
          ? `🚫 AI sẽ né: ${all}`
          : '✅ Không có dị ứng — AI sẽ lập thực đơn đa dạng tối đa.';
      }
    };

    document.querySelectorAll('.allergy-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.getAttribute('data-value');
        if (selectedAllergies.has(val)) {
          selectedAllergies.delete(val);
          chip.style.background = 'var(--bg-card)';
          chip.style.borderColor = 'var(--border-color)';
          chip.style.color = 'var(--text-main)';
        } else {
          selectedAllergies.add(val);
          chip.style.background = 'rgba(124, 58, 237, 0.12)';
          chip.style.borderColor = 'var(--accent-purple)';
          chip.style.color = 'var(--accent-purple)';
        }
        updateAllergyPreview();
      });
    });

    document.getElementById('ob-allergy-custom')?.addEventListener('input', updateAllergyPreview);
    updateAllergyPreview(); // init

    document.getElementById('btn-step2b-back').addEventListener('click', () => {
      document.getElementById('step-2b').style.display = 'none';
      document.getElementById('step-2').style.display = 'block';
    });

    const calculateAndShowSummary = () => {
      const targetWeightVal = document.getElementById('ob-target-weight').value.trim();
      const targetDaysVal = document.getElementById('ob-target-days').value.trim();
      const errDiv = document.getElementById('ob-step2-error');

      if (!targetWeightVal) {
        // Guard: go back to step 2 to fill in target weight
        document.getElementById('step-2b').style.display = 'none';
        document.getElementById('step-2').style.display = 'block';
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
      const allergyBadge = formData.foodAllergies
        ? `<div style="margin-bottom: 0.65rem; background: #fef3f2; border: 1px solid #fca5a5; padding: 0.55rem 0.85rem; border-radius: 10px; font-size: 0.8rem; color: #dc2626; font-weight: 700;">🚫 Dị ứng / Kiêng khem AI sẽ né: <span style="font-weight: 800;">${formData.foodAllergies}</span></div>`
        : '';

      const resultsHtml = `
        <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-card); border: 1px solid var(--border-color); font-size: 0.9rem;">
          ${allergyBadge}
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
              🏆 <b>Hệ Thống Level AI Cá Nhân Hóa:</b> Tự động sinh <b>${Math.max(5, Math.round(formData.targetDays / 10))} Cấp Độ</b> (~1 Level / 10 ngày) &amp; <b>5 Huy Hiệu Cột Mốc</b> cho hành trình <b>${formData.targetDays} Ngày</b>!
            </div>
          </div>

          <div style="margin-top: 0.75rem; background: rgba(124, 58, 237, 0.08); border: 1px solid var(--border-highlight); padding: 0.75rem; border-radius: 12px; font-size: 0.825rem; color: var(--accent-purple);">
            ✨ <b>AI Auto-Planner:</b> Sau khi xác nhận, AI Coach sẽ tự động thiết lập toàn bộ thực đơn (né ${formData.foodAllergies || 'không có dị ứng'}), lịch tập luyện &amp; checklist hàng ngày cho hành trình <b>${formData.targetDays} ngày</b>!
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

      // Hide step-2b (current step), show step-3
      document.getElementById('step-2b').style.display = 'none';
      document.getElementById('step-3').style.display = 'block';
      if (window.lucide) window.lucide.createIcons();
      return true;
    };

    document.getElementById('btn-step2b-next').addEventListener('click', calculateAndShowSummary);

    // Step 3 Back → Step 2b
    document.getElementById('btn-step3-back').addEventListener('click', () => {
      document.getElementById('step-3').style.display = 'none';
      document.getElementById('step-2b').style.display = 'block';
    });

    // Step 3 Next → Step 4 Review (Bước 5/5)
    const showReviewStep = () => {
      const genderText = formData.gender === 'male' ? 'Nam' : 'Nữ';
      const actObj = ACTIVITY_MULTIPLIERS[formData.activityLevel] || {};
      const actText = actObj.label || 'Vừa phải';
      const allergyText = formData.foodAllergies
        ? `<span style="color: #dc2626; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#dc2626" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Né: ${formData.foodAllergies}</span>`
        : '<span style="color: #059669; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Không có dị ứng (Thực đơn đa dạng)</span>';

      const reviewHtml = `
        <div style="background: var(--bg-subtle); padding: 1.1rem; border-radius: var(--radius-card); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.8rem; font-size: 0.875rem; text-align: left;">
          
          <!-- Section 1: Physical parameters -->
          <div style="background: var(--bg-card); padding: 0.75rem 0.9rem; border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="font-weight: 800; color: var(--accent-purple); margin-bottom: 0.4rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 0.35rem;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> 1. Chỉ số cá nhân
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; color: var(--text-main);">
              <div>• Giới tính: <b>${genderText}</b></div>
              <div>• Tuổi: <b>${formData.age} tuổi</b></div>
              <div>• Chiều cao: <b>${formData.height} cm</b></div>
              <div>• Cân nặng hiện tại: <b>${formData.currentWeight} kg</b></div>
            </div>
          </div>

          <!-- Section 2: Goals & Journey Duration -->
          <div style="background: var(--bg-card); padding: 0.75rem 0.9rem; border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="font-weight: 800; color: var(--accent-blue); margin-bottom: 0.4rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 0.35rem;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> 2. Mục tiêu &amp; Thời gian hành trình
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; color: var(--text-main);">
              <div>• Cân nặng mục tiêu: <b style="color: var(--accent-purple);">${formData.targetWeight} kg</b></div>
              <div>• Thời gian hành trình: <b style="color: var(--accent-blue);">${formData.targetDays} ngày</b></div>
            </div>
            <div style="margin-top: 0.35rem; font-size: 0.825rem; color: var(--text-muted);">
              • Vận động: <b>${actText}</b>
            </div>
          </div>

          <!-- Section 3: Food allergies & restrictions -->
          <div style="background: var(--bg-card); padding: 0.75rem 0.9rem; border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="font-weight: 800; color: #dc2626; margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 0.35rem;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dc2626" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> 3. Dị ứng &amp; Sở thích ăn uống
            </div>
            <div style="font-size: 0.85rem; line-height: 1.4;">
              ${allergyText}
            </div>
          </div>

          <!-- Section 4: AI Calorie & Macro Target -->
          <div style="background: rgba(124, 58, 237, 0.08); padding: 0.75rem 0.9rem; border-radius: 12px; border: 1px solid var(--border-highlight);">
            <div style="font-weight: 800; color: var(--accent-purple); margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 0.35rem;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> 4. Chỉ số dinh dưỡng AI
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <span>Mục tiêu Calo:</span>
              <b style="font-size: 1.05rem; color: var(--accent-purple);">${formData.dailyCalorieTarget} kcal/ngày</b>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
              <span>Protein: <b style="color: var(--accent-purple);">${formData.macroTarget?.protein}g</b></span>
              <span>Carb: <b style="color: var(--accent-blue);">${formData.macroTarget?.carb}g</b></span>
              <span>Fat: <b style="color: var(--accent-amber);">${formData.macroTarget?.fat}g</b></span>
              <span>Nước: <b>${formData.waterTarget}ml</b></span>
            </div>
          </div>
        </div>
      `;

      document.getElementById('ob-review-content').innerHTML = reviewHtml;
      document.getElementById('step-3').style.display = 'none';
      document.getElementById('step-4').style.display = 'block';
      if (window.lucide) window.lucide.createIcons();
    };

    document.getElementById('btn-step3-next').addEventListener('click', showReviewStep);

    // Step 4 Back → Step 3
    document.getElementById('btn-step4-back').addEventListener('click', () => {
      document.getElementById('step-4').style.display = 'none';
      document.getElementById('step-3').style.display = 'block';
    });

    document.getElementById('btn-confirm-onboarding').addEventListener('click', async () => {
      const selectedModel = (await DataService.getSelectedModel()) || 'google/gemini-2.5-flash';
      const modalEl = document.getElementById('onboarding-modal');
      if (modalEl) {
        modalEl.innerHTML = `
          <style>
            .setup-modal-content {
              width: 100%;
              max-width: 460px;
              background: linear-gradient(165deg, #ffffff 0%, #faf5ff 100%);
              border-radius: 32px;
              padding: 44px 40px 40px;
              text-align: center;
              box-shadow:
                0 0 0 1px rgba(167, 139, 250, 0.2),
                0 8px 16px -4px rgba(0, 0, 0, 0.1),
                0 32px 64px -12px rgba(124, 58, 237, 0.35),
                0 0 80px rgba(139, 92, 246, 0.15);
              position: relative;
              overflow: hidden;
              animation: modalIn 0.5s cubic-bezier(0.34, 1.4, 0.64, 1);
              margin: auto;
            }

            @keyframes modalIn {
              from { opacity: 0; transform: scale(0.85) translateY(30px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }

            .setup-modal-content::before {
              content: '';
              position: absolute;
              inset: -2px;
              border-radius: 34px;
              background: linear-gradient(135deg, #a78bfa, #7c3aed, #c084fc, #a78bfa);
              background-size: 300% 300%;
              animation: borderGlow 4s ease infinite;
              z-index: -1;
              opacity: 0.6;
              filter: blur(8px);
            }

            @keyframes borderGlow {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }

            .setup-modal-content::after {
              content: '';
              position: absolute;
              top: -80px;
              left: 50%;
              transform: translateX(-50%);
              width: 280px;
              height: 280px;
              background: radial-gradient(circle, rgba(167, 139, 250, 0.25), transparent 65%);
              pointer-events: none;
            }

            .icon-wrap {
              position: relative;
              width: 88px;
              height: 88px;
              margin: 0 auto 24px;
              z-index: 1;
            }

            .icon-ring {
              position: absolute;
              inset: 0;
              border-radius: 50%;
              border: 2px solid transparent;
              border-top-color: #a78bfa;
              border-right-color: #7c3aed;
              animation: spin 1.8s linear infinite;
            }

            .icon-ring.r2 {
              inset: -8px;
              border-top-color: #c4b5fd;
              border-right-color: transparent;
              border-bottom-color: #a78bfa;
              animation-duration: 2.6s;
              animation-direction: reverse;
              opacity: 0.5;
            }

            .icon-ring.r3 {
              inset: -16px;
              border-top-color: transparent;
              border-left-color: #ddd6fe;
              animation-duration: 3.4s;
              opacity: 0.3;
            }

            @keyframes spin {
              to { transform: rotate(360deg); }
            }

            .setup-icon {
              position: absolute;
              inset: 10px;
              border-radius: 22px;
              background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #6d28d9 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow:
                0 8px 24px rgba(124, 58, 237, 0.5),
                inset 0 1px 0 rgba(255,255,255,0.25);
              animation: iconPulse 2.5s ease-in-out infinite;
            }

            @keyframes iconPulse {
              0%, 100% { transform: scale(1); box-shadow: 0 8px 24px rgba(124, 58, 237, 0.5), inset 0 1px 0 rgba(255,255,255,0.25); }
              50% { transform: scale(1.06); box-shadow: 0 12px 32px rgba(124, 58, 237, 0.65), inset 0 1px 0 rgba(255,255,255,0.25); }
            }

            .setup-icon svg {
              width: 30px;
              height: 30px;
              color: #fff;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
            }

            .setup-title {
              font-size: 22px;
              font-weight: 800;
              color: #1e1b4b;
              letter-spacing: -0.03em;
              margin-bottom: 10px;
              position: relative;
              z-index: 1;
            }

            .setup-desc {
              font-size: 14.5px;
              line-height: 1.65;
              color: #64748b;
              max-width: 360px;
              margin: 0 auto 36px;
              position: relative;
              z-index: 1;
            }

            .status-box {
              background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
              border: 1.5px solid #ddd6fe;
              border-radius: 18px;
              padding: 20px 22px;
              text-align: left;
              position: relative;
              z-index: 1;
              overflow: hidden;
            }

            .status-box::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 60%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
              animation: shine 2.8s ease-in-out infinite;
            }

            @keyframes shine {
              0% { left: -100%; }
              50%, 100% { left: 150%; }
            }

            .status-label {
              display: flex;
              align-items: center;
              gap: 10px;
              font-size: 14.5px;
              font-weight: 700;
              color: #5b21b6;
              margin-bottom: 10px;
              position: relative;
            }

            .status-label .spark {
              width: 20px;
              height: 20px;
              color: #7c3aed;
              animation: sparkSpin 2s linear infinite;
            }

            @keyframes sparkSpin {
              0% { transform: rotate(0deg) scale(1); }
              50% { transform: rotate(180deg) scale(1.2); }
              100% { transform: rotate(360deg) scale(1); }
            }

            .status-text {
              font-size: 13.5px;
              line-height: 1.6;
              color: #6b7280;
              position: relative;
            }

            .progress-track {
              height: 6px;
              background: #e9d5ff;
              border-radius: 99px;
              margin-top: 24px;
              overflow: hidden;
              position: relative;
              z-index: 1;
            }

            .progress-fill {
              height: 100%;
              width: 15%;
              border-radius: 99px;
              background: linear-gradient(90deg, #a78bfa, #7c3aed, #c084fc);
              background-size: 200% 100%;
              animation: progressMove 2s ease-in-out infinite, progressGrow 40s ease-out forwards;
            }

            @keyframes progressMove {
              0% { background-position: 0% 0%; }
              100% { background-position: 200% 0%; }
            }

            @keyframes progressGrow {
              from { width: 10%; }
              to { width: 92%; }
            }

            .progress-label {
              font-size: 12px;
              font-weight: 600;
              color: #a78bfa;
              margin-top: 10px;
              position: relative;
              z-index: 1;
            }
          </style>

          <div class="setup-modal-content">
            <div class="icon-wrap">
              <div class="icon-ring"></div>
              <div class="icon-ring r2"></div>
              <div class="icon-ring r3"></div>
              <div class="setup-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
                  <path d="M5 19l.75 2.25L8 22l-2.25.75L5 25l-.75-2.25L2 22l2.25-.75L5 19z" opacity="0.6"/>
                </svg>
              </div>
            </div>

            <h1 class="setup-title">Thiết Lập Hành Trình Fitness</h1>
            <p class="setup-desc">
              Vui lòng đợi trong giây lát. AI Coach đang lập thực đơn &amp; lịch tập luyện cho hành trình <b>${formData.targetDays} ngày</b> của bạn.
            </p>

            <div class="status-box">
              <div class="status-label">
                <svg class="spark" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 17.2 5.7 21l2.3-7-6-4.8h7.6L12 2z"/>
                </svg>
                AI Coach Đang Gọi Mô Hình AI Online...
              </div>
              <div style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.25rem 0.75rem; border-radius: 20px; background: rgba(124, 58, 237, 0.12); color: #7c3aed; font-weight: 700; font-size: 0.78rem; margin-bottom: 0.6rem;">
                🤖 Mô hình: ${selectedModel}
              </div>
              ${formData.foodAllergies ? `<div style="font-size: 0.8rem; color: #dc2626; font-weight: 700; margin-bottom: 0.5rem;">🚫 Đang né thực phẩm: ${formData.foodAllergies}</div>` : ''}
              <p class="status-text">
                Đang kết nối 9router AI API để tự động sinh ra Kế Hoạch Thực Đơn Dinh Dưỡng &amp; Lịch Tập Luyện Cá Nhân Hóa dành riêng cho bạn...
              </p>
            </div>

            <div class="progress-track">
              <div class="progress-fill"></div>
            </div>
            <div class="progress-label">Đang tạo kế hoạch cá nhân hóa...</div>
          </div>
        `;
      }

      const profile = await DataService.getUserProfile();
      profile.gender = formData.gender;
      profile.age = formData.age;
      profile.height = formData.height;
      profile.currentWeight = formData.currentWeight;
      profile.activityLevel = formData.activityLevel;
      profile.foodAllergies = formData.foodAllergies || ''; // Save allergies before AI call
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
      let journeyPhases = null;

      try {
        const aiPlan = await AiCoachService.generateFullJourneyPlan(profile, goal);
        if (aiPlan && aiPlan.weeklyMealPlan && aiPlan.weeklyWorkoutRoutine) {
          weeklyMealPlan = aiPlan.weeklyMealPlan;
          weeklyWorkoutRoutine = aiPlan.weeklyWorkoutRoutine;
          journeyPhases = aiPlan.journeyPhases || null;
          console.log(`✅ [Onboarding] AI generated ${journeyPhases?.length || 0} phases for ${formData.targetDays} days.`);
        } else {
          console.warn('⚠️ [Onboarding] AI returned null/invalid plan. Falling back to local generator.');
        }
      } catch (aiErr) {
        console.error('❌ [Onboarding] AiCoachService.generateFullJourneyPlan error:', aiErr);
      }

      // Smart Local Generator Failsafe (if AI failed or timed out)
      if (!weeklyMealPlan || !weeklyWorkoutRoutine) {
        weeklyMealPlan = generate7DayMealPlan(100000, today, profile.foodAllergies);
        weeklyWorkoutRoutine = generate7DayWorkoutRoutine('home', 'Thảm yoga, Dây kháng lực, Tạ đơn 5kg');
      }
      // Always ensure journeyPhases exists (local fallback if AI didn't return it)
      if (!journeyPhases || journeyPhases.length === 0) {
        journeyPhases = generateFullJourneyPhases(
          formData.targetDays,
          100000,
          'home',
          'Thảm yoga, Dây kháng lực, Tạ đơn 5kg'
        );
        console.log(`✅ [Onboarding] Local generator: ${journeyPhases.length} phases for ${formData.targetDays} days.`);
      }

      const plan = {
        id: 'current_plan',
        dailyBudgetVnd: 100000,
        workoutType: 'home',
        homeEquipment: 'Thảm yoga, Dây kháng lực, Tạ đơn 5kg',
        createdAt: today,
        targetDays: formData.targetDays,
        weeklyMealPlan,
        weeklyWorkoutRoutine,
        journeyPhases
      };
      await DataService.saveUserPlan(plan);

      // Pre-populate daily checklist (personalized to user targets & allergy info)
      const dailyLog = await DataService.getDailyLog(today);
      const allergyNote = formData.foodAllergies ? ` (né: ${formData.foodAllergies})` : '';
      dailyLog.checklist = [
        { id: 'ch_water',   task: `💧 Uống đủ ${formData.waterTarget} ml nước trong ngày`, done: false },
        { id: 'ch_calo',    task: `🍽️ Duy trì chỉ tiêu ${formData.dailyCalorieTarget} kcal/ngày${allergyNote}`, done: false },
        { id: 'ch_protein', task: `💪 Nạp đủ ${formData.macroTarget?.protein || 120}g Protein`, done: false },
        { id: 'ch_workout', task: `🏋️ Hoàn thành bài tập theo lịch AI hôm nay`, done: false },
        { id: 'ch_log',     task: `📝 Ghi nhật ký bữa ăn vào AI Coach`, done: false },
        { id: 'ch_photo',   task: `📸 Chụp ảnh tiến trình cơ thể ngày đầu tiên`, done: false },
        { id: 'ch_sleep',   task: `😴 Ngủ đủ 7–8 tiếng để phục hồi cơ bắp`, done: false }
      ];
      await DataService.saveDailyLog(dailyLog);

      // Close modal & trigger celebration callback
      const activeModal = document.getElementById('onboarding-modal');
      if (activeModal) activeModal.remove();
      confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
      if (onComplete) onComplete();
    });
  }
}
