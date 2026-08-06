/**
 * Custom SVG Icons Collection (Gemini, Sun, Sunset, Moon, Apple, Flame)
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
 * Yellow Sun SVG Icon (Bữa Sáng ☀️)
 */
export function renderSunIcon({ width = 20, height = 20, color = '#F59E0B', style = '' } = {}) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0; ${style}">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  `;
}

/**
 * Orange Sunset SVG Icon (Bữa Trưa / Chiều 🌇)
 */
export function renderSunsetIcon({ width = 20, height = 20, color = '#F97316', style = '' } = {}) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0; ${style}">
      <path d="M12 10V2M12 10l-3.5 3.5M12 10l3.5 3.5"/>
      <path d="M4.93 10.93a7 7 0 0 1 14.14 0"/>
      <path d="M2 18h20"/>
      <path d="M20 22H4"/>
    </svg>
  `;
}

/**
 * Purple Moon SVG Icon (Bữa Tối 🌙)
 */
export function renderMoonIcon({ width = 20, height = 20, color = '#8B5CF6', style = '' } = {}) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0; ${style}">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  `;
}

/**
 * Green Apple / Snack SVG Icon (Bữa Phụ 🍎)
 */
export function renderAppleIcon({ width = 20, height = 20, color = '#10B981', style = '' } = {}) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0; ${style}">
      <path d="M12 2a4 4 0 0 0-4 4c0 3.5 2 7 4 10 2-3 4-6.5 4-10a4 4 0 0 0-4-4z"/>
      <path d="M12 2c1.5 0 3-1 3-2"/>
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
