import { DataService } from '../services/dataService.js';
import { renderGeminiIcon } from './ui/Icons.js';
import { initTooltips, hideTooltip } from './ui/Tooltip.js';

export async function renderNavigation(activeTab = 'dashboard', onTabChange, onOpenAiCoach, onOpenSettings) {
  const isAiTab = activeTab === 'ai';

  const navHtml = `
    <!-- Floating Navigation Bar (Horizontal on standard tabs, Right Vertical on AI tab) -->
    <nav class="bottom-nav ${isAiTab ? 'nav-right-vertical' : ''}">
      <a class="nav-item ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard" data-tooltip="Dashboard / Tổng Quan" data-tooltip-pos="${isAiTab ? 'left' : 'top'}">
        <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
        <span>Tổng quan</span>
      </a>
      <a class="nav-item ${activeTab === 'plan' ? 'active' : ''}" data-tab="plan" data-tooltip="Kế Hoạch AI" data-tooltip-pos="${isAiTab ? 'left' : 'top'}">
        <i data-lucide="wand-2" class="w-5 h-5"></i>
        <span>Kế hoạch</span>
      </a>
      <a class="nav-item ${activeTab === 'meals' ? 'active' : ''}" data-tab="meals" data-tooltip="Bữa Ăn & Dinh Dưỡng" data-tooltip-pos="${isAiTab ? 'left' : 'top'}">
        <i data-lucide="utensils" class="w-5 h-5"></i>
        <span>Bữa ăn</span>
      </a>
      <a class="nav-item ${activeTab === 'workouts' ? 'active' : ''}" data-tab="workouts" data-tooltip="Tập Luyện & Vận Động" data-tooltip-pos="${isAiTab ? 'left' : 'top'}">
        <i data-lucide="dumbbell" class="w-5 h-5"></i>
        <span>Tập luyện</span>
      </a>
      <a class="nav-item ${activeTab === 'photos' ? 'active' : ''}" data-tab="photos" data-tooltip="Kho Ảnh Tiến Trình" data-tooltip-pos="${isAiTab ? 'left' : 'top'}">
        <i data-lucide="camera" class="w-5 h-5"></i>
        <span>Kho ảnh</span>
      </a>
      <a class="nav-item ${activeTab === 'gamification' ? 'active' : ''}" data-tab="gamification" data-tooltip="Thành Tích & Cấp Độ" data-tooltip-pos="${isAiTab ? 'left' : 'top'}">
        <i data-lucide="trophy" class="w-5 h-5"></i>
        <span>Thành tích</span>
      </a>
      <a class="nav-item ${activeTab === 'ai' ? 'active' : ''}" data-tab="ai" data-tooltip="Trò Chuyện AI Coach" data-tooltip-pos="${isAiTab ? 'left' : 'top'}">
        ${renderGeminiIcon({ width: 20, height: 20, color: 'var(--accent-purple)' })}
        <span>AI Coach</span>
      </a>
      <a class="nav-item ${activeTab === 'settings' ? 'active' : ''}" data-tab="settings" data-tooltip="Cài Đặt Hệ Thống" data-tooltip-pos="${isAiTab ? 'left' : 'top'}">
        <i data-lucide="settings" class="w-5 h-5"></i>
        <span>Cài đặt</span>
      </a>
    </nav>
    ${!isAiTab ? `
    <!-- Circular Arrow Button to Toggle Navigation (Hidden when in AI tab) -->
    <button class="nav-toggle-fab" id="btn-toggle-nav-floating" title="Ẩn/Hiện thanh điều hướng">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
    </button>
    ` : ''}
  `;

  const container = document.getElementById('navbar-mount');
  if (container) {
    container.innerHTML = navHtml;
    if (window.lucide) window.lucide.createIcons();
    initTooltips();

    // Listeners for tab switching
    container.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        hideTooltip();
        onTabChange(el.getAttribute('data-tab'));
      });
    });

    // Settings Listener
    document.getElementById('btn-open-settings')?.addEventListener('click', onOpenSettings);

    // Global toggle function
    window.toggleNavState = function(forceHide) {
      if (isAiTab) return;
      const navEl = container.querySelector('.bottom-nav');
      const fab = document.getElementById('btn-toggle-nav-floating');
      const topbarBtn = document.getElementById('btnToggleNav');
      if (!navEl) return;

      const shouldHide = forceHide !== undefined ? forceHide : !navEl.classList.contains('nav-hidden');

      if (shouldHide) {
        navEl.classList.add('nav-hidden');
        document.body.classList.add('nav-hidden-state');
        fab?.classList.add('nav-is-hidden');
      } else {
        navEl.classList.remove('nav-hidden');
        document.body.classList.remove('nav-hidden-state');
        fab?.classList.remove('nav-is-hidden');
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
