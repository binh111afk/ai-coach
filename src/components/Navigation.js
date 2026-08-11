import { DataService } from '../services/dataService.js';
import { getLevelInfo } from '../services/gamificationService.js';
import { Modal } from './ui/Modal.js';
import { renderCrownIcon, renderGeminiIcon } from './ui/Icons.js';
import { showLevelRoadmapModal } from './ui/LevelRoadmapModal.js';

export async function renderNavigation(activeTab = 'dashboard', onTabChange, onOpenAiCoach, onOpenSettings) {
  const profile = await DataService.getUserProfile();
  const progress = await DataService.getUserProgress();
  const goal = await DataService.getUserGoal();
  const levelInfo = getLevelInfo(progress.totalXp, goal.journeyLevels);
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
      showLevelRoadmapModal();
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

export async function updateNavigationXp() {
  const progress = await DataService.getUserProgress(true); // Bypass cache to get latest totalXp
  const goal = await DataService.getUserGoal();
  const levelInfo = getLevelInfo(progress.totalXp, goal.journeyLevels);

  const badgeEl = document.getElementById('nav-level-badge-text');
  if (badgeEl) badgeEl.innerText = `Lvl ${levelInfo.currentLevel.level}/${levelInfo.maxLevel}`;

  const barEl = document.getElementById('nav-level-bar-fill');
  if (barEl) barEl.style.width = `${levelInfo.progressPercent}%`;

  const xpEl = document.getElementById('nav-level-xp-text');
  if (xpEl) xpEl.innerHTML = `${progress.totalXp} <span style="font-size: 0.7rem; color: var(--text-muted);">XP</span>`;
}

// Automatically sync navbar XP when achievement unlocked or XP updated
window.addEventListener('achievement:unlocked', updateNavigationXp);
window.addEventListener('xp:updated', updateNavigationXp);
