import { DataService } from './services/dataService.js';
import { renderNavigation, updateNavigationXp } from './components/Navigation.js';
import { renderOnboarding } from './components/Onboarding.js';
import { renderDashboard } from './components/Dashboard.js';
import { renderPlanPage } from './components/PlanPage.js';
import { renderMealTracker } from './components/MealTracker.js';
import { renderWorkoutTracker } from './components/WorkoutTracker.js';
import { renderPhotoVault } from './components/PhotoVault.js';
import { renderGamificationPage } from './components/GamificationPage.js';
import { renderAiChatPage } from './components/AiChatPage.js';
import { renderSettingsPage } from './components/SettingsPage.js';
import { showAchievementToast } from './components/ui/AchievementToast.js';

// Global achievement toast listener — catches events from anywhere in the app
window.addEventListener('achievement:unlocked', (e) => {
  if (e.detail?.badgeIds?.length > 0) {
    showAchievementToast(e.detail.badgeIds);
  }
});

const TAB_ORDER = ['dashboard', 'plan', 'meals', 'workouts', 'photos', 'gamification', 'ai', 'settings'];

function getSavedTab() {
  const hash = window.location.hash ? window.location.hash.replace('#', '').trim() : '';
  if (hash && TAB_ORDER.includes(hash)) return hash;
  const stored = localStorage.getItem('active_tab');
  if (stored && TAB_ORDER.includes(stored)) return stored;
  return 'dashboard';
}

let currentTab = getSavedTab();
let prevTab = currentTab;

import { renderLandingPage } from './components/LandingPage.js';
import { showStreakOverlay } from './components/StreakOverlay.js';

function restoreAppShell() {
  const appContainer = document.getElementById('app');
  if (appContainer && !document.getElementById('view-mount')) {
    appContainer.innerHTML = `
      <header id="navbar-mount"></header>
      <main class="main-container">
        <div id="view-mount" class="content-area"></div>
      </main>
      <div id="modal-mount"></div>
    `;
  }
}

async function initApp() {
  await DataService.preloadAllData();

  const profile = await DataService.getUserProfile();

  // If user is not onboarded, show Landing Page showcase first
  if (!profile.isOnboarded) {
    renderLandingPage({
      onStartOnboarding: () => {
        renderOnboarding(async () => {
          restoreAppShell();
          await initApp();
        });
      },
      onLoginSuccess: async () => {
        restoreAppShell();
        await initApp();
      }
    });
    return;
  }

  restoreAppShell();

  // Ensure currentTab is persisted in localStorage & URL hash
  localStorage.setItem('active_tab', currentTab);
  if (!window.location.hash || window.location.hash !== '#' + currentTab) {
    history.replaceState(null, '', '#' + currentTab);
  }

  // Toggle AI full-screen mode on body if starting on AI tab
  if (currentTab === 'ai') {
    document.body.classList.add('ai-tab-active');
  } else {
    document.body.classList.remove('ai-tab-active');
  }

  // Render navigation header
  await renderNavigation(currentTab, handleTabChange, handleOpenAiCoach, handleOpenSettings);

  // Render active main content view
  await renderActiveView();

  // Check if first visit of the day to show Fire Streak Celebration Overlay
  const todayStr = DataService.getTodayString();
  const lastCelebrated = localStorage.getItem('last_streak_celebration_date');
  if (lastCelebrated !== todayStr) {
    localStorage.setItem('last_streak_celebration_date', todayStr);
    const progress = await DataService.getUserProgress();
    const streakCount = Math.max(1, progress.currentStreak || 1);
    setTimeout(() => {
      showStreakOverlay(streakCount);
    }, 700);
  }

  // Global Auto-Sync: Auto-refresh entire app when calendar date rolls over (e.g. tab left open overnight)
  let lastKnownDate = todayStr;
  const checkDateRollover = async () => {
    const nowStr = DataService.getTodayString();
    if (nowStr !== lastKnownDate) {
      lastKnownDate = nowStr;
      await refreshAllViews();
    }
  };
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkDateRollover();
  });
  window.addEventListener('focus', checkDateRollover);
}

