import confetti from 'canvas-confetti';

export function showStreakOverlay(targetStreak = 1) {
  // Prevent duplicate overlay if already active
  if (document.getElementById('streakOverlay')) return;

  const overlayHtml = `
    <div class="streak-overlay" id="streakOverlay">
      <div class="streak-card">
        <div class="fire-wrap">
          <div class="fire-glow"></div>
          <div class="fire">
            <div class="flame f1"></div>
            <div class="flame f2"></div>
            <div class="flame f3"></div>
            <div class="flame f4"></div>
            <div class="flame f5"></div>
          </div>
          <div class="sparks">
            <div class="spark"></div>
            <div class="spark"></div>
            <div class="spark"></div>
            <div class="spark"></div>
            <div class="spark"></div>
            <div class="spark"></div>
          </div>
          <div class="plus-badge">+1</div>
        </div>

        <div class="streak-num" id="streakNum">0</div>
        <div class="streak-label">Chuỗi Streak Kỷ Luật!</div>
        <div class="streak-sub">Bạn đã duy trì kỷ luật liên tiếp</div>
        <div class="close-hint">Nhấn bất kỳ đâu để tiếp tục</div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', overlayHtml);
  const overlay = document.getElementById('streakOverlay');
  const numEl = document.getElementById('streakNum');

  let current = Math.max(0, targetStreak - 1);
  if (numEl) numEl.textContent = current;

  setTimeout(() => {
    confetti({ particleCount: 70, spread: 90, origin: { y: 0.5 } });
    const interval = setInterval(() => {
      current++;
      if (numEl) {
        numEl.textContent = current;
        numEl.style.transform = 'scale(1.18)';
        setTimeout(() => { if (numEl) numEl.style.transform = 'scale(1)'; }, 80);
      }
      if (current >= targetStreak) {
        clearInterval(interval);
      }
    }, 140);
  }, 400);

  const closeHandler = () => {
    if (!overlay) return;
    overlay.classList.add('hide');
    setTimeout(() => overlay?.remove(), 450);
  };

  overlay.addEventListener('click', closeHandler);
}
