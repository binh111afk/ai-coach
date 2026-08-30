import { DataService } from '../services/dataService.js';

/**
 * FitCoach AI - Auth Page (Login / Register / Forgot Password)
 */
export function renderAuthPage({ initialView = 'loginView', onStartOnboarding, onLoginSuccess, onBackToLanding }) {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  appContainer.innerHTML = `
    <style>
      :root {
        --primary: #7C3AED;
        --accent: #D946EF;
        --pink: #EC4899;
        --bg: #F8F7FC;
      }
      /* Override global body/html/app when auth page is active */
      html, body { height: 100vh !important; min-height: unset !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; }
      body { background-color: white !important; background-image: none !important; }
      #app { display: block !important; min-height: unset !important; height: 100vh !important; overflow: hidden !important; }

      .auth-body { 
        font-family: 'Plus Jakarta Sans', sans-serif; 
        background-color: white; 
        overflow: hidden; 
        height: 100vh;
        display: flex;
      }
      .display { font-family: 'Fraunces', serif; }

      /* Glass Card cho các thẻ lơ lửng */
      .auth-glass-card {
        background: rgba(255, 255, 255, 0.82);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.95);
        box-shadow: 0 15px 35px -8px rgba(124, 58, 237, 0.12);
      }

      /* Input Fields */
      .auth-ui-input {
        width: 100%; 
        padding: 15px 16px 15px 48px;
        background: #F9FAFB; 
        border: 1.5px solid #E5E7EB;
        border-radius: 16px; 
        font-weight: 600; 
        color: #1E1B2E;
        transition: all 0.2s; 
        font-size: 14px;
      }
      .auth-ui-input:focus {
        outline: none; 
        background: white;
        border-color: var(--primary);
        box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
      }
      .auth-ui-input::placeholder { color: #9CA3AF; font-weight: 500; }

      /* Buttons */
      .auth-btn-gradient {
        background: linear-gradient(135deg, var(--primary), var(--accent));
        box-shadow: 0 8px 20px -4px rgba(124, 58, 237, 0.4);
        transition: all 0.3s; 
        position: relative; 
        overflow: hidden;
      }
      .auth-btn-gradient:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -4px rgba(124, 58, 237, 0.5); }
      .auth-btn-gradient::before {
        content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        transition: 0.6s;
      }
      .auth-btn-gradient:hover::before { left: 100%; }

      .auth-btn-ghost {
        border: 1.5px solid #E5E7EB; 
        background: white;
        transition: all 0.25s;
      }
      .auth-btn-ghost:hover { border-color: var(--primary); color: var(--primary); background: #FAF5FF; }

      /* Tab Transition */
      .auth-view { animation: authFadeInRight 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
      @keyframes authFadeInRight {
        from { opacity: 0; transform: translateX(18px); }
        to { opacity: 1; transform: translateX(0); }
      }

      /* Floating Orbs (Nền trái) */
      .auth-glow-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
      @keyframes auth-float-orb { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -20px) scale(1.1); } }
      .auth-orb-anim { animation: auth-float-orb 12s infinite ease-in-out; }

      /* Floating Cards Animation */
      @keyframes auth-float-a { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(-2deg); } }
      @keyframes auth-float-b { 0%, 100% { transform: translateY(0) rotate(3deg); } 50% { transform: translateY(-14px) rotate(3deg); } }
      @keyframes auth-float-c { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-10px) rotate(-3deg); } }
      @keyframes auth-float-d { 0%, 100% { transform: translateY(0) rotate(2deg); } 50% { transform: translateY(-13px) rotate(2deg); } }
      
      .auth-float-a { animation: auth-float-a 6s infinite ease-in-out; }
      .auth-float-b { animation: auth-float-b 7s infinite ease-in-out; animation-delay: -1.5s; }
      .auth-float-c { animation: auth-float-c 8s infinite ease-in-out; animation-delay: -3s; }
      .auth-float-d { animation: auth-float-d 6.5s infinite ease-in-out; animation-delay: -4.5s; }

      /* Custom Circular Checkbox Component with Path Drawing Animation */
      .custom-checkbox-wrapper {
        display: inline-flex;
        align-items: center;
        gap: 0.65rem;
        cursor: pointer;
        user-select: none;
        position: relative;
      }
      .custom-checkbox-input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
      }
      .custom-checkbox-circle {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid #C4B5FD;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 2px 6px rgba(124, 58, 237, 0.12);
        flex-shrink: 0;
      }
      .custom-checkbox-input:checked + .custom-checkbox-circle {
        background: linear-gradient(135deg, var(--primary), var(--accent));
        border-color: transparent;
        transform: scale(1.08);
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);
      }
      .custom-checkbox-path {
        stroke: #ffffff;
        stroke-width: 3.2;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
        stroke-dasharray: 24;
        stroke-dashoffset: 24;
        transition: stroke-dashoffset 0.35s ease-in-out;
      }
      .custom-checkbox-input:checked + .custom-checkbox-circle .custom-checkbox-path {
        stroke-dashoffset: 0;
        animation: drawCheckmark 0.35s ease-in-out forwards;
      }
      @keyframes drawCheckmark {
        0% { stroke-dashoffset: 24; }
        100% { stroke-dashoffset: 0; }
      }
      .custom-checkbox-label {
        font-size: 0.825rem;
        color: #4B5563;
        transition: all 0.2s ease;
      }

      /* Scrollbar */
      .auth-form-area::-webkit-scrollbar { width: 4px; }
      .auth-form-area::-webkit-scrollbar-thumb { background: rgba(124, 58, 237, 0.2); border-radius: 10px; }
    </style>

    <div class="auth-body w-full min-h-screen">
      <!-- ==================== BÊN TRÁI: VISUAL & ANIMATION ==================== -->
      <div class="hidden lg:flex w-1/2 relative overflow-hidden bg-[#F4F4F8] border-r border-gray-100 flex-col justify-between p-8 xl:p-10 select-none">
        <!-- Nền lưới caro tinh tế -->
        <div class="absolute inset-0 opacity-40 pointer-events-none" style="background-image: linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px); background-size: 32px 32px;"></div>
        
        <!-- Quầng sáng động -->
        <div class="auth-glow-orb w-96 h-96 bg-[#7C3AED] top-10 left-10 opacity-20 auth-orb-anim"></div>
        <div class="auth-glow-orb w-[480px] h-[480px] bg-[#D946EF] bottom-10 right-10 opacity-10 auth-orb-anim" style="animation-delay: -6s;"></div>

        <!-- Header Top Left Logo -->
        <div class="relative z-10 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex items-center justify-center shadow-md shadow-purple-500/20">
              <i data-lucide="zap" class="w-6 h-6 text-white"></i>
            </div>
            <span class="display text-xl font-bold text-gray-900 tracking-tight">FitCoach AI</span>
          </div>

          <!-- Top-right Floating Badge 1 (AI Status) -->
          <div class="auth-glass-card px-3.5 py-1.5 rounded-full auth-float-d flex items-center gap-2 shadow-xs">
            <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span class="text-xs font-bold text-gray-700">AI Coach Sẵn Sàng 24/7</span>
          </div>
        </div>

        <!-- Trung tâm: Lời chào Hero Text (Được giữ khoảng cách an toàn, không bị box đè lên) -->
        <div class="relative z-10 my-auto py-8 max-w-md xl:max-w-lg">
          <div class="inline-flex items-center gap-2 bg-white/90 border border-purple-100 px-3.5 py-1.5 rounded-full shadow-xs mb-5">
            <i data-lucide="sparkles" class="w-4 h-4 text-[#7C3AED]"></i>
            <span class="text-xs font-bold text-gray-700">Cố Vấn Hình Thể Thông Minh</span>
          </div>
          <h1 class="display text-4xl xl:text-5xl font-bold text-gray-900 leading-[1.18] mb-4">
            Khởi đầu hành trình <br>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#D946EF]">vóc dáng lý tưởng</span> cùng AI.
          </h1>
          <p class="text-gray-500 text-base leading-relaxed">
            Hệ thống AI Coach tự động tính toán calo, lập thực đơn không trùng lặp và cá nhân hóa bài tập vừa vặn nhất với bạn.
          </p>
        </div>

        <!-- Footer Bottom Left Quote -->
        <div class="relative z-10 flex items-center justify-between text-xs text-gray-400 font-medium">
          <span>© 2026 FitCoach AI Tracker</span>
          <span class="flex items-center gap-1.5 text-purple-600 font-bold">
            <i data-lucide="shield-check" class="w-4 h-4"></i> 100% Bảo Mật Thông Tin
          </span>
        </div>

        <!-- ================= CÁC THẺ FLOATING NẰM Ở CÁC GÓC & RÌA NGOÀI ================= -->
        
        <!-- Floating 1: Mục tiêu Calo (Góc trên phải) -->
        <div class="absolute top-[82px] right-8 auth-glass-card p-3.5 xl:p-4 rounded-2xl w-48 xl:w-52 auth-float-a z-20 pointer-events-none">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mục Tiêu Calo</span>
            <i data-lucide="flame" class="w-4 h-4 text-[#D946EF]"></i>
          </div>
          <p class="display text-2xl xl:text-3xl font-bold text-gray-900">1,905 <span class="text-xs text-gray-400 font-sans font-medium">kcal/ngày</span></p>
          <div class="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full w-3/4 bg-gradient-to-r from-[#7C3AED] to-[#D946EF] rounded-full"></div>
          </div>
        </div>

        <!-- Floating 2: Thực Đơn AI (Nằm giữa Mục Tiêu Calo và Nước) -->
        <div class="absolute top-[42px] left-[43%] auth-glass-card px-3.5 py-1.5 rounded-full auth-float-b z-20 flex items-center gap-2 shadow-xs pointer-events-none" style="animation-delay: -1s;">
          <i data-lucide="salad" class="w-3.5 h-3.5 text-emerald-500"></i>
          <span class="text-xs font-bold text-gray-700">Thực đơn 4 bữa / ngày</span>
        </div>

        <!-- Floating 3: Mục Tiêu Giảm Cân (Nằm giữa Mục Tiêu Calo và Nước) -->
        <div class="absolute top-[135px] left-[39%] auth-glass-card px-3.5 py-2 rounded-2xl auth-float-c z-20 flex items-center gap-2.5 shadow-md pointer-events-none" style="animation-delay: -2.5s;">
          <div class="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <i data-lucide="scale" class="w-3.5 h-3.5 text-[#7C3AED]"></i>
          </div>
          <div>
            <p class="text-[9px] font-bold text-gray-400 uppercase leading-none">Mục Tiêu AI</p>
            <p class="text-xs font-bold text-gray-800 leading-tight">Giảm 5.0 kg an toàn</p>
          </div>
        </div>

        <!-- Floating 4: Water Intake Badge (Rìa trái trên) -->
        <div class="absolute top-[205px] left-8 auth-glass-card px-3.5 py-1.5 rounded-full auth-float-d z-20 flex items-center gap-2 shadow-xs pointer-events-none" style="animation-delay: -3.5s;">
          <i data-lucide="droplet" class="w-3.5 h-3.5 text-blue-500"></i>
          <span class="text-xs font-bold text-gray-700">Nước: 2,450 ml</span>
        </div>

        <!-- Floating 5: Protein Badge (Rìa phải giữa) -->
        <div class="absolute top-[48%] right-6 auth-glass-card px-3.5 py-2 rounded-2xl auth-float-c z-20 flex items-center gap-2.5 shadow-md pointer-events-none">
          <div class="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
            <i data-lucide="beef" class="w-4 h-4 text-[#EC4899]"></i>
          </div>
          <div>
            <p class="text-[10px] font-bold text-gray-400 uppercase">Protein Target</p>
            <p class="text-xs font-bold text-gray-800">143g · Đạt chuẩn</p>
          </div>
        </div>

        <!-- Floating 6: Bài tập AI đề xuất (Góc dưới trái) -->
        <div class="absolute bottom-16 left-8 auth-glass-card p-3.5 rounded-2xl w-48 xl:w-52 auth-float-b z-20 shadow-md pointer-events-none">
          <div class="flex items-center gap-2.5 mb-2">
            <div class="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <i data-lucide="dumbbell" class="w-4 h-4 text-[#7C3AED]"></i>
            </div>
            <div class="overflow-hidden">
              <p class="text-xs font-bold text-gray-800 truncate">Bài tập Ngực</p>
              <p class="text-[10px] text-gray-400 truncate">45 phút · Tại nhà</p>
            </div>
          </div>
          <div class="bg-[#F5F3FF] py-1 px-2 rounded-lg text-center text-[10px] font-bold text-[#7C3AED]">
            AI Đề Xuất Khớp Dụng Cụ
          </div>
        </div>

        <!-- Floating 7: Streak XP Badge (Góc dưới phải) -->
        <div class="absolute bottom-16 right-12 auth-glass-card px-3.5 py-2 rounded-2xl auth-float-a z-20 flex items-center gap-2.5 shadow-md pointer-events-none" style="animation-delay: -2s;">
          <div class="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <i data-lucide="trophy" class="w-4 h-4 text-amber-500"></i>
          </div>
          <div>
            <p class="text-[10px] font-bold text-gray-400 uppercase">Streak Lửa</p>
            <p class="text-xs font-bold text-gray-800">+50 XP Ngày 14 🔥</p>
          </div>
        </div>

      </div>

      <!-- ==================== BÊN PHẢI: FORM ĐIỀN ==================== -->
      <div class="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 auth-form-area overflow-y-auto min-h-screen bg-white">
        <!-- Top Back Navigation -->
        <div class="flex items-center justify-between w-full max-w-md mx-auto mb-4">
          <button type="button" id="btn-back-to-landing" class="text-xs font-bold text-gray-500 hover:text-[#7C3AED] transition flex items-center gap-1.5 py-1.5 px-3 rounded-xl hover:bg-purple-50">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> Quay lại Trang chủ
          </button>
          
          <!-- Mobile Logo -->
          <div class="lg:hidden flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex items-center justify-center shadow-xs">
              <i data-lucide="zap" class="w-4 h-4 text-white"></i>
            </div>
            <span class="display text-base font-bold text-gray-900">FitCoach AI</span>
          </div>
        </div>

        <div class="w-full max-w-md mx-auto my-auto py-4">

          <!-- ==================== LOGIN VIEW ==================== -->
          <div id="loginView" class="auth-view ${initialView === 'loginView' ? '' : 'hidden'}">
            <h2 class="display text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Chào Mừng Trở Lại! 👋</h2>
            <p class="text-gray-500 text-sm mb-7">Đăng nhập để tiếp tục hành trình hình thể cùng AI Coach.</p>

            <!-- Tài khoản test công khai — hiển thị ngay trên trang đăng nhập để người dùng vào thử -->
            <div class="flex items-center justify-between gap-3 mb-5 p-3.5 rounded-2xl bg-[#F5F3FF] border border-purple-100">
              <div class="text-xs leading-relaxed text-gray-700">
                <p class="font-bold text-[#7C3AED] uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
                  <i data-lucide="key-round" class="w-3.5 h-3.5"></i> Tài khoản demo
                </p>
                <p><span class="font-semibold text-gray-500">Tài khoản:</span> <b class="font-bold text-gray-900 select-all">admin</b></p>
                <p><span class="font-semibold text-gray-500">Mật khẩu:</span> <b class="font-bold text-gray-900 select-all">1234</b></p>
              </div>
              <button type="button" id="btn-fill-demo-creds" class="flex-shrink-0 px-3 py-2 rounded-xl bg-[#7C3AED] text-white font-bold text-[10px] uppercase tracking-wide hover:bg-[#6D28D9] transition shadow-sm">
                Điền sẵn
              </button>
            </div>

            <form id="form-login" class="space-y-4" novalidate>
              <!-- Input Account / Email -->
              <div class="relative">
                <i data-lucide="user" class="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"></i>
                <input type="text" id="login-email" required placeholder="Tài khoản" value="" class="auth-ui-input">
              </div>
              <!-- Input Password -->
              <div class="relative">
                <i data-lucide="lock" class="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"></i>
                <input type="password" id="login-password" required placeholder="Mật khẩu" value="" class="auth-ui-input pr-12">
                <button type="button" id="btn-toggle-login-pwd" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                  <i data-lucide="eye-off" id="icon-login-pwd" class="w-5 h-5"></i>
                </button>
              </div>

              <!-- Lỗi đăng nhập -->
              <p id="login-error" class="hidden text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5"></p>

              <div class="flex items-center justify-between text-xs sm:text-sm pt-1">
                <label class="custom-checkbox-wrapper" for="login-remember">
                  <input type="checkbox" id="login-remember" checked class="custom-checkbox-input">
                  <div class="custom-checkbox-circle">
                    <svg width="11" height="11" viewBox="0 0 24 24">
                      <path class="custom-checkbox-path" d="M4 12l5 5L20 6"></path>
                    </svg>
                  </div>
                  <span class="custom-checkbox-label font-semibold text-gray-700">Ghi nhớ đăng nhập</span>
                </label>
              </div>

              <button type="submit" class="auth-btn-gradient w-full py-3.5 rounded-2xl text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 mt-2">
                <span class="btn-text">Đăng Nhập Vào Hệ Thống</span>
                <i data-lucide="arrow-right" class="w-5 h-5"></i>
              </button>
            </form>

            <p class="text-center text-[11px] text-gray-400 mt-7 leading-relaxed">
              Hệ thống chỉ chấp nhận <b class="text-gray-600">một tài khoản admin duy nhất</b>.<br>
              Sai tài khoản hoặc mật khẩu sẽ không thể đăng nhập.
            </p>
          </div>

        </div>

        <!-- Footer Notice -->
        <div class="text-center text-xs text-gray-400 pt-4">
          Bảo mật bởi mã hóa SSL 256-bit chuẩn quốc tế
        </div>
      </div>
    </div>

    <!-- ==================== TOAST NOTIFICATION ==================== -->
    <div id="auth-toast" class="fixed top-8 right-8 z-[999999] hidden transition-all duration-300">
      <div class="auth-glass-card px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl border-l-4 border-emerald-500 bg-white">
        <i data-lucide="check-circle" class="w-5 h-5 text-emerald-500 flex-shrink-0"></i>
        <span id="auth-toast-text" class="text-xs sm:text-sm font-bold text-gray-800">Thành công!</span>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  bindAuthEvents({ onStartOnboarding, onLoginSuccess, onBackToLanding });
}

// Tài khoản test duy nhất được phép đăng nhập (demo công khai, hiển thị trên trang đăng nhập)
const DEMO_AUTH = { username: 'admin', password: '1234' };

function bindAuthEvents({ onStartOnboarding, onLoginSuccess, onBackToLanding }) {
  // 1. Switch View Helpers
  function switchAuthView(viewId) {
    document.querySelectorAll('.auth-view').forEach(v => v.classList.add('hidden'));
    const activeView = document.getElementById(viewId);
    if (activeView) {
      activeView.classList.remove('hidden');
      activeView.style.animation = 'none';
      void activeView.offsetHeight;
      activeView.style.animation = '';
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // 2. Back to Landing
  document.getElementById('btn-back-to-landing')?.addEventListener('click', () => {
    if (typeof onBackToLanding === 'function') onBackToLanding();
  });

  // 3. Điền sẵn tài khoản demo
  document.getElementById('btn-fill-demo-creds')?.addEventListener('click', () => {
    const userInput = document.getElementById('login-email');
    const pwdInput = document.getElementById('login-password');
    if (userInput) userInput.value = DEMO_AUTH.username;
    if (pwdInput) pwdInput.value = DEMO_AUTH.password;
    document.getElementById('login-error')?.classList.add('hidden');
  });

  // 4. Password Toggle Visibility
  document.getElementById('btn-toggle-login-pwd')?.addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const icon = document.getElementById('icon-login-pwd');
    if (!input || !icon) return;
    if (input.type === 'password') {
      input.type = 'text';
      icon.setAttribute('data-lucide', 'eye');
    } else {
      input.type = 'password';
      icon.setAttribute('data-lucide', 'eye-off');
    }
    if (window.lucide) window.lucide.createIcons();
  });

  // 5. Toast Notification
  function showToast(message, isError = false) {
    const toast = document.getElementById('auth-toast');
    const toastText = document.getElementById('auth-toast-text');
    if (!toast || !toastText) return;
    toastText.innerText = message;
    toast.querySelector('i')?.setAttribute('data-lucide', isError ? 'alert-circle' : 'check-circle');
    toast.querySelector('div')?.classList.toggle('border-l-red-500', isError);
    toast.querySelector('div')?.classList.toggle('border-l-emerald-500', !isError);
    if (window.lucide) window.lucide.createIcons();
    toast.classList.remove('hidden');
    toast.style.transform = 'translateX(120%)';

    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => toast.classList.add('hidden'), 350);
    }, 2500);
  }

  // 6. Handle Form Login Submit — chỉ tài khoản admin duy nhất được vào
  document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const textSpan = btn?.querySelector('.btn-text');
    const originalText = textSpan ? textSpan.innerText : 'Đăng Nhập Vào Hệ Thống';
    const errorEl = document.getElementById('login-error');
    const showLoginError = (msg) => {
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
      }
      showToast(msg, true);
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('opacity-75');
      }
      if (textSpan) textSpan.innerText = originalText;
    };

    const username = (document.getElementById('login-email')?.value || '').trim().toLowerCase();
    const password = document.getElementById('login-password')?.value || '';

    if (!username || !password) {
      showLoginError('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-75');
    }
    if (textSpan) textSpan.innerText = 'Đang xác thực...';

    // Xác thực ngay (đồng bộ) — sai tài khoản/mật khẩu thì chặn, không cho vào
    if (username !== DEMO_AUTH.username || password !== DEMO_AUTH.password) {
      showLoginError('Sai tài khoản hoặc mật khẩu! Chỉ tài khoản "admin" mới được đăng nhập.');
      return;
    }

    setTimeout(async () => {
      showToast('Đăng nhập thành công! Đang chuyển tiếp...');
      const profile = await DataService.getUserProfile();

      setTimeout(() => {
        if (!profile.isOnboarded && typeof onStartOnboarding === 'function') {
          onStartOnboarding();
        } else if (typeof onLoginSuccess === 'function') {
          onLoginSuccess();
        }
      }, 700);
    }, 1000);
  });
}
