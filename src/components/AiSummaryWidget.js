import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';

export async function renderAiSummaryWidget(containerId = 'dashboard-ai-summary-container', passedScore = null, passedLog = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const profile = await DataService.getUserProfile();
  const goal = await DataService.getUserGoal();
  const todayLog = passedLog || await DataService.getDailyLog();
  const progress = await DataService.getUserProgress();

  // Daily Calculations
  const caloriesIn = (todayLog.meals || []).reduce((sum, m) => sum + (m.calories || 0), 0);
  const caloriesOut = (todayLog.workouts || []).reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  const netCalories = caloriesIn - caloriesOut;
  const calorieTarget = goal.dailyCalorieTarget || 2000;

  const waterIntake = todayLog.waterIntake || 0;
  const waterTarget = goal.waterTarget || 2500;

  const checklistDone = (todayLog.checklist || []).filter(c => c.done).length;
  const checklistTotal = (todayLog.checklist || []).length;

  // Unified Discipline Score (directly synced from Dashboard.js or computed)
  let score = 0;
  if (passedScore !== null && passedScore !== undefined) {
    score = passedScore;
  } else {
    const hasMeal = (todayLog.meals || []).length > 0;
    const hasWater = waterIntake > 0;
    const hasWorkout = (todayLog.workouts || []).length > 0 || !!todayLog.isRestDay;
    const hasChecklist = (todayLog.checklist || []).some(t => t.done);

    const checkins = [hasMeal, hasWater, hasWorkout, hasChecklist];
    const completeCount = checkins.filter(Boolean).length;
    const waterRatio = waterTarget > 0 ? Math.min(1, waterIntake / waterTarget) : 0;
    score = Math.min(100, Math.round((completeCount / 4) * 80 + waterRatio * 20));
  }

  // Default Daily Advice
  let dailyAdvice = '';
  if (score >= 80) {
    dailyAdvice = `Tuyệt vời ${profile.name || 'bạn'}! Bạn đã đạt ${score}/100 điểm kỷ luật, kiểm soát calo (${netCalories}/${calorieTarget} kcal) và uống nước rất chuẩn. Giữ vững phong độ nhé!`;
  } else if (score >= 50) {
    dailyAdvice = `Khá tốt! Bạn đã đạt ${score}/100 điểm kỷ luật. Tối nay hãy bổ sung thêm nước và hoàn thành nốt các việc trong checklist để trọn vẹn ngày nhé.`;
  } else {
    dailyAdvice = `Hôm nay điểm kỷ luật của bạn đang ở mức ${score}/100. Lượng calo và nước nạp vào còn thấp. Hãy cố gắng hoàn thành checklist để cải thiện ngay nhé!`;
  }

  // Default Weekly Advice
  const weeklyAdvice = `Tổng kết tuần này: Bạn đã duy trì chuỗi Streak ${progress.currentStreak} ngày liên tục! Lịch tập hoàn thành 70%. Tuần sau hãy cố gắng tăng cường Protein và uống đủ nước để bứt phá nhé!`;

  const html = `
    <!-- BOX CHÍNH: APPLE GLASS STYLE -->
    <div class="relative bg-white/75 dark:bg-[#1E1B2E]/75 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-purple-100/80 dark:border-purple-900/40 shadow-xl flex flex-col fade-up">
      
      <!-- Phần Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-white dark:bg-[#25213B] flex items-center justify-center p-0.5 shadow-md border border-purple-100 dark:border-purple-900/50 flex-shrink-0 overflow-hidden">
            <img src="/nova-ai-logo.svg" class="w-full h-full object-contain scale-110" alt="Nova AI Avatar">
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted" style="color: var(--text-muted);">AI Coach</p>
            <h2 class="display text-lg font-semibold leading-tight" style="color: var(--text-main);">Đánh Giá Của AI</h2>
          </div>
        </div>
        
        <!-- Nút chuyển Tab -->
        <div class="toggle-group flex text-xs font-bold w-36">
          <button id="btn-ai-today" class="flex-1 py-1.5 transition-all active">Hôm nay</button>
          <button id="btn-ai-week" class="flex-1 py-1.5 transition-all">Tuần này</button>
        </div>
      </div>

      <!-- Phần Nội Dung & Nút Bấm -->
      <div class="flex-1 flex flex-col justify-center">
        
        <!-- Khung chứa Text / Thinking -->
        <div class="min-h-[85px] mb-6 flex items-start">
          <p id="ai-text-display" class="display text-base md:text-lg font-medium leading-relaxed cursor" style="color: var(--text-main);"></p>
          
          <!-- Thinking State -->
          <div id="ai-thinking-box" class="hidden items-center gap-2 text-muted text-sm font-medium mt-2" style="color: var(--text-muted);">
            <i data-lucide="loader-2" class="w-4 h-4 animate-spin text-[#7C3AED]"></i>
            <span>AI đang suy nghĩ &amp; phân tích dữ liệu...</span>
          </div>
        </div>

        <!-- Nút Phân Tích Lại (NỀN TÍM CHỮ TRẮNG CHUẨN NỐI BẬT) -->
        <button id="re-analyze-btn" class="w-full py-3.5 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 hover:-translate-y-0.5 active:scale-95 cursor-pointer">
          <span id="re-default" class="flex items-center gap-2">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i> 
            AI phân tích lại chi tiết
          </span>
          <span id="re-loading" class="hidden items-center gap-2">
            <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> 
            Đang phân tích dữ liệu...
          </span>
        </button>

      </div>
      
    </div>
  `;

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();

  let currentTab = 0; // 0: Today, 1: Week
  let isAnalyzing = false;
  let activeTimer = null;
  let customDailyAdvice = null;

  // Typewriter effect function
  function typeText(text) {
    if (activeTimer) clearTimeout(activeTimer);
    const target = document.getElementById('ai-text-display');
    if (!target) return;
    target.textContent = '';
    target.classList.add('cursor');
    let i = 0;
    function type() {
      if (i < text.length) {
        target.textContent += text.charAt(i);
        i++;
        activeTimer = setTimeout(type, 25);
      }
    }
    type();
  }

  // Switch Tab (Today / Week)
  function switchTab(index) {
    if (isAnalyzing) return;
    currentTab = index;
    const btnToday = document.getElementById('btn-ai-today');
    const btnWeek = document.getElementById('btn-ai-week');

    if (index === 0) {
      btnToday?.classList.add('active');
      btnWeek?.classList.remove('active');
      typeText(customDailyAdvice || dailyAdvice);
    } else {
      btnToday?.classList.remove('active');
      btnWeek?.classList.add('active');
      typeText(weeklyAdvice);
    }
  }

  document.getElementById('btn-ai-today')?.addEventListener('click', () => switchTab(0));
  document.getElementById('btn-ai-week')?.addEventListener('click', () => switchTab(1));

  // Re-analyze Button handler
  document.getElementById('re-analyze-btn')?.addEventListener('click', async () => {
    if (isAnalyzing) return;
    isAnalyzing = true;
    if (activeTimer) clearTimeout(activeTimer);

    const btn = document.getElementById('re-analyze-btn');
    const reDefault = document.getElementById('re-default');
    const reLoading = document.getElementById('re-loading');
    const aiText = document.getElementById('ai-text-display');
    const thinkingBox = document.getElementById('ai-thinking-box');

    reDefault?.classList.add('hidden');
    reLoading?.classList.remove('hidden');
    reLoading?.classList.add('flex');
    btn?.classList.remove('hover:-translate-y-0.5');

    aiText?.classList.add('hidden');
    aiText?.classList.remove('cursor');
    thinkingBox?.classList.remove('hidden');
    thinkingBox?.classList.add('flex');

    try {
      const isWeekMode = currentTab === 1;
      const detailedPrompt = isWeekMode
        ? `Hãy phân tích tổng kết tiến độ tuần này của tôi (${profile.name}):
- Calo ròng hôm nay = ${netCalories} kcal (Mục tiêu = ${calorieTarget} kcal)
- Nước uống hôm nay = ${waterIntake}/${waterTarget} ml
- Checklist hôm nay = ${checklistDone}/${checklistTotal} công việc
- Chuỗi Streak = ${progress.currentStreak} ngày

Yêu cầu: Đưa ra nhận xét ngắn gọn 2-3 câu về tổng quan tuần này và lời khuyên hành động định hướng tiếp theo.`
        : `Hãy phân tích sâu tiến độ hôm nay của tôi (${profile.name}):
- Calo nạp = ${caloriesIn} kcal, Calo đốt = ${caloriesOut} kcal, Calo ròng = ${netCalories} kcal (Mục tiêu = ${calorieTarget} kcal)
- Nước uống = ${waterIntake}/${waterTarget} ml (${Math.round((waterIntake / waterTarget) * 100)}%)
- Checklist kỷ luật = ${checklistDone}/${checklistTotal} công việc
- Chuỗi Streak = ${progress.currentStreak} ngày

Yêu cầu: Đánh giá ngắn gọn 2-3 câu, chỉ ra ưu/nhược điểm hôm nay và lời khuyên hành động thực tế nhất.`;

      const aiResponse = await AiCoachService.sendMessage(detailedPrompt);
      let newAdvice = currentTab === 0 ? dailyAdvice : weeklyAdvice;
      if (aiResponse && aiResponse.content) {
        newAdvice = aiResponse.content.replace(/```json[\s\S]*?```/g, '').trim();
      }

      reLoading?.classList.add('hidden');
      reLoading?.classList.remove('flex');
      reDefault?.classList.remove('hidden');
      btn?.classList.add('hover:-translate-y-0.5');

      thinkingBox?.classList.add('hidden');
      thinkingBox?.classList.remove('flex');
      aiText?.classList.remove('hidden');

      if (currentTab === 0) customDailyAdvice = newAdvice;
      typeText(newAdvice);
    } catch (e) {
      console.error(e);
      reLoading?.classList.add('hidden');
      reLoading?.classList.remove('flex');
      reDefault?.classList.remove('hidden');
      thinkingBox?.classList.add('hidden');
      thinkingBox?.classList.remove('flex');
      aiText?.classList.remove('hidden');
      typeText('Không thể kết nối AI Coach. Vui lòng thử lại sau ít phút.');
    } finally {
      isAnalyzing = false;
    }
  });

  // Initial typewriter effect
  typeText(dailyAdvice);
}
