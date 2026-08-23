import { renderAuthPage } from './AuthPage.js';

export function renderLandingPage({ onStartOnboarding, onLoginSuccess }) {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  appContainer.innerHTML = `
    <style>
      :root {
        --primary: #7C3AED;
        --accent: #D946EF;
        --pink: #EC4899;
        --bg: #F4F4F8;
        --fg: #1E1B2E;
      }
      /* Override global body/app when landing page is active */
      body { background-color: #F4F4F8 !important; background-image: 
        linear-gradient(rgba(124, 58, 237, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(124, 58, 237, 0.04) 1px, transparent 1px) !important;
        background-size: 32px 32px !important; }
      #app { display: block !important; min-height: unset !important; }

      .landing-body { 
        font-family: 'Plus Jakarta Sans', sans-serif; 
        background-color: var(--bg);
        color: var(--fg);
        background-image: 
          linear-gradient(rgba(124, 58, 237, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(124, 58, 237, 0.04) 1px, transparent 1px);
        background-size: 32px 32px;
        overflow-x: hidden;
      }
      .display { font-family: 'Fraunces', serif; }

      /* Glass Cards */
      .lp-glass-card {
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 20px 50px -10px rgba(124, 58, 237, 0.12);
      }

      /* Buttons */
      .btn-v2, .lp-btn-gradient {
        background: linear-gradient(135deg, #7C3AED, #D946EF);
        color: white;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      /* Tia sáng chéo lướt qua */
      .btn-v2::before, .lp-btn-gradient::before {
        content: '';
        position: absolute;
        top: 0; 
        left: -150%;
        width: 50%; 
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
        transform: skewX(-20deg);
        transition: left 0.6s ease;
      }
      .btn-v2:hover::before, .lp-btn-gradient:hover::before { 
        left: 150%;
      }
      /* Hiệu ứng nâng nhẹ & tỏa sáng */
      .btn-v2:hover, .lp-btn-gradient:hover {
        box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15), 0 15px 30px -5px rgba(217, 70, 239, 0.5);
        transform: translateY(-2px);
      }

      .lp-btn-ghost {
        border: 1px solid rgba(124, 58, 237, 0.2);
        background: rgba(255, 255, 255, 0.5);
        transition: all 0.3s;
      }
      .lp-btn-ghost:hover { border-color: var(--primary); color: var(--primary); background: white; }

      /* Pro Card Glow */
      @keyframes pulse-glow-pro {
        0%, 100% { box-shadow: 0 10px 40px -5px rgba(124, 58, 237, 0.25), 0 0 0 1.5px rgba(217, 70, 239, 0.4); }
        50% { box-shadow: 0 15px 50px -5px rgba(124, 58, 237, 0.4), 0 0 0 1.5px rgba(217, 70, 239, 0.6); }
      }
      .pro-card-glow {
        animation: pulse-glow-pro 4s infinite ease-in-out;
      }

      /* === V6: 3D Hover Core Logic for Pricing Cards === */
      .tilt-card { 
        transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1); 
        transform-style: preserve-3d; 
      }
      .pricing-container:hover .tilt-card { 
        transform: scale(0.9); 
        opacity: 0.6; 
        filter: blur(2px); 
      }
      .pricing-container .tilt-card:hover { 
        transform: scale(1.05) translateY(-10px) rotate(0deg) !important; 
        opacity: 1; 
        filter: blur(0); 
        z-index: 10; 
      }

      /* Nav Link Active Indicator */
      .lp-nav-link {
        position: relative;
        transition: all 0.25s ease;
      }
      .lp-nav-link.active {
        color: #7C3AED !important;
        font-weight: 800;
      }
      .lp-nav-link.active::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 0;
        right: 0;
        height: 2.5px;
        background: linear-gradient(90deg, #7C3AED, #D946EF);
        border-radius: 99px;
      }

      /* Floating Ambient Orbs */
      .lp-glow-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; }
      @keyframes lp-float-orb { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(40px, -30px) scale(1.1); } }
      .lp-orb-anim { animation: lp-float-orb 12s infinite ease-in-out; }

      /* Floating Cards Animation */
      @keyframes lp-float-card-a { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-15px) rotate(-2deg); } }
      @keyframes lp-float-card-b { 0%, 100% { transform: translateY(0) rotate(3deg); } 50% { transform: translateY(-10px) rotate(3deg); } }
      .lp-float-a { animation: lp-float-card-a 6s infinite ease-in-out; }
      .lp-float-b { animation: lp-float-card-b 7s infinite ease-in-out; }

      /* Scroll Reveal */
      .lp-reveal { opacity: 0; transform: translateY(35px); transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1); }
      .lp-reveal.active { opacity: 1; transform: translateY(0); }

      /* Shimmer Text */
      .lp-text-shimmer { 
        background: linear-gradient(90deg, #7C3AED, #D946EF, #7C3AED); 
        background-size: 200% auto; 
        -webkit-background-clip: text; 
        background-clip: text; 
        color: transparent; 
        animation: lp-shimmer-text 3s linear infinite; 
      }
      @keyframes lp-shimmer-text { to { background-position: 200% center; } }

      /* Chat Typing Dots */
      @keyframes lp-typing { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
      .lp-dot { width: 6px; height: 6px; background: var(--primary); border-radius: 50%; display: inline-block; animation: lp-typing 1.4s infinite; }
      .lp-dot:nth-child(2) { animation-delay: 0.2s; }
      .lp-dot:nth-child(3) { animation-delay: 0.4s; }

      /* Before/After Slider */
      .ba-slider { position: relative; overflow: hidden; cursor: ew-resize; }
      .ba-img { display: block; width: 100%; height: 100%; object-fit: cover; }
      .ba-before { position: absolute; top: 0; left: 0; width: 50%; height: 100%; overflow: hidden; }
      .ba-handle { position: absolute; top: 0; bottom: 0; left: 50%; width: 4px; background: white; transform: translateX(-50%); pointer-events: none; z-index: 10; }
      .ba-handle::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: white; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
      .ba-handle::before { content: '⟷'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 11; font-size: 16px; color: var(--primary); font-weight: bold; }
    </style>

    <div class="landing-body">
      <!-- ==================== HEADER ==================== -->
      <header id="lp-header" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div class="lp-glass-card rounded-2xl px-5 sm:px-6 py-3 flex items-center justify-between">
            <a href="#" class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex items-center justify-center shadow-md flex-shrink-0">
                <i data-lucide="zap" class="w-5 h-5 text-white"></i>
              </div>
              <span class="display text-xl font-bold text-gray-900">FitCoach AI</span>
            </a>
            <nav class="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
              <a href="#lp-features" class="lp-nav-link hover:text-[#7C3AED] transition" data-section="lp-features">Tính Năng</a>
              <a href="#lp-journey" class="lp-nav-link hover:text-[#7C3AED] transition" data-section="lp-journey">Lộ Trình</a>
              <a href="#lp-progress" class="lp-nav-link hover:text-[#7C3AED] transition" data-section="lp-progress">Tiến Trình</a>
              <a href="#lp-pricing" class="lp-nav-link hover:text-[#7C3AED] transition" data-section="lp-pricing">Bảng Giá</a>
            </nav>
            <div class="flex items-center gap-2.5">
              <button type="button" id="lp-btn-login" class="lp-btn-ghost text-xs sm:text-sm font-bold text-gray-700 px-3.5 sm:px-4 py-2 rounded-xl">Đăng Nhập</button>
              <button type="button" id="lp-btn-register" class="lp-btn-gradient text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-md">Đăng Ký Miễn Phí</button>
            </div>
          </div>
        </div>
      </header>

      <!-- ==================== HERO SECTION ==================== -->
      <section class="relative pt-36 sm:pt-40 pb-16 sm:pb-20 px-4 sm:px-6 overflow-hidden">


        <div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div class="inline-flex items-center gap-2 bg-white/90 border border-purple-100 px-4 py-2 rounded-full shadow-sm mb-6">
              <span class="w-2 h-2 bg-[#D946EF] rounded-full animate-pulse"></span>
              <span class="text-xs font-bold text-gray-700">🔥 AI Coach 2.0 — Trợ Lý Sức Khỏe Cá Nhân Hóa</span>
            </div>
            <h1 class="display text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Biến Mục Tiêu Hình Thể Của Bạn Thành <span class="lp-text-shimmer">Hiện Thực</span> Cùng AI
            </h1>
            <p class="text-gray-600 text-base sm:text-lg mb-8 max-w-xl leading-relaxed">
              Tự động tính toán TDEE/BMR, phân bổ Calo & Macro, sinh lịch trình 24h và bài tập khớp chính xác với dụng cụ bạn có sẵn.
            </p>
            <div class="flex flex-wrap gap-4 mb-12">
              <button type="button" id="lp-hero-start-btn" class="lp-btn-gradient text-white font-bold px-7 sm:px-8 py-3.5 sm:py-4 rounded-2xl flex items-center gap-2 text-sm sm:text-base">
                Bắt Đầu Lập Kế Hoạch <i data-lucide="arrow-right" class="w-5 h-5"></i>
              </button>
              <a href="#lp-features" class="lp-btn-ghost text-gray-700 font-bold px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl flex items-center gap-2 text-sm sm:text-base">
                <i data-lucide="sparkles" class="w-5 h-5 text-[#7C3AED]"></i> Xem Tính Năng Mẫu
              </a>
            </div>
            <div class="grid grid-cols-3 gap-4 sm:gap-6 max-w-lg">
              <div>
                <p class="display text-2xl sm:text-3xl font-bold text-gray-900"><span class="lp-counter" data-target="10000">0</span>+</p>
                <p class="text-xs text-gray-500 mt-1">Bữa ăn & bài tập</p>
              </div>
              <div>
                <p class="display text-2xl sm:text-3xl font-bold text-gray-900"><span class="lp-counter" data-target="98">0</span>.5%</p>
                <p class="text-xs text-gray-500 mt-1">Đạt mục tiêu đúng hạn</p>
              </div>
              <div>
                <p class="display text-2xl sm:text-3xl font-bold text-gray-900"><span class="lp-counter" data-target="26">0</span>+</p>
                <p class="text-xs text-gray-500 mt-1">Model AI hỗ trợ</p>
              </div>
            </div>
          </div>

          <!-- Floating Dashboard Preview -->
          <div class="relative hidden lg:block h-[500px]">
            <div class="lp-glass-card absolute top-0 right-0 w-72 p-6 rounded-3xl lp-float-a z-20">
              <div class="flex justify-between items-center mb-4">
                <span class="text-xs font-bold text-gray-400 uppercase">Mục Tiêu Calo</span>
                <i data-lucide="flame" class="w-4 h-4 text-[#D946EF]"></i>
              </div>
              <div class="flex items-end gap-1">
                <h2 class="display text-5xl font-bold text-gray-900">1,905</h2>
                <span class="text-sm text-gray-400 mb-2">kcal</span>
              </div>
              <div class="mt-4 space-y-2">
                <div class="flex justify-between text-xs"><span class="text-gray-500">Protein</span><span class="font-bold text-[#7C3AED]">143g</span></div>
                <div class="h-1.5 bg-gray-100 rounded-full"><div class="h-full w-3/4 bg-[#7C3AED] rounded-full"></div></div>
                <div class="flex justify-between text-xs"><span class="text-gray-500">Carbs</span><span class="font-bold text-[#D946EF]">191g</span></div>
                <div class="h-1.5 bg-gray-100 rounded-full"><div class="h-full w-full bg-[#D946EF] rounded-full"></div></div>
              </div>
            </div>
            <div class="lp-glass-card absolute bottom-10 left-0 w-64 p-6 rounded-3xl lp-float-b z-10">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><i data-lucide="dumbbell" class="w-5 h-5 text-[#7C3AED]"></i></div>
                <div>
                  <p class="text-sm font-bold text-gray-800">Bài tập Ngực</p>
                  <p class="text-xs text-gray-400">45 phút · Tại nhà</p>
                </div>
              </div>
              <div class="bg-[#F5F3FF] p-2 rounded-xl text-center text-xs font-bold text-[#7C3AED]">AI Đề Xuất Phù Hợp</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== FEATURES SECTION ==================== -->
      <section id="lp-features" class="py-20 px-4 sm:px-6 relative">
        <div class="max-w-7xl mx-auto">
          <div class="text-center mb-16 lp-reveal">
            <span class="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">Tính Năng Đột Phá</span>
            <h2 class="display text-3xl sm:text-4xl font-bold text-gray-900 mt-2">Mọi thứ bạn cần, gói gọn trong AI</h2>
          </div>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- F1 -->
            <div class="lp-glass-card p-6 sm:p-7 rounded-3xl lp-reveal">
              <div class="w-12 h-12 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mb-5"><i data-lucide="brain-circuit" class="w-6 h-6 text-[#7C3AED]"></i></div>
              <h3 class="display text-xl font-bold mb-2">AI Chat & Natural Logging</h3>
              <p class="text-gray-500 text-sm leading-relaxed">Gõ tự do: "Sáng ăn 2 quả trứng, trưa ăn phở bò". AI tự bóc tách Calo, Macro và tạo thẻ Xác Nhận an toàn.</p>
            </div>
            <!-- F2 -->
            <div class="lp-glass-card p-6 sm:p-7 rounded-3xl lp-reveal">
              <div class="w-12 h-12 rounded-2xl bg-[#FCE7F3] flex items-center justify-center mb-5"><i data-lucide="route" class="w-6 h-6 text-[#D946EF]"></i></div>
              <h3 class="display text-xl font-bold mb-2">Kế Hoạch Hành Trình</h3>
              <p class="text-gray-500 text-sm leading-relaxed">Chia lộ trình đa giai đoạn (Thích nghi ➔ Tăng tiến ➔ Đỉnh cao). Thực đơn 4 bữa không trùng lặp.</p>
            </div>
            <!-- F3 -->
            <div class="lp-glass-card p-6 sm:p-7 rounded-3xl lp-reveal">
              <div class="w-12 h-12 rounded-2xl bg-[#FFEDD5] flex items-center justify-center mb-5"><i data-lucide="home" class="w-6 h-6 text-[#F59E0B]"></i></div>
              <h3 class="display text-xl font-bold mb-2">Tùy Biến Địa Điểm & Dụng Cụ</h3>
              <p class="text-gray-500 text-sm leading-relaxed">Tự động chọn bài tập Bodyweight hoặc đúng dụng cụ tại nhà (Thảm yoga, Tạ đơn, Dây kháng lực...).</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== AI SIMULATOR SECTION ==================== -->
      <section id="lp-journey" class="py-20 px-4 sm:px-6 relative">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-12 lp-reveal">
            <span class="text-xs font-bold uppercase tracking-widest text-[#D946EF]">Trải Nghiệm Thực Tế</span>
            <h2 class="display text-3xl sm:text-4xl font-bold text-gray-900 mt-2">Trò Chuyện Cùng AI Coach</h2>
            <p class="text-gray-500 mt-3 text-sm sm:text-base">Giao diện trò chuyện thông minh như trong ứng dụng thực tế</p>
          </div>

          <!-- AiChatPage Window Replica -->
          <div class="lp-glass-card rounded-3xl p-4 sm:p-6 lp-reveal shadow-2xl border border-white/90 relative overflow-hidden">
            <!-- Window Topbar matching AiChatPage -->
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex items-center justify-center text-white shadow-md">
                  <i data-lucide="sparkles" class="w-5 h-5"></i>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-900">Gemini 3.6 Flash</span>
                    <span class="px-2 py-0.5 rounded-full bg-purple-100 text-[#7C3AED] text-[10px] font-extrabold uppercase">AI Coach</span>
                  </div>
                  <p class="text-[11px] text-gray-400">Trợ lý cá nhân hóa 24/7</p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs font-bold text-emerald-600">Sẵn sàng</span>
              </div>
            </div>

            <!-- Quick Preset Chips -->
            <div class="flex gap-2 mb-5 flex-wrap">
              <button type="button" class="lp-chat-preset-btn px-3.5 py-2 bg-purple-50/80 text-[#7C3AED] border border-purple-100/90 rounded-xl text-xs font-bold hover:bg-purple-100 transition shadow-xs flex items-center gap-1.5" data-query="Gợi ý bữa tối 500 kcal né hải sản">
                <i data-lucide="utensils" class="w-3.5 h-3.5 text-purple-500"></i> Gợi ý bữa tối 500 kcal
              </button>
              <button type="button" class="lp-chat-preset-btn px-3.5 py-2 bg-gray-50/80 text-gray-700 border border-gray-200/80 rounded-xl text-xs font-bold hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-100 transition shadow-xs flex items-center gap-1.5" data-query="Hôm nay tập ngực tại nhà có tạ đơn">
                <i data-lucide="dumbbell" class="w-3.5 h-3.5 text-blue-500"></i> Tập ngực tại nhà với tạ đơn
              </button>
            </div>

            <!-- Chat Box Container -->
            <div id="lp-chat-box" class="space-y-4 min-h-[300px] max-h-[420px] overflow-y-auto pr-1 pb-2">
              <!-- Initial welcome message injected by JS -->
            </div>

            <!-- Glass Input Bar matching AiChatPage.js -->
            <div class="mt-4 pt-3 border-t border-gray-100">
              <div class="bg-white/90 rounded-2xl p-2 border border-purple-100 shadow-md flex items-center gap-2">
                <button type="button" class="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#7C3AED] hover:bg-purple-50 transition flex-shrink-0" title="Đính kèm tệp">
                  <i data-lucide="plus" class="w-5 h-5"></i>
                </button>
                <input type="text" id="lp-sim-input-text" placeholder="Thử gõ: 'Trưa nay ăn 1 bát phở bò'..." class="flex-1 bg-transparent border-none focus:outline-none text-xs sm:text-sm font-medium text-gray-800 placeholder:text-gray-400 px-1" />
                <button type="button" id="lp-sim-btn-send" class="w-10 h-10 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white flex items-center justify-center shadow-md hover:scale-105 transition flex-shrink-0">
                  <i data-lucide="arrow-up" class="w-5 h-5"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== BEFORE/AFTER SLIDER SECTION ==================== -->
      <section id="lp-progress" class="py-20 px-4 sm:px-6 relative">
        <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div class="lp-reveal">
            <span class="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">Kho Ảnh Tiến Trình</span>
            <h2 class="display text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-4">Nhìn Lại Sự Thay Đổi Của Bạn</h2>
            <p class="text-gray-500 text-base sm:text-lg mb-6 leading-relaxed">Theo dõi sự thay đổi vóc dáng qua từng mốc thời gian với thanh trượt tương tác trực quan. AI sẽ phân tích sự khác biệt và điều chỉnh kế hoạch.</p>
            <div class="flex items-center gap-4 text-sm font-bold text-gray-700">
              <div class="flex items-center gap-2"><span class="w-3 h-3 bg-gray-300 rounded-full"></span> Ngày 1</div>
              <i data-lucide="arrow-right" class="w-5 h-5 text-[#7C3AED]"></i>
              <div class="flex items-center gap-2"><span class="w-3 h-3 bg-[#7C3AED] rounded-full"></span> Ngày 60</div>
            </div>
          </div>
          <div class="lp-reveal ba-slider rounded-3xl shadow-xl overflow-hidden" id="lp-ba-slider" style="height: 380px;">
            <img src="https://images.unsplash.com/photo-1581009146145-b5d0e0dc78b5?w=800&q=80" class="ba-img" alt="After">
            <div class="ba-before">
              <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80" class="ba-img" alt="Before">
            </div>
            <div class="ba-handle"></div>
          </div>
        </div>
      </section>

      <!-- ==================== PRICING SECTION ==================== -->
      <section id="lp-pricing" class="relative py-20 px-4 sm:px-6 overflow-hidden">
        <div class="max-w-5xl mx-auto relative z-10 w-full">
          <div class="text-center mb-16 lp-reveal">
            <h2 class="display text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-4">
              Chọn <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#D946EF]">Trải Nghiệm</span> Của Bạn
            </h2>
            <p class="text-gray-500 text-lg">Bắt đầu miễn phí hoặc mở khóa toàn bộ sức mạnh AI.</p>
          </div>

          <div class="pricing-container flex flex-col md:flex-row items-center justify-center gap-8">
            
            <!-- Free Plan -->
            <div class="tilt-card lp-glass-card p-8 rounded-3xl w-full max-w-sm transform md:rotate-6 md:translate-y-8 lp-reveal">
              <h3 class="text-xl font-bold text-gray-800 mb-2">Gói Free</h3>
              <div class="flex items-baseline gap-2 mb-8">
                <span class="display text-5xl font-bold text-gray-900">0</span>
                <span class="text-gray-400 font-semibold">VND</span>
              </div>
              <ul class="space-y-3 mb-8 text-sm">
                <li class="flex items-start gap-3 text-gray-600"><i data-lucide="check" class="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0"></i> <span>Tính toán BMR & TDEE</span></li>
                <li class="flex items-start gap-3 text-gray-600"><i data-lucide="check" class="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0"></i> <span>Ghi chép bữa ăn</span></li>
                <li class="flex items-start gap-3 text-gray-600"><i data-lucide="check" class="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0"></i> <span>Thư viện 100+ bài tập</span></li>
                <li class="flex items-start gap-3 text-gray-300"><i data-lucide="x" class="w-5 h-5 mt-0.5 flex-shrink-0"></i> <span class="line-through">AI Chat Coach 24/7</span></li>
              </ul>
              <button type="button" id="lp-btn-free-plan" class="lp-btn-ghost w-full py-3.5 rounded-2xl font-bold text-gray-700 text-sm">Dùng Thử</button>
            </div>

            <!-- Pro Plan -->
            <div class="tilt-card relative w-full max-w-md lp-reveal">
              <div class="bg-gradient-to-br from-[#7C3AED] to-[#D946EF] p-[2px] rounded-3xl pro-card-glow transform md:-rotate-6 h-full">
                <div class="bg-gradient-to-br from-[#F5F3FF] to-[#FCE7F3] rounded-[22px] p-8 h-full flex flex-col">
                  <div class="inline-flex items-center gap-1.5 bg-[#7C3AED] text-white text-xs font-bold px-3 py-1 rounded-full mb-4 w-fit">
                    <i data-lucide="sparkles" class="w-3 h-3"></i> PHỔ BIẾN NHẤT
                  </div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Gói Pro AI</h3>
                  <div class="flex items-baseline gap-2 mb-8">
                    <span class="display text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#D946EF]">49,000</span>
                    <span class="text-gray-500 font-semibold">VND/tháng</span>
                  </div>
                  <ul class="space-y-3 mb-8 text-sm flex-grow">
                    <li class="flex items-start gap-3 text-gray-700"><i data-lucide="check-circle-2" class="w-5 h-5 text-[#7C3AED] mt-0.5 flex-shrink-0"></i> <span>AI Chat Coach 24/7</span></li>
                    <li class="flex items-start gap-3 text-gray-700"><i data-lucide="check-circle-2" class="w-5 h-5 text-[#7C3AED] mt-0.5 flex-shrink-0"></i> <span>Logging ngôn ngữ tự nhiên</span></li>
                    <li class="flex items-start gap-3 text-gray-700"><i data-lucide="check-circle-2" class="w-5 h-5 text-[#7C3AED] mt-0.5 flex-shrink-0"></i> <span>Sinh tự động Kế hoạch 24h</span></li>
                    <li class="flex items-start gap-3 text-gray-700"><i data-lucide="check-circle-2" class="w-5 h-5 text-[#7C3AED] mt-0.5 flex-shrink-0"></i> <span>Đọc ảnh nhãn mác, PDF, Excel</span></li>
                  </ul>
                  <button type="button" id="lp-btn-pro-plan" class="lp-btn-gradient w-full py-3.5 rounded-2xl font-bold text-white text-sm">Nâng Cấp Ngay</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
          </div>
        </div>
      </section>

      <!-- ==================== BENEFITS SECTION ==================== -->
      <section class="py-20 px-4 sm:px-6 relative">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-16 lp-reveal">
            <span class="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">Lợi Ích Vượt Trội</span>
            <h2 class="display text-3xl sm:text-4xl font-bold text-gray-900 mt-2">Vì Sao Nên Chọn FitCoach AI Pro?</h2>
            <p class="text-gray-500 mt-3 max-w-xl mx-auto text-sm sm:text-base">Không chỉ là đếm calo, đây là hệ sinh thái AI đồng hành thực sự.</p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Benefit 1 -->
            <div class="p-6 sm:p-8 rounded-3xl lp-glass-card hover:shadow-xl transition-all lp-reveal">
              <div class="w-12 h-12 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mb-5">
                <i data-lucide="message-square-text" class="w-6 h-6 text-[#7C3AED]"></i>
              </div>
              <h3 class="display text-xl font-bold mb-2">Giao Tiếp Tự Nhiên</h3>
              <p class="text-gray-500 text-sm leading-relaxed">Không cần tìm kiếm từng gram thức ăn. Chỉ cần nói hoặc gõ: "Sáng ăn bún bò, uống trà sữa", AI tự bóc tách chính xác Calo & Macro.</p>
            </div>

            <!-- Benefit 2 -->
            <div class="p-6 sm:p-8 rounded-3xl lp-glass-card hover:shadow-xl transition-all lp-reveal">
              <div class="w-12 h-12 rounded-2xl bg-[#FCE7F3] flex items-center justify-center mb-5">
                <i data-lucide="route" class="w-6 h-6 text-[#D946EF]"></i>
              </div>
              <h3 class="display text-xl font-bold mb-2">Lộ Trình Thông Minh</h3>
              <p class="text-gray-500 text-sm leading-relaxed">AI tự động chia nhỏ mục tiêu thành các giai đoạn (Thích nghi -> Tăng tiến). Tự động điều chỉnh nếu bạn bị tụt hậu hoặc vượt trội.</p>
            </div>

            <!-- Benefit 3 -->
            <div class="p-6 sm:p-8 rounded-3xl lp-glass-card hover:shadow-xl transition-all lp-reveal">
              <div class="w-12 h-12 rounded-2xl bg-[#FFEDD5] flex items-center justify-center mb-5">
                <i data-lucide="scan-line" class="w-6 h-6 text-[#F59E0B]"></i>
              </div>
              <h3 class="display text-xl font-bold mb-2">Đọc Mọi Tài Liệu</h3>
              <p class="text-gray-500 text-sm leading-relaxed">Tải lên thực đơn PDF, file Excel tính toán, hoặc chụp ảnh nhãn mác. AI phân tích và đồng bộ ngay vào sổ theo dõi của bạn.</p>
            </div>

            <!-- Benefit 4 -->
            <div class="p-6 sm:p-8 rounded-3xl lp-glass-card hover:shadow-xl transition-all lp-reveal">
              <div class="w-12 h-12 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mb-5">
                <i data-lucide="dumbbell" class="w-6 h-6 text-[#7C3AED]"></i>
              </div>
              <h3 class="display text-xl font-bold mb-2">Huấn Luyện Tại Nhà</h3>
              <p class="text-gray-500 text-sm leading-relaxed">Khai báo dụng cụ (Tạ đơn, Dây kháng, Thảm yoga), AI sẽ thiết kế bài tập thay thế gym chuẩn y như có PT cá nhân hướng dẫn.</p>
            </div>

            <!-- Benefit 5 -->
            <div class="p-6 sm:p-8 rounded-3xl lp-glass-card hover:shadow-xl transition-all lp-reveal">
              <div class="w-12 h-12 rounded-2xl bg-[#FCE7F3] flex items-center justify-center mb-5">
                <i data-lucide="trophy" class="w-6 h-6 text-[#D946EF]"></i>
              </div>
              <h3 class="display text-xl font-bold mb-2">Gamification Cao Cấp</h3>
              <p class="text-gray-500 text-sm leading-relaxed">Giữ Streak liên tục, tích lũy XP qua từng bữa ăn, bài tập để mở khóa huy hiệu danh gia và nâng cấp Avatar Coach của bạn.</p>
            </div>

            <!-- Benefit 6 -->
            <div class="p-6 sm:p-8 rounded-3xl lp-glass-card hover:shadow-xl transition-all lp-reveal">
              <div class="w-12 h-12 rounded-2xl bg-[#FFEDD5] flex items-center justify-center mb-5">
                <i data-lucide="bar-chart-3" class="w-6 h-6 text-[#F59E0B]"></i>
              </div>
              <h3 class="display text-xl font-bold mb-2">Báo Cáo Sức Khỏe</h3>
              <p class="text-gray-500 text-sm leading-relaxed">Biểu đồ trực quan hóa sự thay đổi vóc dáng, tinh thần và chất lượng giấc ngủ dựa trên dữ liệu hàng ngày bạn cung cấp.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== BOTTOM CTA ==================== -->
      <section class="py-20 px-4 sm:px-6 relative overflow-hidden">
        <div class="max-w-4xl mx-auto text-center relative z-10 lp-reveal">
          <h2 class="display text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">Sẵn Sàng Thay Đổi Vóc Dáng Của Bạn Ngay Hôm Nay?</h2>
          <p class="text-gray-500 text-base sm:text-lg mb-8">Khởi tạo kế hoạch chỉ trong 2 phút. Miễn phí trải nghiệm, không cần thẻ tín dụng.</p>
          <button type="button" id="lp-bottom-cta-btn" class="btn-v2 text-white font-bold px-8 sm:px-10 py-4 sm:py-5 rounded-2xl text-base sm:text-lg flex items-center gap-3 mx-auto shadow-xl">
            Tạo Tài Khoản & Bắt Đầu Ngay <i data-lucide="rocket" class="w-6 h-6"></i>
          </button>
        </div>
      </section>

    </div>
  `;

  // Initialize Lucide Icons
  if (window.lucide) window.lucide.createIcons();

  // Bind Interactions & Buttons
  bindLandingPageEvents({ onStartOnboarding, onLoginSuccess });
}

