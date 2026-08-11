import confetti from 'canvas-confetti';

export function showStreakOverlay(targetStreak = 1) {
  // Prevent duplicate overlay if already active
  const existing = document.getElementById('streakPopup');
  if (existing) existing.remove();

  const overlayHtml = `
    <div id="streakPopup" class="streak-overlay">
      <div id="confettiWrapper" class="absolute inset-0 overflow-hidden pointer-events-none"></div>

      <div class="text-center relative z-10 flex flex-col items-center px-6">
        <div class="streak-glow-container">
          <div class="shockwave"></div>
          <div class="shockwave"></div>
          <div class="streak-fire-icon">
            <i data-lucide="flame"></i>
          </div>
        </div>

        <div class="mt-6 flex items-start justify-center gap-2">
          <div id="streakCount" class="streak-number">0</div>
        </div>
        
        <div class="streak-text">Chuỗi Kỷ Luật</div>
        <div class="streak-subtext">Bạn đã duy trì thói quen tập luyện! Hãy tiếp tục nhé!</div>

        <div class="streak-tap-hint" id="streakCloseHint">Chạm để tiếp tục</div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', overlayHtml);
  const popup = document.getElementById('streakPopup');
  const countEl = document.getElementById('streakCount');
  const confettiWrapper = document.getElementById('confettiWrapper');

  // Generate CSS confetti particles
  if (confettiWrapper) {
    const colors = ['#7C3AED', '#D946EF', '#F59E0B', '#EC4899', '#3B82F6', '#FFFFFF'];
    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div');
      particle.classList.add('confetti-particle');
      particle.style.left = Math.random() * 100 + '%';
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      
      const size = Math.random() * 8 + 4;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      
      const delay = Math.random() * 1.5;
      const duration = Math.random() * 2 + 2.5;
      
      particle.style.animation = `confettiFall ${duration}s linear ${delay}s forwards`;
      if (Math.random() > 0.5) particle.style.borderRadius = '2px';
      
      confettiWrapper.appendChild(particle);
    }
  }

  // Trigger canvas confetti splash
  try {
    confetti({ particleCount: 70, spread: 100, origin: { y: 0.5 } });
  } catch (e) {}

  // Trigger Lucide icons
  if (window.lucide) window.lucide.createIcons();

  // Activate CSS animations
  setTimeout(() => {
    popup?.classList.add('active');

    // Count-up animation
    let currentCount = 0;
    const startVal = Math.max(0, targetStreak - 1);
    currentCount = startVal;
    if (countEl) countEl.textContent = Math.floor(currentCount);

    const duration = 1000;
    const intervalTime = 30;
    const steps = duration / intervalTime;
    const increment = (targetStreak - startVal) / steps || 1;

    const counter = setInterval(() => {
      currentCount += increment;
      if (currentCount >= targetStreak) {
        currentCount = targetStreak;
        if (countEl) countEl.textContent = targetStreak;
        clearInterval(counter);
      } else {
        if (countEl) countEl.textContent = Math.floor(currentCount);
      }
    }, intervalTime);
  }, 100);

  // Close popup handler on click anywhere
  const closePopup = () => {
    if (!popup) return;
    popup.classList.remove('active');
    setTimeout(() => popup.remove(), 500);
  };

  popup?.addEventListener('click', closePopup);
}
