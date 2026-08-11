/**
 * Tooltip Component System
 * Provides reusable tooltip functionality for any HTML element with data-tooltip.
 */

let tooltipEl = null;

export function initTooltips() {
  if (typeof window === 'undefined') return;

  if (!tooltipEl) {
    tooltipEl = document.getElementById('global-tooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'global-tooltip';
      tooltipEl.className = 'custom-tooltip';
      document.body.appendChild(tooltipEl);
    }
  }

  document.querySelectorAll('[data-tooltip]').forEach(el => {
    // Avoid attaching duplicate listeners
    if (el._hasTooltipListener) return;
    el._hasTooltipListener = true;

    el.addEventListener('mouseenter', () => {
      const text = el.getAttribute('data-tooltip');
      const pos = el.getAttribute('data-tooltip-pos') || 'left';
      if (!text || !tooltipEl) return;

      tooltipEl.textContent = text;
      tooltipEl.className = `custom-tooltip tooltip-${pos} active`;

      const rect = el.getBoundingClientRect();
      if (pos === 'left') {
        tooltipEl.style.top = `${rect.top + rect.height / 2}px`;
        tooltipEl.style.left = `${rect.left - 10}px`;
        tooltipEl.style.transform = 'translate(-100%, -50%)';
      } else if (pos === 'right') {
        tooltipEl.style.top = `${rect.top + rect.height / 2}px`;
        tooltipEl.style.left = `${rect.right + 10}px`;
        tooltipEl.style.transform = 'translate(0, -50%)';
      } else if (pos === 'top') {
        tooltipEl.style.top = `${rect.top - 10}px`;
        tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
        tooltipEl.style.transform = 'translate(-50%, -100%)';
      } else { // bottom
        tooltipEl.style.top = `${rect.bottom + 10}px`;
        tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
        tooltipEl.style.transform = 'translate(-50%, 0)';
      }
    });

    el.addEventListener('mouseleave', () => {
      if (tooltipEl) tooltipEl.classList.remove('active');
    });

    el.addEventListener('click', () => {
      if (tooltipEl) tooltipEl.classList.remove('active');
    });
  });
}

export function hideTooltip() {
  if (tooltipEl) tooltipEl.classList.remove('active');
}
