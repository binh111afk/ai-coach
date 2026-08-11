import { DataService, generate7DayMealPlan } from '../services/dataService.js';
import { dbManager } from '../services/db.js';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterTarget, generateJourneyLevelsAndBadges } from '../services/gamificationService.js';
import { CONFIG } from '../config.js';
import { renderProviderIcon } from './ui/Icons.js';
import { Modal } from './ui/Modal.js';

export async function renderSettingsPage(onSaveComplete) {
  const profile = await DataService.getUserProfile();
  const selectedModelId = await DataService.getSelectedModel();
  const plan = await DataService.getUserPlan();

  let currentModelId = selectedModelId;
  let newAvatarBase64 = null;

  // Process food allergies into an array of string tags
  let allergyList = profile.foodAllergies
    ? profile.foodAllergies.split(',').map(s => s.trim()).filter(Boolean)
    : ['Hải sản', 'Muối biển'];

  // Compute BMR & TDEE
  const bmrVal = Math.round(calculateBMR(profile.gender || 'male', profile.currentWeight || 77, profile.height || 171, profile.age || 19));
  const tdeeVal = Math.round(calculateTDEE(bmrVal, profile.activityLevel || 1.2));

  // Find active model object
  const currentModelObj = CONFIG.SUPPORTED_MODELS.find(m => m.id === currentModelId) || CONFIG.SUPPORTED_MODELS[0];
  const isDarkMode = document.body.classList.contains('dark');

  const goal = await DataService.getUserGoal();
  const totalJourneyDays = goal.totalJourneyDays || goal.targetDays || 100;
  const currentJourneyDay = DataService.calculateCurrentJourneyDay(goal.startDate);

  const pageHtml = `
    <div class="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-6 fade-up">
      
      <!-- ==================== HEADER ==================== -->
      <div class="fade-up">
        <h1 class="display text-3xl md:text-4xl font-medium leading-[1.1]" style="color: var(--fg);">
          Cài Đặt <span class="italic text-[var(--primary)]">Hồ Sơ & AI</span>
        </h1>
        <p class="text-sm md:text-base mt-1.5" style="color: var(--muted);">Quản lý thông tin cá nhân, mục tiêu và cấu hình hệ thống AI.</p>
      </div>

      <!-- ==================== 1. PROFILE & BODY STATS CARD ==================== -->
      <div class="card p-6 fade-up" style="animation-delay: 0.1s; border: 1px solid rgba(124, 58, 237, 0.18) !important;">
        <!-- Top Profile Info with Right Side Journey Day Box -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 mb-6" style="border-bottom: 1px solid rgba(124, 58, 237, 0.14);">
          <div class="flex items-center gap-5">
            <div class="relative flex-shrink-0">
              <img id="profile-avatar-img" src="${profile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-md" style="border: 2.5px solid var(--primary-light, #8B5CF6);">
            </div>
            <div>
              <h2 class="display text-2xl font-semibold" id="disp-profile-name" style="color: var(--fg);">${profile.name || 'Chiến Binh Fitness'}</h2>
              <p class="text-sm text-[var(--muted)]" id="disp-profile-email">${profile.email || 'fitness_warrior@ai.app'}</p>
              <button class="btn-ghost mt-3 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 w-fit" id="btn-toggle-edit-box" style="border: 1px solid rgba(124, 58, 237, 0.2);">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> <span id="btn-edit-label">Chỉnh sửa hồ sơ</span>
              </button>
            </div>
          </div>

          <!-- Journey Day Badge Box (Fills right side empty space) -->
          <div class="flex items-center gap-3.5 p-4 rounded-2xl shadow-sm self-start md:self-center" style="background: var(--primary-soft); border: 1px solid rgba(124, 58, 237, 0.16);">
            <div class="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-[var(--primary)] shadow-sm flex-shrink-0">
              <i data-lucide="calendar" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="text-[10px] uppercase tracking-wider text-[var(--muted)] font-extrabold">Hành Trình AI</div>
              <div class="display text-xl md:text-2xl font-bold text-[var(--primary)]">Ngày ${currentJourneyDay}/${totalJourneyDays}</div>
            </div>
          </div>
        </div>

        <!-- INLINE EDITING EXPANDABLE BOX (Toggles when clicking Chỉnh sửa hồ sơ) -->
        <div id="profile-edit-box" class="hidden p-5 rounded-2xl mb-6" style="background: var(--primary-soft); border: 1px dashed rgba(124, 58, 237, 0.35);">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-sm flex items-center gap-1.5 text-[var(--primary)]">
              <i data-lucide="user-check" class="w-4 h-4"></i> Cập Nhật Thông Tin Hồ Sơ
            </h3>
            <button type="button" id="btn-cancel-edit-box" class="text-xs font-semibold text-[var(--muted)] hover:text-red-500">✕ Đóng</button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="text-xs font-bold block mb-1" style="color: var(--fg);">Họ & Tên</label>
              <input type="text" id="edit-input-name" value="${profile.name || ''}" class="w-full px-3 py-2 rounded-xl text-xs bg-white font-semibold" style="border: 1px solid rgba(124, 58, 237, 0.25); color: #1E1B2E;">
            </div>

            <div>
              <label class="text-xs font-bold block mb-1" style="color: var(--fg);">Email Liên Hệ</label>
              <input type="email" id="edit-input-email" value="${profile.email || ''}" class="w-full px-3 py-2 rounded-xl text-xs bg-white font-semibold" style="border: 1px solid rgba(124, 58, 237, 0.25); color: #1E1B2E;">
            </div>

            <div>
              <label class="text-xs font-bold block mb-1" style="color: var(--fg);">Tuổi (năm)</label>
              <input type="number" id="edit-input-age" value="${profile.age || 19}" min="12" max="100" class="w-full px-3 py-2 rounded-xl text-xs bg-white font-semibold" style="border: 1px solid rgba(124, 58, 237, 0.25); color: #1E1B2E;">
            </div>

            <div>
              <label class="text-xs font-bold block mb-1" style="color: var(--fg);">Chiều cao (cm)</label>
              <input type="number" id="edit-input-height" value="${profile.height || 171}" min="100" max="230" class="w-full px-3 py-2 rounded-xl text-xs bg-white font-semibold" style="border: 1px solid rgba(124, 58, 237, 0.25); color: #1E1B2E;">
            </div>

            <div>
              <label class="text-xs font-bold block mb-1" style="color: var(--fg);">Cân nặng (kg)</label>
              <input type="number" id="edit-input-weight" value="${profile.currentWeight || 77}" step="0.1" class="w-full px-3 py-2 rounded-xl text-xs bg-white font-semibold" style="border: 1px solid rgba(124, 58, 237, 0.25); color: #1E1B2E;">
            </div>

            <div>
              <label class="text-xs font-bold block mb-1" style="color: var(--fg);">Ảnh đại diện mới</label>
              <input type="file" id="edit-input-avatar-file" accept="image/*" class="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[var(--primary)] file:text-white cursor-pointer">
            </div>
          </div>

          <button class="btn-primary w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5" id="btn-save-inline-profile">
            <i data-lucide="check" class="w-4 h-4"></i> Cập Nhật Hồ Sơ
          </button>
        </div>

        <!-- Body Stats (3 Boxes) -->
        <div class="grid grid-cols-3 gap-3 mb-6">
          <div class="p-3 md:p-4 rounded-2xl text-center shadow-sm" style="background: var(--primary-soft); border: 1px solid rgba(124, 58, 237, 0.16);">
            <div class="text-[10px] uppercase tracking-wider text-[var(--primary)] font-bold">Tuổi</div>
            <div class="display text-xl md:text-2xl font-semibold mt-1" id="stat-disp-age" style="color: var(--fg);">${profile.age || 19}</div>
          </div>
          <div class="p-3 md:p-4 rounded-2xl text-center shadow-sm" style="background: var(--primary-soft); border: 1px solid rgba(124, 58, 237, 0.16);">
            <div class="text-[10px] uppercase tracking-wider text-[var(--primary)] font-bold">Chiều cao</div>
            <div class="display text-xl md:text-2xl font-semibold mt-1" style="color: var(--fg);"><span id="stat-disp-height">${profile.height || 171}</span> <span class="text-xs font-normal text-[var(--muted)]">cm</span></div>
          </div>
          <div class="p-3 md:p-4 rounded-2xl text-center shadow-sm" style="background: var(--primary-soft); border: 1px solid rgba(124, 58, 237, 0.16);">
            <div class="text-[10px] uppercase tracking-wider text-[var(--primary)] font-bold">Cân nặng</div>
            <div class="display text-xl md:text-2xl font-semibold mt-1" style="color: var(--fg);"><span id="stat-disp-weight">${profile.currentWeight || 77}</span> <span class="text-xs font-normal text-[var(--muted)]">kg</span></div>
          </div>
        </div>

        <!-- Metabolism Stats (2 Boxes) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-2xl flex items-center gap-3" style="border: 1px solid rgba(124, 58, 237, 0.16);">
            <div class="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
              <i data-lucide="flame" class="w-5 h-5 text-[var(--blue)]"></i>
            </div>
            <div>
              <div class="text-xs text-[var(--muted)] font-semibold">BMR (Năng lượng nghỉ)</div>
              <div class="font-bold text-lg" id="stat-disp-bmr" style="color: var(--fg);">~${bmrVal.toLocaleString('vi-VN')} kcal</div>
            </div>
          </div>
          <div class="p-4 rounded-2xl flex items-center gap-3" style="border: 1px solid rgba(124, 58, 237, 0.16);">
            <div class="w-10 h-10 rounded-xl bg-[#FCE7F3] flex items-center justify-center flex-shrink-0">
              <i data-lucide="zap" class="w-5 h-5 text-[var(--pink)]"></i>
            </div>
            <div>
              <div class="text-xs text-[var(--muted)] font-semibold">TDEE (Tiêu hao/ngày)</div>
              <div class="font-bold text-lg" id="stat-disp-tdee" style="color: var(--fg);">~${tdeeVal.toLocaleString('vi-VN')} kcal</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 2. AI CONFIGURATION & THEME CARD ==================== -->
      <div class="card p-6 fade-up" style="animation-delay: 0.15s; border: 1px solid rgba(124, 58, 237, 0.18) !important;">
        <h3 class="display text-xl font-semibold mb-4" style="color: var(--fg);">Cấu Hình AI Coach & Giao Diện</h3>
        
        <!-- Model Selector Button (Click opens Popup Modal) -->
        <div class="flex items-center justify-between p-4 bg-[var(--primary-soft)] rounded-2xl mb-4 cursor-pointer transition hover:shadow-md" id="btn-open-model-modal" style="border: 1px solid rgba(124, 58, 237, 0.16);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--primary)] shadow-sm">
              <i data-lucide="brain-circuit" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="text-sm font-semibold" style="color: var(--fg);">Mô hình AI</div>
              <div class="text-xs text-[var(--primary)] font-bold flex items-center gap-1.5" id="disp-active-model-name">
                <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> ${currentModelObj.name}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1 text-xs font-bold text-[var(--primary)]">
            <span>Bấm đổi</span>
            <i data-lucide="chevron-right" class="w-5 h-5 text-[var(--muted)]"></i>
          </div>
        </div>

        <!-- AI Toggles & Dark Mode Switcher -->
        <div class="space-y-1">
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <i data-lucide="scan-line" class="w-5 h-5 text-[var(--muted)]"></i>
              <div>
                <div class="text-sm font-semibold" style="color: var(--fg);">Phân tích hình ảnh</div>
                <div class="text-xs text-[var(--muted)]">Nhận diện calo từ ảnh chụp thức ăn</div>
              </div>
            </div>
            <div class="toggle-switch active" id="toggle-image-analysis">
              <div class="toggle-knob"></div>
            </div>
          </div>

          <div style="border-top: 1px solid rgba(124, 58, 237, 0.14);"></div>

          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <i data-lucide="message-square-heart" class="w-5 h-5 text-[var(--muted)]"></i>
              <div>
                <div class="text-sm font-semibold" style="color: var(--fg);">Giọng điệu AI</div>
                <div class="text-xs text-[var(--muted)]">Thiết lập phong cách giao tiếp</div>
              </div>
            </div>
            <div class="text-xs font-bold text-[var(--accent)] bg-fuchsia-50 px-2.5 py-1 rounded-lg">Truyền cảm hứng</div>
          </div>

          <div style="border-top: 1px solid rgba(124, 58, 237, 0.14);"></div>

          <!-- DARK MODE / LIGHT MODE TOGGLE WITH SWITCH -->
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <i data-lucide="${isDarkMode ? 'sun' : 'moon'}" class="w-5 h-5 text-[var(--muted)]" id="theme-icon-indicator"></i>
              <div>
                <div class="text-sm font-semibold" style="color: var(--fg);">Chế độ Giao diện</div>
                <div class="text-xs text-[var(--muted)]" id="theme-status-text">${isDarkMode ? 'Giao diện Tối (Dark Mode)' : 'Giao diện Sáng (Light Mode)'}</div>
              </div>
            </div>
            <div class="toggle-switch ${isDarkMode ? 'active' : ''}" id="toggle-theme-switch">
              <div class="toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 3. DIET & NUTRITION CARD ==================== -->
      <div class="card p-6 fade-up" style="animation-delay: 0.2s; border: 1px solid rgba(124, 58, 237, 0.18) !important;">
        <h3 class="display text-xl font-semibold mb-4" style="color: var(--fg);">Dinh Dưỡng & Ngân Sách</h3>
        
        <!-- Budget -->
        <div class="mb-5">
          <label class="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold">Ngân sách bữa ăn / ngày</label>
          <div class="mt-2 flex items-center gap-2 p-3 bg-[var(--primary-soft)] rounded-xl transition" style="border: 1px solid rgba(124, 58, 237, 0.16);">
            <i data-lucide="wallet" class="w-5 h-5 text-[var(--amber)] flex-shrink-0"></i>
            <input type="number" id="input-daily-budget" value="${plan.dailyBudgetVnd || 100000}" step="10000" class="flex-1 bg-transparent border-none focus:outline-none font-bold text-base" style="color: var(--fg);">
            <span class="text-sm font-bold text-[var(--muted)]">VND</span>
          </div>
        </div>

        <!-- Allergies -->
        <div>
          <label class="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold">Dị ứng & Thực phẩm kiêng</label>
          <div class="mt-2 flex flex-wrap gap-2 items-center" id="allergy-pills-container">
            ${allergyList.map(tag => `
              <span class="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-50 text-[var(--accent)] text-xs font-bold rounded-full shadow-sm">
                ${tag} <i data-lucide="x" class="w-3.5 h-3.5 cursor-pointer hover:text-red-500 remove-allergy-tag" data-tag="${tag}"></i>
              </span>
            `).join('')}
            <button type="button" id="btn-add-allergy-tag" class="flex items-center gap-1 px-3 py-1.5 text-[var(--muted)] text-xs font-bold rounded-full hover:text-[var(--primary)] transition" style="border: 1px dashed rgba(124, 58, 237, 0.35);">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Thêm mục
            </button>
          </div>
        </div>
      </div>

      <!-- ==================== 4. BOTTOM DUAL ACTION BUTTONS (No Red Box) ==================== -->
      <div class="flex flex-col sm:flex-row gap-3 pt-2 fade-up" style="animation-delay: 0.25s">
        <button class="btn-primary flex-1 py-3.5 rounded-2xl text-sm font-bold shadow-md flex items-center justify-center gap-2" id="btn-main-save-settings">
          <i data-lucide="save" class="w-4 h-4"></i> Lưu Cài Đặt
        </button>
        <button class="flex-1 py-3.5 text-red-500 font-bold text-sm rounded-2xl hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-2" id="btn-main-reset-data" style="border: 2px solid #EF4444;">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Xóa Toàn Bộ Dữ Liệu
        </button>
      </div>

    </div>

    <!-- ==================== MODEL SELECTION POPUP MODAL (Teleported to body for 100% fullscreen blur) ==================== -->
    <div class="modal-overlay" id="model-selection-modal">
      <div class="modal-card card p-6 w-full max-w-lg max-h-[85vh] flex flex-col" style="background: var(--bg-card); border-radius: 28px; border: 1px solid rgba(124, 58, 237, 0.25) !important; position: relative; z-index: 1;">
        <div class="flex justify-between items-center mb-4 pb-3 flex-shrink-0" style="border-bottom: 1px solid rgba(124, 58, 237, 0.14);">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-white" style="background: var(--accent-purple);">
              <i data-lucide="brain-circuit" class="w-4 h-4"></i>
            </div>
            <h3 class="display text-xl font-bold" style="color: var(--fg);">Chọn AI Model</h3>
          </div>
          <button type="button" class="btn-ghost w-8 h-8 rounded-full flex items-center justify-center" id="btn-close-model-modal">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="mb-3 flex-shrink-0">
          <input type="text" id="model-search-input" placeholder="🔍 Tìm kiếm AI Model (Gemini, DeepSeek, Nemotron...)" class="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold" style="background: var(--bg-input); color: var(--text-main); border: 1px solid rgba(124, 58, 237, 0.25);">
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 pr-1" id="model-list-container">
          ${CONFIG.SUPPORTED_MODELS.map(m => `
            <div class="model-select-item flex items-center justify-between p-3 rounded-2xl ${m.id === currentModelId ? 'bg-[var(--primary-soft)] font-bold' : 'hover:bg-slate-50'} cursor-pointer transition" style="border: 1px solid ${m.id === currentModelId ? 'var(--primary)' : 'rgba(124, 58, 237, 0.14)'};" data-model-id="${m.id}">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(124, 58, 237, 0.1);">
                  ${renderProviderIcon(m.id)}
                </div>
                <div class="truncate">
                  <div class="text-xs font-semibold" style="color: var(--fg);">${m.name}</div>
                  <div class="text-[10px] text-[var(--muted)] font-mono truncate">${m.id}</div>
                </div>
              </div>
              <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style="border: 2px solid ${m.id === currentModelId ? 'var(--primary)' : '#CBD5E1'}; background: ${m.id === currentModelId ? 'var(--primary)' : 'transparent'};">
                ${m.id === currentModelId ? '<div class="w-2 h-2 rounded-full bg-white"></div>' : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="mt-4 pt-3 flex justify-end flex-shrink-0" style="border-top: 1px solid rgba(124, 58, 237, 0.14);">
          <button type="button" class="btn-ghost px-5 py-2 rounded-xl text-xs font-bold" id="btn-close-model-modal-bottom">Đóng</button>
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = pageHtml;
    if (window.lucide) window.lucide.createIcons();

    // Teleport model selection modal to document.body to ensure 100% fullscreen backdrop-blur
    const modelModal = document.getElementById('model-selection-modal');
    if (modelModal) {
      document.body.appendChild(modelModal);
    }

    // 1. INLINE PROFILE EDIT BOX TOGGLE
    const editBox = document.getElementById('profile-edit-box');
    const toggleBtn = document.getElementById('btn-toggle-edit-box');
    const editLabel = document.getElementById('btn-edit-label');

    const toggleEditBox = () => {
      if (editBox.classList.contains('hidden')) {
        editBox.classList.remove('hidden');
        if (editLabel) editLabel.textContent = 'Đóng chỉnh sửa';
      } else {
        editBox.classList.add('hidden');
        if (editLabel) editLabel.textContent = 'Chỉnh sửa hồ sơ';
      }
    };

    toggleBtn?.addEventListener('click', toggleEditBox);
    document.getElementById('btn-cancel-edit-box')?.addEventListener('click', toggleEditBox);

    // Avatar File Upload inside Edit Box
    document.getElementById('edit-input-avatar-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        Modal.alert({ title: 'File Quá Lớn', message: 'Vui lòng chọn file ảnh dung lượng dưới 5MB.' });
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        newAvatarBase64 = evt.target.result;
        const avatarImg = document.getElementById('profile-avatar-img');
        if (avatarImg) avatarImg.src = newAvatarBase64;
      };
      reader.readAsDataURL(file);
    });

    // Save Inline Profile Button
    document.getElementById('btn-save-inline-profile')?.addEventListener('click', async () => {
      const name = document.getElementById('edit-input-name').value.trim();
      const email = document.getElementById('edit-input-email').value.trim();
      const age = parseInt(document.getElementById('edit-input-age').value) || profile.age;
      const height = parseFloat(document.getElementById('edit-input-height').value) || profile.height;
      const weight = parseFloat(document.getElementById('edit-input-weight').value) || profile.currentWeight;

      if (name) profile.name = name;
      if (email) profile.email = email;
      if (!isNaN(age)) profile.age = age;
      if (!isNaN(height)) profile.height = height;
      if (!isNaN(weight)) profile.currentWeight = weight;
      if (newAvatarBase64) profile.avatar = newAvatarBase64;

      await DataService.saveUserProfile(profile);

      // Update UI displays
      document.getElementById('disp-profile-name').textContent = profile.name;
      document.getElementById('disp-profile-email').textContent = profile.email;
      document.getElementById('stat-disp-age').textContent = profile.age;
      document.getElementById('stat-disp-height').textContent = profile.height;
      document.getElementById('stat-disp-weight').textContent = profile.currentWeight;

      const newBmr = Math.round(calculateBMR(profile.gender || 'male', profile.currentWeight, profile.height, profile.age));
      const newTdee = Math.round(calculateTDEE(newBmr, profile.activityLevel || 1.2));
      document.getElementById('stat-disp-bmr').textContent = `~${newBmr.toLocaleString('vi-VN')} kcal`;
      document.getElementById('stat-disp-tdee').textContent = `~${newTdee.toLocaleString('vi-VN')} kcal`;

      toggleEditBox();
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    });

    // 2. MODEL SELECTION POPUP MODAL (Teleported & full backdrop blur)
    const openModelModal = () => modelModal?.classList.add('active');
    const closeModelModal = () => modelModal?.classList.remove('active');

    document.getElementById('btn-open-model-modal')?.addEventListener('click', openModelModal);
    document.getElementById('btn-close-model-modal')?.addEventListener('click', closeModelModal);
    document.getElementById('btn-close-model-modal-bottom')?.addEventListener('click', closeModelModal);
    modelModal?.addEventListener('click', (e) => {
      if (e.target === modelModal) closeModelModal();
    });

    // Model Search Filtering inside Popup
    document.getElementById('model-search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#model-list-container .model-select-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });

    // Model item click handler inside Popup
    document.querySelectorAll('#model-list-container .model-select-item').forEach(item => {
      item.addEventListener('click', async () => {
        const mId = item.getAttribute('data-model-id');
        if (mId) {
          currentModelId = mId;
          await DataService.saveSetting('ninerouter_model', currentModelId);

          const mObj = CONFIG.SUPPORTED_MODELS.find(m => m.id === currentModelId);
          const dispEl = document.getElementById('disp-active-model-name');
          if (dispEl && mObj) {
            dispEl.innerHTML = `<div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> ${mObj.name}`;
          }

          // Update active border styles in popup list
          document.querySelectorAll('#model-list-container .model-select-item').forEach(el => {
            el.style.borderColor = 'rgba(124, 58, 237, 0.14)';
            el.classList.remove('bg-[var(--primary-soft)]', 'font-bold');
          });
          item.style.borderColor = 'var(--primary)';
          item.classList.add('bg-[var(--primary-soft)]', 'font-bold');

          closeModelModal();
        }
      });
    });

    // 3. DARK MODE / LIGHT MODE TOGGLE
    const themeSwitch = document.getElementById('toggle-theme-switch');
    themeSwitch?.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const isDarkNow = document.body.classList.contains('dark');
      themeSwitch.classList.toggle('active', isDarkNow);

      const statusText = document.getElementById('theme-status-text');
      if (statusText) {
        statusText.textContent = isDarkNow ? 'Giao diện Tối (Dark Mode)' : 'Giao diện Sáng (Light Mode)';
      }

      const themeIcon = document.getElementById('theme-icon-indicator');
      if (themeIcon) {
        themeIcon.setAttribute('data-lucide', isDarkNow ? 'sun' : 'moon');
        if (window.lucide) window.lucide.createIcons();
      }
    });

    // Image analysis toggle
    document.getElementById('toggle-image-analysis')?.addEventListener('click', function() {
      this.classList.toggle('active');
    });

    // 4. ALLERGY TAGS INTERACTIVE LOGIC
    const renderAllergyTags = () => {
      const container = document.getElementById('allergy-pills-container');
      if (!container) return;

      container.innerHTML = `
        ${allergyList.map(tag => `
          <span class="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-50 text-[var(--accent)] text-xs font-bold rounded-full shadow-sm">
            ${tag} <i data-lucide="x" class="w-3.5 h-3.5 cursor-pointer hover:text-red-500 remove-allergy-tag" data-tag="${tag}"></i>
          </span>
        `).join('')}
        <button type="button" id="btn-add-allergy-tag" class="flex items-center gap-1 px-3 py-1.5 text-[var(--muted)] text-xs font-bold rounded-full hover:text-[var(--primary)] transition" style="border: 1px dashed rgba(124, 58, 237, 0.35);">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Thêm mục
        </button>
      `;
      if (window.lucide) window.lucide.createIcons();

      // Remove tag listeners
      container.querySelectorAll('.remove-allergy-tag').forEach(btn => {
        btn.addEventListener('click', () => {
          const t = btn.getAttribute('data-tag');
          allergyList = allergyList.filter(item => item !== t);
          renderAllergyTags();
        });
      });

      // Add tag listener using custom Modal.prompt component!
      document.getElementById('btn-add-allergy-tag')?.addEventListener('click', async () => {
        const newTag = await Modal.prompt({
          title: 'Thêm Thực Phẩm Kiêng / Dị Ứng',
          message: 'Nhập tên thực phẩm hoặc món ăn bạn muốn AI Coach tự động lọc khỏi thực đơn:',
          placeholder: 'Ví dụ: Tôm, Mực, Đậu nành, Trứng, Sữa tươi...'
        });

        if (newTag && newTag.trim()) {
          const cleaned = newTag.trim();
          if (!allergyList.includes(cleaned)) {
            allergyList.push(cleaned);
            renderAllergyTags();
          }
        }
      });
    };

    renderAllergyTags();

    // 5. MAIN SAVE SETTINGS BUTTON & RESET DATA BUTTON AT BOTTOM
    document.getElementById('btn-main-save-settings')?.addEventListener('click', async () => {
      const budgetInput = document.getElementById('input-daily-budget');
      const newBudget = parseInt(budgetInput ? budgetInput.value : 100000) || 100000;

      profile.foodAllergies = allergyList.join(', ');
      await DataService.saveUserProfile(profile);

      // Recalculate User Goal math based on updated physical parameters
      const goal = await DataService.getUserGoal();
      const bmr = calculateBMR(profile.gender || 'male', profile.currentWeight, profile.height, profile.age);
      const tdee = calculateTDEE(bmr, profile.activityLevel || 1.2);
      const totalDays = goal.totalJourneyDays || goal.targetDays || 60;
      const targetCalObj = calculateTargetCalories(tdee, profile.currentWeight, goal.targetWeight || profile.currentWeight, totalDays);
      const macros = calculateMacros(targetCalObj.targetCalories);
      const water = calculateWaterTarget(profile.currentWeight, profile.activityLevel || 1.2);

      goal.bmr = bmr;
      goal.tdee = tdee;
      goal.dailyCalorieTarget = targetCalObj.targetCalories;
      goal.macroTarget = macros;
      goal.waterTarget = water;

      if (!goal.journeyLevels || goal.journeyLevels.length === 0) {
        const gami = generateJourneyLevelsAndBadges(goal.totalJourneyDays || goal.targetDays || 60);
        goal.journeyLevels = gami.levels;
        goal.journeyBadges = gami.badges;
      }
      await DataService.saveUserGoal(goal);

      // Re-generate user's 7-day meal plan to respect new budget & food allergies
      const planData = await DataService.getUserPlan();
      planData.dailyBudgetVnd = newBudget;
      planData.weeklyMealPlan = generate7DayMealPlan(newBudget, DataService.getTodayString(), profile.foodAllergies);
      await DataService.saveUserPlan(planData);

      await Modal.success({
        title: 'Đã Lưu Cài Đặt!',
        message: 'Thông tin hồ sơ, cấu hình AI Model, ngân sách và danh sách dị ứng đã được lưu thành công!'
      });

      if (onSaveComplete) onSaveComplete();
    });

    // Reset Data Handler
    document.getElementById('btn-main-reset-data')?.addEventListener('click', async () => {
      const confirmed = await Modal.confirm({
        title: 'Xóa Toàn Bộ Dữ Liệu Web',
        message: 'Cảnh báo: Bạn có chắc chắn muốn xóa sạch toàn bộ dữ liệu trong trình duyệt (IndexedDB, LocalStorage, Cache) để cài lại từ đầu không?',
        type: 'warning',
        confirmText: 'Đồng Ý Xóa Rút Cạn',
        cancelText: 'Hủy Bỏ'
      });

      if (confirmed) {
        await dbManager.clearAllData();
        window.location.reload();
      }
    });
  }
}

// Keep export alias for backwards compatibility
export const renderSettingsModal = renderSettingsPage;
