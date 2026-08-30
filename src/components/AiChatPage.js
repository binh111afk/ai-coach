import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { appState } from '../services/appState.js';
import { CONFIG, isGeminiModel } from '../config.js';
import { renderGeminiIcon, renderPdfIcon, renderProviderIcon } from './ui/Icons.js';
import { Modal } from './ui/Modal.js';
import { getLevelInfo } from '../services/gamificationService.js';

export async function renderAiChatPage(onStateUpdated) {
  let isSending = false;
  let attachedFiles = [];
  let searchQuery = '';

  const profile = await DataService.getUserProfile();
  const goal = await DataService.getUserGoal();
  const progress = await DataService.getUserProgress();
  let activeSessionId = await DataService.getCurrentSessionId();
  await DataService.getPhotos(); // Warm up photos cache for instant approval card lookup

  const levelInfo = getLevelInfo(progress.totalXp || 0, goal.journeyLevels);
  const currentLevelNum = levelInfo.currentLevel ? levelInfo.currentLevel.level : (progress.level || 1);
  const currentLevelTitle = levelInfo.currentLevel ? (levelInfo.currentLevel.title || levelInfo.currentLevel.name) : 'Cốt Lõi';

  const getInitialLetter = (fullName = '') => {
    const parts = (fullName || 'H').trim().split(/\s+/);
    const lastWord = parts[parts.length - 1];
    return (lastWord ? lastWord.charAt(0) : 'H').toUpperCase();
  };
  const userInitialLetter = getInitialLetter(profile.name);

  let userAvatarHtml = '';
  if (profile.avatar) {
    userAvatarHtml = `<img src="${profile.avatar}" class="w-full h-full rounded-full object-cover shadow-sm">`;
  } else {
    userAvatarHtml = `<div class="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white flex items-center justify-center font-serif text-sm font-bold shadow-sm">${userInitialLetter}</div>`;
  }

  const chatPageHtml = `
    <style>
      :root {
        --primary: #7C3AED;
        --accent: #D946EF;
        --pink: #EC4899;
      }

      .display { font-family: 'Fraunces', serif; }

      .glass-card {
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 20px 50px -10px rgba(124, 58, 237, 0.15);
      }

      body.dark .glass-card {
        background: rgba(26, 22, 38, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.5);
      }

      /* Nút Cuộc trò chuyện mới - Wow Effect */
      .btn-new-chat {
        background: linear-gradient(135deg, var(--primary), var(--accent));
        box-shadow: 0 8px 20px -4px rgba(124, 58, 237, 0.4);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .btn-new-chat:hover {
        box-shadow: 0 12px 24px -4px rgba(124, 58, 237, 0.55);
        transform: translateY(-2px);
      }
      .btn-new-chat::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        transition: 0.6s;
      }
      .btn-new-chat:hover::before {
        left: 100%;
      }

      /* V12 Hover Toolbar */
      .hover-toolbar { 
        opacity: 0; 
        transform: translateY(-50%) translateX(8px); 
        transition: opacity 0.2s ease, transform 0.2s ease; 
        pointer-events: none; 
      }
      .list-item-v12:hover .hover-toolbar { 
        opacity: 1; 
        transform: translateY(-50%) translateX(0); 
        pointer-events: auto; 
      }

      .btn-send-glass { 
        background: linear-gradient(135deg, var(--primary), var(--accent)); 
        box-shadow: 0 4px 15px -3px rgba(124, 58, 237, 0.4); 
        transition: all 0.3s ease; 
        color: #ffffff;
      }
      .btn-send-glass:hover { transform: scale(1.05); }

      @keyframes float-a { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-12px) rotate(-2deg); } }
      @keyframes float-b { 0%, 100% { transform: translateY(0) rotate(5deg); } 50% { transform: translateY(-10px) rotate(8deg); } }
      @keyframes float-c { 0%, 100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-15px) rotate(-5deg); } }
      @keyframes float-d { 0%, 100% { transform: translateY(0) rotate(10deg); } 50% { transform: translateY(-8px) rotate(12deg); } }
      @keyframes float-e { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
      @keyframes float-f { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-12px); } }

      .float-a { animation: float-a 6s infinite ease-in-out; }
      .float-b { animation: float-b 7s infinite ease-in-out; animation-delay: -1s; }
      .float-c { animation: float-c 8s infinite ease-in-out; animation-delay: -2s; }
      .float-d { animation: float-d 9s infinite ease-in-out; animation-delay: -3s; }
      .float-e { animation: float-e 7s infinite ease-in-out; animation-delay: -1.5s; }
      .float-f { animation: float-f 10s infinite ease-in-out; animation-delay: -4s; }

      .dot-bg { position: absolute; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; opacity: 0.3; }

      .file-chip {
        animation: chip-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        transition: all 0.2s ease;
      }
      @keyframes chip-in {
        from { opacity: 0; transform: translateY(-6px) scale(0.92); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .caro-bg {
        background-color: #F4F4F8 !important;
        background-image: 
          linear-gradient(rgba(124, 58, 237, 0.16) 1.5px, transparent 1.5px),
          linear-gradient(90deg, rgba(124, 58, 237, 0.16) 1.5px, transparent 1.5px) !important;
        background-size: 32px 32px !important;
      }

      body.dark .caro-bg {
        background-color: #120F1D !important;
        background-image: 
          linear-gradient(rgba(167, 139, 250, 0.2) 1.5px, transparent 1.5px),
          linear-gradient(90deg, rgba(167, 139, 250, 0.2) 1.5px, transparent 1.5px) !important;
        background-size: 32px 32px !important;
      }

      .chat-area, .new-chat-hero, .input-area {
        background-color: transparent !important;
        background-image: none !important;
      }
    </style>

    <div class="ai-chat-app">
      <!-- SIDEBAR V12 Clean -->
      <aside class="ai-chat-sidebar v12-sidebar glass-card rounded-3xl flex flex-col overflow-hidden" id="ai-sidebar">
        
        <!-- Header: Cuộc trò chuyện mới Wow Button -->
        <div class="p-4 pb-3 flex-shrink-0">
          <button type="button" class="btn-new-chat w-full text-white text-sm font-bold py-4 rounded-2xl flex items-center justify-center gap-2 relative z-10 cursor-pointer" id="btn-new-chat-session">
            <i data-lucide="message-square-plus" class="w-5 h-5"></i> 
            <span class="relative z-10">Cuộc trò chuyện mới</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="px-4 pb-3 flex-shrink-0">
          <div class="relative">
            <i data-lucide="search" class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
            <input type="text" id="sidebar-search-input" placeholder="Tìm kiếm..." class="w-full pl-9 pr-3 py-2.5 bg-gray-50/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:outline-none focus:border-[#7C3AED] focus:bg-white dark:focus:bg-gray-900 transition placeholder:text-gray-400 dark:text-gray-100">
          </div>
        </div>

        <!-- Dynamic History Sessions Scroll Area -->
        <div class="flex-1 overflow-y-auto px-2.5 pb-4 space-y-1 pt-1 custom-scrollbar" id="chat-sessions-sidebar-container">
          <!-- Rendered dynamically -->
        </div>

        <!-- Footer User Profile -->
        <div class="p-3 border-t border-gray-100/80 dark:border-gray-800/80 flex items-center gap-3 flex-shrink-0 bg-white/40 dark:bg-gray-900/40">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden flex-shrink-0">
            ${userAvatarHtml}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">${escapeHtml(profile.name || 'Chiến Binh')}</p>
            <div class="level-badge shadow-sm mt-0.5" style="padding: 0.2rem 0.65rem; font-size: 0.7rem; width: fit-content;">
              <span class="level-dot"></span>
              Lv.${currentLevelNum} · ${escapeHtml(currentLevelTitle)}
            </div>
          </div>
        </div>
      </aside>

      <!-- MAIN -->
      <main class="ai-chat-main caro-bg">
        <!-- Top bar -->
        <div class="ai-topbar">
          <div class="topbar-left">
            <button class="btn-toggle" id="btnToggleSidebar" title="Đóng/Mở sidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            <!-- Model selector -->
            <div class="model-select" id="modelSelect">
              <span id="currentModelIcon" style="display: flex; align-items: center;"></span>
              <span class="model-name" id="currentModelText">Gemini 3.6 Flash</span>
              <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>

              <div class="model-dropdown" id="modelDropdown">
                <!-- Dynamically populated model items -->
              </div>
            </div>
          </div>

          <!-- Nav toggle button on the right of topbar -->
          <div class="topbar-right">
            <button class="btn-toggle" id="btnToggleNav" title="Ẩn/Hiện thanh điều hướng">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Chat area -->
        <div class="chat-area" id="page-chat-messages-container">
          <!-- Rendered dynamically -->
        </div>

        <!-- Glass Input Area -->
        <div class="input-area p-3 sm:pb-5">
          <!-- File attach preview chips -->
          <div class="attach-preview flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto max-w-2xl mx-auto" id="page-attach-preview-container" style="display: none;"></div>

          <!-- Glass Input Wrapper (Centered & Compact max-w-2xl) -->
          <div class="glass-card rounded-[28px] sm:rounded-[32px] p-2 shadow-xl border border-white/80 dark:border-gray-800/80 flex items-center gap-2 max-w-2xl mx-auto w-full">
            <label for="page-chat-file-input" class="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition flex-shrink-0 relative group cursor-pointer" title="Đính kèm tệp (Anh/PDF/Excel/Docx)">
              <i data-lucide="plus" class="w-6 h-6 group-hover:rotate-90 transition-transform duration-300"></i>
            </label>
            <input type="file" id="page-chat-file-input" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.xlsx,.xls,.csv,.doc,.docx" style="display: none;">

            <input type="text" id="page-chat-input-text" placeholder="Nhập câu hỏi của bạn..." class="flex-1 bg-transparent border-none focus:outline-none text-sm sm:text-base font-medium text-gray-800 dark:text-gray-100 placeholder:text-gray-400 py-2 min-w-0" />
            
            <button class="btn-send-glass w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white flex-shrink-0 cursor-pointer" id="page-chat-btn-send" title="Gửi câu hỏi">
              <i data-lucide="arrow-up" class="w-6 h-6"></i>
            </button>
          </div>
        </div>
      </main>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = chatPageHtml;
    if (window.lucide) window.lucide.createIcons();

    // Auto-hide nav when AI tab is active
    setTimeout(() => {
      if (window.toggleNavState) window.toggleNavState(true);
    }, 80);

    // Sidebar toggle
    const container = document.getElementById('page-chat-messages-container');
    const sendBtn = document.getElementById('page-chat-btn-send');
    const inputText = document.getElementById('page-chat-input-text');
    const fileInput = document.getElementById('page-chat-file-input');
    const attachPreview = document.getElementById('page-attach-preview-container');
    const sidebar = document.getElementById('ai-sidebar');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');

    btnToggleSidebar?.addEventListener('click', () => {
      sidebar?.classList.toggle('collapsed');
    });

    // Nav toggle button in topbar
    document.getElementById('btnToggleNav')?.addEventListener('click', () => {
      if (window.toggleNavState) window.toggleNavState();
    });

    // Footer settings button
    document.getElementById('btn-sidebar-open-settings')?.addEventListener('click', () => {
      if (window.navigateToTab) window.navigateToTab('settings');
    });

    // Search bar filter binding
    const searchInput = document.getElementById('sidebar-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      buildSidebar();
    });

    const buildModelDropdown = async () => {
      const dropdown = document.getElementById('modelDropdown');
      const currentModelText = document.getElementById('currentModelText');
      const currentModelIcon = document.getElementById('currentModelIcon');
      if (!dropdown || !currentModelText) return;

      const currentModelId = await DataService.getSelectedModel();
      const currentModelObj = CONFIG.SUPPORTED_MODELS.find(m => m.id === currentModelId) || CONFIG.SUPPORTED_MODELS[0];
      currentModelText.textContent = currentModelObj.name.split(' (')[0];
      if (currentModelIcon) currentModelIcon.innerHTML = renderProviderIcon(currentModelObj.id);

      const top3Ids = [
        "deepseek/deepseek-v4-pro",
        "gemini-2.5-flash",
        "gpt-4o"
      ];

      const top3Models = CONFIG.SUPPORTED_MODELS.filter(m => top3Ids.includes(m.id));
      const remainingModels = CONFIG.SUPPORTED_MODELS.filter(m => !top3Ids.includes(m.id));
      const hasGeminiKey = !!(await DataService.getProviderApiKey('gemini'));

      dropdown.innerHTML = `
        <div class="model-dropdown-section-title">Model Nổi Bật (Khuyên Dùng)</div>
        ${top3Models.map(m => `
          <div class="model-option ${m.id === currentModelId ? 'active' : ''}" data-model-id="${m.id}">
            ${renderProviderIcon(m.id)}
            <div style="flex: 1; min-width: 0;">
              <div class="name">${m.name.split(' (')[0]}</div>
              <div class="desc">${m.name.includes('(') ? m.name.split('(')[1].replace(')', '') : 'AI Coach Model'}</div>
            </div>
            ${isGeminiModel(m.id) && !hasGeminiKey ? '<span style="font-size:9px;font-weight:800;color:#B45309;background:#FEF3C7;padding:2px 6px;border-radius:5px;white-space:nowrap;flex-shrink:0;">🔒 Cần key</span>' : ''}
          </div>
        `).join('')}
        <div class="model-dropdown-section-title" style="margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 8px;">Tất Cả Models (${remainingModels.length})</div>
        ${remainingModels.map(m => `
          <div class="model-option ${m.id === currentModelId ? 'active' : ''}" data-model-id="${m.id}">
            ${renderProviderIcon(m.id)}
            <div style="flex: 1; min-width: 0;">
              <div class="name">${m.name.split(' (')[0]}</div>
              <div class="desc">${m.name.includes('(') ? m.name.split('(')[1].replace(')', '') : 'AI Coach Model'}</div>
            </div>
            ${isGeminiModel(m.id) && !hasGeminiKey ? '<span style="font-size:9px;font-weight:800;color:#B45309;background:#FEF3C7;padding:2px 6px;border-radius:5px;white-space:nowrap;flex-shrink:0;">🔒 Cần key</span>' : ''}
          </div>
        `).join('')}
      `;

      dropdown.querySelectorAll('.model-option').forEach(opt => {
        opt.addEventListener('click', async (e) => {
          e.stopPropagation();
          const selectedId = opt.getAttribute('data-model-id');
          if (selectedId) {
            // Model Gemini cần API key riêng — chưa có key thì hiện modal nhập key trước khi cho chọn
            if (isGeminiModel(selectedId) && !(await DataService.getProviderApiKey('gemini'))) {
              const enteredKey = await Modal.prompt({
                title: 'Nhập API Key Google AI Studio',
                message: `Model **"${(CONFIG.SUPPORTED_MODELS.find(m => m.id === selectedId)?.name || selectedId).split(' (')[0]}"** chạy bằng nguồn **Gemini** của bạn và **không tính vào hạn mức token XKiro**.\n\nVui lòng dán API key lấy miễn phí tại **aistudio.google.com** để mở khóa model này.`,
                placeholder: 'Dán API key Gemini của bạn vào đây...',
                confirmText: 'Xác Thực & Chọn'
              });
              const key = (enteredKey || '').trim();
              if (!key) {
                dropdown.classList.remove('open');
                return;
              }
              const test = await AiCoachService.validateProviderKey('gemini', key);
              if (!test.valid) {
                await Modal.alert({
                  title: 'API Key Không Hợp Lệ',
                  message: test.error || 'Không xác thực được API key với Google AI Studio. Vui lòng kiểm tra lại key rồi thử lại.'
                });
                dropdown.classList.remove('open');
                return;
              }
              await DataService.setProviderApiKey('gemini', key);
            }
            await DataService.setSelectedModel(selectedId);
            await buildModelDropdown();
          }
          dropdown.classList.remove('open');
        });
      });
    };

    const modelSelect = document.getElementById('modelSelect');
    const modelDropdown = document.getElementById('modelDropdown');
    modelSelect?.addEventListener('click', (e) => {
      if (e.target.closest('#modelDropdown')) return;
      e.stopPropagation();
      modelDropdown?.classList.toggle('open');
    });

    document.addEventListener('click', () => modelDropdown?.classList.remove('open'));
    await buildModelDropdown();

    const buildSidebar = async () => {
      await renderChatSessionsSidebar(
        activeSessionId,
        searchQuery,
        async (selectedId) => {
          activeSessionId = selectedId;
          await DataService.setCurrentSessionId(activeSessionId);
          await refreshMessages(container, activeSessionId, onStateUpdated);
          await buildSidebar();
        },
        async (deleteId) => {
          await DataService.deleteChatSession(deleteId);
          if (deleteId === activeSessionId) {
            activeSessionId = await DataService.createNewSession();
          }
          await buildSidebar();
          await refreshMessages(container, activeSessionId, onStateUpdated);
        },
        async () => {
          await buildSidebar();
        }
      );
    };

    await buildSidebar();
    await refreshMessages(container, activeSessionId, onStateUpdated);

    document.getElementById('btn-new-chat-session')?.addEventListener('click', async () => {
      activeSessionId = await DataService.createNewSession();
      await buildSidebar();
      await refreshMessages(container, activeSessionId, onStateUpdated);
      inputText.focus();
    });

    const renderPreviewChips = () => {
      if (!attachPreview) return;
      attachPreview.innerHTML = '';
      if (attachedFiles.length === 0) {
        attachPreview.style.display = 'none';
        return;
      }
      attachPreview.style.display = 'flex';

      attachedFiles.forEach((fileObj, idx) => {
        const type = getFileType(fileObj.name);
        const sizeStr = formatFileSize(fileObj.size);
        const isImg = fileObj.dataUrl && (fileObj.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(type));

        let iconHtml = '';
        let bgColor = 'bg-gray-100 dark:bg-gray-800';

        if (isImg) {
          iconHtml = `<img src="${fileObj.dataUrl}" class="w-full h-full object-cover rounded-lg">`;
        } else if (type === 'pdf') {
          iconHtml = `<i data-lucide="file-text" class="w-5 h-5 text-red-500"></i>`;
          bgColor = 'bg-red-50 dark:bg-red-950/40';
        } else if (type === 'xls') {
          iconHtml = `<i data-lucide="sheet" class="w-5 h-5 text-green-500"></i>`;
          bgColor = 'bg-green-50 dark:bg-green-950/40';
        } else if (type === 'doc') {
          iconHtml = `<i data-lucide="file-text" class="w-5 h-5 text-blue-500"></i>`;
          bgColor = 'bg-blue-50 dark:bg-blue-950/40';
        } else {
          iconHtml = `<i data-lucide="file" class="w-5 h-5 text-gray-500"></i>`;
        }

        const chip = document.createElement('div');
        chip.className = `file-chip flex items-center gap-2 p-2 pr-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:border-purple-300 transition-all group`;
        chip.innerHTML = `
          <div class="w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0 overflow-hidden">
            ${iconHtml}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[140px]">${fileObj.name}</span>
            <span class="text-[10px] text-gray-400">${sizeStr}</span>
          </div>
          <button class="file-remove ml-1 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-400 hover:text-red-500 flex items-center justify-center transition flex-shrink-0" data-index="${idx}" title="Xóa">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        `;
        attachPreview.appendChild(chip);
      });

      if (window.lucide) window.lucide.createIcons({ el: attachPreview });

      attachPreview.querySelectorAll('.file-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const removeIdx = parseInt(btn.getAttribute('data-index'));
          const chipEl = btn.closest('.file-chip');
          if (chipEl) {
            chipEl.style.opacity = '0';
            chipEl.style.transform = 'scale(0.8)';
            setTimeout(() => {
              attachedFiles.splice(removeIdx, 1);
              renderPreviewChips();
            }, 200);
          } else {
            attachedFiles.splice(removeIdx, 1);
            renderPreviewChips();
          }
        });
      });
    };

    fileInput?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach(f => {
        if (!attachedFiles.find(x => x.name === f.name && x.size === f.size)) {
          const reader = new FileReader();
          reader.onload = (event) => {
            attachedFiles.push({
              name: f.name,
              size: f.size,
              type: f.type,
              dataUrl: event.target.result,
              file: f
            });
            renderPreviewChips();
          };
          reader.readAsDataURL(f);
        }
      });
      fileInput.value = '';
    });

    const sendMessageHandler = async () => {
      const msgText = inputText.value.trim();
      if ((!msgText && attachedFiles.length === 0) || isSending) return;

      isSending = true;
      const sentFilesPayload = [...attachedFiles];

      inputText.value = '';
      attachedFiles = [];
      renderPreviewChips();
      fileInput.value = '';
      inputText.disabled = true;

      let finalContent = msgText;

      await DataService.addChatMessage({
        role: 'user',
        content: finalContent,
        attachments: sentFilesPayload
      });

      await refreshMessages(container, activeSessionId, onStateUpdated);
      const promptText = msgText || `Hãy phân tích các file đính kèm: ${sentFilesPayload.map(f => f.name).join(', ')}`;
      await showPageThinkingIndicator(container, promptText, sentFilesPayload);

      const historyList = await DataService.getChatHistory(activeSessionId);
      const currentModelId = await DataService.getSelectedModel();
      const aiResponse = await AiCoachService.sendMessage(promptText, historyList, sentFilesPayload);

      hidePageThinkingIndicator();

      await DataService.addChatMessage({
        role: 'assistant',
        model: currentModelId,
        content: aiResponse.content,
        proposedChange: aiResponse.proposedChange,
        status: aiResponse.proposedChange ? 'pending' : 'none'
      });
      isSending = false;
      inputText.disabled = false;
      inputText.focus();
      DataService.awardAiCoachXp().catch(() => { });
      await refreshMessages(container, activeSessionId, onStateUpdated, true);

      // Asynchronously generate AI title for this session if not set yet
      if (!DataService.getSessionTitle(activeSessionId)) {
        AiCoachService.generateSessionTitle(promptText, aiResponse.content).then(async (aiTitle) => {
          if (aiTitle) {
            DataService.saveSessionTitle(activeSessionId, aiTitle);
            await buildSidebar();
          }
        }).catch(() => { });
      } else {
        await buildSidebar();
      }
    };

    sendBtn?.addEventListener('click', sendMessageHandler);
    inputText?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessageHandler(); });
  }
}

function isSessionPinned(sessionId) {
  try {
    const pinned = JSON.parse(localStorage.getItem('ai_chat_pinned_sessions') || '[]');
    return pinned.includes(sessionId);
  } catch { return false; }
}

function togglePinSession(sessionId) {
  try {
    let pinned = JSON.parse(localStorage.getItem('ai_chat_pinned_sessions') || '[]');
    if (pinned.includes(sessionId)) {
      pinned = pinned.filter(id => id !== sessionId);
    } else {
      pinned.push(sessionId);
    }
    localStorage.setItem('ai_chat_pinned_sessions', JSON.stringify(pinned));
  } catch { }
}

function formatSessionDateGroup(timestamp) {
  if (!timestamp) return 'Hôm nay';
  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return 'Hôm nay';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';

  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return 'Tuần này';

  return 'Cũ hơn';
}

function formatSessionTimeAgo(timestamp) {
  if (!timestamp) return 'Vừa xong';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / (1000 * 60));
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const hoursStr = String(date.getHours()).padStart(2, '0');
  const minStr = String(date.getMinutes()).padStart(2, '0');
  return `${hoursStr}:${minStr}`;
}

async function renderChatSessionsSidebar(activeSessionId, filterQuery, onSelectSession, onDeleteSession, onRefreshSidebar) {
  const sidebarContainer = document.getElementById('chat-sessions-sidebar-container');
  if (!sidebarContainer) return;

  let sessions = await DataService.getChatSessions();

  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    sessions = sessions.filter(s => (s.title || '').toLowerCase().includes(q));
  }

  if (sessions.length === 0) {
    sidebarContainer.innerHTML = `
      <div class="text-center text-gray-400 dark:text-gray-500 text-xs py-8 px-2 font-medium">
        ${filterQuery ? 'Không tìm thấy cuộc trò chuyện phù hợp' : 'Bấm <b>+ Cuộc trò chuyện mới</b> để bắt đầu!'}
      </div>
    `;
    return;
  }

  // Separate pinned vs unpinned sessions
  const pinnedSessions = sessions.filter(s => isSessionPinned(s.id));
  const unpinnedSessions = sessions.filter(s => !isSessionPinned(s.id));

  // Group unpinned by date
  const groups = {};
  unpinnedSessions.forEach(s => {
    const gName = formatSessionDateGroup(s.updatedAt);
    if (!groups[gName]) groups[gName] = [];
    groups[gName].push(s);
  });

  const renderSessionItemHtml = (s) => {
    const isActive = s.id === activeSessionId;
    const pinned = isSessionPinned(s.id);
    const timeAgoStr = formatSessionTimeAgo(s.updatedAt);
    const previewText = s.messageCount ? `${s.messageCount} tin nhắn` : 'Trò chuyện cùng AI Coach';

    return `
      <div class="list-item-v12 group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-[#EDE9FE] dark:bg-purple-950/50' : 'hover:bg-gray-100/70 dark:hover:bg-gray-800/50'}" data-session-id="${s.id}">
        <!-- Dot Indicator -->
        <div class="w-2 h-2 rounded-full ${isActive ? 'bg-[#7C3AED]' : 'bg-gray-300 dark:bg-gray-600'} flex-shrink-0"></div>
        
        <!-- Title & Sub -->
        <div class="flex-1 min-w-0 pr-12">
          <h3 class="text-sm font-semibold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'} truncate" id="session-title-text-${s.id}">${escapeHtml(s.title)}</h3>
          <p class="text-[11px] text-gray-400 truncate mt-0.5">${timeAgoStr} · ${previewText}</p>
        </div>

        <!-- V12 Hover Toolbar (Aligned right, centered vertically on the hovered chat box) -->
        <div class="hover-toolbar absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white dark:bg-gray-900 p-1 rounded-lg shadow-md border border-gray-100 dark:border-gray-800 z-10">
          <button type="button" class="btn-session-pin w-7 h-7 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center justify-center text-gray-400 hover:text-[#7C3AED] transition" data-pin-session-id="${s.id}" title="${pinned ? 'Bỏ ghim' : 'Ghim'}">
            <i data-lucide="pin" class="w-3.5 h-3.5 ${pinned ? 'fill-[#7C3AED] text-[#7C3AED]' : ''}"></i>
          </button>
          <button type="button" class="btn-session-edit w-7 h-7 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-center text-gray-400 hover:text-blue-500 transition" data-edit-session-id="${s.id}" title="Đổi tên">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
          </button>
          <button type="button" class="btn-session-delete w-7 h-7 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center justify-center text-gray-400 hover:text-red-500 transition" data-del-session-id="${s.id}" title="Xóa">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <!-- Active Accent Left Bar -->
        ${isActive ? `<div class="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-[#7C3AED] to-[#D946EF] rounded-full"></div>` : ''}
      </div>
    `;
  };

  let sidebarHtml = '';

  if (pinnedSessions.length > 0) {
    sidebarHtml += `
      <p class="text-[10px] font-bold text-[#7C3AED] dark:text-purple-400 uppercase tracking-wider px-3 mt-2 mb-1 flex items-center gap-1">
        <i data-lucide="pin" class="w-3 h-3 fill-purple-500"></i> Đã ghim
      </p>
      ${pinnedSessions.map(renderSessionItemHtml).join('')}
    `;
  }

  const groupOrder = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Cũ hơn'];
  groupOrder.forEach(gName => {
    if (groups[gName] && groups[gName].length > 0) {
      sidebarHtml += `
        <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mt-3 mb-1">${gName}</p>
        ${groups[gName].map(renderSessionItemHtml).join('')}
      `;
    }
  });

  sidebarContainer.innerHTML = sidebarHtml;
  if (window.lucide) window.lucide.createIcons({ el: sidebarContainer });

  // Event handlers
  sidebarContainer.querySelectorAll('.list-item-v12').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.hover-toolbar') || e.target.tagName === 'INPUT') return;
      onSelectSession(item.getAttribute('data-session-id'));
    });
  });

  // Pin Button
  sidebarContainer.querySelectorAll('[data-pin-session-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const sId = btn.getAttribute('data-pin-session-id');
      togglePinSession(sId);
      if (onRefreshSidebar) await onRefreshSidebar();
    });
  });

  // Inline Edit Button
  sidebarContainer.querySelectorAll('[data-edit-session-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sId = btn.getAttribute('data-edit-session-id');
      const titleHeading = sidebarContainer.querySelector(`#session-title-text-${sId}`);
      if (!titleHeading) return;

      const currentTitle = titleHeading.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'w-full text-sm font-semibold bg-white dark:bg-gray-800 border border-purple-400 rounded px-1.5 py-0.5 focus:outline-none text-gray-900 dark:text-white shadow-sm';
      input.value = currentTitle;

      titleHeading.replaceWith(input);
      input.focus();
      input.select();

      const saveEdit = async () => {
        const val = input.value.trim();
        if (val && val !== currentTitle) {
          DataService.saveSessionTitle(sId, val);
        }
        if (onRefreshSidebar) await onRefreshSidebar();
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') if (onRefreshSidebar) onRefreshSidebar();
      });
      input.addEventListener('blur', saveEdit);
    });
  });

  // Delete Button
  sidebarContainer.querySelectorAll('[data-del-session-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sId = btn.getAttribute('data-del-session-id');
      const itemEl = btn.closest('.list-item-v12');
      if (itemEl) {
        itemEl.style.opacity = '0';
        itemEl.style.transform = 'scale(0.9)';
        setTimeout(() => {
          if (onDeleteSession) onDeleteSession(sId);
        }, 250);
      } else {
        if (onDeleteSession) onDeleteSession(sId);
      }
    });
  });
}

