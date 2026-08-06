import { DataService, generate7DayMealPlan } from '../services/dataService.js';
import { CONFIG } from '../config.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import { Modal } from './ui/Modal.js';

export async function renderSettingsModal(onSaveComplete) {
  const profile = await DataService.getUserProfile();
  const selectedModel = await DataService.getSelectedModel();
  const plan = await DataService.getUserPlan();

  let currentSelectedModel = selectedModel;

  const modelOptions = CONFIG.SUPPORTED_MODELS.map(m => ({
    value: m.id,
    label: m.name
  }));

  const modalHtml = `
    <div class="modal-overlay active" id="settings-modal">
      <div class="modal-card" style="max-width: 560px;">
        <div class="card-header">
          <h3><i data-lucide="settings" class="text-purple"></i> Cài Đặt Hệ Thống & Dinh Dưỡng</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-settings"><i data-lucide="x"></i></button>
        </div>

        <!-- Google OAuth Simulator -->
        <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-card); border: 1px solid var(--border-color); margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${profile.avatar}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover;">
            <div>
              <div style="font-weight: 800; font-size: 0.95rem;">${profile.name}</div>
              <div class="text-xs text-muted">${profile.email}</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-mock-google-login">
            <i data-lucide="shield-check" class="text-purple"></i> Google OAuth
          </button>
        </div>

        <!-- 9router AI Model Selector -->
        <div style="margin-bottom: 1.25rem;">
          <h4 style="margin-bottom: 0.75rem; color: var(--accent-purple); display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="cpu"></i> Cấu Hình Model AI (9router API)
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
          <h4 style="margin-bottom: 0.75rem; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="user"></i> Thông Tin Cá Nhân & Ngân Sách Ăn Uống
          </h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Họ & Tên</label>
              <input type="text" class="form-input" id="settings-user-name" value="${profile.name}">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Cân nặng hiện tại (kg)</label>
              <input type="number" class="form-input" id="settings-user-weight" value="${profile.currentWeight}">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label class="form-label" style="color: var(--accent-purple);">
              💵 Ngân Sách Ăn Uống Hàng Ngày (VNĐ / Ngày)
            </label>
            <input type="number" class="form-input" id="settings-daily-budget" value="${plan.dailyBudgetVnd || 100000}" step="10000">
          </div>

          <!-- Food Allergies & Dietary Restrictions Input -->
          <div class="form-group">
            <label class="form-label" style="color: var(--accent-amber);">
              🚫 Món Ăn / Thực Phẩm Dị Ứng Hoặc Kiêng Khem
            </label>
            <input type="text" class="form-input" id="settings-food-allergies" value="${profile.foodAllergies || ''}" placeholder="Ví dụ: Hải sản tôm mực, Đậu nành, Sữa tươi lactose, Trứng...">
            <span class="text-xs text-muted">* AI Coach sẽ tự động lọc và tính toán lại thực đơn 7 ngày theo ngân sách và món dị ứng.</span>
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
    if (window.lucide) window.lucide.createIcons();

    // Initialize Dropdown Component Listeners
    initDropdownListeners(mountNode, (val) => {
      currentSelectedModel = val;
    });

    const modal = document.getElementById('settings-modal');
    document.getElementById('btn-close-settings')?.addEventListener('click', () => modal.remove());

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

      await DataService.saveUserProfile(profile);

      // Re-generate user's 7-day meal plan to respect new budget & food allergies
      const plan = await DataService.getUserPlan();
      plan.dailyBudgetVnd = newBudget;
      plan.weeklyMealPlan = generate7DayMealPlan(newBudget, DataService.getTodayString(), newAllergies);
      await DataService.saveUserPlan(plan);

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
