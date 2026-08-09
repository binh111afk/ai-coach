import { DataService } from '../services/dataService.js';
import { getLevelInfo, getAllBadges, BADGES, LEVELS } from '../services/gamificationService.js';

function renderBadgeCard(b, isUnlocked) {
  return `
    <div class="badge-card ${isUnlocked ? 'badge-card--unlocked' : 'badge-card--locked'}">
      <div class="badge-card__icon" style="background: ${isUnlocked ? 'var(--accent-purple-light)' : 'var(--bg-card)'}; color: ${isUnlocked ? 'var(--accent-purple)' : 'var(--text-subtle)'};">
        <i data-lucide="${b.icon || 'shield'}" style="width: 22px; height: 22px;"></i>
      </div>
      <div class="badge-card__name">${b.name}</div>
      <div class="badge-card__desc">${b.description}</div>
      <span class="badge ${isUnlocked ? 'badge-primary' : 'badge-secondary'}" style="margin-top: 0.6rem; font-size: 0.7rem;">
        <i data-lucide="${isUnlocked ? 'check-circle' : 'lock'}" style="width: 11px; height: 11px;"></i>
        ${isUnlocked ? 'Đã Mở' : 'Khóa'}
      </span>
    </div>
  `;
}

export async function renderGamificationPage() {
  const progress = await DataService.getUserProgress();
  const goal = await DataService.getUserGoal();
  const levelInfo = getLevelInfo(progress.totalXp, goal.journeyLevels);
  const allBadges = getAllBadges(goal.journeyBadges);

  // Sort badges: Unlocked badges FIRST, followed by locked badges
  const sortedBadges = [...allBadges].sort((a, b) => {
    const aUnlocked = progress.badges.includes(a.id);
    const bUnlocked = progress.badges.includes(b.id);
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    return 0;
  });

  // Full list for popup
  const badgeCardsHtml = sortedBadges.map(b => {
    const isUnlocked = progress.badges.includes(b.id);
    return renderBadgeCard(b, isUnlocked);
  }).join('');

  // First 14 badges for PC desktop initial view
  const initial14BadgesHtml = sortedBadges.slice(0, 14).map(b => {
    const isUnlocked = progress.badges.includes(b.id);
    return renderBadgeCard(b, isUnlocked);
  }).join('');

  // Remaining badges (14+) for PC desktop expanded view
  const remainingBadgesHtml = sortedBadges.slice(14).map(b => {
    const isUnlocked = progress.badges.includes(b.id);
    return renderBadgeCard(b, isUnlocked);
  }).join('');

  // First 4 badges for mobile preview
  const previewBadgesHtml = sortedBadges.slice(0, 4).map(b => {
    const isUnlocked = progress.badges.includes(b.id);
    return renderBadgeCard(b, isUnlocked);
  }).join('');

  const html = `
    <div style="display: flex; flex-direction: column; gap: 1.75rem;">
      <!-- Level Hero Banner -->
      <div class="card" style="background: linear-gradient(135deg, rgba(245, 241, 255, 0.9), rgba(251, 250, 255, 0.9)); border: 1px solid var(--border-highlight);">
        <div class="gami-hero-row">
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            <div class="gami-crown-icon">
              <i data-lucide="crown" style="width: 36px; height: 36px;"></i>
            </div>
            <div>
              <div class="badge badge-secondary" style="margin-bottom: 0.35rem;">LEVEL ${levelInfo.currentLevel.level}</div>
              <h2 class="gami-level-name">${levelInfo.currentLevel.name}</h2>
              <div class="text-sm text-muted" style="margin-top: 0.25rem;">Tổng điểm: <b style="color: var(--accent-purple); font-size: 1rem;">${progress.totalXp} XP</b></div>
            </div>
          </div>

          <!-- Streak Card -->
          <div class="gami-streak-card">
            <div class="gami-streak-icon">
              <i data-lucide="flame" style="width: 26px; height: 26px;"></i>
            </div>
            <div>
              <div class="text-xs text-muted" style="font-weight: 800; text-transform: uppercase;">Chuỗi Kỷ Luật</div>
              <div class="gami-streak-value">${progress.currentStreak} Ngày</div>
              <div class="text-xs text-muted">Kỷ lục: ${progress.longestStreak} ngày</div>
            </div>
          </div>
        </div>

        <!-- Level Progress Bar -->
        <div style="margin-top: 1.5rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem; font-weight: 700;">
            <span>Tiến độ lên Level ${levelInfo.nextLevel ? levelInfo.nextLevel.level : 'MAX'}</span>
            <span style="color: var(--accent-purple);">${levelInfo.xpInCurrentLevel} / ${levelInfo.xpNeededForNext} XP (${levelInfo.progressPercent}%)</span>
          </div>
          <div class="progress-bar-bg" style="height: 12px;">
            <div class="progress-bar-fill" style="width: ${levelInfo.progressPercent}%; background: var(--primary-gradient);"></div>
          </div>
        </div>
      </div>

      <!-- Badges Showcase -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i data-lucide="award" style="color: var(--accent-amber);"></i> Bộ Sưu Tập Huy Hiệu (${progress.badges.length}/${sortedBadges.length})</div>
        </div>

        <!-- Desktop: 14 initial badges + smooth expandable section for remaining -->
        <div class="badges-grid-desktop">
          <div class="badges-desktop-initial">
            ${initial14BadgesHtml}
          </div>
          ${sortedBadges.length > 14 ? `
            <div class="badges-desktop-more" id="desktop-badges-more-container">
              <div class="badges-desktop-more-inner">
                ${remainingBadgesHtml}
              </div>
            </div>
            <button class="btn btn-secondary" id="btn-expand-desktop-badges" style="width: 100%; margin-top: 1rem; justify-content: center; gap: 0.5rem; font-weight: 700;">
              <i data-lucide="chevron-down" class="expand-icon" style="width: 16px; height: 16px; transition: transform 0.3s ease;"></i>
              <span id="btn-expand-desktop-text">Xem thêm ${sortedBadges.length - 14} huy hiệu còn lại</span>
            </button>
          ` : ''}
        </div>

        <!-- Mobile: 4 badges preview + "Xem tất cả" button -->
        <div class="badges-grid-mobile">
          <div class="badges-preview-row">
            ${previewBadgesHtml}
          </div>
          ${sortedBadges.length > 4 ? `
            <button class="btn btn-secondary" id="btn-view-all-badges" style="width: 100%; margin-top: 0.85rem; justify-content: center; gap: 0.4rem;">
              <i data-lucide="grid-2x2" style="width: 15px; height: 15px;"></i>
              Xem tất cả ${sortedBadges.length} huy hiệu
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Level Roadmap Section -->
      <div class="roadmap-card">
        <!-- Header -->
        <div class="roadmap-header">
          <div class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/>
              <path d="M9 3v15"/>
              <path d="M15 6v15"/>
            </svg>
          </div>
          <h2>Lộ Trình ${levelInfo.maxLevel} Cấp Độ Fitness (${goal.totalJourneyDays || goal.targetDays || 60} Ngày)</h2>
        </div>

        <!-- Levels Grid -->
        <div class="levels-grid">
          ${levelInfo.allLevels.map(l => {
            const isCurrent = levelInfo.currentLevel.level === l.level;
            const isCompleted = levelInfo.currentLevel.level > l.level;
            const statusClass = isCurrent ? 'current' : (isCompleted ? 'completed' : 'locked');

            return `
              <div class="level-item ${statusClass}">
                <div class="level-badge">Lvl ${l.level}</div>
                <div class="level-name" title="${l.name}">${l.name}</div>
                <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 0.15rem; font-weight: 600;">Cột mốc: Ngày ${l.dayMilestone || l.level * 10}</div>
                <div class="level-xp">
                  ${isCurrent ? `
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 17.2 5.7 21l2.3-7-6-4.8h7.6L12 2z"/>
                    </svg>
                    ${l.minXp} XP
                    <span class="current-tag">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="4"/>
                      </svg>
                      Hiện tại
                    </span>
                  ` : (isCompleted ? `
                    <svg viewBox="0 0 24 24" fill="currentColor" style="color: #22c55e;">
                      <path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 17.2 5.7 21l2.3-7-6-4.8h7.6L12 2z"/>
                    </svg>
                    ${l.minXp} XP
                  ` : `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 17.2 5.7 21l2.3-7-6-4.8h7.6L12 2z"/>
                    </svg>
                    ${l.minXp} XP
                  `)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- XP Rules -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i data-lucide="book-open" class="text-purple"></i> Quy Tắc Thưởng XP & Điều Kiện Mở Khóa</div>
        </div>
        <div style="font-size: 0.9rem; line-height: 1.6; display: flex; flex-direction: column; gap: 1rem;">
          <div style="background: var(--bg-subtle); padding: 1.1rem; border-radius: 16px; border-left: 4px solid var(--accent-purple);">
            <h4 style="color: var(--accent-purple); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="star" style="width: 18px; height: 18px;"></i> Cách Tích Lũy XP Hàng Ngày
            </h4>
            <ul style="padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <li><b>Đạt chỉ tiêu Calo (±15%):</b> +30 XP</li>
              <li><b>Nạp đủ Protein:</b> +20 XP</li>
              <li><b>Uống đủ nước:</b> +20 XP</li>
              <li><b>Hoàn thành tập luyện / nghỉ:</b> +25 XP</li>
              <li><b>Full checklist hàng ngày:</b> +30 XP</li>
              <li><b>Thưởng Streak:</b> +10 XP / ngày liên tiếp</li>
              <li><b>Trò chuyện với AI Coach:</b> +5 XP / tin nhắn</li>
              <li><b>Upload ảnh tiến trình:</b> +15 XP / ảnh</li>
            </ul>
          </div>
          <div style="background: var(--bg-subtle); padding: 1.1rem; border-radius: 16px; border-left: 4px solid var(--accent-amber);">
            <h4 style="color: var(--accent-amber); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="shield-check" style="width: 18px; height: 18px;"></i> Bảo Vệ Streak & Năng Lượng Tích Cực
            </h4>
            <p>FitCoach AI áp dụng triết lý <b>Năng Lượng Tích Cực</b>. Nếu bỏ lỡ ngày tập, hãy đánh dấu <b>"Ngày Nghỉ Phục Hồi"</b> để streak không bị ngắt. AI Coach sẽ động viên nhẹ nhàng!</p>
          </div>
        </div>
      </div>
    </div>

    <!-- All Badges Popup Modal (Mobile) -->
    <div id="all-badges-popup" style="display:none; position:fixed; inset:0; z-index:1100; background: rgba(30,20,60,0.65); backdrop-filter: blur(10px); align-items: center; justify-content: center; padding: 1rem;">
      <div id="all-badges-popup-card" style="background: var(--bg-card); border-radius: 24px; width: 100%; max-width: 480px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(0,0,0,0.25); border: 1px solid var(--border-color);">
        <!-- Popup Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--border-color); flex-shrink: 0;">
          <div style="font-weight: 900; font-size: 1rem; color: var(--text-main); display: flex; align-items: center; gap: 0.45rem;">
            <i data-lucide="award" style="width: 18px; height: 18px; color: var(--accent-amber);"></i>
            Tất Cả Huy Hiệu (${progress.badges.length}/${sortedBadges.length})
          </div>
          <button id="btn-close-badges-popup" style="background: var(--bg-subtle); border: 1px solid var(--border-color); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); transition: all 0.2s ease; flex-shrink: 0;">
            <i data-lucide="x" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
        <!-- Popup Badges Grid — no scrollbar -->
        <div style="padding: 1rem; overflow: hidden;">
          <div class="badges-popup-grid">
            ${badgeCardsHtml}
          </div>
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

    // Desktop: Toggle remaining 10+ badges with smooth animation
    const btnExpandDesktop = document.getElementById('btn-expand-desktop-badges');
    const moreContainerDesktop = document.getElementById('desktop-badges-more-container');
    const btnExpandText = document.getElementById('btn-expand-desktop-text');

    btnExpandDesktop?.addEventListener('click', () => {
      const isExpanded = moreContainerDesktop?.classList.contains('is-expanded');
      if (isExpanded) {
        moreContainerDesktop.classList.remove('is-expanded');
        btnExpandDesktop.classList.remove('is-expanded');
        if (btnExpandText) btnExpandText.textContent = `Xem thêm ${sortedBadges.length - 14} huy hiệu còn lại`;
      } else {
        moreContainerDesktop.classList.add('is-expanded');
        btnExpandDesktop.classList.add('is-expanded');
        if (btnExpandText) btnExpandText.textContent = `Thu gọn danh sách huy hiệu`;
      }
    });

    // Mobile: Open popup
    document.getElementById('btn-view-all-badges')?.addEventListener('click', () => {
      const popup = document.getElementById('all-badges-popup');
      if (popup) {
        popup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    });

    // Mobile: Close popup
    const closePopup = () => {
      const popup = document.getElementById('all-badges-popup');
      if (popup) {
        popup.style.display = 'none';
        document.body.style.overflow = '';
      }
    };

    document.getElementById('btn-close-badges-popup')?.addEventListener('click', closePopup);

    // Close when clicking overlay (outside card)
    document.getElementById('all-badges-popup')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('all-badges-popup')) closePopup();
    });
  }
}
