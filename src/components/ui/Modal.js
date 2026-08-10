/**
 * Custom Animated Dialog Modal Component (Success / Warning / Confirm / Alert)
 * Replaces browser default alert() and confirm() with pop-bounce animations & SVG path drawing.
 */
export const Modal = {
  /**
   * Show an Alert or Info Modal
   */
  alert({ title = 'Thông Báo', message = '', type = 'info', confirmText = 'Đã Hiểu' }) {
    return new Promise((resolve) => {
      const modalNode = createModalDOM({
        title,
        message,
        type,
        confirmText,
        showCancel: false
      });

      document.body.appendChild(modalNode);
      requestAnimationFrame(() => modalNode.classList.add('active'));

      const btnConfirm = modalNode.querySelector('#modal-btn-confirm');
      btnConfirm.addEventListener('click', () => {
        closeModal(modalNode, () => resolve(true));
      });
    });
  },

  /**
   * Show a Success Modal
   */
  success({ title = 'Thành Công!', message = '', confirmText = 'Đồng Ý' }) {
    return this.alert({ title, message, type: 'success', confirmText });
  },

  /**
   * Show a Warning Modal
   */
  warning({ title = 'Cảnh Báo!', message = '', confirmText = 'Đã Hiểu' }) {
    return this.alert({ title, message, type: 'warning', confirmText });
  },

  /**
   * Show a Confirm Dialog Modal (Returns Promise<boolean>)
   */
  confirm({ title = 'Xác Nhận Hành Động', message = '', type = 'confirm', confirmText = 'Xác Nhận', cancelText = 'Hủy Bỏ' }) {
    return new Promise((resolve) => {
      const modalNode = createModalDOM({
        title,
        message,
        type,
        confirmText,
        cancelText,
        showCancel: true
      });

      document.body.appendChild(modalNode);
      requestAnimationFrame(() => modalNode.classList.add('active'));

      const btnConfirm = modalNode.querySelector('#modal-btn-confirm');
      const btnCancel = modalNode.querySelector('#modal-btn-cancel');

      btnConfirm.addEventListener('click', () => {
        closeModal(modalNode, () => resolve(true));
      });

      btnCancel?.addEventListener('click', () => {
        closeModal(modalNode, () => resolve(false));
      });
    });
  },
  /**
   * Show a Prompt Modal with Input Field (Returns Promise<string|null>)
   */
  prompt({ title = 'Nhập Thông Tin', message = '', placeholder = '', defaultValue = '', confirmText = 'Xác Nhận', cancelText = 'Hủy Bỏ' }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay';

      overlay.innerHTML = `
        <div class="custom-modal-card">
          <div class="custom-modal-icon-wrapper type-info">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path class="custom-modal-path" d="M12 8V12M12 16H12.01" stroke="var(--accent-purple)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <circle class="custom-modal-path" cx="12" cy="12" r="10" stroke="var(--accent-purple)" stroke-width="2"/>
            </svg>
          </div>
          <div class="custom-modal-title">${title}</div>
          ${message ? `<div class="custom-modal-message">${message}</div>` : ''}
          <input
            id="modal-prompt-input"
            type="text"
            class="form-input"
            value="${defaultValue}"
            placeholder="${placeholder}"
            style="margin: 0.75rem 0 0.25rem 0; width: 100%; font-size: 0.95rem;"
            autofocus
          >
          <div class="custom-modal-actions">
            <button class="btn btn-secondary custom-modal-btn" id="modal-btn-cancel">${cancelText}</button>
            <button class="btn btn-primary custom-modal-btn" id="modal-btn-confirm">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const inputEl = overlay.querySelector('#modal-prompt-input');
      const btnConfirm = overlay.querySelector('#modal-btn-confirm');
      const btnCancel = overlay.querySelector('#modal-btn-cancel');

      // Focus & auto-select input text after animation so typing immediately overwrites without needing backspace
      setTimeout(() => {
        if (inputEl) {
          inputEl.focus();
          if (typeof inputEl.select === 'function') {
            inputEl.select();
          }
        }
      }, 150);

      // Enter key submits
      inputEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnConfirm.click();
        if (e.key === 'Escape') btnCancel.click();
      });

      btnConfirm.addEventListener('click', () => {
        const val = inputEl?.value?.trim() || null;
        closeModal(overlay, () => resolve(val));
      });

      btnCancel.addEventListener('click', () => {
        closeModal(overlay, () => resolve(null));
      });
    });
  }
};
function createModalDOM({ title, message, type, confirmText, cancelText, showCancel }) {
  const overlay = document.createElement('div');
  overlay.className = 'custom-modal-overlay';

  overlay.innerHTML = `
    <div class="custom-modal-card">
      <div class="custom-modal-icon-wrapper type-${type}">
        ${renderModalSvgIcon(type)}
      </div>

      <div class="custom-modal-title">${title}</div>
      <div class="custom-modal-message">${message}</div>

      <div class="custom-modal-actions">
        ${showCancel ? `
          <button class="btn btn-secondary custom-modal-btn" id="modal-btn-cancel">
            ${cancelText}
          </button>
        ` : ''}
        <button class="btn btn-primary custom-modal-btn" id="modal-btn-confirm">
          ${confirmText}
        </button>
      </div>
    </div>
  `;

  return overlay;
}

function closeModal(modalNode, callback) {
  modalNode.classList.remove('active');
  setTimeout(() => {
    modalNode.remove();
    if (callback) callback();
  }, 300);
}

function renderModalSvgIcon(type) {
  if (type === 'success') {
    return `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path class="custom-modal-path" d="M20 6L9 17L4 12" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  } else if (type === 'warning' || type === 'confirm') {
    return `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path class="custom-modal-path" d="M12 9V14M12 17.5V18" stroke="#F59E0B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle class="custom-modal-path" cx="12" cy="12" r="10" stroke="#F59E0B" stroke-width="2"/>
      </svg>
    `;
  } else {
    return `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path class="custom-modal-path" d="M12 8V12M12 16H12.01" stroke="var(--accent-purple)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle class="custom-modal-path" cx="12" cy="12" r="10" stroke="var(--accent-purple)" stroke-width="2"/>
      </svg>
    `;
  }
}
