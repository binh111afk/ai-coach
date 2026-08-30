import { DataService, generate7DayMealPlan } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { dbManager } from '../services/db.js';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterTarget, generateJourneyLevelsAndBadges, getLevelInfo } from '../services/gamificationService.js';
import { CONFIG, isVisionModel } from '../config.js';
import { renderProviderIcon } from './ui/Icons.js';
import { Modal } from './ui/Modal.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';

// Trạng thái Nguồn AI (giữ qua các lần re-render trang cài đặt): provider đang chọn tạm, key đang gõ, kết quả test
const providerKeyTestState = { status: 'idle', message: '', key: '', providerId: null };

export async function renderSettingsPage(onSaveComplete, opts = {}) {
  const profile = await DataService.getUserProfile();
  const selectedModelId = await DataService.getSelectedModel();
  const plan = await DataService.getUserPlan();

  let currentModelId = selectedModelId;
  let newAvatarBase64 = null;

  // Nguồn AI — chỉ cho chọn 9Router / Google AI Studio. XKiro là nguồn do app cung cấp (không hiện ở đây).
  // keepState: re-render nội bộ (bấm card/test/restore) giữ lựa chọn tạm; mount mới thì đọc lại từ DB
  let currentProviderId;
  if (opts.keepState && providerKeyTestState.providerId) {
    currentProviderId = providerKeyTestState.providerId;
  } else {
    currentProviderId = await DataService.getSelectedProvider();
    providerKeyTestState.providerId = currentProviderId;
  }
  const selectableProviders = CONFIG.AI_PROVIDERS.filter(p => p.id !== 'xkiro');
  const providerApiKey = await DataService.getProviderApiKey(currentProviderId);
  const aiQuota = await DataService.getAiQuotaStatus();
  const availableModels = currentProviderId !== 'xkiro' ? await DataService.getAvailableModels(currentProviderId) : null;
  const keyTestState = providerKeyTestState;
  // Key đang hiển thị: ưu tiên key người dùng đang gõ (giữ qua re-render), sau đó tới key đã lưu
  if (keyTestState.key === '' && providerApiKey) keyTestState.key = providerApiKey;
  const displayApiKey = keyTestState.key || providerApiKey;
  const keyTestOk = keyTestState.status === 'ok' && !!displayApiKey;

  // Gộp model khả dụng đã xác thực (VD: model Gemini nạp từ key AI Studio) vào danh sách chọn model
  const extraModelObjs = (availableModels || [])
    .filter(id => !CONFIG.SUPPORTED_MODELS.some(m => m.id === id))
    .map(id => ({ id, name: `${id} (Google AI Studio)`, isVision: true }));
  const modelChoices = [...CONFIG.SUPPORTED_MODELS, ...extraModelObjs];

  // Read saved image analysis setting (defaults to true if model has vision, false otherwise)
  const savedImageAnalysis = await DataService.getSetting('ai_image_analysis');
  const isImageAnalysisEnabled = savedImageAnalysis !== false && isVisionModel(currentModelId);

  // Process food allergies into an array of string tags
  let allergyList = profile.foodAllergies
    ? profile.foodAllergies.split(',').map(s => s.trim()).filter(Boolean)
    : ['Hải sản', 'Muối biển'];

  // Compute BMR & TDEE
  const bmrVal = Math.round(calculateBMR(profile.gender || 'male', profile.currentWeight || 77, profile.height || 171, profile.age || 19));
  const tdeeVal = Math.round(calculateTDEE(bmrVal, profile.activityLevel || 1.2));

  // Find active model object
  const currentModelObj = modelChoices.find(m => m.id === currentModelId) || CONFIG.SUPPORTED_MODELS[0];
  const isDarkMode = document.body.classList.contains('dark');

  // AI Tone Dropdown Options
  const activeTone = await DataService.getSetting('ai_coach_tone') || 'inspiring';
  const toneOptions = [
    { value: 'inspiring', label: 'Truyền cảm hứng' },
    { value: 'strict', label: 'Nghiêm khắc' },
    { value: 'gentle', label: 'Nhẹ nhàng' }
  ];

  const toneDropdownHtml = renderDropdown({
    options: toneOptions,
    value: activeTone,
    id: 'select-ai-tone',
    className: 'w-40 sm:w-44'
  });

  const getInitialLetter = (fullName = '') => {
    const parts = (fullName || 'B').trim().split(/\s+/);
    const lastWord = parts[parts.length - 1];
    return (lastWord ? lastWord.charAt(0) : 'B').toUpperCase();
  };

  const initialLetter = getInitialLetter(profile.name);

  const goal = await DataService.getUserGoal();
  const progress = await DataService.getUserProgress();
  const levelInfo = getLevelInfo(progress.totalXp || 0, goal.journeyLevels);
  const currentLevelNum = levelInfo.currentLevel ? levelInfo.currentLevel.level : (progress.level || 1);
  const currentLevelTitle = levelInfo.currentLevel ? (levelInfo.currentLevel.title || levelInfo.currentLevel.name) : 'Cốt Lõi';

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
            <div class="avatar-box" id="avatar-container-box">
              ${profile.avatar ? `
                <img id="profile-avatar-img" src="${profile.avatar}" class="w-full h-full rounded-full object-cover shadow-md">
              ` : `
                <span class="avatar-letter display" id="profile-avatar-letter">${initialLetter}</span>
              `}
            </div>
            <div>
              <h2 class="display text-2xl font-semibold" id="disp-profile-name" style="color: var(--fg);">${profile.name || 'Chiến Binh Fitness'}</h2>
              <p class="text-xs text-[var(--muted)] mt-1" id="disp-profile-email">${profile.email || 'fitness_warrior@ai.app'}</p>
              <button class="btn-ghost mt-3 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 w-fit" id="btn-toggle-edit-box" style="border: 1px solid rgba(124, 58, 237, 0.2);">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> <span id="btn-edit-label">Chỉnh sửa hồ sơ</span>
              </button>
            </div>
          </div>

          <!-- Journey Day Badge Box & Level Badge Container (Right Side) -->
          <div class="flex flex-col items-start md:items-end gap-2.5 self-start md:self-center">
            <div class="flex items-center gap-3.5 p-4 rounded-2xl shadow-sm w-full md:w-auto" style="background: var(--primary-soft); border: 1px solid rgba(124, 58, 237, 0.16);">
              <div class="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-[var(--primary)] shadow-sm flex-shrink-0">
                <i data-lucide="calendar" class="w-6 h-6"></i>
              </div>
              <div>
                <div class="text-[10px] uppercase tracking-wider text-[var(--muted)] font-extrabold">Hành Trình AI</div>
                <div class="display text-xl md:text-2xl font-bold text-[var(--primary)]">Ngày ${currentJourneyDay}/${totalJourneyDays}</div>
              </div>
            </div>

            <!-- Level Badge directly under Journey Day Box -->
            <div class="level-badge shadow-sm">
              <span class="level-dot"></span>
              Lv.${currentLevelNum} · ${currentLevelTitle}
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
        
        <!-- Model Selector V5 Glass Chip Button (Click opens Popup Modal) -->
        <div class="v5-chip mb-4" id="btn-open-model-modal">
          <div class="v5-left min-w-0 pr-2 overflow-hidden">
            <div class="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center flex-shrink-0 shadow-sm border border-purple-200/50" id="disp-active-model-icon">
              ${renderProviderIcon(currentModelObj.id)}
            </div>
            <div class="flex items-center gap-1.5 min-w-0 truncate" id="disp-active-model-name">
              <span class="v5-title font-semibold text-sm truncate" style="color: var(--fg);">${currentModelObj.name.split(' (')[0]}</span>
              ${currentModelObj.name.includes('(') ? `<span class="v5-sub text-xs text-[var(--muted)] truncate flex-shrink-0">· ${currentModelObj.name.split('(')[1].replace(')', '')}</span>` : ''}
            </div>
          </div>
          <button type="button" class="v5-btn flex-shrink-0">
            <span>Thay đổi</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

        <!-- Nguồn AI: Provider / API Key / Hạn mức token ngày -->
        <style>
          @keyframes ktDotBounce { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }
          .kt-dot { display: inline-block; animation: ktDotBounce 1.1s infinite; }
        </style>
        <div class="mb-4 p-4 rounded-2xl" style="border: 1px solid rgba(124, 58, 237, 0.16); background: var(--primary-soft, rgba(124, 58, 237, 0.05));">
          <label class="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold">Nguồn AI (Provider)</label>
          ${currentProviderId === 'xkiro' ? '<p class="text-[11px] font-semibold text-emerald-600 mt-1">Đang dùng XKiro — nguồn do app cung cấp (giới hạn 50.000 token/ngày). Chọn nguồn bên dưới để dùng key riêng không giới hạn.</p>' : ''}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" id="provider-cards-container">
            ${selectableProviders.map(p => `
              <label class="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer border-2 transition ${p.id === currentProviderId ? 'border-[#7C3AED] bg-white dark:bg-gray-800/60' : 'border-transparent bg-white/60 dark:bg-gray-800/30'}" data-provider-option="${p.id}">
                <input type="radio" name="provider-option" value="${p.id}" class="hidden" ${p.id === currentProviderId ? 'checked' : ''}>
                <i data-lucide="${p.icon}" class="w-4 h-4 text-[var(--primary)] flex-shrink-0"></i>
                <span class="text-xs font-bold truncate" style="color: var(--fg);">${p.name.replace(' (Gemini)', '')}</span>
              </label>
            `).join('')}
          </div>
          <div class="mt-3">
            <label class="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold">API Key (tùy chọn — ưu tiên key của bạn)</label>
            <div class="mt-1.5 flex items-center gap-2 p-3 bg-white dark:bg-gray-800/60 rounded-xl transition" style="border: 1px solid rgba(124, 58, 237, 0.16);">
              <i data-lucide="key-round" class="w-5 h-5 text-[var(--muted)] flex-shrink-0"></i>
              <input type="password" id="input-provider-api-key" autocomplete="off" value="${displayApiKey}" placeholder="Dán API key của provider đang chọn..." class="flex-1 min-w-0 bg-transparent border-none focus:outline-none font-semibold text-sm" style="color: var(--fg); padding-right: 0.5rem;">
              ${keyTestOk
                ? '<span class="text-emerald-500 flex-shrink-0" title="Key hợp lệ & kết nối thành công"><i data-lucide="check-circle-2" class="w-5 h-5"></i></span>'
                : `<button type="button" id="btn-test-provider-key" class="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white font-bold text-[10px] uppercase tracking-wide hover:bg-[#6D28D9] transition ${keyTestState.status === 'testing' ? 'opacity-70 pointer-events-none animate-pulse' : ''}">${keyTestState.status === 'testing' ? 'Đang kiểm tra<span class="kt-dot">.</span><span class="kt-dot" style="animation-delay:.15s">.</span><span class="kt-dot" style="animation-delay:.3s">.</span>' : 'Kiểm tra'}</button>`}
            </div>
            ${currentProviderId !== 'xkiro' ? `
            <button type="button" id="btn-restore-provider" class="mt-2 w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 dark:hover:bg-gray-800/50 transition flex items-center justify-center gap-1.5">
              <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Khôi phục nguồn AI do app cung cấp (XKiro)
            </button>` : ''}
            <p class="text-[11px] font-semibold mt-1.5 ${keyTestOk ? 'text-emerald-600' : keyTestState.status === 'error' ? 'text-red-500' : 'text-[var(--muted)]'}">${keyTestState.status === 'testing' ? '⏳ Đang kiểm tra kết nối tới nhà cung cấp, vui lòng đợi vài giây...' : `${keyTestOk ? '✅ ' : keyTestState.status === 'error' ? '❌ ' : ''}${keyTestState.message || 'Nhập key rồi bấm "Kiểm tra" để xác thực & nạp model khả dụng. Model mới sẽ xuất hiện trong mục chọn Model.'}`}</p>
            <p class="text-[10px] text-[var(--muted)] mt-1">Chỉ lưu trên thiết bị này. Để trống để dùng key cấu hình sẵn trên server (Vercel).</p>
          </div>
          <div class="mt-3">
            <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
              <span>Token AI hôm nay (áp dụng nguồn XKiro)</span>
              <span>${aiQuota.used.toLocaleString('vi-VN')} / ${aiQuota.limit.toLocaleString('vi-VN')}</span>
            </div>
            <div class="h-1.5 w-full rounded-full overflow-hidden" style="background: rgba(124, 58, 237, 0.12);">
              <div class="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF]" style="width: ${Math.min(100, Math.round((aiQuota.used / aiQuota.limit) * 100))}%;"></div>
            </div>
          </div>
        </div>

        <!-- AI Toggles & Dark Mode Switcher -->
        <div class="space-y-1">
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <i data-lucide="scan-line" class="w-5 h-5 text-[var(--muted)]"></i>
              <div>
                <div class="text-sm font-semibold" style="color: var(--fg);">Phân tích hình ảnh</div>
                <div class="text-xs text-[var(--muted)]">Nhận diện calo & đọc thực đơn từ ảnh chụp</div>
              </div>
            </div>
            <div class="toggle-switch ${isImageAnalysisEnabled ? 'active' : ''}" id="toggle-image-analysis">
              <div class="toggle-knob"></div>
            </div>
          </div>

          <div style="border-top: 1px solid rgba(124, 58, 237, 0.14);"></div>

          <div class="flex items-center justify-between py-3 gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <i data-lucide="message-square-heart" class="w-5 h-5 text-[var(--muted)] flex-shrink-0"></i>
              <div>
                <div class="text-sm font-semibold" style="color: var(--fg);">Giọng điệu AI</div>
                <div class="text-xs text-[var(--muted)]">Thiết lập phong cách giao tiếp</div>
              </div>
            </div>
            ${toneDropdownHtml}
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
    <div id="modal-overlay" class="overlay hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      
      <!-- Khung Modal -->
      <div class="modal-content w-full max-w-lg bg-white dark:bg-[#1E1B2E] rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-purple-100/50 dark:border-purple-900/40">
        
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="display text-2xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">Chọn AI Model</h2>
              <p class="text-xs text-gray-400 font-medium mt-1">Tối ưu hóa trải nghiệm cá nhân hóa của bạn</p>
            </div>
            <span class="text-[10px] font-bold uppercase tracking-wider bg-[#EDE9FE] dark:bg-purple-900/50 text-[#6D28D9] dark:text-purple-300 px-2.5 py-1 rounded-full">${modelChoices.length} Models</span>
          </div>

          <!-- Search Bar -->
          <div class="relative">
            <i data-lucide="search" class="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"></i>
            <input 
              type="text" 
              id="model-search-input"
              placeholder="Tìm kiếm AI Model (Gemini, DeepSeek, Kimi, Qwen...)" 
              class="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/40 text-gray-900 dark:text-gray-100 transition-all"
            >
          </div>
        </div>

        <!-- List Models -->
        <div class="flex-1 overflow-y-auto p-4 space-y-2.5" id="model-list-container">
          ${modelChoices.map(m => {
            const isChecked = m.id === currentModelId;
            const hasVision = isVisionModel(m.id);
            let badgeClass = "text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300";
            let badgeText = "Free";

            if (m.name.toLowerCase().includes("pro") || m.name.toLowerCase().includes("ultra") || m.name.toLowerCase().includes("plus") || m.name.toLowerCase().includes("max")) {
              badgeClass = "text-purple-700 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300";
              badgeText = "Pro";
            } else if (m.name.toLowerCase().includes("code") || m.name.toLowerCase().includes("coder")) {
              badgeClass = "text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300";
              badgeText = "Code";
            } else if (m.name.toLowerCase().includes("reasoner") || m.name.toLowerCase().includes("reasoning") || m.name.toLowerCase().includes("thinking")) {
              badgeClass = "text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300";
              badgeText = "Logic";
            }

            const visionBadgeHtml = hasVision 
              ? `<span class="text-[10px] font-bold text-indigo-700 bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Hỗ trợ đọc & phân tích hình ảnh">Vision</span>`
              : `<span class="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded">Text</span>`;

            return `
              <label class="model-card flex items-center gap-4 p-3 border ${isChecked ? 'border-[#C4B5FD] bg-[#F5F3FF] dark:bg-[#2E1A47] dark:border-[#7C3AED] is-selected' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#25213B]'} rounded-2xl cursor-pointer transition-all duration-200" data-model-id="${m.id}">
                <div class="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm border border-purple-100/50 dark:border-purple-800/40">
                  ${renderProviderIcon(m.id)}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">${m.name.split(' (')[0]}</h3>
                    <span class="text-[10px] font-bold ${badgeClass} px-1.5 py-0.5 rounded">${badgeText}</span>
                    ${visionBadgeHtml}
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${m.name.includes('(') ? m.name.split('(')[1].replace(')', '') : m.id}</p>
                </div>
                <div class="model-item flex items-center">
                  <input type="radio" name="ai-model-choice" value="${m.id}" ${isChecked ? 'checked' : ''}>
                  <div class="radio-indicator">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>
              </label>
            `;
          }).join('')}
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <button id="close-modal-btn" type="button" class="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition px-4 py-2.5 rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-800/50">
            Hủy bỏ
          </button>
          <button id="apply-btn" type="button" class="flex-1 sm:flex-none text-sm font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition px-6 py-2.5 rounded-xl shadow-md shadow-purple-200 dark:shadow-none flex items-center justify-center gap-2">
            <i data-lucide="check-check" class="w-4 h-4"></i>
            Áp dụng Model
          </button>
        </div>

      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = pageHtml;
    if (window.lucide) window.lucide.createIcons();

    // Teleport model selection modal to document.body to ensure 100% fullscreen backdrop-blur
    // (dọn các modal cũ còn dính trên body trước khi gắn modal mới, tránh chồng lớp khi re-render)
    document.body.querySelectorAll(':scope > #modal-overlay').forEach(el => el.remove());
    const modelModal = document.getElementById('modal-overlay');
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
        const avatarBox = document.getElementById('avatar-container-box');
        if (avatarBox) {
          avatarBox.innerHTML = `<img id="profile-avatar-img" src="${newAvatarBase64}" class="w-full h-full rounded-full object-cover shadow-md">`;
        }
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

      if (!profile.avatar) {
        const letterEl = document.getElementById('profile-avatar-letter');
        if (letterEl) letterEl.textContent = getInitialLetter(profile.name);
      }
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

    // 2. MODEL SELECTION POPUP MODAL LOGIC
    let tempSelectedModelId = currentModelId;
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('close-modal-btn');
    const applyBtn = document.getElementById('apply-btn');
    const openBtn = document.getElementById('btn-open-model-modal');

    const updateModalSelectionUI = () => {
      document.querySelectorAll('#model-list-container .model-card').forEach(card => {
        const mId = card.getAttribute('data-model-id');
        const radio = card.querySelector('input[type="radio"]');
        if (mId === tempSelectedModelId) {
          if (radio) radio.checked = true;
          card.classList.add('is-selected');
        } else {
          if (radio) radio.checked = false;
          card.classList.remove('is-selected');
        }
      });
    };

    openBtn?.addEventListener('click', () => {
      tempSelectedModelId = currentModelId;
      updateModalSelectionUI();
      overlay?.classList.remove('hidden');
      overlay?.classList.remove('overlay');
      void overlay?.offsetWidth; 
      overlay?.classList.add('overlay');
    });

    const closeModal = () => {
      overlay?.classList.add('hidden');
    };

    closeBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    applyBtn?.addEventListener('click', async () => {
      if (tempSelectedModelId) {
        currentModelId = tempSelectedModelId;
        await DataService.saveSetting('ninerouter_model', currentModelId);

        const mObj = modelChoices.find(m => m.id === currentModelId);
        const dispEl = document.getElementById('disp-active-model-name');
        const iconEl = document.getElementById('disp-active-model-icon');
        if (mObj) {
          if (dispEl) {
            dispEl.innerHTML = `
              <span class="v5-title font-semibold text-sm truncate" style="color: var(--fg);">${mObj.name.split(' (')[0]}</span>
              ${mObj.name.includes('(') ? `<span class="v5-sub text-xs text-[var(--muted)] truncate flex-shrink-0">· ${mObj.name.split('(')[1].replace(')', '')}</span>` : ''}
            `;
          }
          if (iconEl) {
            iconEl.innerHTML = renderProviderIcon(mObj.id);
          }
        }

        // Tự động tắt công tắc Phân tích hình ảnh nếu người dùng chọn Model thuần Văn bản (Text-only)
        if (!isVisionModel(currentModelId)) {
          const imageToggle = document.getElementById('toggle-image-analysis');
          if (imageToggle && imageToggle.classList.contains('active')) {
            imageToggle.classList.remove('active');
            await DataService.saveSetting('ai_image_analysis', false);

            await Modal.warning({
              title: 'Tự Động Tắt Phân Tích Ảnh',
              message: `Bạn vừa chuyển sang **"${mObj ? mObj.name.split(' (')[0] : currentModelId}"** (model thuần Văn bản).\n\nHệ thống đã tự động **tắt** công tắc Phân tích hình ảnh.`,
              confirmText: 'Đã Hiểu'
            });
          }
        }
      }
      closeModal();
    });

    // Model Search Filtering inside Popup
    document.getElementById('model-search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#model-list-container .model-card').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });

    // Model Card click handler inside Popup
    document.querySelectorAll('#model-list-container .model-card').forEach(card => {
      card.addEventListener('click', () => {
        const mId = card.getAttribute('data-model-id');
        if (mId) {
          tempSelectedModelId = mId;
          updateModalSelectionUI();
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

    // Image analysis toggle logic with Vision check & Modal component warning
    const imageAnalysisToggle = document.getElementById('toggle-image-analysis');
    imageAnalysisToggle?.addEventListener('click', async function() {
      const isTurningOn = !this.classList.contains('active');

      if (isTurningOn) {
        if (!isVisionModel(currentModelId)) {
          const mObj = modelChoices.find(m => m.id === currentModelId);
          const mName = mObj ? mObj.name.split(' (')[0] : currentModelId;

          await Modal.warning({
            title: 'Model Không Hỗ Trợ Vision!',
            message: `Mô hình AI hiện tại **"${mName}"** là dòng AI chuyên xử lý Văn bản (Text / Code) nên không thể phân tích hình ảnh.\n\nVui lòng bấm nút **[Thay đổi]** ở phần Model AI để chọn các model có nhãn 📸 **Vision** (như **Gemini 3.6 Flash**, **Kimi 2.5** hoặc **Qwen 3.5 Plus**) trước khi bật tính năng này!`,
            confirmText: 'Đã Hiểu'
          });
          return;
        }

        this.classList.add('active');
        await DataService.saveSetting('ai_image_analysis', true);
      } else {
        this.classList.remove('active');
        await DataService.saveSetting('ai_image_analysis', false);
      }
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

    // Init custom dropdown listeners
    initDropdownListeners(mountNode, async (val, id) => {
      if (id === 'select-ai-tone') {
        await DataService.saveSetting('ai_coach_tone', val);
      }
    });

    // 4.5 NGUỒN AI: chọn provider + nhập API key + kiểm tra key & nạp model
    document.querySelectorAll('[data-provider-option]').forEach(card => {
      card.addEventListener('click', async () => {
        const pid = card.getAttribute('data-provider-option');
        if (pid === currentProviderId) return;
        currentProviderId = pid;
        providerKeyTestState.providerId = pid;
        // Reset kết quả test, nạp key & model khả dụng đã lưu của provider mới, rồi re-render
        // (re-render để modal chọn Model tính lại danh sách theo provider vừa chọn)
        providerKeyTestState.status = 'idle';
        providerKeyTestState.message = '';
        providerKeyTestState.key = (await DataService.getProviderApiKey(pid)) || '';
        renderSettingsPage(onSaveComplete, { keepState: true });
      });
    });

    // Giữ key người dùng đang gõ qua các lần re-render + gỡ tick xanh khi key thay đổi
    document.getElementById('input-provider-api-key')?.addEventListener('input', (e) => {
      providerKeyTestState.key = e.target.value;
      if (providerKeyTestState.status === 'ok') {
        providerKeyTestState.status = 'idle';
        providerKeyTestState.message = '';
      }
    });

    document.getElementById('btn-test-provider-key')?.addEventListener('click', async () => {
      const key = (providerKeyTestState.key || '').trim();
      if (!key) {
        providerKeyTestState.status = 'error';
        providerKeyTestState.message = 'Vui lòng nhập API key trước khi kiểm tra.';
        renderSettingsPage(onSaveComplete, { keepState: true });
        return;
      }
      providerKeyTestState.status = 'testing';
      providerKeyTestState.message = '';
      renderSettingsPage(onSaveComplete, { keepState: true });
      const result = await AiCoachService.validateProviderKey(currentProviderId, key);
      if (result.valid) {
        providerKeyTestState.status = 'ok';
        providerKeyTestState.key = key;
        providerKeyTestState.message = `Kết nối thành công! Đã nạp ${result.models.length} model khả dụng — bấm nút chọn Model để xem danh sách mới.`;
        await DataService.setAvailableModels(currentProviderId, result.models);
      } else {
        providerKeyTestState.status = 'error';
        providerKeyTestState.message = result.error || 'Key không hợp lệ hoặc không kết nối được.';
      }
      renderSettingsPage(onSaveComplete, { keepState: true });
    });

    document.getElementById('btn-restore-provider')?.addEventListener('click', async () => {
      // Khôi phục về nguồn AI do app cung cấp (XKiro) + model mặc định
      providerKeyTestState.status = 'idle';
      providerKeyTestState.message = '';
      providerKeyTestState.key = '';
      providerKeyTestState.providerId = 'xkiro';
      await DataService.setSelectedProvider('xkiro');
      renderSettingsPage(onSaveComplete, { keepState: true });
    });

    // 5. MAIN SAVE SETTINGS BUTTON & RESET DATA BUTTON AT BOTTOM
    document.getElementById('btn-main-save-settings')?.addEventListener('click', async () => {
      const budgetInput = document.getElementById('input-daily-budget');
      const newBudget = parseInt(budgetInput ? budgetInput.value : 100000) || 100000;

      profile.foodAllergies = allergyList.join(', ');
      await DataService.saveUserProfile(profile);

      // Lưu Nguồn AI: chỉ áp dụng cho 9Router / Google AI Studio (XKiro là nguồn do app cung cấp, không đổi từ đây)
      if (currentProviderId !== 'xkiro') {
        await DataService.setSelectedProvider(currentProviderId);
        const providerKeyInput = document.getElementById('input-provider-api-key');
        if (providerKeyInput) await DataService.setProviderApiKey(currentProviderId, providerKeyInput.value.trim());
      }

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