function getFileType(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'img';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  return 'other';
}

function formatFileSize(bytes = 0) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIconSvg(type) {
  if (type === 'pdf') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`;
  if (type === 'img') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  if (type === 'xls') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2l2 3 2-3h2"/></svg>`;
  if (type === 'doc') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
}

let thinkingInterval = null;

async function showPageThinkingIndicator(container, promptText = '', attachments = []) {
  if (!container) return;
  hidePageThinkingIndicator();

  const currentModelId = await DataService.getSelectedModel();
  const text = (promptText || '').toLowerCase();
  const hasImage = (attachments || []).some(a => (a.type || '').includes('image') || (a.name || '').match(/\.(png|jpg|jpeg|gif|webp)$/i));

  let steps = [
    { icon: 'search', text: 'Đang kết nối bộ nhớ & chỉ số AI Coach...' },
    { icon: 'brain', text: 'Đang phân tích ngữ cảnh & dữ liệu cá nhân...' },
    { icon: 'sparkles', text: 'Đang soạn thảo câu trả lời chuyên sâu...' }
  ];

  if (hasImage || /ảnh|kho ảnh|photo|sefile|tiến trình|vóc dáng/i.test(text)) {
    steps = [
      { icon: 'camera', text: 'Đang quét & phân tích Kho Ảnh tiến trình...' },
      { icon: 'scale', text: 'Đang so sánh vóc dáng & cân nặng...' },
      { icon: 'sparkles', text: 'Đang tổng hợp nhận xét & đề xuất...' }
    ];
  } else if (/ăn|bữa|món|calo|thực đơn|protein|đạm|carb|fat/i.test(text)) {
    steps = [
      { icon: 'utensils', text: 'Đang truy cập dữ liệu dinh dưỡng...' },
      { icon: 'flame', text: 'Đang tính toán Calo & tỷ lệ Macro...' },
      { icon: 'sparkles', text: 'Đang xây dựng đề xuất thực đơn...' }
    ];
  } else if (/tập|gym|chạy|bơi|cardio|hiit|bài tập|thể thao/i.test(text)) {
    steps = [
      { icon: 'dumbbell', text: 'Đang đối chiếu lịch trình tập luyện...' },
      { icon: 'flame', text: 'Đang ước tính lượng Calo tiêu hao...' },
      { icon: 'check-circle', text: 'Đang hoàn thiện hướng dẫn bài tập...' }
    ];
  } else if (/nước|water|lít|ml/i.test(text)) {
    steps = [
      { icon: 'droplets', text: 'Đang kiểm tra mục tiêu nước uống...' },
      { icon: 'zap', text: 'Đang tính toán mức bù nước...' },
      { icon: 'sparkles', text: 'Đang soạn câu trả lời...' }
    ];
  }

  let stepIdx = 0;

  const thinkingDiv = document.createElement('div');
  thinkingDiv.id = 'page-ai-thinking';
  thinkingDiv.className = 'msg ai thinking';
  thinkingDiv.innerHTML = `
    <div class="msg-avatar" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 56px; height: 56px; min-width: 56px; display: flex; align-items: center; justify-content: center; padding: 0;">
      <img src="/nova-ai-logo.svg" class="w-14 h-14 md:w-16 md:h-16 object-contain flex-shrink-0" style="background: transparent !important; border: none !important; filter: drop-shadow(0 4px 12px rgba(124, 58, 237, 0.25));" alt="Nova AI Avatar">
    </div>
    <div class="msg-bubble">
      <div class="thinking-content">
        <span class="thinking-text" id="thinking-step-label">
          <i data-lucide="${steps[0].icon}" class="w-3.5 h-3.5 inline-block mr-1" style="color: var(--accent-purple);"></i>
          <span>${steps[0].text}</span>
        </span>
        <div class="thinking-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="scanline-beam"></div>
      <div class="thinking-shimmer"></div>
    </div>
  `;

  container.appendChild(thinkingDiv);
  if (window.lucide) window.lucide.createIcons({ el: thinkingDiv });
  container.scrollTop = container.scrollHeight;

  thinkingInterval = setInterval(() => {
    stepIdx = (stepIdx + 1) % steps.length;
    const labelEl = document.getElementById('thinking-step-label');
    if (labelEl) {
      labelEl.classList.add('fade-swap');
      setTimeout(() => {
        const cur = steps[stepIdx];
        labelEl.innerHTML = `
          <i data-lucide="${cur.icon}" class="w-3.5 h-3.5 inline-block mr-1" style="color: var(--accent-purple);"></i>
          <span>${cur.text}</span>
        `;
        if (window.lucide) window.lucide.createIcons({ el: labelEl });
        labelEl.classList.remove('fade-swap');
      }, 180);
    }
  }, 1800);
}

