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

            <form id="form-login" class="space-y-4">
              <!-- Input Account / Email -->
              <div class="relative">
                <i data-lucide="user" class="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"></i>
                <input type="text" id="login-email" required placeholder="Tài khoản hoặc Email" value="" class="auth-ui-input">
              </div>
              <!-- Input Password -->
              <div class="relative">
                <i data-lucide="lock" class="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"></i>
                <input type="password" id="login-password" required placeholder="Mật khẩu" value="" class="auth-ui-input pr-12">
                <button type="button" id="btn-toggle-login-pwd" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                  <i data-lucide="eye-off" id="icon-login-pwd" class="w-5 h-5"></i>
                </button>
              </div>

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
                <button type="button" id="btn-goto-forgot" class="font-bold text-[#7C3AED] hover:underline">Quên mật khẩu?</button>
              </div>

              <button type="submit" class="auth-btn-gradient w-full py-3.5 rounded-2xl text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 mt-2">
                <span class="btn-text">Đăng Nhập Vào Hệ Thống</span>
                <i data-lucide="arrow-right" class="w-5 h-5"></i>
              </button>
            </form>

            <div class="flex items-center gap-4 my-6">
              <div class="flex-1 h-px bg-gray-100"></div>
              <span class="text-[11px] text-gray-400 font-bold tracking-wider uppercase">HOẶC TIẾP TỤC VỚI</span>
              <div class="flex-1 h-px bg-gray-100"></div>
            </div>

            <div>
              <button type="button" class="btn-social-mock auth-btn-ghost w-full py-3 rounded-2xl font-bold text-xs sm:text-sm text-gray-700 flex items-center justify-center gap-2.5">
                <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z" fill="#4285F4"></path><path d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z" fill="#34A853"></path><path d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z" fill="#FBBC05"></path><path d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z" fill="#EB4335"></path></svg>
                <span>Đăng nhập bằng Google</span>
              </button>
            </div>

            <p class="text-center text-xs sm:text-sm text-gray-500 mt-7">
              Chưa có tài khoản? 
              <button type="button" id="btn-goto-register" class="font-bold text-[#7C3AED] hover:underline ml-1">Đăng ký miễn phí ngay</button>
            </p>
          </div>

          <!-- ==================== REGISTER VIEW ==================== -->
          <div id="registerView" class="auth-view ${initialView === 'registerView' ? '' : 'hidden'}">
            <h2 class="display text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Bắt Đầu Hành Trình Mới! 🚀</h2>
            <p class="text-gray-500 text-sm mb-7">Tạo tài khoản để AI Coach thiết kế lộ trình cho riêng bạn.</p>

            <form id="form-register" class="space-y-3.5">
              <div class="relative">
                <i data-lucide="user" class="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"></i>
                <input type="text" id="reg-name" required placeholder="Họ và tên của bạn" class="auth-ui-input">
              </div>
              <div class="relative">
                <i data-lucide="mail" class="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"></i>
                <input type="email" id="reg-email" required placeholder="name@example.com" class="auth-ui-input">
              </div>
              <div class="relative">
                <i data-lucide="lock" class="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"></i>
                <input type="password" id="reg-password" required placeholder="Mật khẩu (tối thiểu 6 ký tự)" class="auth-ui-input pr-12">
                <button type="button" id="btn-toggle-reg-pwd" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                  <i data-lucide="eye-off" id="icon-reg-pwd" class="w-5 h-5"></i>
                </button>
              </div>

              <!-- Password Strength Indicator -->
              <div class="space-y-1 pt-0.5">
                <div class="flex items-center gap-1.5 h-1.5">
                  <div id="strengthBar1" class="w-1/4 h-full bg-gray-200 rounded-full transition-colors"></div>
                  <div id="strengthBar2" class="w-1/4 h-full bg-gray-200 rounded-full transition-colors"></div>
                  <div id="strengthBar3" class="w-1/4 h-full bg-gray-200 rounded-full transition-colors"></div>
                  <div id="strengthBar4" class="w-1/4 h-full bg-gray-200 rounded-full transition-colors"></div>
                </div>
                <div class="flex justify-between items-center text-[11px]">
                  <span class="text-gray-400">Độ mạnh mật khẩu:</span>
                  <span id="strengthText" class="font-bold text-gray-400">Yếu</span>
                </div>
              </div>

              <div class="relative">
                <i data-lucide="shield-check" class="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"></i>
                <input type="password" id="reg-confirm-password" required placeholder="Xác nhận lại mật khẩu" class="auth-ui-input">
              </div>

              <div class="pt-1">
                <label class="custom-checkbox-wrapper !items-start" for="reg-agree">
                  <input type="checkbox" id="reg-agree" required checked class="custom-checkbox-input">
                  <div class="custom-checkbox-circle mt-0.5">
                    <svg width="11" height="11" viewBox="0 0 24 24">
                      <path class="custom-checkbox-path" d="M4 12l5 5L20 6"></path>
                    </svg>
                  </div>
                  <span class="custom-checkbox-label !text-xs text-gray-600 leading-relaxed font-medium">
                    Tôi đồng ý với <a href="#" class="font-bold text-[#7C3AED] hover:underline">Điều khoản sử dụng</a> & <a href="#" class="font-bold text-[#7C3AED] hover:underline">Chính sách bảo mật</a>.
                  </span>
                </label>
              </div>

              <button type="submit" class="auth-btn-gradient w-full py-3.5 rounded-2xl text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 mt-2">
                <span class="btn-text">Tạo Tài Khoản & Bắt Đầu Ngay</span>
                <i data-lucide="rocket" class="w-5 h-5"></i>
              </button>
            </form>

            <p class="text-center text-xs sm:text-sm text-gray-500 mt-6">
              Đã có tài khoản? 
              <button type="button" id="btn-goto-login" class="font-bold text-[#7C3AED] hover:underline ml-1">Đăng nhập tại đây</button>
            </p>
          </div>

          <!-- ==================== FORGOT PASSWORD VIEW ==================== -->
          <div id="forgotView" class="auth-view hidden">
            <div class="w-12 h-12 mb-4 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100">
              <i data-lucide="key-round" class="w-6 h-6 text-amber-500"></i>
            </div>
            <h2 class="display text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Khôi Phục Mật Khẩu</h2>
            <p class="text-gray-500 text-sm mb-7">Nhập email đã đăng ký để nhận mã khôi phục mật khẩu tài khoản.</p>

            <form id="form-forgot" class="space-y-4">
              <div class="relative">
                <i data-lucide="mail" class="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"></i>
                <input type="email" id="forgot-email" required placeholder="name@example.com" class="auth-ui-input">
              </div>
              <button type="submit" class="auth-btn-gradient w-full py-3.5 rounded-2xl text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20">
                <span class="btn-text">Gửi Liên Kết Khôi Phục</span>
                <i data-lucide="send" class="w-5 h-5"></i>
              </button>
            </form>

            <button type="button" id="btn-forgot-back-login" class="mt-6 w-full text-xs sm:text-sm font-bold text-gray-500 hover:text-[#7C3AED] flex items-center justify-center gap-2 py-2">
              <i data-lucide="arrow-left" class="w-4 h-4"></i> Quay lại Đăng nhập
            </button>
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

  // 2. Navigation Switch Handlers
  document.getElementById('btn-goto-register')?.addEventListener('click', () => switchAuthView('registerView'));
  document.getElementById('btn-goto-login')?.addEventListener('click', () => switchAuthView('loginView'));
  document.getElementById('btn-goto-forgot')?.addEventListener('click', () => switchAuthView('forgotView'));
  document.getElementById('btn-forgot-back-login')?.addEventListener('click', () => switchAuthView('loginView'));
  document.getElementById('btn-back-to-landing')?.addEventListener('click', () => {
    if (typeof onBackToLanding === 'function') onBackToLanding();
  });

  // 3. Password Toggle Visibility
  function setupPwdToggle(btnId, inputId, iconId) {
    document.getElementById(btnId)?.addEventListener('click', () => {
      const input = document.getElementById(inputId);
      const icon = document.getElementById(iconId);
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
  }
  setupPwdToggle('btn-toggle-login-pwd', 'login-password', 'icon-login-pwd');
  setupPwdToggle('btn-toggle-reg-pwd', 'reg-password', 'icon-reg-pwd');

  // 4. Password Strength Meter
  document.getElementById('reg-password')?.addEventListener('input', (e) => {
    const pwd = e.target.value;
    const bars = [
      document.getElementById('strengthBar1'),
      document.getElementById('strengthBar2'),
      document.getElementById('strengthBar3'),
      document.getElementById('strengthBar4')
    ];
    const text = document.getElementById('strengthText');
    if (!text || !bars[0]) return;

    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd) || /[^a-zA-Z0-9]/.test(pwd)) strength++;

    const colors = ['bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-500'];
    const labels = ['Yếu', 'Vừa', 'Tốt', 'Mạnh'];
    const textColors = ['text-red-500', 'text-amber-500', 'text-yellow-500', 'text-emerald-500'];

    bars.forEach((bar, i) => {
      if (bar) {
        bar.className = `w-1/4 h-full rounded-full transition-colors ${i < strength ? colors[strength - 1] : 'bg-gray-200'}`;
      }
    });

    text.textContent = strength > 0 ? labels[strength - 1] : 'Yếu';
    text.className = `font-bold ${strength > 0 ? textColors[strength - 1] : 'text-gray-400'}`;
  });

  // 5. Toast Notification
  function showToast(message) {
    const toast = document.getElementById('auth-toast');
    const toastText = document.getElementById('auth-toast-text');
    if (!toast || !toastText) return;
    toastText.innerText = message;
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

  // 6. Handle Form Login Submit
  document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const textSpan = btn?.querySelector('.btn-text');
    const originalText = textSpan ? textSpan.innerText : 'Đăng Nhập Vào Hệ Thống';

    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-75');
    }
    if (textSpan) textSpan.innerText = 'Đang xác thực...';

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

  // 7. Handle Form Register Submit
  document.getElementById('form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameVal = document.getElementById('reg-name')?.value?.trim() || 'Người dùng';
    const btn = e.target.querySelector('button[type="submit"]');
    const textSpan = btn?.querySelector('.btn-text');

    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-75');
    }
    if (textSpan) textSpan.innerText = 'Đang tạo tài khoản...';

    setTimeout(async () => {
      // Save name to profile
      const profile = await DataService.getUserProfile();
      profile.name = nameVal;
      await DataService.saveUserProfile(profile);

      showToast('Tạo tài khoản thành công! Bắt đầu thiết lập hành trình...');

      setTimeout(() => {
        if (typeof onStartOnboarding === 'function') {
          onStartOnboarding();
        }
      }, 800);
    }, 1100);
  });

  // 8. Handle Form Forgot Password Submit
  document.getElementById('form-forgot')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const textSpan = btn?.querySelector('.btn-text');

    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-75');
    }
    if (textSpan) textSpan.innerText = 'Đang gửi mã...';

    setTimeout(() => {
      if (btn) btn.disabled = false;
      if (textSpan) textSpan.innerText = 'Gửi Liên Kết Khôi Phục';
      showToast('Đã gửi liên kết khôi phục tới email của bạn!');
      setTimeout(() => switchAuthView('loginView'), 1500);
    }, 1000);
  });

  // 9. Handle Social Login (Mock Google / Apple)
  document.querySelectorAll('.btn-social-mock').forEach(btn => {
    btn.addEventListener('click', async () => {
      showToast('Đang kết nối tài khoản...');
      setTimeout(async () => {
        showToast('Xác thực thành công!');
        const profile = await DataService.getUserProfile();
        setTimeout(() => {
          if (!profile.isOnboarded && typeof onStartOnboarding === 'function') {
            onStartOnboarding();
          } else if (typeof onLoginSuccess === 'function') {
            onLoginSuccess();
          }
        }, 600);
      }, 800);
    });
  });
}
