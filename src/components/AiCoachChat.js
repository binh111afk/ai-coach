import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { appState } from '../services/appState.js';
import { renderGeminiIcon } from './ui/Icons.js';

export async function renderAiCoachChat(onStateUpdated) {
  let isSending = false;

  const chatDrawerHtml = `
    <!-- Floating FAB Trigger Button -->
    <button class="chat-fab" id="chat-fab-toggle" title="Mở AI Coach">
      ${renderGeminiIcon({ width: 28, height: 28, strokeWidth: 1.8 })}
    </button>

    <!-- Floating Chat Drawer (Premium Glass Card Style) -->
    <div class="chat-drawer shadow-2xl relative" id="chat-drawer">
      
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-color" style="border-bottom: 1px solid var(--border-color); background: var(--bg-subtle);">
        <div class="flex items-center gap-3">
          <div class="relative">
            <!-- Avatar AI với Glow -->
            <div class="absolute inset-0 bg-[#7C3AED] blur-lg opacity-40 rounded-full"></div>
            <div class="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex items-center justify-center shadow-md text-white">
              <i data-lucide="bot" class="w-5 h-5"></i>
            </div>
            <!-- Chấm online -->
            <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h2 class="display text-base font-bold leading-tight" style="color: var(--text-main);">AI Coach</h2>
            <p class="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
              Smart Brain · Online
            </p>
          </div>
        </div>
        <button class="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-muted transition cursor-pointer" id="chat-drawer-close" aria-label="Đóng">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Messages History Area -->
      <div class="chat-messages" id="chat-messages-container">
        <!-- Rendered dynamically -->
      </div>

      <!-- Quick Replies Chips -->
      <div class="flex gap-2 p-2.5 overflow-x-auto scrollbar-hide border-t border-color" style="border-top: 1px solid var(--border-color); background: var(--bg-subtle);">
        <button class="quick-chip whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer" data-quick-prompt="Chào bạn, tư vấn cho tôi hôm nay">
          <i data-lucide="message-square" class="w-3.5 h-3.5"></i> Chào bạn
        </button>
        <button class="quick-chip whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer" data-quick-prompt="Tạo thực đơn dinh dưỡng hôm nay">
          <i data-lucide="utensils" class="w-3.5 h-3.5"></i> Tạo thực đơn
        </button>
        <button class="quick-chip whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer" data-quick-prompt="Gợi ý bài tập luyện hôm nay">
          <i data-lucide="dumbbell" class="w-3.5 h-3.5"></i> Gợi ý bài tập
        </button>
      </div>

      <!-- Input Bar Wrapper -->
      <div class="p-3 border-t border-color" style="border-top: 1px solid var(--border-color); background: var(--bg-card);">
        <div class="chat-input-wrapper rounded-2xl p-1.5 flex items-center gap-2">
          <button class="action-btn w-9 h-9 rounded-full flex items-center justify-center text-muted hover:bg-gray-100 dark:hover:bg-white/10 flex-shrink-0 cursor-pointer" id="btn-chat-attachment" title="Đính kèm dữ liệu hôm nay">
            <i data-lucide="paperclip" class="w-4 h-4"></i>
          </button>
          <input id="chat-input-text" type="text" placeholder="Nhập tin nhắn cho AI..." class="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium placeholder:text-gray-400" style="color: var(--text-main);">
          <button class="action-btn btn-mic w-9 h-9 rounded-full flex items-center justify-center text-muted hover:bg-gray-100 dark:hover:bg-white/10 flex-shrink-0 cursor-pointer" id="btn-chat-mic" title="Nói qua micro">
            <i data-lucide="mic" class="w-4 h-4"></i>
          </button>
          <button id="chat-btn-send" class="action-btn btn-send w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 cursor-pointer">
            <i data-lucide="send" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('chat-mount');
  if (mountNode) {
    mountNode.innerHTML = chatDrawerHtml;
    if (window.lucide) window.lucide.createIcons();

    const fab = document.getElementById('chat-fab-toggle');
    const drawer = document.getElementById('chat-drawer');
    const closeBtn = document.getElementById('chat-drawer-close');
    const sendBtn = document.getElementById('chat-btn-send');
    const inputText = document.getElementById('chat-input-text');

    const toggleDrawer = () => drawer.classList.toggle('open');
    fab?.addEventListener('click', toggleDrawer);
    closeBtn?.addEventListener('click', () => drawer.classList.remove('open'));

    // Expose open drawer function globally for other buttons
    window.openAiCoachDrawer = () => drawer.classList.add('open');

    // Load initial chat history
    await refreshChatMessages(onStateUpdated);

    // Send Message Handler
    const sendMessageHandler = async () => {
      const msg = inputText.value.trim();
      if (!msg || isSending) return;

      isSending = true;
      inputText.value = '';
      inputText.disabled = true;

      // 1. Add User Message
      await DataService.addChatMessage({ role: 'user', content: msg });
      await refreshChatMessages(onStateUpdated);

      // Show dynamic thinking indicator animation
      showThinkingIndicator();

      // 2. Fetch Chat History context & call AI Coach Service
      const history = await DataService.getChatHistory();
      const aiResponse = await AiCoachService.sendMessage(msg, history);

      // Hide thinking indicator
      hideThinkingIndicator();

      // 3. Save AI Message
      await DataService.addChatMessage({
        role: 'assistant',
        content: aiResponse.content,
        proposedChange: aiResponse.proposedChange,
        status: aiResponse.proposedChange ? 'pending' : 'none'
      });

      isSending = false;
      inputText.disabled = false;
      inputText.focus();

      await refreshChatMessages(onStateUpdated);
    };

    sendBtn?.addEventListener('click', sendMessageHandler);
    inputText?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessageHandler();
    });

    // Quick Reply Chips Event Handlers
    mountNode.querySelectorAll('[data-quick-prompt]').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-quick-prompt');
        if (prompt && inputText) {
          inputText.value = prompt;
          sendMessageHandler();
        }
      });
    });

    // Attachment Button Handler
    document.getElementById('btn-chat-attachment')?.addEventListener('click', async () => {
      const todayLog = (await DataService.getDailyLog()) || { meals: [], workouts: [], waterIntake: 0 };
      const mealsList = todayLog.meals || [];
      const caloriesIn = mealsList.reduce((sum, m) => sum + (m.calories || m.kcal || 0), 0);
      if (inputText) {
        inputText.value = `Hôm nay tôi đã ăn ${mealsList.length} bữa (${caloriesIn} kcal) và uống ${todayLog.waterIntake || 0}ml nước. Bạn có thể nhận xét giúp tôi không?`;
        inputText.focus();
      }
    });

    // Voice Mic Handler (Speech Recognition)
    const btnMic = document.getElementById('btn-chat-mic');
    if (btnMic) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.continuous = false;

        let isListening = false;
        recognition.onstart = () => {
          isListening = true;
          btnMic.style.color = '#D946EF';
          btnMic.classList.add('animate-pulse');
        };
        recognition.onend = () => {
          isListening = false;
          btnMic.style.color = '';
          btnMic.classList.remove('animate-pulse');
        };
        recognition.onresult = (e) => {
          const transcript = e.results[0][0].transcript;
          if (inputText) inputText.value = transcript;
        };

        btnMic.addEventListener('click', () => {
          if (isListening) recognition.stop();
          else recognition.start();
        });
      }
    }
  }
}

function showThinkingIndicator() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const existing = document.getElementById('ai-thinking-indicator');
  if (existing) return;

  const thinkingDiv = document.createElement('div');
  thinkingDiv.id = 'ai-thinking-indicator';
  thinkingDiv.className = 'flex items-start gap-2.5 mb-3';

  thinkingDiv.innerHTML = `
    <div class="w-7 h-7 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex-shrink-0 flex items-center justify-center text-white shadow-sm">
      <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
    </div>
    <div class="msg-bubble" style="padding: 8px 14px; border-radius: 16px 16px 16px 4px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(217, 70, 239, 0.08)); border: 1.5px solid rgba(124, 58, 237, 0.18); max-width: fit-content;">
      <div class="thinking-content">
        <span class="thinking-text">AI Coach đang suy nghĩ</span>
        <div class="thinking-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;

  container.appendChild(thinkingDiv);
  if (window.lucide) window.lucide.createIcons();
  container.scrollTop = container.scrollHeight;
}