function bindLandingPageEvents({ onStartOnboarding, onLoginSuccess }) {
  const openAuth = (initialView) => {
    renderAuthPage({
      initialView,
      onStartOnboarding,
      onLoginSuccess,
      onBackToLanding: () => renderLandingPage({ onStartOnboarding, onLoginSuccess })
    });
  };

  // 1. Action Buttons triggering Register View
  document.getElementById('lp-btn-register')?.addEventListener('click', () => openAuth('registerView'));
  document.getElementById('lp-hero-start-btn')?.addEventListener('click', () => openAuth('registerView'));
  document.getElementById('lp-bottom-cta-btn')?.addEventListener('click', () => openAuth('registerView'));
  document.getElementById('lp-btn-free-plan')?.addEventListener('click', () => openAuth('registerView'));
  document.getElementById('lp-btn-pro-plan')?.addEventListener('click', () => openAuth('registerView'));

  // 2. Login button triggering Login View
  document.getElementById('lp-btn-login')?.addEventListener('click', () => openAuth('loginView'));

  // ScrollSpy & Smooth Scroll for Header Nav Links
  const navLinks = document.querySelectorAll('.lp-nav-link');
  const sections = ['lp-features', 'lp-journey', 'lp-progress', 'lp-pricing'];

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-section') || link.getAttribute('href')?.replace('#', '');
      const targetEl = targetId ? document.getElementById(targetId) : null;
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  
  function updateActiveNav() {
    const scrollPos = window.scrollY + 200;
    let activeId = '';
    
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          activeId = id;
        }
      }
    });

    navLinks.forEach(link => {
      if (link.getAttribute('data-section') === activeId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  // 3. Counter Animation via IntersectionObserver
  const counters = document.querySelectorAll('.lp-counter');
  function animateCounter(el) {
    if (el.classList.contains('done')) return;
    const target = +el.getAttribute('data-target');
    let current = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        el.innerText = target.toLocaleString('en-US');
        clearInterval(timer);
      } else {
        el.innerText = Math.floor(current).toLocaleString('en-US');
      }
    }, 30);
    el.classList.add('done');
  }

  // 4. Scroll Reveal
  const reveals = document.querySelectorAll('.lp-reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        const cList = entry.target.querySelectorAll('.lp-counter');
        cList.forEach(c => animateCounter(c));
      }
    });
  }, { threshold: 0.1 });
  reveals.forEach(r => observer.observe(r));

  // Trigger counters initially visible
  counters.forEach(c => animateCounter(c));

  // 5. Before/After Slider Interaction
  const baSlider = document.getElementById('lp-ba-slider');
  if (baSlider) {
    const baBefore = baSlider.querySelector('.ba-before');
    const baHandle = baSlider.querySelector('.ba-handle');

    function moveSlider(x) {
      let pos = (x / baSlider.offsetWidth) * 100;
      if (pos > 100) pos = 100;
      if (pos < 0) pos = 0;
      if (baBefore) baBefore.style.width = pos + '%';
      if (baHandle) baHandle.style.left = pos + '%';
    }

    baSlider.addEventListener('mousemove', (e) => {
      moveSlider(e.clientX - baSlider.getBoundingClientRect().left);
    });
    baSlider.addEventListener('touchmove', (e) => {
      if (e.touches?.[0]) {
        moveSlider(e.touches[0].clientX - baSlider.getBoundingClientRect().left);
      }
    });
  }

  // 6. AI Simulator Chat matching AiChatPage.js styling & markdown parser
  const chatBox = document.getElementById('lp-chat-box');
  const simInputText = document.getElementById('lp-sim-input-text');
  const simBtnSend = document.getElementById('lp-sim-btn-send');

  function parseMarkdownLanding(text = '') {
    if (!text) return '';
    let html = text;

    // Code blocks & inline code
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 p-3 rounded-xl text-xs overflow-x-auto my-2"><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code class="bg-purple-100/80 text-[#7C3AED] px-1.5 py-0.5 rounded font-mono text-xs font-semibold">$1</code>');

    // Rich highlights (Calo, Protein, Carbs)
    html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*(?:kcal|calo|calories))\s*\*\*/gi, '<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-md text-xs font-bold">🔥 $1</span>');
    html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*g?\s*(?:protein|đạm))\s*\*\*/gi, '<span class="inline-flex items-center gap-1 bg-purple-50 text-[#7C3AED] border border-purple-200 px-2 py-0.5 rounded-md text-xs font-bold">🥩 $1</span>');
    html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*g?\s*(?:carb|fat|tinh bột|chất béo))\s*\*\*/gi, '<span class="inline-flex items-center gap-1 bg-pink-50 text-pink-600 border border-pink-200 px-2 py-0.5 rounded-md text-xs font-bold">🥑 $1</span>');

    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-purple-950">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // Lists
    html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li class="ml-4 list-disc my-1">$1</li>');
    html = html.replace(/(<li.*?>.*?<\/li>\n?)+/g, '<ul class="my-1.5 pl-1">$&</ul>');

    // Line breaks
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  function createMessage(type, text, isCard = false) {
    const isAI = type === 'ai';
    const contentHtml = parseMarkdownLanding(text);
    return `
      <div class="flex ${isAI ? 'justify-start' : 'justify-end'} animate-fade-in">
        <div class="flex gap-3 max-w-[88%] ${isAI ? 'flex-row' : 'flex-row-reverse'} items-start">
          ${isAI ? `
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex items-center justify-center shadow-md text-white flex-shrink-0">
              <i data-lucide="sparkles" class="w-5 h-5"></i>
            </div>
          ` : `
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white flex items-center justify-center font-serif text-xs font-bold shadow-md flex-shrink-0">
              B
            </div>
          `}
          
          <div class="${isAI ? 'bg-white/95 border border-purple-100 text-gray-800 p-4 rounded-2xl rounded-tl-xs shadow-sm' : 'bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white p-4 rounded-2xl rounded-tr-xs shadow-md'} font-medium text-xs sm:text-sm leading-relaxed ${isCard ? 'w-72 sm:w-84' : ''}">
            <div>${contentHtml}</div>
            ${isAI && isCard ? `
              <div class="mt-3 bg-purple-50/90 border border-purple-200/90 rounded-2xl p-3.5 text-xs text-gray-800 shadow-xs">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                    <i data-lucide="utensils" class="w-4 h-4 text-[#7C3AED]"></i> Thực Đơn Đề Xuất
                  </span>
                  <span class="px-2 py-0.5 rounded-full bg-purple-100 text-[#7C3AED] text-[10px] font-extrabold uppercase">XÁC NHẬN</span>
                </div>
                
                <div class="flex items-baseline gap-1.5 my-2">
                  <span class="display text-2xl font-bold text-gray-900">500</span>
                  <span class="text-xs font-semibold text-gray-500">kcal / bữa tối</span>
                </div>

                <div class="space-y-2 mb-3">
                  <div>
                    <div class="flex justify-between text-[11px] mb-0.5"><span class="text-gray-600 font-medium">Protein</span><span class="font-bold text-[#7C3AED]">40g</span></div>
                    <div class="h-1.5 bg-gray-200/70 rounded-full overflow-hidden"><div class="h-full w-3/4 bg-[#7C3AED] rounded-full"></div></div>
                  </div>
                  <div>
                    <div class="flex justify-between text-[11px] mb-0.5"><span class="text-gray-600 font-medium">Carbs</span><span class="font-bold text-[#D946EF]">50g</span></div>
                    <div class="h-1.5 bg-gray-200/70 rounded-full overflow-hidden"><div class="h-full w-2/3 bg-[#D946EF] rounded-full"></div></div>
                  </div>
                </div>

                <div class="pt-2 border-t border-purple-200/60 text-xs text-gray-700 font-medium space-y-1">
                  <p class="flex items-center gap-1.5"><span>🍗</span> 150g ức gà áp chảo sốt thảo mộc</p>
                  <p class="flex items-center gap-1.5"><span>🥗</span> 100g salad xà lách & bơ thực vật</p>
                  <p class="flex items-center gap-1.5"><span>🍚</span> 50g cơm gạo lứt hấp chín</p>
                </div>

                <div class="flex gap-2 mt-3.5">
                  <button type="button" class="flex-1 bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white text-xs font-bold py-2 rounded-xl shadow-sm hover:opacity-90 transition flex items-center justify-center gap-1">
                    <i data-lucide="check" class="w-3.5 h-3.5"></i> Đồng Ý
                  </button>
                  <button type="button" class="flex-1 bg-white border border-gray-200 text-gray-600 text-xs font-bold py-2 rounded-xl hover:bg-gray-50 transition">
                    Từ chối
                  </button>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function renderInitialWelcome() {
    if (!chatBox) return;
    chatBox.innerHTML = createMessage('ai', 'Xin chào! Tôi là **FitCoach AI**. Bạn muốn tính toán thực đơn, kiểm tra calo hay tạo lịch tập hôm nay?');
    if (window.lucide) window.lucide.createIcons({ el: chatBox });
  }

  function showTyping() {
    if (!chatBox) return;
    const typingEl = document.createElement('div');
    typingEl.id = 'lp-typingIndicator';
    typingEl.className = 'flex justify-start animate-fade-in';
    typingEl.innerHTML = `
      <div class="flex gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex items-center justify-center text-white shadow-md flex-shrink-0">
          <i data-lucide="sparkles" class="w-5 h-5"></i>
        </div>
        <div class="bg-white/95 border border-purple-100 p-3.5 rounded-2xl rounded-tl-xs shadow-sm flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce"></span>
          <span class="w-2 h-2 rounded-full bg-[#D946EF] animate-bounce" style="animation-delay: 0.15s;"></span>
          <span class="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style="animation-delay: 0.3s;"></span>
        </div>
      </div>
    `;
    chatBox.appendChild(typingEl);
    if (window.lucide) window.lucide.createIcons({ el: typingEl });
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function simulateChat(userInput) {
    if (!chatBox || !userInput.trim()) return;
    const text = userInput.trim();
    chatBox.innerHTML += createMessage('user', text);
    if (window.lucide) window.lucide.createIcons({ el: chatBox });
    chatBox.scrollTop = chatBox.scrollHeight;

    setTimeout(() => {
      showTyping();
    }, 300);

    setTimeout(() => {
      document.getElementById('lp-typingIndicator')?.remove();
      let aiText = "";
      let isCard = false;

      if (text.toLowerCase().includes("bữa tối") || text.toLowerCase().includes("thực đơn")) {
        aiText = "Tôi đã tối ưu hóa thực đơn bữa tối dựa trên mục tiêu giảm mỡ của bạn:";
        isCard = true;
      } else if (text.toLowerCase().includes("tập ngực") || text.toLowerCase().includes("bài tập")) {
        aiText = "Đã lên kế hoạch! Bài tập ngực tại nhà 45 phút phù hợp với tạ đơn của bạn: 4 set Dumbbell Bench Press, 3 set Push-up và 3 set Dumbbell Flyes.";
        isCard = false;
      } else {
        aiText = `Đã nhận diện: "${text}". AI Coach đang tính toán calo và macro tương ứng cho bạn!`;
        isCard = false;
      }

      chatBox.innerHTML += createMessage('ai', aiText, isCard);
      if (window.lucide) window.lucide.createIcons({ el: chatBox });
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 1400);
  }

  // Render initial welcome
  renderInitialWelcome();

  // Bind Preset Click Buttons
  document.querySelectorAll('.lp-chat-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      if (q) simulateChat(q);
    });
  });

  // Bind Custom Text Input & Send Button
  const handleUserSubmit = () => {
    if (simInputText && simInputText.value.trim()) {
      simulateChat(simInputText.value);
      simInputText.value = '';
    }
  };

  simBtnSend?.addEventListener('click', handleUserSubmit);
  simInputText?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUserSubmit();
    }
  });
}
