import { DataService, generate7DayMealPlan, generate7DayWorkoutRoutine, generateFullJourneyPhases, sanitizeMealItem } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterTarget, generateJourneyLevelsAndBadges, ACTIVITY_MULTIPLIERS } from '../services/gamificationService.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import confetti from 'canvas-confetti';

export function renderOnboarding(onComplete) {
  const mountNode = document.getElementById('modal-mount');
  if (!mountNode) return;

  const formData = {
    gender: 'male',
    age: null,
    height: null,
    currentWeight: null,
    targetWeight: null,
    targetDays: 60,
    activityLevel: 'moderate',
    foodAllergies: 'Hải sản, Gluten',
    preferredWorkoutTimes: ['Thứ 2, 4, 6 (18:00 - 19:00)']
  };

  const selectedAllergies = new Set(['hải sản', 'gluten']);
  let customAllergyInputVal = '';
  let customWorkoutTimeInputVal = '';
  let currentStep = 1;
  let validationError = '';

  const headers = {
    1: { icon: 'user-plus', title: 'Thông Tin Cá Nhân', desc: 'Tự nhập chỉ số cá nhân. AI sẽ dựa vào đó để lập kế hoạch.' },
    2: { icon: 'target', title: 'Mục Tiêu Của Bạn', desc: 'Chúng ta sẽ cùng nhau đạt được mốc sức khỏe này!' },
    3: { icon: 'utensils', title: 'Sở Thích & Lịch Tập', desc: 'Tùy chỉnh thực đơn né dị ứng và khung giờ tập luyện.' },
    4: { icon: 'sparkles', title: 'Tổng Kết Hành Trình', desc: 'Kiểm tra lại chỉ số & xác nhận kế hoạch với AI Coach.' }
  };

  const allergyPresets = [
    { id: 'alg_seafood', label: 'Hải sản', value: 'hải sản', icon: 'fish' },
    { id: 'alg_beef',    label: 'Thịt bò',  value: 'thịt bò',  icon: 'beef' },
    { id: 'alg_gluten',  label: 'Gluten',   value: 'gluten',  icon: 'wheat' },
    { id: 'alg_milk',    label: 'Sữa / Lactose', value: 'sữa', icon: 'milk' },
    { id: 'alg_peanut',  label: 'Đậu phộng', value: 'đậu phộng', icon: 'nut' },
    { id: 'alg_egg',     label: 'Trứng',    value: 'trứng',   icon: 'egg' },
    { id: 'alg_spicy',   label: 'Đồ cay',   value: 'đồ cay',  icon: 'flame' }
  ];

  function updateFoodAllergiesString() {
    const list = Array.from(selectedAllergies);
    if (customAllergyInputVal.trim()) {
      list.push(customAllergyInputVal.trim());
    }
    formData.foodAllergies = list.join(', ');
  }

  function computeStep4Calculations() {
    const age = formData.age || 25;
    const height = formData.height || 170;
    const currentWeight = formData.currentWeight || 70;
    const targetWeight = formData.targetWeight || 65;
    const targetDays = formData.targetDays || 60;

    const bmr = calculateBMR(formData.gender, currentWeight, height, age);
    const tdee = calculateTDEE(bmr, formData.activityLevel);
    const targetCalObj = calculateTargetCalories(tdee, currentWeight, targetWeight, targetDays);
    const macros = calculateMacros(targetCalObj.targetCalories);
    const water = calculateWaterTarget(currentWeight, formData.activityLevel);

    formData.bmr = bmr;
    formData.tdee = tdee;
    formData.dailyCalorieTarget = targetCalObj.targetCalories;
    formData.macroTarget = macros;
    formData.waterTarget = water;
  }

  function getStepContent(step) {
    if (step === 1) {
      return `
        <div class="flex-1 space-y-4 mt-2">
          <div class="grid grid-cols-2 gap-3">
            <button type="button" id="btn-gender-male" class="chip w-full justify-center !py-3.5 ${formData.gender === 'male' ? 'active' : ''}">
              <i data-lucide="mars" class="w-4 h-4"></i> Nam
            </button>
            <button type="button" id="btn-gender-female" class="chip w-full justify-center !py-3.5 ${formData.gender === 'female' ? 'active' : ''}">
              <i data-lucide="venus" class="w-4 h-4"></i> Nữ
            </button>
          </div>

          <div>
            <label class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Tuổi</label>
            <input type="number" id="ob-input-age" value="${formData.age !== null && formData.age !== undefined ? formData.age : ''}" placeholder="Ví dụ: 25" min="12" max="90" class="ui-input">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Chiều cao (cm)</label>
              <input type="number" id="ob-input-height" value="${formData.height !== null && formData.height !== undefined ? formData.height : ''}" placeholder="Ví dụ: 170" min="100" max="230" class="ui-input">
            </div>
            <div>
              <label class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Cân nặng (kg)</label>
              <input type="number" id="ob-input-weight" value="${formData.currentWeight !== null && formData.currentWeight !== undefined ? formData.currentWeight : ''}" placeholder="Ví dụ: 70" step="0.1" min="30" max="250" class="ui-input">
            </div>
          </div>
        </div>
      `;
    }

    if (step === 2) {
      const activityOptions = Object.keys(ACTIVITY_MULTIPLIERS).map(key => ({
        value: key,
        label: ACTIVITY_MULTIPLIERS[key].label
      }));

      return `
        <div class="flex-1 space-y-4 mt-2">
          <div>
            <label class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Cân nặng mục tiêu (kg)</label>
            <div class="relative">
              <input type="number" id="ob-input-target-weight" value="${formData.targetWeight !== null && formData.targetWeight !== undefined ? formData.targetWeight : ''}" placeholder="Ví dụ: 65" step="0.1" class="ui-input !pl-12">
              <i data-lucide="trending-down" class="w-5 h-5 text-[#7C3AED] absolute left-4 top-1/2 -translate-y-1/2"></i>
            </div>
          </div>

          <div>
            <label class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Thời gian hành trình (ngày)</label>
            <input type="number" id="ob-input-target-days" value="${formData.targetDays !== null && formData.targetDays !== undefined ? formData.targetDays : ''}" placeholder="Ví dụ: 60" min="10" max="365" class="ui-input">
          </div>

          <div>
            <label class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Mức độ vận động</label>
            <div>
              ${renderDropdown({
                id: 'ob-activity-dropdown',
                options: activityOptions,
                value: formData.activityLevel,
                placeholder: 'Chọn mức độ vận động...'
              })}
            </div>
          </div>
        </div>
      `;
    }

    if (step === 3) {
      const timesHtml = formData.preferredWorkoutTimes.length > 0
        ? formData.preferredWorkoutTimes.map((t, idx) => `
            <div class="flex items-center justify-between p-3 bg-[#F5F3FF] border border-[#EDE9FE] rounded-2xl transition hover:border-[#7C3AED]">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                  <i data-lucide="dumbbell" class="w-4 h-4 text-[#7C3AED]"></i>
                </div>
                <div class="overflow-hidden">
                  <p class="text-xs sm:text-sm font-bold text-gray-800 truncate">${t}</p>
                </div>
              </div>
              <button type="button" class="btn-remove-time text-gray-400 hover:text-red-500 transition p-1 flex-shrink-0" data-index="${idx}">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          `).join('')
        : `<p class="text-xs text-gray-400 italic py-2">Chưa có khung giờ tập nào được chọn. Nhập tự do hoặc bấm nút bên dưới.</p>`;

      return `
        <div class="flex-1 space-y-5 mt-2 max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          <div>
            <label class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2.5 block">Dị ứng / Kiêng khem</label>
            <div class="flex flex-wrap gap-2 mb-3">
              ${allergyPresets.map(preset => {
                const isActive = selectedAllergies.has(preset.value);
                return `
                  <button type="button" class="chip btn-allergy-preset ${isActive ? 'active' : ''}" data-value="${preset.value}">
                    <i data-lucide="${preset.icon}" class="w-4 h-4"></i> ${preset.label}
                  </button>
                `;
              }).join('')}
            </div>

            <div class="flex gap-2">
              <input type="text" id="ob-input-custom-allergy" value="${customAllergyInputVal}" placeholder="Nhập đồ ăn khác (vd: cà tím, nấm...)" class="ui-input flex-1 text-sm !py-2.5">
            </div>
            
            <div class="mt-2 text-xs font-semibold ${formData.foodAllergies ? 'text-[#7C3AED]' : 'text-emerald-600'}">
              ${formData.foodAllergies ? `🚫 AI sẽ loại bỏ khỏi thực đơn: ${formData.foodAllergies}` : '✅ Không có dị ứng — AI sẽ lập thực đơn phong phú tối đa.'}
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-gray-500 text-xs font-bold uppercase tracking-wider block">Khung Giờ Tập</label>
              <span class="text-[11px] text-purple-600 font-semibold">${formData.preferredWorkoutTimes.length} khung giờ đã chọn</span>
            </div>

            <!-- Scrollable list of chosen workout times -->
            <div class="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar" id="workout-times-list">
              ${timesHtml}
            </div>

            <!-- Free-text input for custom workout schedule -->
            <div class="flex gap-2 mb-2">
              <input type="text" id="ob-input-custom-workout-time" value="${customWorkoutTimeInputVal}" placeholder="Tự nhập giờ tập (vd: Trưa 12:00, 5h sáng...)" class="ui-input flex-1 text-xs sm:text-sm !py-2.5">
              <button type="button" id="btn-add-custom-time-input" class="w-11 h-11 rounded-2xl bg-[#7C3AED] text-white flex items-center justify-center flex-shrink-0 shadow-md hover:bg-[#6D28D9] transition" title="Thêm giờ tập">
                <i data-lucide="plus" class="w-5 h-5"></i>
              </button>
            </div>

            <button type="button" id="btn-add-workout-time-dialog" class="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-2xl text-xs font-bold text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED] transition flex items-center justify-center gap-1.5">
              <i data-lucide="calendar-plus" class="w-4 h-4"></i> Chọn Khung Giờ Mẫu Theo Ngày
            </button>
          </div>
        </div>
      `;
    }

    if (step === 4) {
      computeStep4Calculations();

      const currentW = formData.currentWeight || 70;
      const targetW = formData.targetWeight || 65;
      const targetD = formData.targetDays || 60;
      const diffKg = currentW - targetW;
      let recommendedDays = targetD;
      let isTooFast = false;

      if (diffKg > 0) {
        recommendedDays = Math.max(30, Math.ceil((diffKg * 7700) / 500));
        if (targetD < recommendedDays || (formData.dailyCalorieTarget && formData.dailyCalorieTarget <= 1200)) {
          isTooFast = true;
        }
      }

      return `
        <!-- Fixed Max Height Scrollable Summary Container -->
        <div class="flex-1 space-y-4 mt-2 max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          <!-- Calorie Target Card -->
          <div class="relative bg-gradient-to-r from-[#7C3AED] to-[#D946EF] p-4 sm:p-5 rounded-2xl text-white overflow-hidden shadow-lg shadow-purple-500/20">
            <div class="relative z-10">
              <span class="text-xs font-bold uppercase tracking-wider opacity-85">Mục Tiêu Nạp Calo</span>
              <div class="flex items-baseline gap-1 mt-1">
                <p class="display text-3xl sm:text-4xl font-bold">${formData.dailyCalorieTarget?.toLocaleString() || 1905}</p>
                <span class="text-sm font-medium opacity-85">kcal/ngày</span>
              </div>
              <div class="flex items-center gap-4 mt-2.5 text-xs font-medium opacity-90">
                <span class="flex items-center gap-1"><i data-lucide="heart-pulse" class="w-3.5 h-3.5"></i> BMR: ${formData.bmr} kcal</span>
                <span class="flex items-center gap-1"><i data-lucide="flame" class="w-3.5 h-3.5"></i> TDEE: ${formData.tdee} kcal</span>
              </div>
            </div>
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xs pointer-events-none"></div>
            <div class="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xs pointer-events-none"></div>
          </div>

          <!-- Summary Info Card -->
          <div class="bg-[#F9FAFB] border border-gray-100 rounded-2xl p-3.5 sm:p-4 space-y-2.5 text-xs sm:text-sm">
            <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Thông Tin Đã Nhập</h3>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-gray-500"><i data-lucide="scale" class="w-4 h-4 text-[#7C3AED]"></i> Cân nặng</div>
              <div class="font-bold flex items-center gap-2 text-gray-800">
                <span>${currentW}kg</span>
                <i data-lucide="arrow-right" class="w-3 h-3 text-[#7C3AED]"></i>
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#D946EF]">${targetW}kg</span>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-gray-500"><i data-lucide="calendar-days" class="w-4 h-4 text-[#7C3AED]"></i> Thời gian</div>
              <span class="font-bold text-gray-800">${targetD} ngày</span>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-gray-500"><i data-lucide="dumbbell" class="w-4 h-4 text-[#7C3AED]"></i> Giờ tập</div>
              <span class="font-bold text-gray-800 text-right text-xs max-w-[180px] sm:max-w-[210px] truncate">${formData.preferredWorkoutTimes.join(', ') || 'Chưa chọn'}</span>
            </div>

            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2 text-gray-500 flex-shrink-0"><i data-lucide="ban" class="w-4 h-4 text-red-400"></i> Dị ứng</div>
              <div class="flex flex-wrap gap-1 justify-end">
                ${formData.foodAllergies 
                  ? formData.foodAllergies.split(',').map(a => `<span class="text-[10px] font-bold bg-[#EDE9FE] text-[#7C3AED] px-2 py-0.5 rounded-md">${a.trim()}</span>`).join('')
                  : '<span class="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md">Không có</span>'
                }
              </div>
            </div>
          </div>

          <!-- Safety Rate Warning (if too fast) -->
          ${isTooFast ? `
            <div class="bg-red-50 border border-red-200 p-3.5 rounded-2xl text-xs text-red-800 space-y-1.5">
              <div class="font-bold flex items-center gap-1.5 text-red-600 text-sm">
                <i data-lucide="alert-triangle" class="w-4 h-4"></i> Nhắc Nhở An Toàn Sức Khỏe AI
              </div>
              <p>Mục tiêu giảm <b>${diffKg.toFixed(1)} kg</b> trong <b>${targetD} ngày</b> là khá nhanh, dễ mệt mỏi!</p>
              <p>💡 <b>Khuyên dùng: ${recommendedDays} ngày</b> (để giảm an toàn ~0.5kg/tuần).</p>
              <button type="button" id="btn-apply-recommended-days" class="w-full py-2 bg-white border border-red-300 text-red-600 font-bold rounded-xl hover:bg-red-100 transition shadow-xs mt-1">
                ⚡ Áp dụng ngay ${recommendedDays} ngày
              </button>
            </div>
          ` : ''}

          <!-- Macros Breakdown -->
          <div class="space-y-2.5 pt-1">
            <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phân Bổ Dinh Dưỡng</h3>
            
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0"><i data-lucide="egg" class="w-4 h-4 text-[#7C3AED]"></i></div>
              <div class="flex-1">
                <div class="flex justify-between text-xs font-bold mb-1"><span class="text-gray-700">Protein</span><span class="text-[#7C3AED]">${formData.macroTarget?.protein || 140}g</span></div>
                <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-[#7C3AED] rounded-full" style="width: 30%;"></div></div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0"><i data-lucide="wheat" class="w-4 h-4 text-[#F59E0B]"></i></div>
              <div class="flex-1">
                <div class="flex justify-between text-xs font-bold mb-1"><span class="text-gray-700">Carbs</span><span class="text-[#F59E0B]">${formData.macroTarget?.carb || 190}g</span></div>
                <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-[#F59E0B] rounded-full" style="width: 45%;"></div></div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0"><i data-lucide="droplet" class="w-4 h-4 text-[#EC4899]"></i></div>
              <div class="flex-1">
                <div class="flex justify-between text-xs font-bold mb-1"><span class="text-gray-700">Fat</span><span class="text-[#EC4899]">${formData.macroTarget?.fat || 60}g</span></div>
                <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-[#EC4899] rounded-full" style="width: 25%;"></div></div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0"><i data-lucide="glass-water" class="w-4 h-4 text-[#3B82F6]"></i></div>
              <div class="flex-1">
                <div class="flex justify-between text-xs font-bold mb-1"><span class="text-gray-700">Nước</span><span class="text-[#3B82F6]">${formData.waterTarget?.toLocaleString() || 2450} ml</span></div>
                <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-[#3B82F6] rounded-full" style="width: 80%;"></div></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  function renderWrapper() {
    const h = headers[currentStep];
    const stepContent = getStepContent(currentStep);
    
    let stepBars = '';
    for (let i = 1; i <= 4; i++) {
      stepBars += `<div class="h-1.5 flex-1 rounded-full ${i <= currentStep ? 'bg-[#7C3AED]' : 'bg-gray-200'} transition-all duration-300"></div>`;
    }

    return `
      <style>
        :root {
          --primary: #7C3AED;
          --accent: #D946EF;
          --fg: #1E1B2E;
        }
        .display { font-family: 'Fraunces', serif; }
        
        .btn-gradient {
          background: linear-gradient(135deg, var(--primary), var(--accent));
          box-shadow: 0 8px 20px -4px rgba(124, 58, 237, 0.4);
          transition: all 0.2s ease; color: white; font-weight: 700;
        }
        .btn-gradient:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -4px rgba(124, 58, 237, 0.5); }
        .btn-gradient:active { transform: translateY(0); }
        
        .ui-input {
          width: 100%; padding: 12px 16px;
          background: #F9FAFB; border: 1.5px solid #E5E7EB;
          border-radius: 16px; font-weight: 600; color: var(--fg);
          transition: all 0.2s;
        }
        .ui-input:focus {
          outline: none; background: white;
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
        }
        .ui-input::placeholder { color: #9CA3AF; font-weight: 500; }

        .chip {
          padding: 10px 16px; border-radius: 12px;
          border: 1.5px solid #E5E7EB; background: white;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px;
          user-select: none;
        }
        .chip:hover { border-color: #C4B5FD; background: #FAF5FF; }
        .chip.active {
          background: #EDE9FE; border-color: var(--primary); color: var(--primary);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }

        .onboarding-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(8px);
          z-index: 999999;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem; overflow-y: auto;
        }
      </style>

      <div class="onboarding-overlay" id="onboarding-modal">
        <div class="bg-white p-5 sm:p-7 rounded-3xl shadow-2xl border border-gray-100/90 w-full max-w-md max-h-[90vh] flex flex-col my-auto transition-all overflow-visible relative">
          
          <!-- Step Progress -->
          <div class="flex gap-2 mb-5 flex-shrink-0">${stepBars}</div>
          
          <!-- Header -->
          <div class="mb-2 flex-shrink-0">
            <div class="w-11 h-11 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mb-2.5 text-[#7C3AED]">
              <i data-lucide="${h.icon}" class="w-5 h-5"></i>
            </div>
            <h2 class="display text-xl sm:text-2xl font-semibold text-gray-900">${h.title}</h2>
            <p class="text-xs sm:text-sm text-gray-500 mt-0.5">${h.desc}</p>
          </div>

          <!-- Step Validation Error -->
          ${validationError ? `
            <div class="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-200 mb-2 flex items-center gap-2 flex-shrink-0">
              <i data-lucide="alert-circle" class="w-4 h-4 flex-shrink-0"></i>
              <span>${validationError}</span>
            </div>
          ` : ''}

          <!-- Step Content Body -->
          ${stepContent}

          <!-- Action Buttons Footer -->
          <div class="mt-auto pt-5 flex gap-3 flex-shrink-0">
            ${currentStep > 1 ? `
              <button type="button" id="btn-onboarding-prev" class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition flex-shrink-0">
                <i data-lucide="arrow-left" class="w-5 h-5"></i>
              </button>
            ` : ''}
            <button type="button" id="btn-onboarding-next" class="btn-gradient flex-1 py-3.5 sm:py-4 rounded-2xl flex items-center justify-center gap-2 text-sm sm:text-base">
              ${currentStep === 4 ? 'Bắt Đầu Hành Trình!' : 'Tiếp Theo'} 
              <i data-lucide="${currentStep !== 4 ? 'arrow-right' : 'rocket'}" class="w-5 h-5"></i>
            </button>
          </div>

        </div>
      </div>
    `;
  }

  function bindEvents() {
    // Custom Dropdown Initialization (Step 2)
    initDropdownListeners(mountNode, (val, dropdownId) => {
      if (dropdownId === 'ob-activity-dropdown') {
        formData.activityLevel = val;
      }
    });

    // Gender buttons
    document.getElementById('btn-gender-male')?.addEventListener('click', () => {
      formData.gender = 'male';
      render();
    });
    document.getElementById('btn-gender-female')?.addEventListener('click', () => {
      formData.gender = 'female';
      render();
    });

    // Inputs change sync
    document.getElementById('ob-input-age')?.addEventListener('input', (e) => {
      formData.age = parseInt(e.target.value) || null;
    });
    document.getElementById('ob-input-height')?.addEventListener('input', (e) => {
      formData.height = parseFloat(e.target.value) || null;
    });
    document.getElementById('ob-input-weight')?.addEventListener('input', (e) => {
      formData.currentWeight = parseFloat(e.target.value) || null;
    });
    document.getElementById('ob-input-target-weight')?.addEventListener('input', (e) => {
      formData.targetWeight = parseFloat(e.target.value) || null;
    });
    document.getElementById('ob-input-target-days')?.addEventListener('input', (e) => {
      formData.targetDays = parseInt(e.target.value) || null;
    });

    // Allergy chips
    document.querySelectorAll('.btn-allergy-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-value');
        if (selectedAllergies.has(val)) {
          selectedAllergies.delete(val);
        } else {
          selectedAllergies.add(val);
        }
        updateFoodAllergiesString();
        render();
      });
    });

    // Custom allergy text input
    document.getElementById('ob-input-custom-allergy')?.addEventListener('input', (e) => {
      customAllergyInputVal = e.target.value;
      updateFoodAllergiesString();
    });

    // Remove workout time slot
    document.querySelectorAll('.btn-remove-time').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'));
        if (!isNaN(idx) && idx >= 0 && idx < formData.preferredWorkoutTimes.length) {
          formData.preferredWorkoutTimes.splice(idx, 1);
          render();
        }
      });
    });

    // Custom workout time text input sync & add button
    const customTimeInputEl = document.getElementById('ob-input-custom-workout-time');
    if (customTimeInputEl) {
      customTimeInputEl.addEventListener('input', (e) => {
        customWorkoutTimeInputVal = e.target.value;
      });
      customTimeInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCustomWorkoutTimeFromInput();
        }
      });
    }

    const addCustomTimeBtn = document.getElementById('btn-add-custom-time-input');
    if (addCustomTimeBtn) {
      addCustomTimeBtn.addEventListener('click', () => {
        addCustomWorkoutTimeFromInput();
      });
    }

    function addCustomWorkoutTimeFromInput() {
      const val = customWorkoutTimeInputVal.trim();
      if (val) {
        if (!formData.preferredWorkoutTimes.includes(val)) {
          formData.preferredWorkoutTimes.push(val);
        }
        customWorkoutTimeInputVal = '';
        render();
      }
    }

    // Add Workout Time Picker Dialog
    document.getElementById('btn-add-workout-time-dialog')?.addEventListener('click', () => {
      openAddWorkoutTimeModal();
    });

    // Step 4 auto-apply safety recommendation
    document.getElementById('btn-apply-recommended-days')?.addEventListener('click', () => {
      const currentW = formData.currentWeight || 70;
      const targetW = formData.targetWeight || 65;
      const diffKg = currentW - targetW;
      const recommendedDays = Math.max(30, Math.ceil((diffKg * 7700) / 500));
      formData.targetDays = recommendedDays;
      render();
    });

    // Navigation buttons
    document.getElementById('btn-onboarding-prev')?.addEventListener('click', () => {
      validationError = '';
      if (currentStep > 1) {
        currentStep--;
        render();
      }
    });

    document.getElementById('btn-onboarding-next')?.addEventListener('click', () => {
      validationError = '';
      
      if (currentStep === 1) {
        if (!formData.age || !formData.height || !formData.currentWeight) {
          validationError = 'Vui lòng tự nhập đầy đủ thông tin Tuổi, Chiều cao và Cân nặng!';
          render();
          return;
        }
        currentStep = 2;
        render();
        return;
      }

      if (currentStep === 2) {
        if (!formData.targetWeight) {
          validationError = 'Vui lòng tự nhập Cân nặng mục tiêu!';
          render();
          return;
        }
        if (!formData.targetDays) {
          formData.targetDays = 60; // fallback if left empty
        }
        currentStep = 3;
        render();
        return;
      }

      if (currentStep === 3) {
        currentStep = 4;
        render();
        return;
      }

      if (currentStep === 4) {
        finishOnboarding();
      }
    });
  }

  function openAddWorkoutTimeModal() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'onboarding-overlay';
    dialogOverlay.style.zIndex = '9999999';

    const daysOptions = [
      { value: 'Thứ 2, 4, 6', label: 'Thứ 2, 4, 6' },
      { value: 'Thứ 3, 5, 7', label: 'Thứ 3, 5, 7' },
      { value: 'Hàng ngày', label: 'Hàng ngày' },
      { value: 'Cuối tuần (T7, CN)', label: 'Cuối tuần (T7, CN)' }
    ];
    let selectedDaysVal = 'Thứ 2, 4, 6';

    dialogOverlay.innerHTML = `
      <div class="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm my-auto overflow-visible relative">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-gray-900 flex items-center gap-2 text-base">
            <i data-lucide="clock" class="w-5 h-5 text-[#7C3AED]"></i> Thêm Khung Giờ Tập
          </h3>
          <button type="button" id="btn-close-wt-dialog" class="text-gray-400 hover:text-gray-600 p-1">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-3 mb-5">
          <div>
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Các ngày trong tuần</label>
            ${renderDropdown({
              id: 'wt-days-dropdown',
              options: daysOptions,
              value: selectedDaysVal,
              placeholder: 'Chọn ngày tập...'
            })}
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Giờ bắt đầu</label>
              <input type="time" id="wt-start-time" value="18:00" class="ui-input !py-2 text-center text-sm">
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Giờ kết thúc</label>
              <input type="time" id="wt-end-time" value="19:00" class="ui-input !py-2 text-center text-sm">
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <button type="button" id="btn-cancel-wt-dialog" class="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl text-sm hover:bg-gray-200 transition">Hủy</button>
          <button type="button" id="btn-confirm-wt-dialog" class="flex-1 py-3 btn-gradient rounded-2xl text-sm font-bold flex items-center justify-center gap-1">
            <i data-lucide="plus" class="w-4 h-4"></i> Thêm
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialogOverlay);
    if (window.lucide) window.lucide.createIcons();

    initDropdownListeners(dialogOverlay, (val, dropdownId) => {
      if (dropdownId === 'wt-days-dropdown') {
        selectedDaysVal = val;
      }
    });

    const close = () => dialogOverlay.remove();
    dialogOverlay.querySelector('#btn-close-wt-dialog')?.addEventListener('click', close);
    dialogOverlay.querySelector('#btn-cancel-wt-dialog')?.addEventListener('click', close);
    dialogOverlay.querySelector('#btn-confirm-wt-dialog')?.addEventListener('click', () => {
      const days = selectedDaysVal || 'Thứ 2, 4, 6';
      const start = dialogOverlay.querySelector('#wt-start-time')?.value || '18:00';
      const end = dialogOverlay.querySelector('#wt-end-time')?.value || '19:00';
      const timeStr = `${days} (${start} - ${end})`;
      if (!formData.preferredWorkoutTimes.includes(timeStr)) {
        formData.preferredWorkoutTimes.push(timeStr);
      }
      close();
      render();
    });
  }

  function render() {
    mountNode.innerHTML = renderWrapper();
    if (window.lucide) window.lucide.createIcons();
    bindEvents();
  }

  async function finishOnboarding() {
    const selectedModel = (await DataService.getSelectedModel()) || 'google/gemini-2.5-flash';

    const targetDays = formData.targetDays || 60;
    const currentWeight = formData.currentWeight || 70;
    const targetWeight = formData.targetWeight || 65;
    const age = formData.age || 25;
    const height = formData.height || 170;

    // Fill in calculated defaults if missing
    formData.targetDays = targetDays;
    formData.currentWeight = currentWeight;
    formData.targetWeight = targetWeight;
    formData.age = age;
    formData.height = height;

    computeStep4Calculations();
    
    // Replace modal content with new AI Thinking animation screen (Light Mode)
    mountNode.innerHTML = `
      <style>
        .ai-bg-light {
          background-color: #F4F4F8;
          background-image: 
            linear-gradient(rgba(124, 58, 237, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 58, 237, 0.05) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(40px, -50px); }
          66% { transform: translate(-30px, 40px); }
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: floatOrb 15s infinite ease-in-out;
          opacity: 0.6;
        }

        @keyframes spin-slow { to { transform: rotate(360deg); } }
        @keyframes spin-reverse { to { transform: rotate(-360deg); } }
        .ring-1 { animation: spin-slow 8s linear infinite; }
        .ring-2 { animation: spin-reverse 12s linear infinite; }
        .ring-3 { animation: spin-slow 5s linear infinite; }

        @keyframes pulse-glow-light {
          0%, 100% { 
            box-shadow: 0 10px 30px -5px rgba(124, 58, 237, 0.3), 0 0 0 8px rgba(124, 58, 237, 0.05); 
            transform: scale(1); 
          }
          50% { 
            box-shadow: 0 15px 40px -5px rgba(217, 70, 239, 0.4), 0 0 0 16px rgba(217, 70, 239, 0.05); 
            transform: scale(1.03); 
          }
        }
        .core-glow-light { animation: pulse-glow-light 3s infinite ease-in-out; }

        .orbit-dot {
          position: absolute;
          width: 12px; height: 12px;
          background: #D946EF;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(217, 70, 239, 0.6);
          top: 50%; left: 50%;
          margin: -6px 0 0 -6px;
        }

        @keyframes blink { 50% { opacity: 0; } }
        .cursor::after {
          content: '|';
          margin-left: 4px;
          animation: blink 1s infinite step-end;
          color: #7C3AED;
          font-weight: 300;
        }

        @keyframes ping-online {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
        .online-dot::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #10B981;
          animation: ping-online 1.5s infinite cubic-bezier(0, 0, 0.2, 1);
        }

        .premium-card {
          background: #FFFFFF;
          border: 1px solid rgba(124, 58, 237, 0.1);
          box-shadow: 0 20px 50px -20px rgba(124, 58, 237, 0.15);
        }

        @keyframes shimmer-light {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-bar-light {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 20%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.8) 80%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer-light 2s infinite linear;
        }
      </style>

      <div class="onboarding-overlay ai-bg-light !p-4 overflow-hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; z-index: 9999999;">
        <!-- Background Orbs (Pastel) -->
        <div class="orb w-96 h-96 bg-[#A78BFA] top-0 left-0"></div>
        <div class="orb w-[500px] h-[500px] bg-[#F472B6] bottom-0 right-0" style="animation-delay: -5s;"></div>
        <div class="orb w-80 h-80 bg-[#93C5FD] top-1/2 left-1/4" style="animation-delay: -10s;"></div>

        <div class="relative z-10 w-full max-w-sm flex flex-col items-center text-center text-[#1E1B2E] m-auto">
          
          <!-- Header Text -->
          <div class="mb-6 flex flex-col items-center justify-center">
            <span class="text-xs font-bold uppercase tracking-[0.2em] text-[#7C3AED] bg-[#EDE9FE] px-3 py-1 rounded-full">AI Coach</span>
            <h2 class="display text-2xl font-semibold text-gray-900 mt-2">Thiết Lập Hành Trình</h2>
          </div>

          <!-- AI Core Visual -->
          <div class="relative w-48 h-48 sm:w-56 sm:h-56 mb-6 flex items-center justify-center">
            <!-- Vòng ngoài 1 -->
            <div class="ring-1 absolute w-full h-full border-2 border-dashed border-purple-300 rounded-full"></div>
            <!-- Vòng ngoài 2 -->
            <div class="ring-2 absolute w-36 h-36 sm:w-44 sm:h-44 border-2 border-fuchsia-300 rounded-full" style="border-right-color: transparent; border-left-color: transparent;"></div>
            <!-- Vòng trong 3 -->
            <div class="ring-3 absolute w-28 h-28 sm:w-32 sm:h-32 border-2 border-purple-400/60 rounded-full" style="border-top-color: transparent; border-bottom-color: transparent;"></div>
            
            <!-- Quỹ đạo chấm sáng -->
            <div class="ring-1 absolute w-36 h-36 sm:w-44 sm:h-44">
              <div class="orbit-dot"></div>
            </div>
            <div class="ring-2 absolute w-28 h-28 sm:w-32 sm:h-32">
              <div class="orbit-dot" style="background: #7C3AED; box-shadow: 0 0 12px rgba(124, 58, 237, 0.6); margin: -4px 0 0 -4px; width: 8px; height: 8px;"></div>
            </div>

            <!-- Lõi AI trung tâm -->
            <div class="core-glow-light w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex items-center justify-center relative">
              <i data-lucide="brain-circuit" class="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-lg"></i>
            </div>
          </div>

          <!-- Text Status -->
          <div class="mb-6 min-h-[70px] flex flex-col items-center justify-center">
            <h3 id="ob-ai-status-text" class="text-lg sm:text-xl font-bold text-gray-800 cursor min-h-[28px]">Đang khởi tạo...</h3>
            <p id="ob-ai-sub-status" class="text-xs sm:text-sm text-gray-500 mt-1 transition-opacity duration-300">Vui lòng đợi trong giây lát</p>
          </div>

          <!-- API Info Card -->
          <div class="premium-card w-full p-4 rounded-2xl flex flex-col gap-3">
            <!-- API Info -->
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2 font-mono text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 max-w-[210px] truncate">
                <i data-lucide="terminal" class="w-4 h-4 text-[#7C3AED] flex-shrink-0"></i>
                <span class="truncate">${selectedModel}</span>
              </div>
              <div class="flex items-center gap-1.5 text-emerald-600 font-semibold flex-shrink-0">
                <div class="relative w-2 h-2 bg-emerald-500 rounded-full online-dot"></div>
                <span>Online</span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
              <div id="ob-ai-progress-fill" class="h-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] rounded-full transition-all duration-500 ease-out relative" style="width: 0%;">
                <div class="absolute inset-0 shimmer-bar-light"></div>
              </div>
            </div>
            
            <div class="flex justify-between items-center text-[11px] text-gray-400 font-medium">
              <span>Đang tạo kế hoạch cá nhân hóa...</span>
              <span id="ob-ai-progress-text">0%</span>
            </div>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Typewriter steps setup
    const steps = [
      { text: `Đang kết nối ${selectedModel}...`, sub: "Thiết lập mã hóa an toàn & kết nối AI", progress: 15 },
      { text: "Phân tích BMR & TDEE...", sub: `BMR: ${formData.bmr} kcal — TDEE: ${formData.tdee} kcal`, progress: 35 },
      { text: "Lọc thực đơn dị ứng...", sub: formData.foodAllergies ? `Né thực phẩm: ${formData.foodAllergies}` : 'Thực đơn đa dạng tối đa', progress: 55 },
      { text: "Phân bổ Macro dinh dưỡng...", sub: `Protein ${formData.macroTarget?.protein || 140}g — Carb ${formData.macroTarget?.carb || 190}g — Fat ${formData.macroTarget?.fat || 60}g`, progress: 75 },
      { text: `Hoàn thiện ${formData.targetDays} ngày tập...`, sub: `Lịch tập: ${formData.preferredWorkoutTimes.join(', ') || 'Cá nhân hóa'}`, progress: 90 },
      { text: "Hoàn tất!", sub: "Kế hoạch của bạn đã sẵn sàng", progress: 100 }
    ];

    let currentStepIdx = 0;
    const statusTextEl = document.getElementById('ob-ai-status-text');
    const subStatusEl = document.getElementById('ob-ai-sub-status');
    const progressFillEl = document.getElementById('ob-ai-progress-fill');
    const progressTextEl = document.getElementById('ob-ai-progress-text');

    function typeWriter(text, element, callback) {
      if (!element) return;
      element.textContent = '';
      element.classList.add('cursor');
      let i = 0;
      const speed = 35;
      
      function type() {
        if (!element || !document.contains(element)) return;
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
          setTimeout(type, speed);
        } else {
          setTimeout(callback, 300);
        }
      }
      type();
    }

    function advanceAnimationStep() {
      if (currentStepIdx >= steps.length) return;
      const step = steps[currentStepIdx];
      if (progressFillEl) progressFillEl.style.width = step.progress + '%';
      if (progressTextEl) progressTextEl.textContent = step.progress + '%';

      if (subStatusEl) subStatusEl.style.opacity = '0';
      setTimeout(() => {
        typeWriter(step.text, statusTextEl, () => {
          if (subStatusEl) {
            subStatusEl.textContent = step.sub;
            subStatusEl.style.opacity = '1';
          }
          currentStepIdx++;
          if (currentStepIdx < steps.length) {
            setTimeout(advanceAnimationStep, 1000);
          }
        });
      }, 150);
    }

    advanceAnimationStep();

    // Data generation execution
    const executeDataGeneration = async () => {
      // 1. Save Profile
      const profile = await DataService.getUserProfile();
      profile.gender = formData.gender;
      profile.age = formData.age;
      profile.height = formData.height;
      profile.currentWeight = formData.currentWeight;
      profile.activityLevel = formData.activityLevel;
      profile.foodAllergies = formData.foodAllergies || '';
      profile.preferredWorkoutTimes = formData.preferredWorkoutTimes;
      profile.isOnboarded = true;
      await DataService.saveUserProfile(profile);

      // 2. Generate Levels & Badges
      const journeyGamification = generateJourneyLevelsAndBadges(formData.targetDays);

      // 3. Save Goal
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
      goal.preferredWorkoutTimes = formData.preferredWorkoutTimes;
      goal.journeyLevels = journeyGamification.levels;
      goal.journeyBadges = journeyGamification.badges;
      await DataService.saveUserGoal(goal);

      const today = DataService.getTodayString();

      // 4. Online AI Plan Generation (with local fallback)
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
        }
      } catch (aiErr) {
        console.error('❌ [Onboarding] AiCoachService plan generation error:', aiErr);
      }

      if (!weeklyMealPlan || !weeklyWorkoutRoutine) {
        weeklyMealPlan = generate7DayMealPlan(100000, today, profile.foodAllergies);
        weeklyWorkoutRoutine = generate7DayWorkoutRoutine('home', 'Thảm yoga, Dây kháng lực, Tạ đơn 5kg');
      }

      if (!journeyPhases || journeyPhases.length === 0) {
        journeyPhases = generateFullJourneyPhases(
          formData.targetDays,
          100000,
          'home',
          'Thảm yoga, Dây kháng lực, Tạ đơn 5kg',
          profile.foodAllergies || '',
          formData.preferredWorkoutTimes
        );
      }

      // Sanitize allergy foods from plans
      const allergyStr = profile.foodAllergies || '';
      if (allergyStr) {
        const sanitizeDay = (dayData) => ({
          ...dayData,
          breakfast: dayData.breakfast ? sanitizeMealItem(dayData.breakfast, allergyStr) : null,
          lunch:     dayData.lunch     ? sanitizeMealItem(dayData.lunch,     allergyStr) : null,
          dinner:    dayData.dinner    ? sanitizeMealItem(dayData.dinner,    allergyStr) : null,
          snack:     dayData.snack     ? sanitizeMealItem(dayData.snack,     allergyStr) : null,
        });

        if (weeklyMealPlan) {
          Object.keys(weeklyMealPlan).forEach(k => {
            if (weeklyMealPlan[k]) weeklyMealPlan[k] = sanitizeDay(weeklyMealPlan[k]);
          });
        }

        if (journeyPhases) {
          journeyPhases = journeyPhases.map(phase => ({
            ...phase,
            weeklyMealPlan: Object.fromEntries(
              Object.entries(phase.weeklyMealPlan || {}).map(([k, v]) => [k, v ? sanitizeDay(v) : v])
            )
          }));
        }
      }

      // 5. Save Plan
      const plan = {
        id: 'current_plan',
        dailyBudgetVnd: 100000,
        workoutType: 'home',
        homeEquipment: 'Thảm yoga, Dây kháng lực, Tạ đơn 5kg',
        createdAt: today,
        targetDays: formData.targetDays,
        preferredWorkoutTimes: formData.preferredWorkoutTimes,
        weeklyMealPlan,
        weeklyWorkoutRoutine,
        dailySchedule: journeyPhases?.[0]?.dailySchedule || null,
        journeyPhases
      };
      await DataService.saveUserPlan(plan);

      // 6. Save Daily Log
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
    };

    await executeDataGeneration();

    // Fast-forward to completed state
    if (progressFillEl) progressFillEl.style.width = '100%';
    if (progressTextEl) progressTextEl.textContent = '100%';
    if (statusTextEl) statusTextEl.textContent = 'Hoàn tất!';
    if (subStatusEl) {
      subStatusEl.textContent = 'Kế hoạch của bạn đã sẵn sàng';
      subStatusEl.style.opacity = '1';
    }

    setTimeout(() => {
      if (statusTextEl) statusTextEl.classList.remove('cursor');
      mountNode.innerHTML = '';
      try {
        confetti({ particleCount: 90, spread: 100, origin: { y: 0.6 } });
      } catch (e) {
        console.warn('confetti trigger fallback:', e);
      }
      if (onComplete) onComplete();
    }, 800);
  }

  // Initial render
  render();
}
