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

  // First 12 badges for PC desktop initial view (2 full rows of 6)
  const initial12BadgesHtml = sortedBadges.slice(0, 12).map(b => {
    const isUnlocked = progress.badges.includes(b.id);
    return renderBadgeCard(b, isUnlocked);
  }).join('');

  // Remaining badges (12+) for PC desktop expanded view
  const remainingBadgesHtml = sortedBadges.slice(12).map(b => {
    const isUnlocked = progress.badges.includes(b.id);
    return renderBadgeCard(b, isUnlocked);
  }).join('');

  // First 4 badges for mobile preview
  const previewBadgesHtml = sortedBadges.slice(0, 4).map(b => {
    const isUnlocked = progress.badges.includes(b.id);
    return renderBadgeCard(b, isUnlocked);
  }).join('');

  const remainingXpNeeded = levelInfo.nextLevel ? Math.max(0, levelInfo.xpNeededForNext - levelInfo.xpInCurrentLevel) : 0;

  const currentLevelIndex = Math.max(0, levelInfo.allLevels.findIndex(l => l.level === levelInfo.currentLevel.level));
  const totalLevelsCount = levelInfo.allLevels.length;

  let segmentXpPercent = 0;
  if (levelInfo.nextLevel && levelInfo.xpNeededForNext > 0) {
    segmentXpPercent = Math.min(1, Math.max(0, levelInfo.xpInCurrentLevel / levelInfo.xpNeededForNext));
  } else if (!levelInfo.nextLevel) {
    segmentXpPercent = 1;
  }

  const overallProgressUnits = currentLevelIndex + segmentXpPercent;
  const lineFillWidthPx = Math.round(overallProgressUnits * 176);
  const pinLeftPx = 88 + lineFillWidthPx;
  const segmentPercentRounded = Math.round(segmentXpPercent * 100);

  const html = `
    <div class="max-w-6xl mx-auto w-full space-y-6 fade-up">
      
      <!-- ==================== STATUS HUB WOW EFFECT ==================== -->
      <div class="relative mb-6 fade-up">
        
        <div class="relative glass-card rounded-[28px] p-6 md:p-8" style="border: 1px solid rgba(124, 58, 237, 0.18) !important;">
          <div class="flex flex-col md:flex-row gap-8 items-center justify-between">
            
            <!-- Left: Level & XP Progress -->
            <div class="flex-1 w-full">
              <div class="flex items-center gap-4 mb-6">
                <!-- Level Icon -->
                <div class="relative animate-float">
                  <div class="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] blur-lg opacity-50 animate-glow-pulse"></div>
                  <div class="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex items-center justify-center text-white shadow-xl border border-white/40">
                    <i data-lucide="crown" class="w-8 h-8 drop-shadow-lg"></i>
                  </div>
                </div>
                
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-[10px] font-bold text-[var(--primary)] tracking-[0.2em] bg-[var(--primary-soft)] px-2.5 py-0.5 rounded-md">LEVEL ${levelInfo.currentLevel.level}</span>
                    <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i>
                  </div>
                  <h2 class="display text-2xl md:text-3xl font-semibold leading-tight" style="color: var(--fg);">${levelInfo.currentLevel.name}</h2>
                  <p class="text-sm text-[var(--muted)] mt-0.5">Tổng điểm: <span class="font-bold" style="color: var(--fg);">${progress.totalXp} XP</span></p>
                </div>
              </div>
              
              <!-- Progress Bar -->
              <div class="mb-2 flex justify-between items-baseline">
                <span class="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Tiến độ lên Level ${levelInfo.nextLevel ? levelInfo.nextLevel.level : 'MAX'}</span>
                <span class="text-xs font-bold text-[var(--primary)]">${levelInfo.progressPercent}%</span>
              </div>
              <div class="relative h-4 neon-track rounded-full overflow-hidden">
                <div class="absolute top-0 left-0 h-full neon-fill rounded-full flex items-center justify-end pr-2" style="width: ${levelInfo.progressPercent}%;">
                  <div class="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_8px_white]"></div>
                </div>
              </div>
              <div class="mt-2.5 flex justify-between text-xs">
                <span class="font-semibold text-[var(--muted)]">${levelInfo.xpInCurrentLevel} / ${levelInfo.xpNeededForNext} XP</span>
                <span class="font-bold text-[var(--accent)] flex items-center gap-1">
                  ${levelInfo.nextLevel ? `${remainingXpNeeded} XP nữa` : 'Đã Đạt Cấp Tối Đa'} 
                  <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                </span>
              </div>
            </div>

            <!-- Divider -->
            <div class="hidden md:block w-px h-36 bg-gradient-to-b from-transparent via-[rgba(124,58,237,0.2)] to-transparent"></div>

            <!-- Right: Streak Card -->
            <div class="w-full md:w-80 relative">
              <div class="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-3xl blur-xl opacity-15"></div>
              <div class="relative rounded-3xl p-5 text-center shadow-sm" style="background: rgba(255, 248, 240, 0.9); border: 1px solid rgba(249, 115, 22, 0.22);">
                
                <div class="relative inline-block mb-2 animate-float" style="animation-delay: 0.5s;">
                  <div class="absolute inset-0 bg-orange-500 blur-md opacity-40 animate-glow-pulse"></div>
                  <div class="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg border border-white">
                    <i data-lucide="flame" class="w-7 h-7 text-white drop-shadow-lg"></i>
                  </div>
                </div>

                <div class="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-0.5">Chuỗi Kỷ Luật</div>
                <div class="display text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-amber-500">
                  ${progress.currentStreak} Ngày
                </div>
                
                <div class="mt-2 pt-2 flex items-center justify-center gap-1.5 text-[10px] text-orange-500 font-semibold" style="border-top: 1px solid rgba(249, 115, 22, 0.15);">
                  <i data-lucide="clock" class="w-3 h-3"></i> Cooldown: 1 ngày
                </div>
                <div class="mt-1 flex items-center justify-center gap-1.5 text-[10px] text-[var(--muted)] font-semibold">
                  <i data-lucide="award" class="w-3 h-3"></i> Kỷ lục: ${progress.longestStreak} ngày
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Badges Showcase -->
      <div class="glass-card rounded-[32px] p-6 md:p-8 relative overflow-hidden fade-up" style="border: 1px solid rgba(124, 58, 237, 0.18) !important;">
        <div class="relative z-10">

          <!-- Header -->
          <div class="flex items-center gap-3.5 mb-6">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" style="background: linear-gradient(135deg, #F59E0B, #D946EF);">
              <i data-lucide="award" class="w-6 h-6" style="color: #FFFFFF;"></i>
            </div>
            <div>
              <p class="text-[11px] font-bold tracking-widest uppercase mb-0.5" style="color: var(--accent-purple);">DANH HIỆU & THÀNH TÍCH</p>
              <h2 class="display text-xl md:text-2xl font-bold leading-tight" style="color: var(--text-main);">Bộ Sưu Tập Huy Hiệu (${progress.badges.length}/${sortedBadges.length})</h2>
            </div>
          </div>

          <!-- Desktop: 12 initial badges (2 rows of 6) + smooth expandable section for remaining -->
          <div class="badges-grid-desktop">
            <div class="badges-desktop-initial">
              ${initial12BadgesHtml}
            </div>
            ${sortedBadges.length > 12 ? `
              <div class="badges-desktop-more" id="desktop-badges-more-container">
                <div class="badges-desktop-more-inner">
                  ${remainingBadgesHtml}
                </div>
              </div>
              <button class="btn btn-secondary" id="btn-expand-desktop-badges" style="width: 100%; margin-top: 1rem; justify-content: center; gap: 0.5rem; font-weight: 700;">
                <i data-lucide="chevron-down" class="expand-icon" style="width: 16px; height: 16px; transition: transform 0.3s ease;"></i>
                <span id="btn-expand-desktop-text">Xem thêm ${sortedBadges.length - 12} huy hiệu còn lại</span>
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
      </div>

      <!-- Level Roadmap Section -->
      <div class="glass-card rounded-[32px] p-6 md:p-8 relative overflow-hidden fade-up" style="border: 1px solid rgba(124, 58, 237, 0.18) !important;">
        <div class="relative z-10">

          <!-- Header -->
          <div class="flex items-center gap-3.5 mb-6">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" style="background: linear-gradient(135deg, #7C3AED, #3B82F6);">
              <i data-lucide="map" class="w-6 h-6" style="color: #FFFFFF;"></i>
            </div>
            <div>
              <p class="text-[11px] font-bold tracking-widest uppercase mb-0.5" style="color: var(--accent-purple);">LỘ TRÌNH ${levelInfo.maxLevel} CẤP ĐỘ</p>
              <h2 class="display text-xl md:text-2xl font-bold leading-tight" style="color: var(--text-main);">Lộ Trình ${levelInfo.maxLevel} Cấp Độ Fitness (${goal.totalJourneyDays || goal.targetDays || 60} Ngày)</h2>
            </div>
          </div>

          <!-- Flowing Energy Track Container -->
          <div class="relative py-4 px-2 md:px-10">
            <!-- Navigation Arrow Left -->
            <button id="btn-scroll-level-left" class="nav-arrow left" aria-label="Cuộn sang trái">
              <i data-lucide="chevron-left" class="w-5 h-5"></i>
            </button>

            <!-- Navigation Arrow Right -->
            <button id="btn-scroll-level-right" class="nav-arrow right" aria-label="Cuộn sang phải">
              <i data-lucide="chevron-right" class="w-5 h-5"></i>
            </button>

            <!-- Scrollable Track Line -->
            <div id="level-roadmap-track" class="flex items-center overflow-x-auto scrollbar-hide py-10 px-4">
              <div class="flex items-center relative min-w-max">
                
                <!-- Background gray line (centered exactly at Y=36px) -->
                <div class="absolute left-[88px] right-[88px] top-[34px] h-1 bg-gray-200 dark:bg-gray-700/60 rounded-full"></div>
                
                <!-- Progress purple gradient line (filled exactly to current XP) -->
                <div class="absolute left-[88px] top-[34px] h-1 bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#D946EF] rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(217,70,239,0.6)]" style="width: ${lineFillWidthPx}px;"></div>
                
                <!-- Flowing energy laser animation -->
                <div class="absolute left-[88px] right-[88px] top-[34px] h-1 overflow-hidden rounded-full pointer-events-none">
                  <div class="flow-line-anim"></div>
                </div>

                <!-- XP Progress Glowing Indicator Pin Pinpoint (Centered at Y=36px) -->
                <div class="absolute top-[36px] z-30 pointer-events-none transition-all duration-700" style="left: ${pinLeftPx}px; transform: translate(-50%, -50%);">
                  <div class="relative flex items-center justify-center">
                    <div class="w-6 h-6 rounded-full bg-[#D946EF] opacity-75 animate-ping"></div>
                    <div class="w-4.5 h-4.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] border-2 border-white dark:border-[#1E1B2E] shadow-xl absolute"></div>
                  </div>
                  <!-- Floating Tooltip badge anchored above pin -->
                  <div class="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white text-[10px] font-extrabold shadow-lg border border-white/40 whitespace-nowrap flex items-center gap-1">
                    <i data-lucide="zap" class="w-3 h-3 text-amber-300 fill-amber-300"></i>
                    ${progress.totalXp} XP (${segmentPercentRounded}%)
                  </div>
                </div>

                <!-- Level Nodes -->
                ${levelInfo.allLevels.map((l, idx) => {
                  const isCurrent = levelInfo.currentLevel.level === l.level;
                  const isCompleted = levelInfo.currentLevel.level > l.level;

                  return `
                    <div class="flex flex-col items-center z-10 w-44 drop-in" style="animation-delay: ${(idx * 0.1).toFixed(1)}s">
                      ${isCurrent ? `
                        <div class="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[#7C3AED] to-[#D946EF] text-white flex items-center justify-center display font-bold text-2xl pulse-glow ring-4 ring-white dark:ring-[#1E1B2E] shadow-xl">
                          ${l.level}
                        </div>
                        <h4 class="display text-base font-bold mt-4 text-center shine-text">${l.name}</h4>
                        <p class="text-xs text-muted mt-1 text-center font-bold" style="color: var(--text-muted);">
                          Ngày ${l.dayMilestone || l.level * 10} · <span class="text-[#D946EF] font-extrabold">${l.minXp} XP</span>
                        </p>
                      ` : (isCompleted ? `
                        <div class="w-[72px] h-[72px] rounded-full bg-emerald-500 text-white flex items-center justify-center display font-bold text-2xl ring-4 ring-white dark:ring-[#1E1B2E] shadow-md">
                          <i data-lucide="check" class="w-7 h-7"></i>
                        </div>
                        <h4 class="display text-base font-semibold mt-4 text-center text-emerald-600 dark:text-emerald-400">${l.name}</h4>
                        <p class="text-xs text-muted mt-1 text-center font-semibold" style="color: var(--text-muted);">
                          Ngày ${l.dayMilestone || l.level * 10} · ${l.minXp} XP
                        </p>
                      ` : `
                        <div class="w-[72px] h-[72px] rounded-full bg-white dark:bg-[#25213B] border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center display font-bold text-2xl ring-4 ring-white dark:ring-[#1E1B2E]">
                          ${l.level}
                        </div>
                        <h4 class="display text-base font-semibold text-gray-400 dark:text-gray-500 mt-4 text-center">${l.name}</h4>
                        <p class="text-xs text-gray-300 dark:text-gray-600 mt-1 text-center font-medium">
                          Ngày ${l.dayMilestone || l.level * 10} · ${l.minXp} XP
                        </p>
                      `)}
                    </div>
                  `;
                }).join('')}

              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- XP Rules & Unlock Conditions -->
      <div class="glass-card rounded-[32px] p-6 md:p-8 relative overflow-hidden fade-up" style="border: 1px solid rgba(124, 58, 237, 0.18) !important;">
        <div class="relative z-10">
          <!-- Header -->
          <div class="flex items-center gap-3.5 mb-6">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" style="background: linear-gradient(135deg, #7C3AED, #D946EF);">
              <i data-lucide="award" class="w-6 h-6" style="color: #FFFFFF;"></i>
            </div>
            <div>
              <p class="text-[11px] font-bold tracking-widest uppercase mb-0.5" style="color: var(--accent-purple);">Hệ Thống Điểm</p>
              <h2 class="display text-xl md:text-2xl font-bold leading-tight" style="color: var(--text-main);">Quy Tắc Thưởng XP & Điều Kiện Mở Khóa</h2>
            </div>
          </div>

          <!-- Section 1: Accumulate XP -->
          <div class="mb-6">
            <h3 class="text-xs font-bold uppercase tracking-wider mb-3.5 flex items-center gap-2" style="color: var(--text-muted);">
              <i data-lucide="zap" class="w-4 h-4" style="color: var(--accent-purple);"></i>
              Cách Tích Lũy XP Hàng Ngày
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Item 1 -->
              <div class="xp-item flex items-center justify-between gap-3 p-3.5 rounded-2xl">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(249, 115, 22, 0.15); color: #EA580C;">
                    <i data-lucide="flame" class="w-5 h-5"></i>
                  </div>
                  <span class="text-sm font-semibold truncate" style="color: var(--text-main);">Đạt chỉ tiêu Calo (±15%)</span>
                </div>
                <span class="display text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex-shrink-0" style="background: linear-gradient(135deg, #7C3AED, #D946EF); color: #FFFFFF;">+30 XP</span>
              </div>

              <!-- Item 2 -->
              <div class="xp-item flex items-center justify-between gap-3 p-3.5 rounded-2xl">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(239, 68, 68, 0.15); color: #DC2626;">
                    <i data-lucide="utensils" class="w-5 h-5"></i>
                  </div>
                  <span class="text-sm font-semibold truncate" style="color: var(--text-main);">Nạp đủ lượng Protein</span>
                </div>
                <span class="display text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex-shrink-0" style="background: linear-gradient(135deg, #7C3AED, #D946EF); color: #FFFFFF;">+20 XP</span>
              </div>

              <!-- Item 3 -->
              <div class="xp-item flex items-center justify-between gap-3 p-3.5 rounded-2xl">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(59, 130, 246, 0.15); color: #2563EB;">
                    <i data-lucide="dumbbell" class="w-5 h-5"></i>
                  </div>
                  <span class="text-sm font-semibold truncate" style="color: var(--text-main);">Hoàn thành bài tập AI / nghỉ</span>
                </div>
                <span class="display text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex-shrink-0" style="background: linear-gradient(135deg, #7C3AED, #D946EF); color: #FFFFFF;">+25 XP</span>
              </div>

              <!-- Item 4 -->
              <div class="xp-item flex items-center justify-between gap-3 p-3.5 rounded-2xl">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(6, 182, 212, 0.15); color: #0891B2;">
                    <i data-lucide="droplet" class="w-5 h-5"></i>
                  </div>
                  <span class="text-sm font-semibold truncate" style="color: var(--text-main);">Uống đủ nước (2.7L)</span>
                </div>
                <span class="display text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex-shrink-0" style="background: linear-gradient(135deg, #7C3AED, #D946EF); color: #FFFFFF;">+15 XP</span>
              </div>

              <!-- Item 5 -->
              <div class="xp-item flex items-center justify-between gap-3 p-3.5 rounded-2xl">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(16, 185, 129, 0.15); color: #059669;">
                    <i data-lucide="check-square" class="w-5 h-5"></i>
                  </div>
                  <span class="text-sm font-semibold truncate" style="color: var(--text-main);">Full checklist hàng ngày</span>
                </div>
                <span class="display text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex-shrink-0" style="background: linear-gradient(135deg, #7C3AED, #D946EF); color: #FFFFFF;">+30 XP</span>
              </div>

              <!-- Item 6 -->
              <div class="xp-item flex items-center justify-between gap-3 p-3.5 rounded-2xl">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(245, 158, 11, 0.15); color: #D97706;">
                    <i data-lucide="award" class="w-5 h-5"></i>
                  </div>
                  <span class="text-sm font-semibold truncate" style="color: var(--text-main);">Thưởng Streak chuỗi liên tục</span>
                </div>
                <span class="display text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex-shrink-0" style="background: linear-gradient(135deg, #7C3AED, #D946EF); color: #FFFFFF;">+10 XP / ngày</span>
              </div>

              <!-- Item 7 -->
              <div class="xp-item flex items-center justify-between gap-3 p-3.5 rounded-2xl">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(168, 85, 247, 0.15); color: #9333EA;">
                    <i data-lucide="bot" class="w-5 h-5"></i>
                  </div>
                  <span class="text-sm font-semibold truncate" style="color: var(--text-main);">Trò chuyện tư vấn AI Coach</span>
                </div>
                <span class="display text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex-shrink-0" style="background: linear-gradient(135deg, #7C3AED, #D946EF); color: #FFFFFF;">+5 XP / tin</span>
              </div>

              <!-- Item 8 -->
              <div class="xp-item flex items-center justify-between gap-3 p-3.5 rounded-2xl">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(236, 72, 153, 0.15); color: #DB2777;">
                    <i data-lucide="camera" class="w-5 h-5"></i>
                  </div>
                  <span class="text-sm font-semibold truncate" style="color: var(--text-main);">Upload ảnh tiến trình vóc dáng</span>
                </div>
                <span class="display text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex-shrink-0" style="background: linear-gradient(135deg, #7C3AED, #D946EF); color: #FFFFFF;">+15 XP / ảnh</span>
              </div>
            </div>
          </div>

          <!-- Section 2: Streak Protection -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider mb-3.5 flex items-center gap-2" style="color: var(--text-muted);">
              <i data-lucide="shield" class="w-4 h-4" style="color: var(--accent-purple);"></i>
              Bảo Vệ Streak & Năng Lượng Tích Cực
            </h3>

            <div class="streak-box rounded-2xl p-4 md:p-5 flex gap-3.5 items-start bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 shadow-sm">
              <div class="flex-shrink-0 pt-0.5">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0" style="background: linear-gradient(135deg, #7C3AED, #D946EF);">
                  <i data-lucide="shield" class="w-5 h-5" style="color: #FFFFFF;"></i>
                </div>
              </div>
              <div class="text-sm leading-relaxed" style="color: var(--text-main);">
                AI Coach áp dụng triết lý <span class="font-bold">Năng Lượng Tích Cực</span>: cho phép bạn <span class="font-bold text-[#7C3AED] dark:text-purple-300">nghỉ tập để phục hồi</span>. Hãy đánh dấu 
                <span class="font-bold px-2.5 py-1 rounded-lg text-xs mx-1 bg-purple-100 dark:bg-purple-900/60 text-[#7C3AED] dark:text-purple-200 border border-purple-200/60 dark:border-purple-800/50">Ngày Nghỉ Phục Hồi</span> 
                để không làm đứt chuỗi Streak và luôn giữ vững động lực!
              </div>
            </div>
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

    // Level Roadmap Flowing Energy Track Navigation
    const levelTrack = document.getElementById('level-roadmap-track');
    document.getElementById('btn-scroll-level-left')?.addEventListener('click', () => {
      levelTrack?.scrollBy({ left: -260, behavior: 'smooth' });
    });
    document.getElementById('btn-scroll-level-right')?.addEventListener('click', () => {
      levelTrack?.scrollBy({ left: 260, behavior: 'smooth' });
    });

    // Auto-scroll to active current level node & XP pin
    const activeXpPin = levelTrack?.querySelector('.animate-ping') || levelTrack?.querySelector('.pulse-glow');
    if (activeXpPin) {
      setTimeout(() => {
        activeXpPin.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, 350);
    }

    // Desktop: Toggle remaining 10+ badges with smooth animation
    const btnExpandDesktop = document.getElementById('btn-expand-desktop-badges');
    const moreContainerDesktop = document.getElementById('desktop-badges-more-container');
    const btnExpandText = document.getElementById('btn-expand-desktop-text');

    btnExpandDesktop?.addEventListener('click', () => {
      const isExpanded = moreContainerDesktop?.classList.contains('is-expanded');
      if (isExpanded) {
        moreContainerDesktop.classList.remove('is-expanded');
        btnExpandDesktop.classList.remove('is-expanded');
        if (btnExpandText) btnExpandText.textContent = `Xem thêm ${sortedBadges.length - 12} huy hiệu còn lại`;
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
