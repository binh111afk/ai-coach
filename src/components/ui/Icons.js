/**
 * Custom SVG Icons Collection (Gemini, Sun, Sunset/Cloche, Moon, Snack/Teacup, Flame, Calendar)
 */
export function renderGeminiIcon({ width = 18, height = 18, strokeWidth = 1.6, color = 'currentColor', className = '', style = '' } = {}) {
  return `
    <svg 
      width="${width}" 
      height="${height}" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="${color}" 
      stroke-width="${strokeWidth}" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      xmlns="http://www.w3.org/2000/svg" 
      class="${className}" 
      style="display: inline-block; vertical-align: middle; flex-shrink: 0; ${style}"
    >
      <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"></path>
    </svg>
  `;
}

/**
 * Bữa Sáng SVG Icon (Mặt trời sáng vàng ☀️)
 */
export function renderSunIcon({ width = 20, height = 20, color = '#F59E0B', style = '' } = {}) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0; ${style}">
      <circle cx="12" cy="12" r="6" stroke="${color}" stroke-width="1.8"></circle>
      <path d="M12 2V3" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M12 21V22" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M22 12L21 12" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M3 12L2 12" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M19.0708 4.92969L18.678 5.32252" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M5.32178 18.6777L4.92894 19.0706" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M19.0708 19.0703L18.678 18.6775" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M5.32178 5.32227L4.92894 4.92943" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
    </svg>
  `;
}

/**
 * Bữa Trưa SVG Icon (Đĩa đậy Cloche / Nắng trưa 🍲)
 */
export function renderSunsetIcon({ width = 20, height = 20, color = '#F97316', style = '' } = {}) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0; ${style}">
      <path d="M8 22H16" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M5 19H19" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M2 16H22" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 6C8.68629 6 6 8.68629 6 12C6 13.5217 6.56645 14.911 7.5 15.9687H16.5C17.4335 14.911 18 13.5217 18 12C18 8.68629 15.3137 6 12 6Z" stroke="${color}" stroke-width="1.8"></path>
      <path d="M12 2V3" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M22 12L21 12" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M3 12L2 12" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M19.0708 4.92969L18.678 5.32252" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M5.32178 5.32227L4.92894 4.92943" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
    </svg>
  `;
}

/**
 * Bữa Tối SVG Icon (Mặt trăng đêm 🌙)
 */
export function renderMoonIcon({ width = 20, height = 20, color = '#8B5CF6', style = '' } = {}) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0; ${style}">
      <path d="M21.0672 11.8568L20.4253 11.469L21.0672 11.8568ZM12.1432 2.93276L11.7553 2.29085V2.29085L12.1432 2.93276ZM21.25 12C21.25 17.1086 17.1086 21.25 12 21.25V22.75C17.9371 22.75 22.75 17.9371 22.75 12H21.25ZM12 21.25C6.89137 21.25 2.75 17.1086 2.75 12H1.25C1.25 17.9371 6.06294 22.75 12 22.75V21.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75V1.25C6.06294 1.25 1.25 6.06294 1.25 12H2.75ZM15.5 14.25C12.3244 14.25 9.75 11.6756 9.75 8.5H8.25C8.25 12.5041 11.4959 15.75 15.5 15.75V14.25ZM20.4253 11.469C19.4172 13.1373 17.5882 14.25 15.5 14.25V15.75C18.1349 15.75 20.4407 14.3439 21.7092 12.2447L20.4253 11.469ZM9.75 8.5C9.75 6.41182 10.8627 4.5828 12.531 3.57467L11.7553 2.29085C9.65609 3.5593 8.25 5.86509 8.25 8.5H9.75ZM12 2.75C11.9115 2.75 11.8077 2.71008 11.7324 2.63168C11.6686 2.56527 11.6538 2.50244 11.6503 2.47703C11.6461 2.44587 11.6482 2.35557 11.7553 2.29085L12.531 3.57467C13.0342 3.27065 13.196 2.71398 13.1368 2.27627C13.0754 1.82126 12.7166 1.25 12 1.25V2.75ZM21.7092 12.2447C21.6444 12.3518 21.5541 12.3539 21.523 12.3497C21.4976 12.3462 21.4347 12.3314 21.3683 12.2676C21.2899 12.1923 21.25 12.0885 21.25 12H22.75C22.75 11.2834 22.1787 10.9246 21.7237 10.8632C21.286 10.804 20.7293 10.9658 20.4253 11.469L21.7092 12.2447Z" fill="${color}"></path>
    </svg>
  `;
}

/**
 * Bữa Phụ SVG Icon (Tách trà / Cốc cà phê ☕/🍵)
 */
export function renderAppleIcon({ width = 20, height = 20, color = '#10B981', style = '' } = {}) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0; ${style}">
      <path d="M2 5.68421C2 3.64948 3.64948 2 5.68421 2C7.71894 2 9.36842 3.64948 9.36842 5.68421V14.6316V15.6842C9.36842 19.1723 12.1961 22 15.6842 22C19.1723 22 22 19.1723 22 15.6842V14.5" stroke="${color}" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M22 14.5C22 15.8807 19.0539 17 16 17C12.9461 17 9.5 15.8807 9.5 14.5C9.5 13.1193 12.9461 12 16 12C19.0539 12 22 13.1193 22 14.5Z" stroke="${color}" stroke-width="1.8"></path>
    </svg>
  `;
}

/**
 * Red Calorie Flame SVG Icon 🔥
 */
export function renderFlameIcon({ width = 16, height = 16, color = '#EF4444', style = '' } = {}) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0; ${style}">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>
    </svg>
  `;
}

/**
 * Custom Calendar SVG Icon 📅
 */
export function renderCalendarIcon({ width = 18, height = 18, color = 'var(--accent-purple)', style = '' } = {}) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0; ${style}">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  `;
}