function hidePageThinkingIndicator() {
  if (thinkingInterval) {
    clearInterval(thinkingInterval);
    thinkingInterval = null;
  }
  const el = document.getElementById('page-ai-thinking');
  if (el) el.remove();
}

async function refreshMessages(container, sessionId, onStateUpdated, animateLast = false) {
  if (!container) return;
  const history = await DataService.getChatHistory(sessionId);
  const currentModelId = await DataService.getSelectedModel();
  const profile = await DataService.getUserProfile();

  const getInitialLetter = (fullName = '') => {
    const parts = (fullName || 'H').trim().split(/\s+/);
    const lastWord = parts[parts.length - 1];
    return (lastWord ? lastWord.charAt(0) : 'H').toUpperCase();
  };
  const userInitialLetter = getInitialLetter(profile.name);

  let userAvatarHtml = '';
  if (profile.avatar) {
    userAvatarHtml = `<img src="${profile.avatar}" class="w-full h-full rounded-full object-cover shadow-sm">`;
  } else {
    userAvatarHtml = `<div class="w-full h-full rounded-full bg-[#4C1D95] text-white flex items-center justify-center font-serif text-xs font-semibold shadow-sm">${userInitialLetter}</div>`;
  }

  if (history.length === 0) {
    container.innerHTML = `
      <div class="new-chat-hero relative w-full h-full flex flex-col items-center justify-center min-h-[480px] p-4 overflow-hidden select-none">
        <!-- Floating background elements layer scattered around edges -->
        <div class="absolute inset-0 z-0 pointer-events-none p-4 md:p-10">
          
          <div class="absolute top-[12%] left-[4%] md:left-[8%] glass-card p-2.5 md:p-3 rounded-2xl flex items-center gap-2 float-a shadow-md">
            <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <i data-lucide="file-text" class="w-4 h-4 text-red-500"></i>
            </div>
            <div>
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tài liệu</p>
              <p class="text-xs font-bold text-gray-700 dark:text-gray-200">Diet_Plan.pdf</p>
            </div>
          </div>

          <div class="absolute top-[8%] right-[4%] md:right-[10%] glass-card p-2.5 md:p-3 rounded-2xl flex items-center gap-2 float-b shadow-md">
            <div class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <i data-lucide="sheet" class="w-4 h-4 text-green-500"></i>
            </div>
            <div>
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bảng tính</p>
              <p class="text-xs font-bold text-gray-700 dark:text-gray-200">Thuc_Pham.xlsx</p>
            </div>
          </div>

          <div class="absolute top-[42%] left-[2%] md:left-[6%] w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex items-center justify-center float-c border border-purple-100 dark:border-purple-900/40">
            <i data-lucide="image" class="w-5 h-5 md:w-6 md:h-6 text-blue-500"></i>
          </div>

          <div class="absolute top-[38%] right-[2%] md:right-[6%] glass-card px-3.5 py-2 rounded-full flex items-center gap-2 float-d shadow-md">
            <span class="w-2 h-2 bg-[#7C3AED] rounded-full animate-pulse"></span>
            <span class="text-xs font-bold text-[#7C3AED] dark:text-purple-300">1,905 kcal</span>
          </div>

          <div class="absolute bottom-[22%] left-[6%] md:left-[12%] glass-card px-3 py-2 rounded-2xl float-e flex items-center gap-2 shadow-md">
            <i data-lucide="beef" class="w-4 h-4 text-pink-500"></i>
            <span class="text-xs font-bold text-gray-700 dark:text-gray-200">Protein 143g</span>
          </div>

          <div class="absolute bottom-[14%] left-[18%] md:left-[24%] w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex items-center justify-center float-a border border-purple-100 dark:border-purple-900/40">
            <i data-lucide="dumbbell" class="w-5 h-5 md:w-6 md:h-6 text-[#7C3AED]"></i>
          </div>

          <div class="absolute bottom-[16%] right-[18%] md:right-[24%] w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex items-center justify-center float-b border border-purple-100 dark:border-purple-900/40">
            <i data-lucide="fish" class="w-4 h-4 md:w-5 md:h-5 text-orange-500"></i>
          </div>

          <div class="absolute bottom-[20%] right-[6%] md:right-[12%] glass-card px-3.5 py-2 rounded-full flex items-center gap-2 float-f shadow-md">
            <i data-lucide="calendar-days" class="w-4 h-4 text-[#D946EF]"></i>
            <span class="text-xs font-bold text-gray-700 dark:text-gray-200">60 ngày</span>
          </div>

          <div class="absolute top-[28%] left-[12%] w-11 h-11 rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex items-center justify-center float-f border border-purple-100 dark:border-purple-900/40">
            <i data-lucide="droplet" class="w-4 h-4 text-blue-400"></i>
          </div>

          <div class="absolute top-[24%] right-[12%] glass-card px-3 py-2 rounded-2xl float-c flex items-center gap-2 shadow-md">
            <i data-lucide="wheat" class="w-4 h-4 text-amber-500"></i>
            <span class="text-xs font-bold text-gray-700 dark:text-gray-200">Carbs 191g</span>
          </div>

          <div class="dot-bg float-a" style="top: 20%; left: 25%;"></div>
          <div class="dot-bg float-b" style="top: 60%; right: 25%; background: #7C3AED;"></div>
          <div class="dot-bg float-c" style="bottom: 30%; left: 40%;"></div>
          <div class="dot-bg float-d" style="top: 50%; right: 40%; background: #7C3AED;"></div>
        </div>

        <!-- Center Main Content -->
        <div class="relative z-10 w-full max-w-2xl flex flex-col items-center text-center px-4 my-auto">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-[#7C3AED] to-[#D946EF] mx-auto mb-5 flex items-center justify-center shadow-2xl shadow-purple-500/30">
            <i data-lucide="sparkles" class="w-8 h-8 sm:w-10 sm:h-10 text-white"></i>
          </div>
          <h1 class="display text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">Tôi có thể giúp gì cho bạn?</h1>
          <p class="text-gray-500 dark:text-gray-400 mt-3 text-sm sm:text-base md:text-lg max-w-md">Nhập câu hỏi hoặc đính kèm tệp để bắt đầu tư vấn với AI Coach.</p>

          <!-- Quick prompt suggestion chips -->
          <div class="flex flex-wrap justify-center gap-2 mt-6 max-w-xl pointer-events-auto">
            <button type="button" class="btn-quick-prompt glass-card px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-[#7C3AED] hover:text-[#7C3AED] transition flex items-center gap-1.5 shadow-sm" data-prompt="Ghi nhận bữa ăn trưa nay của tôi: 1 bát cơm, 150g ức gà">
              <i data-lucide="utensils" class="w-3.5 h-3.5 text-purple-500"></i> Ghi nhận bữa ăn
            </button>
            <button type="button" class="btn-quick-prompt glass-card px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-[#7C3AED] hover:text-[#7C3AED] transition flex items-center gap-1.5 shadow-sm" data-prompt="Phân tích calo và macro hôm nay của tôi">
              <i data-lucide="flame" class="w-3.5 h-3.5 text-amber-500"></i> Phân tích Calo & Macro
            </button>
            <button type="button" class="btn-quick-prompt glass-card px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-[#7C3AED] hover:text-[#7C3AED] transition flex items-center gap-1.5 shadow-sm" data-prompt="Gợi ý bài tập thể lực 30 phút tại nhà">
              <i data-lucide="dumbbell" class="w-3.5 h-3.5 text-blue-500"></i> Gợi ý bài tập tại nhà
            </button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ el: container });

    container.querySelectorAll('.btn-quick-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        const promptText = btn.getAttribute('data-prompt');
        const inputText = document.getElementById('page-chat-input-text');
        if (inputText) {
          inputText.value = promptText;
          inputText.focus();
        }
      });
    });
    return;
  }

  const lastIdx = history.length - 1;
  const html = history.map((m, idx) => {
    const attachments = m.attachments || (m.attachment ? [m.attachment] : []);
    let filesHTML = '';
    if (attachments.length > 0) {
      filesHTML = `
        <div class="msg-files">
          ${attachments.map(f => {
        const t = getFileType(f.fileName || f.name);
        return `
              <div class="msg-file ${t}">
                <div class="mf-icon">${getFileIconSvg(t)}</div>
                <div class="mf-name" title="${f.fileName || f.name}">${f.fileName || f.name}</div>
              </div>
            `;
      }).join('')}
        </div>
      `;
    }

    if (m.role === 'user') {
      return `
        <div class="msg user slide-up">
          <div class="msg-avatar overflow-hidden" style="border-radius: 50%;">
            ${userAvatarHtml}
          </div>
          <div class="msg-bubble">
            ${parseMarkdownPage(m.content)}
            ${filesHTML}
          </div>
        </div>
      `;
    } else {
      const msgModel = m.model || currentModelId;
      const isAnimatedTarget = animateLast && idx === lastIdx;
      return `
        <div class="msg ai slide-up">
          <div class="msg-avatar" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 56px; height: 56px; min-width: 56px; display: flex; align-items: center; justify-content: center; padding: 0;">
            <img src="/nova-ai-logo.svg" class="w-14 h-14 md:w-16 md:h-16 object-contain flex-shrink-0" style="background: transparent !important; border: none !important; filter: drop-shadow(0 4px 12px rgba(124, 58, 237, 0.25));" alt="Nova AI Avatar">
          </div>
          <div style="flex: 1; max-width: 680px;">
            <div class="msg-bubble" id="${isAnimatedTarget ? 'page-typewrite-bubble' : ''}">
              ${isAnimatedTarget ? '' : parseMarkdownPage(m.content)}
              ${isAnimatedTarget ? '' : filesHTML}
            </div>
            ${m.proposedChange ? renderApprovalCardPage(m) : ''}
          </div>
        </div>
      `;
    }
  }).join('');

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
  container.scrollTop = container.scrollHeight;

  container.querySelectorAll('[data-approve-prop]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const msgId = btn.getAttribute('data-approve-prop');
      const msg = history.find(item => item.id === msgId);
      if (msg && msg.proposedChange) {
        const success = await DataService.applyProposedChange(msg.proposedChange);
        if (success) {
          await DataService.addChatMessage({
            role: 'assistant',
            content: `<i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500 inline-block mr-1"></i> **Đã áp dụng thay đổi thành công!** ${msg.proposedChange.title} đã được cập nhật vào dữ liệu web.`
          });
          await refreshMessages(container, sessionId, onStateUpdated);
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
          content: `<i data-lucide="x-circle" class="w-4 h-4 text-rose-500 inline-block mr-1"></i> **Đã từ chối đề xuất.** Bạn có muốn điều chỉnh thêm gì khác không?`
        });
        await refreshMessages(container, sessionId, onStateUpdated);
      }
    });
  });

  // Fast 2-second Typewriter Effect for the newest AI response
  if (animateLast && history.length > 0 && history[lastIdx].role === 'assistant') {
    const bubbleEl = document.getElementById('page-typewrite-bubble');
    if (bubbleEl) {
      const lastMsg = history[lastIdx];
      const parsedHtml = parseMarkdownPage(lastMsg.content);
      const attachments = lastMsg.attachments || (lastMsg.attachment ? [lastMsg.attachment] : []);
      let filesHTML = '';
      if (attachments.length > 0) {
        filesHTML = `
          <div class="msg-files">
            ${attachments.map(f => {
          const t = getFileType(f.fileName || f.name);
          return `<div class="msg-file ${t}"><div class="mf-icon">${getFileIconSvg(t)}</div><div class="mf-name">${f.fileName || f.name}</div></div>`;
        }).join('')}
          </div>
        `;
      }
      await runFastTypewriter(container, bubbleEl, parsedHtml, filesHTML);
    }
  }
}

