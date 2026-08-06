import { DataService, generate7DayMealPlan } from '../services/dataService.js';
import { CONFIG } from '../config.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import { Modal } from './ui/Modal.js';

export async function renderSettingsModal(onSaveComplete) {
  const profile = await DataService.getUserProfile();
  const selectedModel = await DataService.getSelectedModel();
  const plan = await DataService.getUserPlan();

  let currentSelectedModel = selectedModel;
  let newAvatarBase64 = null;

  const modelOptions = CONFIG.SUPPORTED_MODELS.map(m => ({
    value: m.id,
    label: m.name
  }));

  const modalHtml = `
    <div class="modal-overlay active" id="settings-modal">
      <div class="modal-card" style="max-width: 580px; max-height: 88vh; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; word-break: break-word; overflow-wrap: break-word;">
        
        <div class="card-header" style="margin-bottom: 1.25rem;">
          <h3 style="display: flex; align-items: center; gap: 0.5rem;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>Cài Đặt Hệ Thống & Dinh Dưỡng</span>
          </h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- User Profile & Avatar Upload Section -->
        <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-card); border: 1px solid var(--border-color); margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.85rem;">
          <div style="display: flex; align-items: center; gap: 0.85rem; min-width: 0; flex: 1;">
            <div style="position: relative; flex-shrink: 0;">
              <img id="settings-avatar-preview" src="${profile.avatar}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--accent-purple); box-shadow: 0 4px 12px rgba(117, 86, 217, 0.2);">
            </div>
            <div style="min-width: 0; flex: 1; word-break: break-word; overflow-wrap: break-word;">
              <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); word-break: break-word; overflow-wrap: break-word;" id="settings-avatar-name">${profile.name}</div>
              <div class="text-xs text-muted" id="settings-avatar-filename" style="word-break: break-word; overflow-wrap: break-word; white-space: normal; line-height: 1.4; margin-top: 0.15rem;">
                ${profile.email}
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
            <label class="btn btn-secondary btn-sm" for="avatar-file-input" style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700; padding: 0.45rem 0.85rem;" title="Tải file ảnh đại diện mới từ máy tính">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Đổi Ảnh Đại Diện</span>
            </label>
            <input type="file" id="avatar-file-input" accept="image/*" style="display: none;">

            <button class="btn btn-secondary btn-sm" id="btn-mock-google-login" style="padding: 0.45rem 0.75rem;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>OAuth</span>
            </button>
          </div>
        </div>

        <!-- 9router AI Model Selector -->
        <div style="margin-bottom: 1.25rem;">
          <h4 style="margin-bottom: 0.75rem; color: var(--accent-purple); display: flex; align-items: center; gap: 0.45rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
              <rect x="9" y="9" width="6" height="6"></rect>
              <line x1="9" y1="1" x2="9" y2="4"></line>
              <line x1="15" y1="1" x2="15" y2="4"></line>
              <line x1="9" y1="20" x2="9" y2="23"></line>
              <line x1="15" y1="20" x2="15" y2="23"></line>
              <line x1="20" y1="9" x2="23" y2="9"></line>
              <line x1="20" y1="15" x2="23" y2="15"></line>
              <line x1="1" y1="9" x2="4" y2="9"></line>
              <line x1="1" y1="15" x2="4" y2="15"></line>
            </svg>
            <span>Cấu Hình Model AI (9router API)</span>
          </h4>
          <div class="form-group">
            <label class="form-label">Chọn AI Model</label>
            <div id="settings-model-dropdown-container">
              ${renderDropdown({
                id: 'settings-model-dropdown',
                options: modelOptions,
                value: currentSelectedModel,
                placeholder: 'Chọn Model AI...'
              })}
            </div>
          </div>
        </div>

        <!-- User Profile & Food Allergies Settings -->
        <div style="margin-bottom: 1.25rem;">
          <h4 style="margin-bottom: 0.75rem; color: var(--text-main); display: flex; align-items: center; gap: 0.45rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Thông Tin Cá Nhân & Ngân Sách Ăn Uống</span>
          </h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Họ & Tên</label>
              <input type="text" class="form-input" id="settings-user-name" value="${profile.name}" style="word-break: break-word;">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Cân nặng hiện tại (kg)</label>
              <input type="number" class="form-input" id="settings-user-weight" value="${profile.currentWeight}">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label class="form-label" style="color: var(--accent-purple);">
              Ngân Sách Ăn Uống Hàng Ngày (VNĐ / Ngày)
            </label>
            <input type="number" class="form-input" id="settings-daily-budget" value="${plan.dailyBudgetVnd || 100000}" step="10000">
          </div>

          <!-- Food Allergies & Dietary Restrictions Input -->
          <div class="form-group">
            <label class="form-label" style="color: var(--accent-amber);">
              Món Ăn / Thực Phẩm Dị Ứng 
            </label>
            <input type="text" class="form-input" id="settings-food-allergies" value="${profile.foodAllergies || ''}" placeholder="Ví dụ: Hải sản tôm mực, Đậu nành, Sữa tươi lactose, Trứng..." style="word-break: break-word;">
            <span class="text-xs text-muted" style="word-break: break-word; overflow-wrap: break-word; display: block; margin-top: 0.3rem;">* AI Coach sẽ tự động lọc và tính toán lại thực đơn 7 ngày theo ngân sách và món dị ứng.</span>
          </div>
        </div>

        <!-- Save Button -->
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary" style="flex: 1;" id="btn-reset-app-data">Xóa Dữ Liệu Demo</button>
          <button class="btn btn-primary" style="flex: 1.5;" id="btn-save-settings">Lưu Cài Đặt</button>
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('modal-mount');
  if (mountNode) {
    mountNode.innerHTML = modalHtml;

    // Initialize Dropdown Component Listeners
    initDropdownListeners(mountNode, (val) => {
      currentSelectedModel = val;
    });

    const modal = document.getElementById('settings-modal');
    document.getElementById('btn-close-settings')?.addEventListener('click', () => modal.remove());

    // Avatar File Upload Handler with Word Wrap display for filename
    const avatarFileInput = document.getElementById('avatar-file-input');
    avatarFileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const filenameLabel = document.getElementById('settings-avatar-filename');
      if (filenameLabel) {
        filenameLabel.textContent = `📷 ${file.name}`;
        filenameLabel.style.wordBreak = 'break-word';
        filenameLabel.style.overflowWrap = 'break-word';
        filenameLabel.style.whiteSpace = 'normal';
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

    // Save Settings
    document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
      const newName = document.getElementById('settings-user-name').value.trim();
      const newWeight = parseFloat(document.getElementById('settings-user-weight').value);
      const newAllergies = document.getElementById('settings-food-allergies').value.trim();
      const newBudget = parseInt(document.getElementById('settings-daily-budget').value) || 100000;

      await DataService.saveSetting('ninerouter_model', currentSelectedModel);

      if (newName) profile.name = newName;
      if (!isNaN(newWeight)) profile.currentWeight = newWeight;
      profile.foodAllergies = newAllergies;

      if (newAvatarBase64) {
        profile.avatar = newAvatarBase64;
      }

      await DataService.saveUserProfile(profile);

      // Re-generate user's 7-day meal plan to respect new budget & food allergies
      const plan = await DataService.getUserPlan();
      plan.dailyBudgetVnd = newBudget;
      plan.weeklyMealPlan = generate7DayMealPlan(newBudget, DataService.getTodayString(), newAllergies);
      await DataService.saveUserPlan(plan);

      await Modal.success({
        title: 'Đã Lưu Cài Đặt!',
        message: 'Thông tin cá nhân, ảnh đại diện và ngân sách ăn uống đã được cập nhật thành công!'
      });

      modal.remove();
      if (onSaveComplete) onSaveComplete();
    });

    // Reset Data
    document.getElementById('btn-reset-app-data')?.addEventListener('click', async () => {
      const confirmed = await Modal.confirm({
        title: 'Xóa Toàn Bộ Dữ Liệu',
        message: 'Cảnh báo: Bạn có chắc chắn muốn xóa toàn bộ dữ liệu lưu trong IndexedDB để chơi lại từ đầu không?',
        type: 'warning',
        confirmText: 'Đồng Ý Xóa Rút Cạn',
        cancelText: 'Hủy Bỏ'
      });

      if (confirmed) {
        indexedDB.deleteDatabase('FitnessCoachDB');
        window.location.reload();
      }
    });
  }
}
