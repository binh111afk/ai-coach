import { DataService } from './services/dataService.js';
import { renderNavigation } from './components/Navigation.js';
import { renderOnboarding } from './components/Onboarding.js';
import { renderDashboard } from './components/Dashboard.js';
import { renderPlanPage } from './components/PlanPage.js';
import { renderMealTracker } from './components/MealTracker.js';
import { renderWorkoutTracker } from './components/WorkoutTracker.js';
import { renderPhotoVault } from './components/PhotoVault.js';
import { renderGamificationPage } from './components/GamificationPage.js';
import { renderAiCoachChat } from './components/AiCoachChat.js';
import { renderAiChatPage } from './components/AiChatPage.js';
import { renderSettingsModal } from './components/SettingsModal.js';
import { showAchievementToast } from './components/ui/AchievementToast.js';

// Global achievement toast listener — catches events from anywhere in the app
window.addEventListener('achievement:unlocked', (e) => {
  if (e.detail?.badgeIds?.length > 0) {
    showAchievementToast(e.detail.badgeIds);
  }
});

const TAB_ORDER = ['dashboard', 'plan', 'meals', 'workouts', 'photos', 'gamification', 'ai'];
let currentTab = 'dashboard';
let prevTab = 'dashboard';

async function initApp() {
  const profile = await DataService.getUserProfile();

  // Check if onboarding is needed
  if (!profile.isOnboarded) {
    renderOnboarding(async () => {
      await refreshAllViews();
    });
  }

  // Render navigation header
  await renderNavigation(currentTab, handleTabChange, handleOpenAiCoach, handleOpenSettings);

  // Render active main content view
  await renderActiveView();

  // Render floating AI Coach chat drawer
  await renderAiCoachChat(async () => {
    // Callback when AI proposed changes are approved by user
    await refreshAllViews();
  });
}

async function handleTabChange(tab) {
  if (tab === currentTab) return;
  prevTab = currentTab;
  currentTab = tab;

  // Toggle AI full-screen mode on body
  if (tab === 'ai') {
    document.body.classList.add('ai-tab-active');
  } else {
    document.body.classList.remove('ai-tab-active');
  }

  await renderNavigation(currentTab, handleTabChange, handleOpenAiCoach, handleOpenSettings);
  await renderActiveView();
}

async function renderActiveView() {
  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    const prevIdx = TAB_ORDER.indexOf(prevTab);
    const newIdx = TAB_ORDER.indexOf(currentTab);
    const slideClass = newIdx >= prevIdx ? 'slide-from-right' : 'slide-from-left';

    mountNode.classList.remove('slide-from-right', 'slide-from-left');
    // Force reflow for CSS animation restart
    void mountNode.offsetWidth;
    mountNode.classList.add(slideClass);
  }

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
    default:
      await renderDashboard(handleTabChange, handleOpenAiCoach);
  }
}

function handleOpenAiCoach() {
  if (window.openAiCoachDrawer) {
    window.openAiCoachDrawer();
  }
}

async function handleOpenSettings() {
  await renderSettingsModal(async () => {
    await refreshAllViews();
  });
}

async function refreshAllViews() {
  await renderNavigation(currentTab, handleTabChange, handleOpenAiCoach, handleOpenSettings);
  await renderActiveView();
}

// Start application when DOM ready
document.addEventListener('DOMContentLoaded', initApp);
