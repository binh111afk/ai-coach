import { DataService, generate7DayMealPlan } from '../services/dataService.js';
import { dbManager } from '../services/db.js';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterTarget, generateJourneyLevelsAndBadges } from '../services/gamificationService.js';
import { CONFIG } from '../config.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import { Modal } from './ui/Modal.js';

export async function renderSettingsPage(onSaveComplete) {
  const profile = await DataService.getUserProfile();
  const selectedModel = await DataService.getSelectedModel();
  const plan = await DataService.getUserPlan();

  let currentSelectedModel = selectedModel;
  let newAvatarBase64 = null;

  const modelOptions = CONFIG.SUPPORTED_MODELS.map(m => ({
    value: m.id,
    label: m.name
  }));

  const pageHtml = `
    <div class="settings-page-container p-4 md:p-6 max-w-6xl mx-auto space-y-6 fade-up">
      <!-- HEADER HERO CARD -->
      <div class="card p-6 md:p-8 rounded-3xl relative overflow-hidden" style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(217, 70, 239, 0.04) 100%); border: 1px solid rgba(124, 58, 237, 0.18);">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider" style="background: var(--primary-soft); color: var(--accent-purple);">
                ⚙️ System & Profile
              </span>
              <span class="px-3 py-1 rounded-full text-xs font-bold" style="background: rgba(16, 185, 129, 0.1); color: #10B981;">
                ✓ Đã đồng bộ Cloud
              </span>
            </div>
            <h1 class="display text-2xl md:text-3xl font-bold" style="color: var(--text-main);">Cài Đặt Hệ Thống & Hồ Sơ AI</h1>
            <p class="text-xs md:text-sm text-muted mt-1 max-w-xl" style="color: var(--text-muted);">
              Tùy chỉnh thông tin thể trạng, chọn AI Model (9router), cài đặt ngân sách ăn uống và danh sách món dị ứng để AI Coach lập kế hoạch tối ưu nhất.
            </p>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <button class="btn-primary px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md" id="btn-save-settings">
              <i data-lucide="check-circle-2" class="w-4 h-4"></i> Lưu Tất Cả Thay Đổi
            </button>
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT GRID -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- LEFT COLUMN: Profile Avatar & AI Model Config -->
        <div class="space-y-6">
          
          <!-- CARD 1: User Profile & Avatar -->
          <div class="card p-6 rounded-3xl" style="background: var(--bg-card); border: 1px solid var(--border-color);">
            <h3 class="font-bold text-base mb-4 flex items-center gap-2" style="color: var(--text-main);">
              <i data-lucide="user" class="w-5 h-5 text-[var(--accent-purple)]"></i> Ảnh Đại Diện & Tài Khoản
            </h3>

            <div class="flex flex-col items-center text-center p-4 rounded-2xl mb-4" style="background: rgba(124, 58, 237, 0.04); border: 1px solid rgba(124, 58, 237, 0.1);">
              <div class="relative mb-3 group">
                <img id="settings-avatar-preview" src="${profile.avatar}" class="w-24 h-24 rounded-full object-cover shadow-lg transition-transform duration-200 group-hover:scale-105" style="border: 3px solid var(--accent-purple);">
                <label for="avatar-file-input" class="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer shadow-md transition-transform duration-200 hover:scale-110" style="background: var(--accent-purple);" title="Tải ảnh mới từ máy tính">
                  <i data-lucide="camera" class="w-4 h-4"></i>
                </label>
                <input type="file" id="avatar-file-input" accept="image/*" class="hidden">
              </div>

              <h4 class="font-extrabold text-base mb-0.5" id="settings-avatar-name" style="color: var(--text-main);">${profile.name}</h4>
              <p class="text-xs text-muted mb-3" id="settings-avatar-filename" style="color: var(--text-muted);">${profile.email || 'user@fitnesscoach.ai'}</p>

              <div class="flex gap-2 w-full">
                <label for="avatar-file-input" class="btn-ghost flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer">
                  <i data-lucide="upload" class="w-3.5 h-3.5 text-[var(--accent-purple)]"></i> Tải Ảnh Mới
                </label>
                <button class="btn-ghost py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-1" id="btn-mock-google-login" title="Google OAuth">
                  <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-500"></i> OAuth
                </button>
              </div>
            </div>

            <div class="text-xs space-y-2 p-3 rounded-xl" style="background: var(--primary-soft); color: var(--text-main);">
              <div class="flex justify-between">
                <span class="text-muted">Trạng thái:</span>
                <span class="font-bold text-emerald-600">Active Pro</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Bộ nhớ đệm:</span>
                <span class="font-bold">IndexedDB Ready</span>
              </div>
            </div>
          </div>

          <!-- CARD 2: 9router AI Model Config -->
          <div class="card p-6 rounded-3xl" style="background: var(--bg-card); border: 1px solid var(--border-color);">
            <h3 class="font-bold text-base mb-2 flex items-center gap-2" style="color: var(--accent-purple);">
              <i data-lucide="cpu" class="w-5 h-5"></i> Cấu Hình Model AI (9router)
            </h3>
            <p class="text-xs text-muted mb-4" style="color: var(--text-muted);">
              Chọn model trí tuệ nhân tạo dùng để tư vấn dinh dưỡng, sinh thực đơn & bài tập.
            </p>

            <div class="form-group mb-3">
              <label class="form-label text-xs font-bold block mb-1.5" style="color: var(--text-main);">AI Model Hiện Tại</label>
              <div id="settings-model-dropdown-container">
                ${renderDropdown({
                  id: 'settings-model-dropdown',
                  options: modelOptions,
                  value: currentSelectedModel,
                  placeholder: 'Chọn Model AI...'
                })}
              </div>
            </div>

            <div class="p-3 rounded-xl text-xs leading-relaxed" style="background: rgba(124, 58, 237, 0.05); border: 1px solid rgba(124, 58, 237, 0.12); color: var(--text-muted);">
              💡 <b>Mẹo:</b> <code>Gemini 3.6 Flash</code> hỗ trợ phân tích đa phương tiện (ảnh + văn bản) với tốc độ phản hồi tối ưu nhất.
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN: Physical Body Parameters & Budget / Allergy Settings -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- CARD 3: Physical Parameters -->
          <div class="card p-6 rounded-3xl" style="background: var(--bg-card); border: 1px solid var(--border-color);">
            <h3 class="font-bold text-base mb-4 flex items-center gap-2" style="color: var(--text-main);">
              <i data-lucide="activity" class="w-5 h-5 text-[var(--accent-purple)]"></i> Thông Tin Thể Trạng & Chỉ Số Cơ Thể
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div class="form-group">
                <label class="form-label text-xs font-bold block mb-1">Họ & Tên Nguồn Dùng</label>
                <input type="text" class="form-input text-xs w-full rounded-xl p-3" id="settings-user-name" value="${profile.name || ''}" placeholder="Nhập họ và tên..." style="background: var(--bg-input); color: var(--text-main);">
              </div>

              <div class="form-group">
                <label class="form-label text-xs font-bold block mb-1">Tuổi (Năm)</label>
                <input type="number" class="form-input text-xs w-full rounded-xl p-3" id="settings-user-age" value="${profile.age || 25}" min="12" max="100" style="background: var(--bg-input); color: var(--text-main);">
              </div>

              <div class="form-group">
                <label class="form-label text-xs font-bold block mb-1">Chiều Cao (cm)</label>
                <input type="number" class="form-input text-xs w-full rounded-xl p-3" id="settings-user-height" value="${profile.height || 170}" min="100" max="230" style="background: var(--bg-input); color: var(--text-main);">
              </div>

              <div class="form-group">
                <label class="form-label text-xs font-bold block mb-1">Cân Nặng Hiện Tại (kg)</label>
                <input type="number" class="form-input text-xs w-full rounded-xl p-3" id="settings-user-weight" value="${profile.currentWeight || 70}" step="0.1" style="background: var(--bg-input); color: var(--text-main);">
              </div>
            </div>

            <!-- Health Math Overview Mini Banner -->
            <div class="p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3" style="background: var(--primary-soft);">
              <div>
                <div class="text-xs font-bold" style="color: var(--accent-purple);">Chỉ Số BMR & TDEE Ước Tính:</div>
                <div class="text-xs text-muted mt-0.5" style="color: var(--text-muted);">
                  Hệ thống tự động tính toán lại mục tiêu Calories & Macros khi bạn cập nhật chỉ số.
                </div>
              </div>
              <div class="flex gap-2">
                <span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-purple-700 shadow-sm">
                  BMR ~ ${Math.round(calculateBMR(profile.gender || 'male', profile.currentWeight || 70, profile.height || 170, profile.age || 25))} kcal
                </span>
                <span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-purple-700 shadow-sm">
                  TDEE ~ ${Math.round(calculateTDEE(calculateBMR(profile.gender || 'male', profile.currentWeight || 70, profile.height || 170, profile.age || 25), profile.activityLevel || 1.2))} kcal
                </span>
              </div>
            </div>
          </div>

          <!-- CARD 4: Budget & Food Allergies -->
          <div class="card p-6 rounded-3xl" style="background: var(--bg-card); border: 1px solid var(--border-color);">
            <h3 class="font-bold text-base mb-4 flex items-center gap-2" style="color: var(--text-main);">
              <i data-lucide="utensils" class="w-5 h-5 text-[var(--accent-purple)]"></i> Ngân Sách Ăn Uống & Khẩu Vị Kiêng Khem
            </h3>

            <div class="form-group mb-5">
              <label class="form-label text-xs font-bold block mb-1" style="color: var(--accent-purple);">
                💰 Ngân Sách Ăn Uống Hàng Ngày (VNĐ / Ngày)
              </label>
              <input type="number" class="form-input text-xs w-full rounded-xl p-3 font-bold" id="settings-daily-budget" value="${plan.dailyBudgetVnd || 100000}" step="10000" style="background: var(--bg-input); color: var(--text-main);">
              <span class="text-xs text-muted block mt-1" style="color: var(--text-muted);">
                * Mức ngân sách tiêu chuẩn khuyến nghị: 60.000 - 150.000 VNĐ / Ngày cho 3-4 bữa ăn dinh dưỡng.
              </span>
            </div>

            <div class="form-group mb-4">
              <label class="form-label text-xs font-bold block mb-1" style="color: #F59E0B;">
                ⚠️ Món Ăn / Thực Phẩm Dị Ứng Hoặc Kiêng Khem
              </label>
              <input type="text" class="form-input text-xs w-full rounded-xl p-3" id="settings-food-allergies" value="${profile.foodAllergies || ''}" placeholder="Ví dụ: Hải sản tôm mực, Đậu nành, Sữa tươi lactose, Trứng..." style="background: var(--bg-input); color: var(--text-main);">
            </div>

            <!-- Quick Allergy Pill Suggestions -->
            <div class="mb-2">
              <span class="text-xs font-semibold block mb-2" style="color: var(--text-muted);">Gợi ý nhanh (bấm để thêm vào danh sách kiêng):</span>
              <div class="flex flex-wrap gap-2" id="allergy-quick-pills">
                <button type="button" class="btn-ghost px-3 py-1 rounded-full text-xs font-semibold" data-allergy="Hải sản tôm mực">🦐 Hải sản tôm mực</button>
                <button type="button" class="btn-ghost px-3 py-1 rounded-full text-xs font-semibold" data-allergy="Sữa tươi lactose">🥛 Sữa tươi lactose</button>
                <button type="button" class="btn-ghost px-3 py-1 rounded-full text-xs font-semibold" data-allergy="Đậu nành">🫘 Đậu nành</button>
                <button type="button" class="btn-ghost px-3 py-1 rounded-full text-xs font-semibold" data-allergy="Trứng">🥚 Trứng</button>
                <button type="button" class="btn-ghost px-3 py-1 rounded-full text-xs font-semibold" data-allergy="Thịt heo">🐖 Thịt heo</button>
              </div>
            </div>

            <p class="text-xs text-muted italic mt-3" style="color: var(--text-muted);">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 inline mr-1 text-[var(--accent-purple)]"></i> Khi lưu cài đặt, AI Coach sẽ tự động làm mới thực đơn 7 ngày khớp với ngân sách và lọc sạch món dị ứng.
            </p>
          </div>

          <!-- CARD 5: System Actions -->
          <div class="card p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4" style="background: rgba(239, 68, 68, 0.03); border: 1px solid rgba(239, 68, 68, 0.15);">
            <div>
              <h4 class="font-bold text-sm text-red-600 mb-1 flex items-center gap-1.5">
                <i data-lucide="alert-triangle" class="w-4 h-4"></i> Xóa Dữ Liệu & Khôi Phục Hệ Thống
              </h4>
              <p class="text-xs text-muted" style="color: var(--text-muted);">
                Xóa toàn bộ bộ nhớ đệm trình duyệt (IndexedDB, LocalStorage) để cài lại từ đầu.
              </p>
            </div>
            <button class="btn-ghost px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 flex-shrink-0" id="btn-reset-app-data">
              Xóa Dữ Liệu Demo
            </button>
          </div>

        </div>

      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = pageHtml;
    if (window.lucide) window.lucide.createIcons();

    // Initialize Dropdown Component Listeners
    initDropdownListeners(mountNode, (val) => {
      currentSelectedModel = val;
    });

    // Quick allergy pills suggestion click
    document.querySelectorAll('#allergy-quick-pills button').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-allergy');
        const input = document.getElementById('settings-food-allergies');
        if (input && tag) {
          const current = input.value.trim();
          if (!current.toLowerCase().includes(tag.toLowerCase())) {
            input.value = current ? `${current}, ${tag}` : tag;
          }
        }
      });
    });

    // Avatar File Upload Handler
    const avatarFileInput = document.getElementById('avatar-file-input');
    avatarFileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        Modal.alert({ title: 'File Quá Lớn', message: 'Vui lòng chọn file ảnh dung lượng dưới 5MB.' });
        return;
      }

      const filenameLabel = document.getElementById('settings-avatar-filename');
      if (filenameLabel) {
        filenameLabel.textContent = `📷 ${file.name}`;
        filenameLabel.style.color = 'var(--accent-purple)';
        filenameLabel.style.fontWeight = '700';
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        newAvatarBase64 = evt.target.result;
        const preview = document.getElementById('settings-avatar-preview');
        if (preview) preview.src = newAvatarBase64;
      };
      reader.readAsDataURL(file);
    });

    // Google OAuth Mock click
    document.getElementById('btn-mock-google-login')?.addEventListener('click', async () => {
      await Modal.success({
        title: 'Đăng Nhập Google OAuth',
        message: 'Xác thực Google OAuth thành công!\nPhiên làm việc đã được mã hóa và bảo mật.'
      });
    });

    // Save Settings Handler
    document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
      const newName = document.getElementById('settings-user-name').value.trim();
      const newAge = parseInt(document.getElementById('settings-user-age').value) || profile.age;
      const newHeight = parseFloat(document.getElementById('settings-user-height').value) || profile.height;
      const newWeight = parseFloat(document.getElementById('settings-user-weight').value);
      const newAllergies = document.getElementById('settings-food-allergies').value.trim();
      const newBudget = parseInt(document.getElementById('settings-daily-budget').value) || 100000;

      await DataService.saveSetting('ninerouter_model', currentSelectedModel);

      if (newName) profile.name = newName;
      if (!isNaN(newAge)) profile.age = newAge;
      if (!isNaN(newHeight)) profile.height = newHeight;
      if (!isNaN(newWeight)) profile.currentWeight = newWeight;
      profile.foodAllergies = newAllergies;

      if (newAvatarBase64) {
        profile.avatar = newAvatarBase64;
      }

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
      const plan = await DataService.getUserPlan();
      plan.dailyBudgetVnd = newBudget;
      plan.weeklyMealPlan = generate7DayMealPlan(newBudget, DataService.getTodayString(), newAllergies);
      await DataService.saveUserPlan(plan);

      await Modal.success({
        title: 'Đã Lưu Cài Đặt!',
        message: 'Thông tin cá nhân, ảnh đại diện, ngân sách ăn uống và danh sách dị ứng đã được cập nhật thành công!'
      });

      if (onSaveComplete) onSaveComplete();
    });

    // Reset Data
    document.getElementById('btn-reset-app-data')?.addEventListener('click', async () => {
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