function hideThinkingIndicator() {
  const indicator = document.getElementById('ai-thinking-indicator');
  if (indicator) indicator.remove();
}

async function refreshChatMessages(onStateUpdated) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  try {
    const history = await DataService.getChatHistory();

    if (history.length === 0) {
      const profile = (await DataService.getUserProfile()) || {};
      const goal = (await DataService.getUserGoal()) || {};
      const todayLog = (await DataService.getDailyLog()) || { meals: [], workouts: [], waterIntake: 0 };
      const mealsList = todayLog.meals || [];
      const caloriesIn = mealsList.reduce((sum, m) => sum + (m.calories || m.kcal || 0), 0);
      const waterIntake = todayLog.waterIntake || 0;

    container.innerHTML = `
      <div class="flex items-start gap-2.5 my-auto">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex-shrink-0 flex items-center justify-center mt-1 text-white shadow-sm">
          <i data-lucide="bot" class="w-4 h-4"></i>
        </div>
        <div class="ai-bubble rounded-2xl rounded-tl-sm p-3.5 max-w-[88%] shadow-sm">
          <p class="text-sm leading-relaxed mb-3" style="color: var(--text-main);">
            Chào <span class="font-bold text-[var(--accent-purple)]">${profile.name || 'Chiến Binh Fitness'}</span>! Rất vui được đồng hành cùng bạn. Hôm nay chúng ta sẽ cùng nhau chinh phục mục tiêu nhé!
          </p>

          <!-- Mini Data Cards trong Chat -->
          <div class="grid grid-cols-2 gap-2 mb-3">
            <!-- Trọng lượng -->
            <div class="data-card rounded-xl p-2.5">
              <div class="flex items-center gap-1.5 mb-1">
                <i data-lucide="scale" class="w-3.5 h-3.5 text-pink-500"></i>
                <span class="text-[10px] font-bold text-muted uppercase">Cân nặng</span>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="display text-base font-bold" style="color: var(--text-main);">${profile.currentWeight || 70}kg</span>
                <i data-lucide="arrow-right" class="w-3 h-3 text-muted"></i>
                <span class="text-xs font-bold text-emerald-500">${goal.targetWeight || 65}kg</span>
              </div>
            </div>
            <!-- Calo & Nước -->
            <div class="data-card rounded-xl p-2.5">
              <div class="flex items-center gap-1.5 mb-1">
                <i data-lucide="flame" class="w-3.5 h-3.5 text-amber-500"></i>
                <span class="text-[10px] font-bold text-muted uppercase">Hôm Nay</span>
              </div>
              <div class="flex items-baseline gap-1.5">
                <span class="display text-sm font-bold" style="color: var(--text-main);">${caloriesIn} <span class="text-[9px] font-medium text-muted">kcal</span></span>
                <span class="text-sm font-bold text-cyan-500">${waterIntake} <span class="text-[9px] font-medium text-muted">ml</span></span>
              </div>
            </div>
          </div>

          <p class="text-xs text-muted flex items-start gap-1.5 mt-1" style="color: var(--text-muted);">
            <i data-lucide="info" class="w-3.5 h-3.5 text-[var(--accent-purple)] mt-0.5 flex-shrink-0"></i>
            Hãy duy trì ghi chép để AI phân tích và tối ưu hóa kế hoạch của bạn nhé!
          </p>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const html = history.map(m => {
    if (m.role === 'user') {
      return `
        <div class="flex justify-end">
          <div class="bg-gradient-to-br from-[#7C3AED] to-[#D946EF] text-white text-sm font-medium p-3.5 rounded-2xl rounded-tr-sm max-w-[82%] shadow-md">
            ${parseMarkdown(m.content)}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="flex items-start gap-2.5">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#D946EF] flex-shrink-0 flex items-center justify-center mt-1 text-white shadow-sm">
            <i data-lucide="bot" class="w-4 h-4"></i>
          </div>
          <div class="ai-bubble rounded-2xl rounded-tl-sm p-3.5 max-w-[88%] shadow-sm">
            <div class="chat-markdown-body text-sm leading-relaxed" style="line-height: 1.55;">${parseMarkdown(m.content)}</div>
            ${m.proposedChange ? renderApprovalCard(m) : ''}
          </div>
        </div>
      `;
    }
  }).join('');

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;

  // Attach Approval Card Listeners
  container.querySelectorAll('[data-approve-prop]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const msgId = btn.getAttribute('data-approve-prop');
      const msg = history.find(item => item.id === msgId);
      if (msg && msg.proposedChange) {
        const success = await DataService.applyProposedChange(msg.proposedChange);
        if (success) {
          await DataService.updateChatMessageStatus(msgId, 'approved');
          await DataService.addChatMessage({
            role: 'assistant',
            content: `✅ **Đã áp dụng thay đổi thành công!** ${msg.proposedChange.title} đã được cập nhật vào dữ liệu web.`
          });
          await refreshChatMessages(onStateUpdated);
          if (onStateUpdated) onStateUpdated();
        }
      }
    });
  });

  container.querySelectorAll('[data-reject-prop]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const msgId = btn.getAttribute('data-reject-prop');
      const msg = history.find(item => item.id === msgId);
      if (msg) {
        await DataService.updateChatMessageStatus(msgId, 'rejected');
        await DataService.addChatMessage({
          role: 'assistant',
          content: `❌ **Đã từ chối đề xuất.** Bạn có muốn điều chỉnh thêm gì khác không?`
        });
        await refreshChatMessages(onStateUpdated);
      }
    });
  });
} catch (err) {
  console.error('❌ Error refreshing AI chat messages:', err);
}
}

function formatApprovalTitle(titleStr) {
  if (!titleStr) return '<h4 class="display text-base md:text-lg font-bold text-[var(--text-main)] leading-tight mt-1">Đề Xuất Thay Đổi Dữ Liệu</h4>';

  let hasWarning = false;
  let cleanTitle = titleStr;

  if (cleanTitle.includes('[⚠️ GHI ĐÈ]') || cleanTitle.includes('GHI ĐÈ')) {
    hasWarning = true;
    cleanTitle = cleanTitle.replace(/\[?⚠️?\s*GHI ĐÈ\]?\s*/gi, '').trim();
  }

  const warningBadge = hasWarning ? `
    <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 mb-1 w-fit">
      <i data-lucide="alert-triangle" class="w-3 h-3 text-amber-600 flex-shrink-0"></i> CẢNH BÁO GHI ĐÈ
    </div>
  ` : '';

  let mainText = '';
  let subText = '';

  // Match 1: "Main (Sub)" e.g. "Ghi nhận Bữa Tối (Gà rán)"
  const parenMatch = cleanTitle.match(/^(.*?)\s*[\(\（](.*?)[\)\）]$/);
  if (parenMatch) {
    mainText = parenMatch[1].trim();
    subText = parenMatch[2].trim();
  }
  // Match 2: "Main : Sub" or "Main: Sub" e.g. "Ghi nhận bữa tối : Gà rán"
  else if (cleanTitle.includes(':')) {
    const idx = cleanTitle.indexOf(':');
    mainText = cleanTitle.substring(0, idx).trim();
    subText = cleanTitle.substring(idx + 1).trim();
  }
  // Match 3: "Main bằng Sub"
  else if (cleanTitle.includes(' bằng ')) {
    const parts = cleanTitle.split(' bằng ');
    mainText = parts[0].trim();
    subText = parts.slice(1).join(' bằng ').trim();
  }

  if (mainText && subText) {
    if (!mainText.endsWith(':')) mainText += ':';
    return `
      ${warningBadge}
      <h4 class="display text-base md:text-lg font-bold text-[var(--text-main)] leading-tight mt-0.5">${mainText}</h4>
      <div class="text-xs md:text-sm font-semibold text-[var(--accent-purple)] mt-1.5 break-words bg-[var(--accent-purple-light)]/60 px-2.5 py-1 rounded-lg border border-[rgba(124,58,237,0.15)] w-fit">${subText}</div>
    `;
  }

  return `
    ${warningBadge}
    <h4 class="display text-base md:text-lg font-bold text-[var(--text-main)] leading-tight mt-0.5">${cleanTitle}</h4>
  `;
}

function renderApprovalDetailsContent(msg) {
  const prop = msg.proposedChange;
  if (!prop) return '';

  const isPhotoAction = prop.type === 'LOG_PROGRESS_PHOTO' || 
                        prop.type === 'UPLOAD_PHOTO' || 
                        prop.type === 'UPDATE_PHOTO_TAG' ||
                        prop.type === 'COMPARE_PHOTOS' ||
                        Boolean(prop.payload?.oldPhotoUrl || prop.payload?.photoUrl || prop.payload?.journeyDay || (prop.title && prop.title.includes('Ảnh Tiến Trình')));

  if (isPhotoAction) {
    const targetDay = Number(prop.payload?.journeyDay || 1);
    const cachedPhotos = appState ? appState.getPhotos() : [];
    const matchedPhoto = cachedPhotos.find((p, idx) => (p.journeyDay && Number(p.journeyDay) === targetDay) || (idx + 1) === targetDay);

    let oldImg = prop.payload?.oldPhotoUrl || prop.payload?.oldPhotoDataUrl;
    if (!oldImg && matchedPhoto) {
      oldImg = matchedPhoto.photoDataUrl || matchedPhoto.url || matchedPhoto.photoUrl || matchedPhoto.dataUrl;
    }

    let newImg = prop.payload?.photoUrl || prop.payload?.photoDataUrl;
    if (!newImg && msg.attachments && msg.attachments.length > 0) {
      const imgAtt = msg.attachments.find(a => a.dataUrl || a.url);
      if (imgAtt) newImg = imgAtt.dataUrl || imgAtt.url;
    }

    if (oldImg || newImg) {
      return `
        <div class="info-box highlight p-2.5 rounded-xl flex items-center justify-center gap-3 border border-[rgba(124,58,237,0.25)] bg-[var(--accent-purple-light)]/30 w-fit mx-auto md:mx-0">
          <!-- Old Image Thumbnail -->
          ${oldImg ? `
            <div class="relative w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border border-gray-300 shadow-sm flex-shrink-0 bg-gray-100">
              <img src="${oldImg}" class="w-full h-full object-cover" alt="Ảnh cũ" />
              <span class="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[9px] font-bold text-center py-0.5">Ảnh cũ</span>
            </div>
          ` : `
            <div class="w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 border-dashed border-purple-200 flex flex-col items-center justify-center text-purple-400 bg-white/60 flex-shrink-0">
              <i data-lucide="image" class="w-4 h-4"></i>
              <span class="text-[9px] font-bold mt-0.5">Chưa có</span>
            </div>
          `}

          <!-- Arrow -->
          <div class="flex flex-col items-center justify-center text-[var(--accent-purple)] flex-shrink-0 px-1">
            <i data-lucide="arrow-right" class="w-4 h-4 md:w-5 md:h-5"></i>
            <span class="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 mt-0.5 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">${oldImg ? 'Ghi đè' : 'Tải lên'}</span>
          </div>

          <!-- New Image Thumbnail (Side text removed as requested) -->
          ${newImg ? `
            <div class="relative w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border-2 border-[var(--accent-purple)] shadow-md flex-shrink-0 bg-purple-50">
              <img src="${newImg}" class="w-full h-full object-cover" alt="Ảnh mới" />
              <span class="absolute bottom-0 inset-x-0 bg-[var(--accent-purple)] text-white text-[9px] font-bold text-center py-0.5">Mới</span>
            </div>
          ` : `
            <div class="w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 border-purple-400 flex flex-col items-center justify-center text-purple-600 bg-purple-50 flex-shrink-0 shadow-sm">
              <i data-lucide="camera" class="w-4 h-4"></i>
              <span class="text-[9px] font-bold mt-0.5">Ảnh mới</span>
            </div>
          `}
        </div>
      `;
    }
  }

  // Standard details list (Food, Workout, Goals, Water, etc.)
  const detailsList = prop.details || [];
  return `
    <div class="space-y-2">
      ${detailsList.map((d, idx) => `
        <div class="info-box ${idx === (detailsList.length - 1) && detailsList.length > 1 ? 'highlight' : ''} flex items-center justify-between gap-2">
          <span class="text-xs font-bold ${idx === (detailsList.length - 1) && detailsList.length > 1 ? 'text-[var(--accent-purple)]' : 'text-gray-400'} uppercase tracking-wider">${d.field}:</span>
          <div class="flex items-center gap-2">
            <span class="text-xs md:text-sm text-gray-400 line-through">${d.from}</span>
            <i data-lucide="arrow-right" class="w-4 h-4 text-[var(--text-muted)] flex-shrink-0"></i>
            <span class="text-sm font-bold text-[var(--text-main)]">${d.to}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderApprovalCard(msg) {
  const prop = msg.proposedChange;
  const status = msg.status || 'pending';

  if (status === 'approved') {
    return `
      <div class="approval-card-horizontal approved p-4 rounded-2xl flex items-center justify-between gap-3" style="background: rgba(16, 185, 129, 0.08); border: 1.5px solid rgba(16, 185, 129, 0.3);">
        <div class="flex items-center gap-2.5 text-[#10B981] font-bold text-sm">
          <div class="w-8 h-8 rounded-xl bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
            <i data-lucide="check-circle" class="w-5 h-5 text-[#10B981]"></i>
          </div>
          <div>
            <div class="text-[10px] uppercase tracking-wider text-[#10B981] font-extrabold">ĐÃ ÁP DỤNG THAY ĐỔI ✓</div>
            <div class="text-sm font-semibold text-[var(--text-main)] mt-0.5">${prop.title || 'Đã cập nhật dữ liệu'}</div>
          </div>
        </div>
        <span class="text-xs font-bold px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981]">Thành công</span>
      </div>
    `;
  }

  if (status === 'rejected') {
    return `
      <div class="approval-card-horizontal rejected p-4 rounded-2xl flex items-center justify-between gap-3" style="background: rgba(239, 68, 68, 0.08); border: 1.5px solid rgba(239, 68, 68, 0.3);">
        <div class="flex items-center gap-2.5 text-[#EF4444] font-bold text-sm">
          <div class="w-8 h-8 rounded-xl bg-[#EF4444]/15 flex items-center justify-center flex-shrink-0">
            <i data-lucide="x-circle" class="w-5 h-5 text-[#EF4444]"></i>
          </div>
          <div>
            <div class="text-[10px] uppercase tracking-wider text-[#EF4444] font-extrabold">ĐÃ TỪ CHỐI ✗</div>
            <div class="text-sm font-semibold text-[var(--text-main)] mt-0.5">${prop.title || 'Đã hủy đề xuất'}</div>
          </div>
        </div>
        <span class="text-xs font-bold px-3 py-1 rounded-full bg-[#EF4444]/15 text-[#EF4444]">Đã từ chối</span>
      </div>
    `;
  }

  return `
    <div class="approval-card-horizontal">
      <div class="blob"></div>
      
      <!-- Layout ngang: Flex row (Đã bỏ icon theo yêu cầu) -->
      <div class="relative z-10 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
        
        <!-- Cột 1: Title & Tag (Không có icon) -->
        <div class="md:w-2/5 lg:w-1/3 border-b md:border-b-0 md:border-r border-[var(--border-color)] pb-3 md:pb-0 md:pr-4">
          <span class="text-[10px] font-bold text-[var(--accent-purple)] bg-[var(--accent-purple-light)] px-2 py-0.5 rounded-md uppercase tracking-wider">Cập Nhật</span>
          ${formatApprovalTitle(prop.title)}
          <p class="text-xs text-muted hidden md:block mt-1">AI đã nhận diện thay đổi</p>
        </div>

        <!-- Cột 2: Thông số / Thumbnail Ảnh thay đổi -->
        <div class="flex-1">
          ${renderApprovalDetailsContent(msg)}
        </div>

        <!-- Cột 3: Nút bấm -->
        <div class="flex md:flex-col gap-2.5 md:w-1/4 lg:w-1/5 flex-shrink-0">
          <button class="btn-accept flex-1 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs md:text-sm whitespace-nowrap cursor-pointer" data-approve-prop="${msg.id}">
            <i data-lucide="check" class="w-4 h-4"></i>
            Đồng Ý
          </button>
          <button class="btn-reject flex-1 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs md:text-sm whitespace-nowrap cursor-pointer" data-reject-prop="${msg.id}">
            <i data-lucide="x" class="w-4 h-4"></i>
            Từ Chối
          </button>
        </div>

      </div>
    </div>
  `;
}

function parseMarkdown(text = '') {
  if (!text) return '';
  let html = text;

  // Code blocks & inline code
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.18); padding: 0.6rem; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; margin: 0.4rem 0;"><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(117, 86, 217, 0.15); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.82rem; color: var(--accent-purple); font-weight: 600;">$1</code>');

  // Quotes / Callout Box (> Quote)
  html = html.replace(/^>\s*(.*$)/gim, '<blockquote class="ai-callout-box">$1</blockquote>');

  // Images
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<div style="margin: 0.4rem 0;"><img src="$2" alt="$1" style="max-width: 220px; max-height: 180px; border-radius: 10px; object-fit: cover; border: 2px solid var(--accent-purple);"></div>');

  // Tables
  const tableRegex = /(?:\|[^\n]+\|\r?\n){2,}/g;
  html = html.replace(tableRegex, (match) => {
    const lines = match.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return match;

    const headers = lines[0].split('|').map(s => s.trim()).filter(Boolean);
    const rows = lines.slice(2).map(line => line.split('|').map(s => s.trim()).filter(Boolean));

    let tableHtml = `<div style="overflow-x: auto; margin: 0.6rem 0; border-radius: 8px; border: 1px solid var(--border-color);"><table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; background: var(--bg-subtle);">`;
    tableHtml += `<thead><tr style="background: linear-gradient(135deg, rgba(117, 86, 217, 0.18), rgba(168, 145, 255, 0.1)); border-bottom: 1.5px solid var(--border-color);">`;
    headers.forEach(h => {
      tableHtml += `<th style="padding: 0.45rem 0.65rem; text-align: left; font-weight: 800; color: var(--accent-purple);">${h}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.03)';
      tableHtml += `<tr style="background: ${bg}; border-bottom: 1px solid var(--border-color);">`;
      r.forEach(cell => {
        tableHtml += `<td style="padding: 0.4rem 0.65rem; color: var(--text-main);">${cell}</td>`;
      });
      tableHtml += `</tr>`;
    });

    tableHtml += `</tbody></table></div>`;
    return tableHtml;
  });

  // Remove horizontal dividers ---
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gim, '');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h5 style="margin: 0.4rem 0; font-weight: 800; color: var(--accent-purple); font-size: 0.9rem;">$1</h5>');
  html = html.replace(/^## (.*$)/gim, '<h4 style="margin: 0.5rem 0; font-weight: 800; color: var(--text-main); font-size: 0.95rem;">$1</h4>');
  html = html.replace(/^# (.*$)/gim, '<h3 style="margin: 0.6rem 0; font-weight: 800; color: var(--text-main); font-size: 1.05rem;">$1</h3>');

  // Strict Semantic Bold Keyword Highlighting
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*(?:kcal|calo|calories))\s*\*\*/gi, '<span class="badge-highlight badge-calo">🔥 $1</span>');
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*g?\s*(?:protein|đạm))\s*\*\*/gi, '<span class="badge-highlight badge-protein">🥩 $1</span>');
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*g?\s*(?:carb|fat|tinh bột|chất béo))\s*\*\*/gi, '<span class="badge-highlight badge-macro">🥑 $1</span>');
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*(?:ml|lít|l))\s*\*\*/gi, '<span class="badge-highlight badge-water">💧 $1</span>');
  html = html.replace(/\*\*\s*(ngày\s*\d+(?:\/\d+)?)\s*\*\*/gi, '<span class="badge-highlight badge-journey">🚩 $1</span>');
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*kg)\s*\*\*/gi, '<span class="badge-highlight badge-weight">⚖️ $1</span>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800; color: var(--accent-purple);">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^(\d+[\.\️⃣]|(?:[1-9]\d?️⃣))\s+(.*)$/gim, '<li style="margin-left: 1.1rem; margin-bottom: 0.25rem;"><strong>$1</strong> $2</li>');
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li style="margin-left: 1.1rem; list-style-type: disc; margin-bottom: 0.25rem;">$1</li>');
  html = html.replace(/(<li.*?>.*?<\/li>\n?)+/g, '<ul style="margin: 0.4rem 0; padding-left: 0.2rem;">$&</ul>');

  // Clean up excess newlines
  html = html.replace(/\n{3,}/g, '\n\n');
  html = html.replace(/\n/g, '<br/>');
  html = html.replace(/(?:<br\/>\s*){3,}/gi, '<br/><br/>');

  return html;
}
