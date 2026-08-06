import { DataService } from '../services/dataService.js';
import { getLevelInfo, BADGES, LEVELS } from '../services/gamificationService.js';

export async function renderGamificationPage() {
  const progress = await DataService.getUserProgress();
  const levelInfo = getLevelInfo(progress.totalXp);

  const html = `
    <div style="display: flex; flex-direction: column; gap: 1.75rem;">
      <!-- Level Hero Banner with SVG Vector Icons -->
      <div class="card" style="background: linear-gradient(135deg, rgba(245, 241, 255, 0.9), rgba(251, 250, 255, 0.9)); border: 1px solid var(--border-highlight);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            <!-- Crown SVG Icon -->
            <div style="width: 72px; height: 72px; background: var(--primary-gradient); border-radius: 20px; display: flex; align-items: center; justify-content: center; color: #ffffff; box-shadow: 0 10px 25px rgba(117, 86, 217, 0.35);">
              <i data-lucide="crown" style="width: 36px; height: 36px;"></i>
            </div>
            <div>
              <div class="badge badge-secondary" style="margin-bottom: 0.35rem;">LEVEL ${levelInfo.currentLevel.level}</div>
              <h2 style="font-size: 1.65rem;">${levelInfo.currentLevel.name}</h2>
              <div class="text-sm text-muted" style="margin-top: 0.25rem;">Tổng điểm tích lũy: <b style="color: var(--accent-purple); font-size: 1rem;">${progress.totalXp} XP</b></div>
            </div>
          </div>

          <!-- Streak Card with Flame SVG Icon -->
          <div style="background: var(--bg-card); padding: 1.1rem 1.6rem; border-radius: 18px; border: 1px solid var(--border-color); text-align: center; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 48px; height: 48px; border-radius: 14px; background: var(--accent-amber-light); color: var(--accent-amber); display: flex; align-items: center; justify-content: center;">
              <i data-lucide="flame" style="width: 26px; height: 26px;"></i>
            </div>
            <div style="text-align: left;">
              <div class="text-xs text-muted" style="font-weight: 800; text-transform: uppercase;">Chuỗi Kỷ Luật (Streak)</div>
              <div style="font-size: 1.6rem; font-weight: 900; color: var(--accent-amber); display: flex; align-items: center; gap: 0.3rem;">
                ${progress.currentStreak} Ngày
              </div>
              <div class="text-xs text-muted">Kỷ lục cao nhất: ${progress.longestStreak} ngày</div>
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

      <!-- Badges Showcase Grid -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i data-lucide="award" style="color: var(--accent-amber);"></i> Bộ Sưu Tập Huy Hiệu (${progress.badges.length}/${BADGES.length})</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.25rem;">
          ${BADGES.map(b => {
            const isUnlocked = progress.badges.includes(b.id);
            return `
              <div class="card" style="padding: 1.25rem; text-align: center; background: ${isUnlocked ? 'var(--bg-card)' : 'var(--bg-subtle)'}; opacity: ${isUnlocked ? 1 : 0.55}; border-color: ${isUnlocked ? 'var(--border-highlight)' : 'var(--border-color)'};">
                <div style="width: 52px; height: 52px; margin: 0 auto 0.75rem auto; background: ${isUnlocked ? 'var(--accent-purple-light)' : 'var(--bg-card)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${isUnlocked ? 'var(--accent-purple)' : 'var(--text-subtle)'};">
                  <i data-lucide="${b.icon || 'shield'}" style="width: 26px; height: 26px;"></i>
                </div>
                <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.25rem;">${b.name}</div>
                <div class="text-xs text-muted">${b.description}</div>
                <span class="badge ${isUnlocked ? 'badge-primary' : 'badge-secondary'}" style="margin-top: 0.75rem; font-size: 0.725rem;">
                  <i data-lucide="${isUnlocked ? 'check-circle' : 'lock'}" style="width: 12px; height: 12px;"></i>
                  ${isUnlocked ? 'Đã Mở Khóa' : 'Đang Khóa'}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Rules & XP Point Calculations Guide ("Trang Quy Tắc Điểm Thưởng") -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i data-lucide="book-open" class="text-purple"></i> Quy Tắc Thưởng Điểm XP & Kỷ Luật Năng Lượng Tích Cực</div>
        </div>
        <div style="font-size: 0.9rem; line-height: 1.6; display: flex; flex-direction: column; gap: 1rem;">
          <div style="background: var(--bg-subtle); padding: 1.1rem; border-radius: 16px; border-left: 4px solid var(--accent-purple);">
            <h4 style="color: var(--accent-purple); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="star" style="width: 18px; height: 18px;"></i> Cách Tích Lũy XP Hàng Ngày
            </h4>
            <ul style="padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <li><b>Đạt chỉ tiêu Calo mục tiêu (±15%):</b> +30 XP</li>
              <li><b>Nạp đủ đạm (Protein Target):</b> +20 XP</li>
              <li><b>Uống đủ nước (Water Target):</b> +20 XP</li>
              <li><b>Hoàn thành tập luyện hoặc ngày nghỉ:</b> +25 XP</li>
              <li><b>Full checklist hàng ngày:</b> +30 XP</li>
              <li><b>Thưởng Streak:</b> +10 XP cho mỗi ngày duy trì liên tiếp!</li>
            </ul>
          </div>

          <div style="background: var(--bg-subtle); padding: 1.1rem; border-radius: 16px; border-left: 4px solid var(--accent-amber);">
            <h4 style="color: var(--accent-amber); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="shield-check" style="width: 18px; height: 18px;"></i> Cơ Chế Bảo Vệ Streak & Nhắc Nhở Nhẹ Nhàng
            </h4>
            <p>FitCoach AI áp dụng triết lý <b>Năng Lượng Tích Cực</b>. Nếu bạn bỏ lỡ 1 ngày tập luyện, hãy đánh dấu <b>"Ngày Nghỉ Phục Hồi"</b> trong nhật ký để streak không bị ngắt gãy. AI Coach sẽ gửi lời nhắc nhở động viên nhẹ nhàng mà không tạo áp lực tiêu cực tâm lý!</p>
          </div>
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }
}
