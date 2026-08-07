import { DataService } from '../services/dataService.js';
import { getLevelInfo } from '../services/gamificationService.js';
import { Modal } from './ui/Modal.js';
import { renderCrownIcon, renderGeminiIcon } from './ui/Icons.js';

export async function renderNavigation(activeTab = 'dashboard', onTabChange, onOpenAiCoach, onOpenSettings) {
  const profile = await DataService.getUserProfile();
  const progress = await DataService.getUserProgress();
  const goal = await DataService.getUserGoal();
  const levelInfo = getLevelInfo(progress.totalXp);
  const isDark = document.body.classList.contains('dark');

  // Calculate Journey Day (e.g., Ngày 1/185)
  const startMs = new Date(goal.startDate || Date.now()).getTime();
  const targetMs = goal.targetDate ? new Date(goal.targetDate).getTime() : null;
  const calculatedTotalDays = targetMs ? Math.max(1, Math.round((targetMs - startMs) / 86400000)) : null;

  const daysElapsed = Math.max(1, Math.floor((Date.now() - startMs) / 86400000) + 1);
  const currentDay = goal.currentJourneyDay || daysElapsed;
  const totalDays = goal.totalJourneyDays || goal.targetDays || (calculatedTotalDays && calculatedTotalDays > 0 ? calculatedTotalDays : 60);

  const navHtml = `
    <nav class="navbar">
      <div class="navbar-container">
        <a href="#" class="brand-logo" id="nav-brand">
          <div class="brand-icon">
            <i data-lucide="zap" style="width: 24px; height: 24px;"></i>
          </div>
          <span>FitCoach <span class="text-purple">AI</span></span>
        </a>

        <div class="nav-links">
          <a class="nav-item ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
            <i data-lucide="layout-dashboard"></i> <span>Dashboard</span>
          </a>
          <a class="nav-item ${activeTab === 'plan' ? 'active' : ''}" data-tab="plan">
            <i data-lucide="wand-2"></i> <span>Kế Hoạch AI</span>
          </a>
          <a class="nav-item ${activeTab === 'meals' ? 'active' : ''}" data-tab="meals">
            <i data-lucide="utensils"></i> <span>Bữa Ăn</span>
          </a>
          <a class="nav-item ${activeTab === 'workouts' ? 'active' : ''}" data-tab="workouts">
            <i data-lucide="dumbbell"></i> <span>Tập Luyện</span>
          </a>
          <a class="nav-item ${activeTab === 'photos' ? 'active' : ''}" data-tab="photos">
            <i data-lucide="camera"></i> <span>Kho Ảnh</span>
          </a>
          <a class="nav-item ${activeTab === 'gamification' ? 'active' : ''}" data-tab="gamification">
            <i data-lucide="trophy"></i> <span>Thành Tích</span>
          </a>
          <a class="nav-item ${activeTab === 'ai' ? 'active' : ''}" data-tab="ai" style="font-weight: 800; color: var(--accent-purple);">
            ${renderGeminiIcon({ width: 17, height: 17 })} <span>AI</span>
          </a>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <!-- Sleek Vibrant Level & XP Badge -->
          <div style="display: flex; align-items: center; gap: 0.6rem; background: linear-gradient(135deg, rgba(117, 86, 217, 0.12), rgba(168, 145, 255, 0.08)); padding: 0.35rem 0.85rem; border-radius: var(--radius-full); border: 1.5px solid rgba(117, 86, 217, 0.3); box-shadow: 0 4px 12px rgba(117, 86, 217, 0.1); cursor: pointer; transition: all 0.2s ease;" id="btn-level-widget" title="Xem Thành Tích & Cấp Độ XP">
            <div style="display: flex; align-items: center; gap: 0.35rem; background: linear-gradient(135deg, #7556D9, #6042C0); color: #FFFFFF; padding: 0.25rem 0.65rem; border-radius: 9999px; font-weight: 800; font-size: 0.775rem; box-shadow: 0 2px 8px rgba(117, 86, 217, 0.3);">
              Lvl ${levelInfo.currentLevel.level}
            </div>
            <div style="width: 60px; height: 7px; background: rgba(117, 86, 217, 0.18); border-radius: 10px; overflow: hidden; position: relative;">
              <div style="width: ${levelInfo.progressPercent}%; height: 100%; background: linear-gradient(90deg, #7556D9, #A891FF); border-radius: 10px; box-shadow: 0 0 8px rgba(117, 86, 217, 0.6);"></div>
            </div>
            <span style="font-weight: 800; font-size: 0.8rem; color: #7556D9;">${progress.totalXp} <span style="font-size: 0.7rem; color: var(--text-muted);">XP</span></span>
          </div>

          <!-- Interactive Journey Day Progress Badge (Thay thế nút AI Coach cũ) -->
          <div style="display: flex; align-items: center; gap: 0.45rem; background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(251, 191, 36, 0.08)); border: 1.5px solid rgba(245, 158, 11, 0.35); padding: 0.4rem 0.85rem; border-radius: var(--radius-full); font-weight: 800; font-size: 0.825rem; color: #D97706; cursor: pointer; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.12); transition: all 0.2s ease;" id="btn-journey-day-widget" title="Bấm để chỉnh sửa Ngày trong hành trình">
            <i data-lucide="flag" style="width: 14px; height: 14px; color: #D97706;"></i>
            <span>Ngày ${currentDay}/${totalDays}</span>
          </div>

          <!-- Light/Dark Mode Switcher -->
          <button class="btn btn-secondary btn-icon" id="btn-toggle-theme" title="Chuyển chế độ Sáng / Tối">
            <i data-lucide="${isDark ? 'sun' : 'moon'}"></i>
          </button>

          <!-- Settings -->
          <button class="btn btn-secondary btn-icon" id="btn-open-settings" title="Cài đặt">
            <i data-lucide="settings"></i>
          </button>
        </div>
      </div>
    </nav>
  `;

  const container = document.getElementById('navbar-mount');
  if (container) {
    container.innerHTML = navHtml;
    if (window.lucide) window.lucide.createIcons();

    // Listeners
    container.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        onTabChange(el.getAttribute('data-tab'));
      });
    });

    document.getElementById('nav-brand')?.addEventListener('click', (e) => {
      e.preventDefault();
      onTabChange('dashboard');
    });

    document.getElementById('btn-level-widget')?.addEventListener('click', () => {
      onTabChange('gamification');
    });

    // Edit Journey Day Handler
    document.getElementById('btn-journey-day-widget')?.addEventListener('click', async () => {
      const inputVal = await Modal.prompt({
        title: 'Chỉnh Sửa Ngày Hành Trình',
        message: 'Nhập ngày hiện tại và tổng số ngày mục tiêu (ví dụ: <b>30/100</b>)',
        placeholder: `${currentDay}/${totalDays}`,
        defaultValue: `${currentDay}/${totalDays}`,
        confirmText: 'Cập Nhật',
        cancelText: 'Hủy'
      });

      if (inputVal) {
        const parts = inputVal.split('/');
        const newDay = parseInt(parts[0]) || currentDay;
        const newTotal = parts[1] ? (parseInt(parts[1]) || totalDays) : totalDays;

        goal.currentJourneyDay = newDay;
        goal.totalJourneyDays = newTotal;
        await DataService.saveUserGoal(goal);

        await Modal.success({
          title: 'Đã Cập Nhật Ngày Hành Trình!',
          message: `Hành trình cá nhân đã được đặt thành: Ngày ${newDay}/${newTotal}`
        });

        renderNavigation(activeTab, onTabChange, onOpenAiCoach, onOpenSettings);
      }
    });

    // Theme Switcher
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      renderNavigation(activeTab, onTabChange, onOpenAiCoach, onOpenSettings);
    });

    document.getElementById('btn-open-settings')?.addEventListener('click', onOpenSettings);
  }
}
