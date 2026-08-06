/**
 * Reusable Animated Circular Checkbox Component with SVG Path Drawing
 */
export function renderCheckbox({ id, taskId, checked = false, labelText = '' }) {
  return `
    <label class="custom-checkbox-wrapper" for="${id || taskId}">
      <input 
        type="checkbox" 
        class="custom-checkbox-input" 
        id="${id || taskId}" 
        data-task-id="${taskId}" 
        ${checked ? 'checked' : ''}
      >
      <div class="custom-checkbox-circle">
        <svg width="13" height="13" viewBox="0 0 24 24">
          <path class="custom-checkbox-path" d="M4 12l5 5L20 6"></path>
        </svg>
      </div>
      ${labelText ? `<span class="custom-checkbox-label">${labelText}</span>` : ''}
    </label>
  `;
}

export function initCheckboxListeners(containerNode, onToggleCallback) {
  if (!containerNode) return;

  containerNode.querySelectorAll('.custom-checkbox-input').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const taskId = chk.getAttribute('data-task-id');
      const isChecked = chk.checked;
      if (onToggleCallback) {
        onToggleCallback(taskId, isChecked, chk);
      }
    });
  });
}
