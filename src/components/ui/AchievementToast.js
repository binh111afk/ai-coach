/**
 * Achievement Toast Notification System
 * Shows a beautiful toast in the bottom-right corner when a badge is unlocked.
 * Auto-dismisses after 5 seconds with smooth animation.
 */
import { BADGES } from '../../services/gamificationService.js';

let toastQueue = [];
let isShowingToast = false;
const shownToastBadgeIds = new Set();

/**
 * Show achievement toast for one or more newly unlocked badge IDs
 * @param {string[]} newBadgeIds - array of badge IDs just unlocked
 */
export function showAchievementToast(newBadgeIds = []) {
  if (!newBadgeIds || newBadgeIds.length === 0) return;

  newBadgeIds.forEach(id => {
    if (!shownToastBadgeIds.has(id)) {
      shownToastBadgeIds.add(id);
      const badge = BADGES.find(b => b.id === id);
      if (badge) toastQueue.push(badge);
    }
  });

  if (!isShowingToast) processNextToast();
}

function processNextToast() {
  if (toastQueue.length === 0) {
    isShowingToast = false;
    return;
  }
  isShowingToast = true;
  const badge = toastQueue.shift();
  renderToast(badge, () => {
    // After this toast closes, show next (with small gap)
    setTimeout(processNextToast, 400);
  });
}

function renderToast(badge, onClose) {
  // Remove any existing toast
  document.getElementById('achievement-toast-container')?.remove();

  const container = document.createElement('div');
  container.id = 'achievement-toast-container';
  container.innerHTML = `
    <div id="achievement-toast" role="alert" aria-live="polite">
      <div class="ach-toast__shine"></div>
      <div class="ach-toast__icon-wrap">
        <i data-lucide="${badge.icon || 'award'}" class="ach-toast__icon-lucide"></i>
      </div>
      <div class="ach-toast__body">
        <div class="ach-toast__label">🏆 Thành Tựu Mới Mở Khóa!</div>
        <div class="ach-toast__name">${badge.name}</div>
        <div class="ach-toast__desc">${badge.description}</div>
      </div>
      <button class="ach-toast__close" id="ach-toast-close-btn" aria-label="Đóng">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="ach-toast__progress-bar" id="ach-toast-progress"></div>
    </div>
  `;

  document.body.appendChild(container);

  const toast = document.getElementById('achievement-toast');
  const progressBar = document.getElementById('ach-toast-progress');

  // Trigger lucide icons
  if (window.lucide) window.lucide.createIcons({ el: container });

  // Animate in
  requestAnimationFrame(() => {
    setTimeout(() => toast?.classList.add('ach-toast--visible'), 16);
  });

  // Progress bar animation (5 seconds)
  const DURATION = 5000;
  let startTime = null;
  let animFrame = null;

  function animateProgress(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const pct = Math.min(100, (elapsed / DURATION) * 100);
    if (progressBar) progressBar.style.width = (100 - pct) + '%';
    if (elapsed < DURATION) {
      animFrame = requestAnimationFrame(animateProgress);
    } else {
      dismissToast(toast, container, onClose);
    }
  }
  animFrame = requestAnimationFrame(animateProgress);

  // Manual close button
  document.getElementById('ach-toast-close-btn')?.addEventListener('click', () => {
    cancelAnimationFrame(animFrame);
    dismissToast(toast, container, onClose);
  });
}

function dismissToast(toast, container, onClose) {
  toast?.classList.remove('ach-toast--visible');
  toast?.classList.add('ach-toast--hiding');
  setTimeout(() => {
    container?.remove();
    if (onClose) onClose();
  }, 400);
}