async function handleTabChange(tab) {
  if (!TAB_ORDER.includes(tab)) return;
  if (tab === currentTab) return;

  prevTab = currentTab;
  currentTab = tab;

  // Persist active tab to localStorage & URL Hash
  localStorage.setItem('active_tab', tab);
  history.replaceState(null, '', '#' + tab);

  // Toggle AI full-screen mode on body
  if (tab === 'ai') {
    document.body.classList.add('ai-tab-active');
  } else {
    document.body.classList.remove('ai-tab-active');
  }

  // Trigger active view rendering immediately (0ms delay)
  const viewPromise = renderActiveView();

  // Re-render navigation & XP asynchronously in parallel without blocking tab switch
  renderNavigation(tab, handleTabChange, handleOpenAiCoach, handleOpenSettings).then(() => {
    updateNavigationXp();
  });

  await viewPromise;
}

window.addEventListener('hashchange', () => {
  const newTab = getSavedTab();
  if (newTab !== currentTab) {
    handleTabChange(newTab);
  }
});

async function renderActiveView() {
  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    const prevIdx = TAB_ORDER.indexOf(prevTab);
    const newIdx = TAB_ORDER.indexOf(currentTab);
    const slideClass = newIdx >= prevIdx ? 'slide-from-right' : 'slide-from-left';

    mountNode.classList.remove('slide-from-right', 'slide-from-left');
    // Instantly clear old tab markup so old view does NOT linger on screen
    mountNode.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-[360px] p-8 text-center animate-pulse">
        <div class="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-[#7C3AED] mb-3 shadow-sm">
          <i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>
        </div>
        <p class="text-xs font-semibold text-gray-400">Đang chuyển tab...</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons({ el: mountNode });

    // Force reflow for CSS animation restart
    void mountNode.offsetWidth;
    mountNode.classList.add(slideClass);
  }

  try {
    switch (currentTab) {
      case 'dashboard':
        await renderDashboard(handleTabChange, handleOpenAiCoach);
        break;
      case 'plan':
        await renderPlanPage(handleTabChange, handleOpenAiCoach);
        break;
      case 'meals':
        await renderMealTracker(handleOpenAiCoach);
        break;
      case 'workouts':
        await renderWorkoutTracker();
        break;
      case 'photos':
        await renderPhotoVault();
        break;
      case 'gamification':
        await renderGamificationPage();
        break;
      case 'ai':
        await renderAiChatPage(async () => {
          await refreshAllViews();
        });
        break;
      case 'settings':
        await renderSettingsPage(async () => {
          await refreshAllViews();
        });
        break;
      default:
        await renderDashboard(handleTabChange, handleOpenAiCoach);
    }
  } catch (err) {
    console.error(`❌ Error rendering tab "${currentTab}":`, err);
    if (mountNode) {
      mountNode.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem 1.5rem; max-width: 520px; margin: 2rem auto; border: 1px solid var(--border-highlight);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">⚠️</div>
          <h3 style="color: var(--accent-purple); font-weight: 800; margin-bottom: 0.5rem;">Không Thể Tải Tab "${currentTab.toUpperCase()}"</h3>
          <p class="text-sm text-muted" style="margin-bottom: 1.25rem;">Lỗi: ${err.message || err}</p>
          <button class="btn btn-primary" onclick="window.location.reload()">
            <i data-lucide="refresh-cw"></i> Tải Lại Trang
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

function handleOpenAiCoach() {
  handleTabChange('ai');
}

async function handleOpenSettings() {
  await handleTabChange('settings');
}

async function refreshAllViews() {
  await DataService.preloadAllData();
  await renderNavigation(currentTab, handleTabChange, handleOpenAiCoach, handleOpenSettings);
  await renderActiveView();
}

// Start application when DOM ready
document.addEventListener('DOMContentLoaded', initApp);
