import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { appState } from '../services/appState.js';
import { CONFIG } from '../config.js';
import { renderGeminiIcon, renderPdfIcon, renderProviderIcon } from './ui/Icons.js';

export async function renderAiChatPage(onStateUpdated) {
  let isSending = false;
  let attachedFiles = [];

  const profile = await DataService.getUserProfile();
  let activeSessionId = await DataService.getCurrentSessionId();
  await DataService.getPhotos(); // Warm up photos cache for instant approval card lookup

  const chatPageHtml = `
    <div class="ai-chat-app">
      <!-- SIDEBAR -->
      <aside class="ai-chat-sidebar" id="ai-sidebar">
        <div class="ai-sidebar-inner">
          <div class="ai-sidebar-top">
            <button class="btn-sidebar btn-history">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              Đoạn Trò Chuyện
            </button>
            <button class="btn-sidebar btn-new" id="btn-new-chat-session">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Mới
            </button>
          </div>

          <div class="chat-list" id="chat-sessions-sidebar-container">
            <!-- Rendered dynamically -->
          </div>
        </div>
      </aside>

      <!-- MAIN -->
      <main class="ai-chat-main">
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
                <!-- Dynamically populated model items with brand logos -->
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

        <!-- Input area -->
        <div class="input-area">
          <!-- File attach preview chips -->
          <div class="attach-preview" id="page-attach-preview-container"></div>

          <div class="input-wrap">
            <label for="page-chat-file-input" class="btn-attach" title="Đính kèm file (Có thể chọn nhiều file)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </label>
            <input type="file" id="page-chat-file-input" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.xlsx,.xls,.csv,.doc,.docx" style="display: none;">

            <input type="text" id="page-chat-input-text" placeholder="Nhập câu hỏi, thực đơn hoặc đính kèm ảnh/PDF/Excel/DOCX..." />
            <button class="btn-send" id="page-chat-btn-send" title="Gửi">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
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
        "gemini/gemini-3.6-flash",
        "oc/big-pickle",
        "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free"
      ];

      const top3Models = CONFIG.SUPPORTED_MODELS.filter(m => top3Ids.includes(m.id));
      const remainingModels = CONFIG.SUPPORTED_MODELS.filter(m => !top3Ids.includes(m.id));

      dropdown.innerHTML = `
        <div class="model-dropdown-section-title">Model Nổi Bật (Khuyên Dùng)</div>
        ${top3Models.map(m => `
          <div class="model-option ${m.id === currentModelId ? 'active' : ''}" data-model-id="${m.id}">
            ${renderProviderIcon(m.id)}
            <div style="flex: 1; min-width: 0;">
              <div class="name">${m.name.split(' (')[0]}</div>
              <div class="desc">${m.name.includes('(') ? m.name.split('(')[1].replace(')', '') : 'AI Coach Model'}</div>
            </div>
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
          </div>
        `).join('')}
      `;

      dropdown.querySelectorAll('.model-option').forEach(opt => {
        opt.addEventListener('click', async (e) => {
          e.stopPropagation();
          const selectedId = opt.getAttribute('data-model-id');
          if (selectedId) {
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
      if (attachedFiles.length === 0) return;

      attachedFiles.forEach((fileObj, idx) => {
        const type = getFileType(fileObj.name);
        const sizeStr = formatFileSize(fileObj.size);
        const isImg = fileObj.dataUrl && (fileObj.type?.startsWith('image/') || ['jpg','jpeg','png','webp','svg'].includes(type));
        const iconHtml = isImg 
          ? `<img src="${fileObj.dataUrl}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color);" />`
          : getFileIconSvg(type);

        const chip = document.createElement('div');
        chip.className = `file-chip ${type}`;
        chip.innerHTML = `
          <div class="file-icon">${iconHtml}</div>
          <div class="file-info">
            <div class="file-name" title="${fileObj.name}">${fileObj.name}</div>
            <div class="file-size">${sizeStr}</div>
          </div>
          <button class="file-remove" data-index="${idx}" title="Xóa">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        `;
        attachPreview.appendChild(chip);
      });

      attachPreview.querySelectorAll('.file-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const removeIdx = parseInt(btn.getAttribute('data-index'));
          const chipEl = btn.closest('.file-chip');
          if (chipEl) {
            chipEl.classList.add('item-deleting');
            setTimeout(() => {
              attachedFiles.splice(removeIdx, 1);
              renderPreviewChips();
            }, 250);
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
      DataService.awardAiCoachXp().catch(() => {});
      await refreshMessages(container, activeSessionId, onStateUpdated, true);

      // Asynchronously generate AI title for this session if not set yet
      if (!DataService.getSessionTitle(activeSessionId)) {
        AiCoachService.generateSessionTitle(promptText, aiResponse.content).then(async (aiTitle) => {
          if (aiTitle) {
            DataService.saveSessionTitle(activeSessionId, aiTitle);
            await buildSidebar();
          }
        }).catch(() => {});
      } else {
        await buildSidebar();
      }
    };

    sendBtn?.addEventListener('click', sendMessageHandler);
    inputText?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessageHandler(); });
  }
}

async function renderChatSessionsSidebar(activeSessionId, onSelectSession, onDeleteSession) {
  const sidebarContainer = document.getElementById('chat-sessions-sidebar-container');
  if (!sidebarContainer) return;
  const sessions = await DataService.getChatSessions();
  if (sessions.length === 0) {
    sidebarContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1.5rem 0.5rem;">
        Bấm <b>+ Mới</b> để tạo đoạn trò chuyện đầu tiên!
      </div>
    `;
    return;
  }
  sidebarContainer.innerHTML = sessions.map(s => {
    const isActive = s.id === activeSessionId;
    return `
      <div class="chat-item ${isActive ? 'active' : ''}" data-session-id="${s.id}" title="${s.title}">
        <span class="title">${s.title}</span>
        <button class="delete" data-del-session-id="${s.id}" title="Xóa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();

  sidebarContainer.querySelectorAll('[data-session-id]').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-del-session-id]')) return;
      onSelectSession(item.getAttribute('data-session-id'));
    });
  });
  sidebarContainer.querySelectorAll('[data-del-session-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sId = btn.getAttribute('data-del-session-id');
      const itemEl = btn.closest('.chat-item');
      if (itemEl) {
        itemEl.classList.add('item-deleting');
        setTimeout(() => {
          if (onDeleteSession) onDeleteSession(sId);
        }, 400);
      } else {
        if (onDeleteSession) onDeleteSession(sId);
      }
    });
  });
}

function getFileType(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return 'img';
  if (['xls','xlsx','csv'].includes(ext)) return 'xls';
  if (['doc','docx'].includes(ext)) return 'doc';
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
    <div class="msg-avatar" style="background: transparent; border: none; box-shadow: none; display: flex; align-items: center; justify-content: center;">
      ${renderProviderIcon(currentModelId)}
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
    const parts = (fullName || 'B').trim().split(/\s+/);
    const lastWord = parts[parts.length - 1];
    return (lastWord ? lastWord.charAt(0) : 'B').toUpperCase();
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
      <div class="empty-state" id="emptyState">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
            <path d="M5 19l.75 2.25L8 22l-2.25.75L5 25l-.75-2.25L2 22l2.25-.75L5 19z" opacity="0.5"/>
          </svg>
        </div>
        <h2>AI Coach Smart Brain</h2>
        <p>Bắt đầu đoạn trò chuyện mới! Tôi có thể giúp bạn lập thực đơn, phân tích món ăn, đính kèm file PDF/Hình ảnh, tính toán bảng calo & macro và tự động điều khiển dữ liệu hệ thống.</p>
      </div>
    `;
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
          <div class="msg-avatar" style="background: transparent; border: none; box-shadow: none; display: flex; align-items: center; justify-content: center;">
            ${renderProviderIcon(msgModel)}
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
    const totalDuration = 1800; // Complete full message in ~1.8 seconds max
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
  let detailsList = prop.details || [];
  if ((!detailsList || detailsList.length === 0) && prop.payload?.meals && Array.isArray(prop.payload.meals)) {
    const mealTypeNamesVi = {
      Breakfast: 'Bữa Sáng',
      Lunch: 'Bữa Trưa',
      Dinner: 'Bữa Tối',
      Snack: 'Bữa Phụ'
    };
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

function parseMarkdownPage(text = '') {
  if (!text) return '';
  let html = text;

  // Code blocks & inline code
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.18); padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; overflow-x: auto; margin: 0.5rem 0;"><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(117, 86, 217, 0.15); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.85rem; color: var(--accent-purple); font-weight: 600;">$1</code>');

  // Quotes / Callout Box (> Quote)
  html = html.replace(/^>\s*(.*$)/gim, '<blockquote class="ai-callout-box">$1</blockquote>');

  // Images
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<div style="margin: 0.5rem 0;"><img src="$2" alt="$1" style="max-width: 280px; max-height: 240px; border-radius: 12px; object-fit: cover; border: 2px solid var(--accent-purple); box-shadow: 0 4px 14px rgba(0,0,0,0.15);"></div>');

  // Tables
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

  // Remove horizontal dividers ---
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gim, '');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h5 style="margin: 0.5rem 0; font-weight: 800; color: var(--accent-purple); font-size: 0.95rem;">$1</h5>');
  html = html.replace(/^## (.*$)/gim, '<h4 style="margin: 0.6rem 0; font-weight: 800; color: var(--text-main); font-size: 1rem;">$1</h4>');
  html = html.replace(/^# (.*$)/gim, '<h3 style="margin: 0.75rem 0; font-weight: 800; color: var(--text-main); font-size: 1.1rem;">$1</h3>');

  // Strict Semantic Bold Keyword Highlighting (ONLY matches exact numbers & units)
  // 1. Calo
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*(?:kcal|calo|calories))\s*\*\*/gi, '<span class="badge-highlight badge-calo">🔥 $1</span>');
  // 2. Protein
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*g?\s*(?:protein|đạm))\s*\*\*/gi, '<span class="badge-highlight badge-protein">🥩 $1</span>');
  // 3. Carb / Fat / Macro
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*g?\s*(?:carb|fat|tinh bột|chất béo))\s*\*\*/gi, '<span class="badge-highlight badge-macro">🥑 $1</span>');
  // 4. Water / Hydration
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*(?:ml|lít|l))\s*\*\*/gi, '<span class="badge-highlight badge-water">💧 $1</span>');
  // 5. Journey Day
  html = html.replace(/\*\*\s*(ngày\s*\d+(?:\/\d+)?)\s*\*\*/gi, '<span class="badge-highlight badge-journey">🚩 $1</span>');
  // 6. Weight
  html = html.replace(/\*\*\s*(\d+(?:[\.,]\d+)?\s*kg)\s*\*\*/gi, '<span class="badge-highlight badge-weight">⚖️ $1</span>');
  // 7. General bold & italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800; color: var(--accent-purple);">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^(\d+[\.\️⃣]|(?:[1-9]\d?️⃣))\s+(.*)$/gim, '<li style="margin-left: 1.2rem; margin-bottom: 0.3rem;"><strong>$1</strong> $2</li>');
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li style="margin-left: 1.2rem; list-style-type: disc; margin-bottom: 0.3rem;">$1</li>');
  html = html.replace(/(<li.*?>.*?<\/li>\n?)+/g, '<ul style="margin: 0.5rem 0; padding-left: 0.2rem;">$&</ul>');

  // Clean up excess newlines & line breaks
  html = html.replace(/\n{3,}/g, '\n\n');
  html = html.replace(/\n/g, '<br/>');
  html = html.replace(/(?:<br\/>\s*){3,}/gi, '<br/><br/>');

  // Strip excessive <br/> tags before & after block-level HTML elements
  const blockTags = 'blockquote|ul|ol|pre|table|div|h3|h4|h5';
  html = html.replace(new RegExp(`(?:<br\\s*\\/?>\\s*)+(?=<\\/?(?:${blockTags})\\b)`, 'gi'), '');
  html = html.replace(new RegExp(`(<\\/(?:${blockTags})>\\s*)(?:<br\\s*\\/?>\\s*)+`, 'gi'), '$1');

  return html;
}
