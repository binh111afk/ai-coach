import { DataService } from '../services/dataService.js';
import { renderGeminiIcon } from './ui/Icons.js';

export async function renderNavigation(activeTab = 'dashboard', onTabChange, onOpenAiCoach, onOpenSettings) {
  const isDark = document.body.classList.contains('dark');

  const navHtml = `
    <!-- Bottom Floating Navigation Bar -->
    <nav class="bottom-nav">
      <a class="nav-item ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard" title="Dashboard / Tổng Quan">
        <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
        <span>Tổng quan</span>
      </a>
      <a class="nav-item ${activeTab === 'plan' ? 'active' : ''}" data-tab="plan" title="Kế Hoạch AI">
        <i data-lucide="wand-2" class="w-5 h-5"></i>
        <span>Kế hoạch</span>
      </a>
      <a class="nav-item ${activeTab === 'meals' ? 'active' : ''}" data-tab="meals" title="Bữa Ăn & Dinh Dưỡng">
        <i data-lucide="utensils" class="w-5 h-5"></i>
        <span>Bữa ăn</span>
      </a>
      <a class="nav-item ${activeTab === 'workouts' ? 'active' : ''}" data-tab="workouts" title="Tập Luyện & Vận Động">
        <i data-lucide="dumbbell" class="w-5 h-5"></i>
        <span>Tập luyện</span>
      </a>
      <a class="nav-item ${activeTab === 'photos' ? 'active' : ''}" data-tab="photos" title="Kho Ảnh Tiến Trình">
        <i data-lucide="camera" class="w-5 h-5"></i>
        <span>Kho ảnh</span>
      </a>
      <a class="nav-item ${activeTab === 'gamification' ? 'active' : ''}" data-tab="gamification" title="Thành Tích & Cấp Độ">
        <i data-lucide="trophy" class="w-5 h-5"></i>
        <span>Thành tích</span>
      </a>
      <a class="nav-item ${activeTab === 'ai' ? 'active' : ''}" data-tab="ai" title="Trò Chuyện AI Coach">
        ${renderGeminiIcon({ width: 20, height: 20, color: 'var(--accent-purple)' })}
        <span>AI Coach</span>
      </a>
      <button class="nav-item border-0 bg-transparent" id="btn-toggle-theme" title="Chuyển chế độ Sáng / Tối">
        <i data-lucide="${isDark ? 'sun' : 'moon'}" class="w-5 h-5"></i>
        <span>${isDark ? 'Sáng' : 'Tối'}</span>
      </button>
      <button class="nav-item border-0 bg-transparent" id="btn-open-settings" title="Cài đặt">
        <i data-lucide="settings" class="w-5 h-5"></i>
        <span>Cài đặt</span>
      </button>
    </nav>
    <!-- Arrow button to re-show nav when hidden -->
    <button class="nav-show-btn" id="btn-show-nav" title="Hiện thanh điều hướng">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
      Điều hướng
    </button>
  `;

  const container = document.getElementById('navbar-mount');
  if (container) {
    container.innerHTML = navHtml;
    if (window.lucide) window.lucide.createIcons();

    // Listeners for tab switching
    container.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        onTabChange(el.getAttribute('data-tab'));
      });
    });

    // Theme Switcher Listener
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      renderNavigation(activeTab, onTabChange, onOpenAiCoach, onOpenSettings);
    });

    // Settings Listener
    document.getElementById('btn-open-settings')?.addEventListener('click', onOpenSettings);

    // Nav show button — visible when nav is hidden, click to restore nav
    const navEl = container.querySelector('.bottom-nav');
    const showNavBtn = document.getElementById('btn-show-nav');
    showNavBtn?.addEventListener('click', () => {
      navEl?.classList.remove('nav-hidden');
      document.body.classList.remove('nav-hidden-state');
      showNavBtn.classList.remove('visible');
    });
  }
}

export async function updateNavigationXp() {
  // Level and XP pill temporarily removed as requested
}
