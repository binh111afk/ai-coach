/**
 * Reusable Dropdown Component
 * Renders a custom accessible select dropdown with smooth animations and vector SVG icons.
 */
export function renderDropdown({ options = [], value = '', onChange, placeholder = 'Chọn...', id = '', className = '' }) {
  const selectedOption = options.find(o => o.value === value || o.id === value);
  const displayLabel = selectedOption ? (selectedOption.label || selectedOption.name) : placeholder;
  const dropdownId = id || 'dropdown_' + Math.random().toString(36).substr(2, 6);

  const html = `
    <div class="custom-dropdown-container ${className}" id="${dropdownId}">
      <button type="button" class="custom-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="custom-dropdown-label">${escapeHtml(displayLabel)}</span>
        <svg class="custom-dropdown-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div class="custom-dropdown-menu" role="listbox">
        ${options.map(opt => {
          const val = opt.value !== undefined ? opt.value : opt.id;
          const isSelected = val === value;
          return `
            <div class="custom-dropdown-item ${isSelected ? 'selected' : ''}" data-value="${val}" role="option" aria-selected="${isSelected}">
              <span>${escapeHtml(opt.label || opt.name)}</span>
              ${isSelected ? `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  return html;
}

export function initDropdownListeners(containerNode, onChangeCallback) {
  if (!containerNode) return;

  const containers = containerNode.querySelectorAll('.custom-dropdown-container');
  containers.forEach(container => {
    const trigger = container.querySelector('.custom-dropdown-trigger');
    const menu = container.querySelector('.custom-dropdown-menu');

    if (!trigger || !menu) return;

    // Toggle menu
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = container.classList.contains('open');
      // Close all other dropdowns
      document.querySelectorAll('.custom-dropdown-container.open').forEach(c => c.classList.remove('open'));

      if (!isOpen) {
        container.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      } else {
        container.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Item selection
    menu.querySelectorAll('.custom-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = item.getAttribute('data-value');
        container.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');

        if (onChangeCallback) {
          onChangeCallback(val, container.id);
        }
      });
    });
  });

  // Global click outside listener
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.custom-dropdown-container.open').forEach(c => {
      if (!c.contains(e.target)) {
        c.classList.remove('open');
        c.querySelector('.custom-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

function escapeHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