function runFastTypewriter(container, bubbleEl, fullHtml, filesHtml = '') {
  return new Promise(resolve => {
    const tokens = fullHtml.match(/(<[^>]+>|[^<>\s]+|\s+)/g) || [fullHtml];
    const totalDuration = 1800;
    const stepDelay = Math.max(8, Math.floor(totalDuration / tokens.length));

    let currentBuffer = '';
    let i = 0;

    const interval = setInterval(() => {
      if (i < tokens.length) {
        currentBuffer += tokens[i];
        i++;
        while (i < tokens.length && tokens[i].startsWith('<')) {
          currentBuffer += tokens[i];
          i++;
        }
        bubbleEl.innerHTML = currentBuffer + '<span class="ai-typewriter-cursor"></span>' + filesHtml;
        container.scrollTop = container.scrollHeight;
      } else {
        clearInterval(interval);
        bubbleEl.innerHTML = fullHtml + filesHtml;
        if (window.lucide) window.lucide.createIcons({ el: bubbleEl });
        container.scrollTop = container.scrollHeight;
        resolve();
      }
    }, stepDelay);
  });
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

  const parenMatch = cleanTitle.match(/^(.*?)\s*[\(\（](.*?)[\)\）]$/);
  if (parenMatch) {
    mainText = parenMatch[1].trim();
    subText = parenMatch[2].trim();
  } else if (cleanTitle.includes(':')) {
    const idx = cleanTitle.indexOf(':');
    mainText = cleanTitle.substring(0, idx).trim();
    subText = cleanTitle.substring(idx + 1).trim();
  } else if (cleanTitle.includes(' bằng ')) {
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

          <div class="flex flex-col items-center justify-center text-[var(--accent-purple)] flex-shrink-0 px-1">
            <i data-lucide="arrow-right" class="w-4 h-4 md:w-5 md:h-5"></i>
            <span class="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 mt-0.5 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">${oldImg ? 'Ghi đè' : 'Tải lên'}</span>
          </div>

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

  let detailsList = prop.details || [];
  if ((!detailsList || detailsList.length === 0) && prop.payload?.meals && Array.isArray(prop.payload.meals)) {
    const mealTypeNamesVi = { Breakfast: 'Bữa Sáng', Lunch: 'Bữa Trưa', Dinner: 'Bữa Tối', Snack: 'Bữa Phụ' };
    detailsList = prop.payload.meals.map(m => ({
      field: mealTypeNamesVi[m.type] || m.type || 'Bữa ăn',
      from: '-',
      to: `${m.name} (${m.calories || 0} kcal)`
    }));
  } else if ((!detailsList || detailsList.length === 0) && prop.payload?.workouts && Array.isArray(prop.payload.workouts)) {
    detailsList = prop.payload.workouts.map(w => ({
      field: w.type || 'Bài tập',
      from: '-',
      to: `${w.duration || 0} phút (${w.caloriesBurned || 0} kcal)`
    }));
  }
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

function renderApprovalCardPage(msg) {
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
            <div class="text-[10px] uppercase tracking-wider text-[#10B981] font-extrabold">ĐÃ ÁP DỤNG THAY ĐỔI</div>
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
            <div class="text-[10px] uppercase tracking-wider text-[#EF4444] font-extrabold">ĐÃ TỪ CHỐI</div>
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
      
      <div class="relative z-10 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div class="md:w-2/5 lg:w-1/3 border-b md:border-b-0 md:border-r border-[var(--border-color)] pb-3 md:pb-0 md:pr-4">
          <span class="text-[10px] font-bold text-[var(--accent-purple)] bg-[var(--accent-purple-light)] px-2 py-0.5 rounded-md uppercase tracking-wider">Cập Nhật</span>
          ${formatApprovalTitle(prop.title)}
          <p class="text-xs text-muted hidden md:block mt-1">AI đã nhận diện thay đổi</p>
        </div>

        <div class="flex-1">
          ${renderApprovalDetailsContent(msg)}
        </div>

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

function escapeHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseMarkdownPage(text = '') {
  if (!text) return '';
  let html = text;

  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.18); padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; overflow-x: auto; margin: 0.5rem 0;"><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(117, 86, 217, 0.15); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.85rem; color: var(--accent-purple); font-weight: 600;">$1</code>');
  html = html.replace(/^>\s*(.*$)/gim, '<blockquote class="ai-callout-box">$1</blockquote>');
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<div style="margin: 0.5rem 0;"><img src="$2" alt="$1" style="max-width: 280px; max-height: 240px; border-radius: 12px; object-fit: cover; border: 2px solid var(--accent-purple); box-shadow: 0 4px 14px rgba(0,0,0,0.15);"></div>');

  const tableRegex = /(?:\|[^\n]+\|\r?\n){2,}/g;
  html = html.replace(tableRegex, (match) => {
    const lines = match.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return match;

    const headers = lines[0].split('|').map(s => s.trim()).filter(Boolean);
    const rows = lines.slice(2).map(line => line.split('|').map(s => s.trim()).filter(Boolean));

    let tableHtml = `<div style="overflow-x: auto; margin: 0.75rem 0; border-radius: 10px; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.06);"><table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; background: var(--bg-subtle);">`;
    tableHtml += `<thead><tr style="background: linear-gradient(135deg, rgba(117, 86, 217, 0.18), rgba(168, 145, 255, 0.1)); border-bottom: 1.5px solid var(--border-color);">`;
    headers.forEach(h => {
      tableHtml += `<th style="padding: 0.6rem 0.85rem; text-align: left; font-weight: 800; color: var(--accent-purple);">${h}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.03)';
      tableHtml += `<tr style="background: ${bg}; border-bottom: 1px solid var(--border-color);">`;
      r.forEach(cell => {
        tableHtml += `<td style="padding: 0.55rem 0.85rem; color: var(--text-main);">${cell}</td>`;
      });
      tableHtml += `</tr>`;
    });

    tableHtml += `</tbody></table></div>`;
    return tableHtml;
  });

  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gim, '');
  html = html.replace(/^### (.*$)/gim, '<h5 style="margin: 0.5rem 0; font-weight: 800; color: var(--accent-purple); font-size: 0.95rem;">$1</h5>');
  html = html.replace(/^## (.*$)/gim, '<h4 style="margin: 0.6rem 0; font-weight: 800; color: var(--text-main); font-size: 1rem;">$1</h4>');
  html = html.replace(/^# (.*$)/gim, '<h3 style="margin: 0.75rem 0; font-weight: 800; color: var(--text-main); font-size: 1.1rem;">$1</h3>');

  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*(?:kcal|calo|calories))\s*\*\*/gi, '<span class="badge-highlight badge-calo">🔥 $1</span>');
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*g?\s*(?:protein|đạm))\s*\*\*/gi, '<span class="badge-highlight badge-protein">🥩 $1</span>');
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*g?\s*(?:carb|fat|tinh bột|chất béo))\s*\*\*/gi, '<span class="badge-highlight badge-macro">🥑 $1</span>');
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*(?:ml|lít|l))\s*\*\*/gi, '<span class="badge-highlight badge-water">💧 $1</span>');
  html = html.replace(/\*\*\s*(ngày\s*\d+(?:\/\d+)?)\s*\*\*/gi, '<span class="badge-highlight badge-journey">🚩 $1</span>');
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*kg)\s*\*\*/gi, '<span class="badge-highlight badge-weight">⚖️ $1</span>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800; color: var(--accent-purple);">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  html = html.replace(/^(\d+[\.\️⃣]|(?:[1-9]\d?️⃣))\s+(.*)$/gim, '<li style="margin-left: 1.2rem; margin-bottom: 0.3rem;"><strong>$1</strong> $2</li>');
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li style="margin-left: 1.2rem; list-style-type: disc; margin-bottom: 0.3rem;">$1</li>');
  html = html.replace(/(<li.*?>.*?<\/li>\n?)+/g, '<ul style="margin: 0.5rem 0; padding-left: 0.2rem;">$&</ul>');

  html = html.replace(/\n{3,}/g, '\n\n');
  html = html.replace(/\n/g, '<br/>');
  html = html.replace(/(?:<br\/>\s*){3,}/gi, '<br/><br/>');

  const blockTags = 'blockquote|ul|ol|pre|table|div|h3|h4|h5';
  html = html.replace(new RegExp(`(?:<br\\s*\\/?>\\s*)+(?=<\\/?(?:${blockTags})\\b)`, 'gi'), '');
  html = html.replace(new RegExp(`(<\\/(?:${blockTags})>\\s*)(?:<br\\s*\\/?>\\s*)+`, 'gi'), '$1');

  return html;
}
