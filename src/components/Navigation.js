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
    <!-- Circular Arrow Button to Toggle Navigation (Bottom Right) -->
    <button class="nav-toggle-fab" id="btn-toggle-nav-floating" title="Ẩn/Hiện thanh điều hướng">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
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

    // Global toggle function
    window.toggleNavState = function(forceHide) {
      const navEl = container.querySelector('.bottom-nav');
      const fab = document.getElementById('btn-toggle-nav-floating');
      const topbarBtn = document.getElementById('btnToggleNav');
      if (!navEl) return;

      const shouldHide = forceHide !== undefined ? forceHide : !navEl.classList.contains('nav-hidden');

      if (shouldHide) {
        navEl.classList.add('nav-hidden');
        document.body.classList.add('nav-hidden-state');
        fab?.classList.add('nav-is-hidden');
        fab?.setAttribute('title', 'Hiện thanh điều hướng');
        topbarBtn?.setAttribute('title', 'Hiện thanh điều hướng');
      } else {
        navEl.classList.remove('nav-hidden');
        document.body.classList.remove('nav-hidden-state');
        fab?.classList.remove('nav-is-hidden');
        fab?.setAttribute('title', 'Ẩn thanh điều hướng');
        topbarBtn?.setAttribute('title', 'Ẩn thanh điều hướng');
      }
    };

    // Nav floating arrow button listener
    document.getElementById('btn-toggle-nav-floating')?.addEventListener('click', () => {
      if (window.toggleNavState) window.toggleNavState();
    });
  }
}

export async function updateNavigationXp() {
  // Level and XP pill temporarily removed as requested
}
