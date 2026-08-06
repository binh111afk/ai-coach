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
