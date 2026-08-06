import { DataService } from '../services/dataService.js';
import { getLevelInfo } from '../services/gamificationService.js';

export async function renderNavigation(activeTab = 'dashboard', onTabChange, onOpenAiCoach, onOpenSettings) {
  const profile = await DataService.getUserProfile();
  const progress = await DataService.getUserProgress();
  const levelInfo = getLevelInfo(progress.totalXp);
  const isDark = document.body.classList.contains('dark');

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
            <i data-lucide="sparkles"></i> <span>Kế Hoạch AI</span>
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
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <!-- Level & XP Badge -->
          <div style="display: flex; align-items: center; gap: 0.6rem; background: var(--bg-subtle); padding: 0.4rem 0.85rem; border-radius: var(--radius-full); border: 1px solid var(--border-color); cursor: pointer;" id="btn-level-widget">
            <span class="badge badge-primary"><i data-lucide="crown"></i> Lvl ${levelInfo.currentLevel.level}</span>
            <div style="width: 60px; height: 7px; background: var(--bg-card); border-radius: 10px; overflow: hidden;">
              <div style="width: ${levelInfo.progressPercent}%; height: 100%; background: var(--primary-gradient);"></div>
            </div>
            <span class="text-xs text-muted" style="font-weight: 800;">${progress.totalXp} XP</span>
          </div>

          <!-- Light/Dark Mode Switcher -->
          <button class="btn btn-secondary btn-icon" id="btn-toggle-theme" title="Chuyển chế độ Sáng / Tối">
            <i data-lucide="${isDark ? 'sun' : 'moon'}"></i>
          </button>

          <!-- AI Coach Trigger -->
          <button class="btn btn-ai btn-sm" id="btn-trigger-ai-coach">
            <i data-lucide="sparkles"></i> <span>AI Coach</span>
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

    // Theme Switcher
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      renderNavigation(activeTab, onTabChange, onOpenAiCoach, onOpenSettings);
    });

    document.getElementById('btn-trigger-ai-coach')?.addEventListener('click', onOpenAiCoach);
    document.getElementById('btn-open-settings')?.addEventListener('click', onOpenSettings);
  }
}
