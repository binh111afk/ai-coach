import { DataService } from '../../services/dataService.js';
import { getLevelInfo } from '../../services/gamificationService.js';

export async function showLevelRoadmapModal() {
  const progress = await DataService.getUserProgress();
  const goal = await DataService.getUserGoal();
  const levelInfo = getLevelInfo(progress.totalXp || 0, goal.journeyLevels);

  const { currentLevel, nextLevel, totalXp, xpInCurrentLevel, xpNeededForNext, progressPercent, allLevels } = levelInfo;

  const modalMount = document.getElementById('modal-mount');
  if (!modalMount) return;

  const modalHtml = `
    <div class="level-roadmap-overlay" id="level-roadmap-overlay">
      <div class="level-roadmap-popup">
        <!-- Header -->
        <div class="header">
          <button class="close-btn" aria-label="Đóng" id="btn-close-level-roadmap">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M1 1l12 12M13 1L1 13"/>
            </svg>
          </button>

          <div class="label">Lộ trình cấp độ</div>
          <h2 class="title">Hành trình Level ${currentLevel.level}</h2>

          <div class="progress-info">
            <span class="xp-text">
              ${nextLevel 
                ? `<strong>${xpInCurrentLevel}</strong> / ${xpNeededForNext} XP để lên Level ${nextLevel.level}`
                : `<strong>Đã Đạt Cấp Độ Tối Đa (${totalXp} XP)</strong>`}
            </span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>

        <!-- Timeline -->
        <div class="timeline">
          ${allLevels.map((lvl) => {
            const isCurrent = currentLevel.level === lvl.level;
            const isPassed = currentLevel.level > lvl.level || totalXp >= lvl.minXp;

            return `
              <div class="level-item ${isCurrent ? 'current' : ''}">
                <div class="level-dot" style="${isPassed ? 'background: linear-gradient(135deg, #8b5cf6, #7c3aed);' : 'background: #e5e7eb; box-shadow: none;'}">
                  ${isPassed ? `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ` : `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #9ca3af;">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  `}
                </div>
                <div class="level-card">
                  <div class="level-name">Level ${lvl.level} - ${lvl.name}</div>
                  <div class="level-reward">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                    </svg>
                    ${lvl.description || `Mở khóa mốc Level ${lvl.level}`}
                  </div>
                  <div class="level-xp">Mốc: ${lvl.minXp} XP</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = modalHtml;
  const overlayEl = container.firstElementChild;
  modalMount.appendChild(overlayEl);

  const closeModal = () => {
    overlayEl.classList.add('fadeOut');
    setTimeout(() => {
      overlayEl.remove();
    }, 200);
  };

  document.getElementById('btn-close-level-roadmap')?.addEventListener('click', closeModal);
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeModal();
  });
}
