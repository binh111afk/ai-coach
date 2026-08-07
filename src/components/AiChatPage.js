import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { renderGeminiIcon, renderPdfIcon } from './ui/Icons.js';

export async function renderAiChatPage(onStateUpdated) {
  let isSending = false;
  let currentAttachment = null;

  const profile = await DataService.getUserProfile();
  let activeSessionId = await DataService.getCurrentSessionId();

  const chatPageHtml = `
    <!-- Edge-to-Edge Full Screen Layout -->
    <div style="width: 100%; height: calc(100vh - 65px); display: flex; margin: 0; padding: 0; box-sizing: border-box; overflow: hidden; background: var(--bg-card);">
      
      <!-- Left Sidebar: Chat Sessions / Threads (Phiên Trò Chuyện) -->
      <div style="width: 280px; flex-shrink: 0; background: var(--bg-subtle); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
        
        <!-- New Chat Action -->
        <div style="padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
          <div style="font-weight: 800; font-size: 0.9rem; color: var(--accent-purple); display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="message-square-plus" style="width: 18px; height: 18px;"></i>
            <span>Đoạn Trò Chuyện</span>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-new-chat-session" style="padding: 0.35rem 0.75rem; font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; gap: 0.3rem;">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i> Mới
          </button>
        </div>

        <!-- Chat Sessions List -->
        <div style="flex: 1; overflow-y: auto; padding: 0.65rem; display: flex; flex-direction: column; gap: 0.4rem;" id="chat-sessions-sidebar-container">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <!-- Center Edge-to-Edge Main Chat Workspace -->
      <div style="flex: 1; display: flex; flex-direction: column; height: 100%; min-width: 0; background: var(--bg-card);">
        
        <!-- Messages Stream (Center-Aligned Spacious Column) -->
        <div style="flex: 1; overflow-y: auto; padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.25rem;" id="page-chat-messages-container">
          <!-- Rendered dynamically -->
        </div>

        <!-- Attachment Demo Preview Container -->
        <div id="page-attachment-preview-container" style="display: none; padding: 0.6rem 2rem; background: var(--bg-subtle); border-top: 1px solid var(--border-color); align-items: center; gap: 0.75rem;">
          <!-- Rendered dynamically -->
        </div>

        <!-- Bottom Chat Input Bar -->
        <div style="padding: 1rem 2rem 1.25rem 2rem; border-top: 1px solid var(--border-color); background: var(--bg-card);">
          <div style="max-width: 950px; margin: 0 auto; display: flex; align-items: center; gap: 0.75rem; background: var(--bg-subtle); padding: 0.4rem 0.6rem 0.4rem 0.85rem; border-radius: var(--radius-card); border: 1.5px solid var(--border-color); box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
            
            <!-- File Attachment Button -->
            <label for="page-chat-file-input" style="cursor: pointer; padding: 0.5rem; border-radius: 8px; background: transparent; color: var(--accent-purple); display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;" title="Đính kèm File Ảnh hoặc PDF">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </label>
            <input type="file" id="page-chat-file-input" accept="image/*,application/pdf,.pdf,.xlsx,.xls,.docx,.doc" style="display: none;">

            <input type="text" class="form-input" id="page-chat-input-text" placeholder="Nhập câu hỏi, thực đơn hoặc đính kèm ảnh/PDF/Excel/DOCX..." style="flex: 1; border: none; background: transparent; padding: 0.5rem 0.25rem; font-size: 0.95rem; outline: none; box-shadow: none;">
            
            <button class="btn btn-primary" id="page-chat-btn-send" style="width: 42px; height: 42px; padding: 0; font-weight: 800; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <i data-lucide="send" style="width: 17px; height: 17px; margin-left: 2px;"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = chatPageHtml;
    if (window.lucide) window.lucide.createIcons();

    const container = document.getElementById('page-chat-messages-container');
    const sendBtn = document.getElementById('page-chat-btn-send');
    const inputText = document.getElementById('page-chat-input-text');
    const fileInput = document.getElementById('page-chat-file-input');
    const attachmentContainer = document.getElementById('page-attachment-preview-container');

    // Helpers to build sidebar with all callbacks
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
          // If we deleted the active session, create a new one
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

    // New Session Button Handler
    document.getElementById('btn-new-chat-session')?.addEventListener('click', async () => {
      activeSessionId = await DataService.createNewSession();
      await buildSidebar();
      await refreshMessages(container, activeSessionId, onStateUpdated);
      inputText.focus();
    });

    // File Upload Handler (Image, PDF, Excel, DOCX)
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const name = file.name.toLowerCase();
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
      const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') ||
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel';
      const isDocx = name.endsWith('.docx') || name.endsWith('.doc') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword';

      if (!isImage && !isPdf && !isExcel && !isDocx) {
        alert('Chỉ hỗ trợ: Hình ảnh (PNG/JPG), PDF, Excel (.xlsx/.xls) và DOCX (.docx/.doc).');
        fileInput.value = '';
        return;
      }

      // Determine display type for attachment preview
      const fileType = isImage ? 'image' : isPdf ? 'pdf' : isExcel ? 'excel' : 'docx';

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          currentAttachment = {
            type: 'image',
            file,
            fileName: file.name,
            dataUrl: evt.target.result
          };
          renderAttachmentPreview(attachmentContainer, currentAttachment);
        };
        reader.readAsDataURL(file);
      } else {
        currentAttachment = {
          type: fileType,
          file,
          fileName: file.name
        };
        renderAttachmentPreview(attachmentContainer, currentAttachment);
      }
    });

    // Send Message Handler
    const sendMessageHandler = async () => {
      const msgText = inputText.value.trim();
      if ((!msgText && !currentAttachment) || isSending) return;

      isSending = true;
      let finalContent = msgText;
      const attachmentPayload = currentAttachment ? { ...currentAttachment } : null;

      // Reset Inputs
      inputText.value = '';
      currentAttachment = null;
      attachmentContainer.style.display = 'none';
      attachmentContainer.innerHTML = '';
      fileInput.value = '';
      inputText.disabled = true;

      // Attachment markdown formatting
      if (attachmentPayload) {
        if (attachmentPayload.type === 'image') {
          finalContent = (msgText ? msgText + '\n\n' : '') + `![${attachmentPayload.fileName}](${attachmentPayload.dataUrl})`;
        } else {
          finalContent = (msgText ? msgText + '\n\n' : '') + `📄 **File Đính Kèm:** ${attachmentPayload.fileName}`;
        }
      }

      // 1. Save User Message
      await DataService.addChatMessage({
        role: 'user',
        content: finalContent,
        attachment: attachmentPayload
      });

      await refreshMessages(container, activeSessionId, onStateUpdated);
      showPageThinkingIndicator(container);

      // 2. Fetch AI Response
      const historyList = await DataService.getChatHistory(activeSessionId);
      const aiResponse = await AiCoachService.sendMessage(msgText || "Hãy phân tích file đính kèm này", historyList);

      hidePageThinkingIndicator();

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

      // Award XP for using AI Coach (dispatches achievement event if new badge)
      DataService.awardAiCoachXp().catch(() => {});

      await refreshMessages(container, activeSessionId, onStateUpdated);
      await renderChatSessionsSidebar(activeSessionId, async (selectedId) => {
        activeSessionId = selectedId;
        await DataService.setCurrentSessionId(activeSessionId);
        await refreshMessages(container, activeSessionId, onStateUpdated);
      });
    };

    sendBtn.addEventListener('click', sendMessageHandler);
    inputText.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessageHandler();
    });
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
    const activeClass = isActive
      ? 'background: linear-gradient(135deg, rgba(117, 86, 217, 0.18), rgba(168, 145, 255, 0.12)); border-color: rgba(117, 86, 217, 0.4);'
      : 'background: var(--bg-card); border-color: var(--border-color);';

    return `
      <div class="chat-session-item" data-session-id="${s.id}" style="padding: 0.6rem 0.65rem; border-radius: var(--radius-sm); border: 1px solid; ${activeClass} cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 0.4rem;" title="${s.title}">
        <div style="min-width: 0; flex: 1; font-size: 0.8rem; font-weight: ${isActive ? '800' : '600'}; color: ${isActive ? 'var(--accent-purple)' : 'var(--text-main)'}; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${s.title}</div>
        <button class="btn-delete-session" data-del-session-id="${s.id}" style="background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0.15rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; opacity: 0.6; transition: all 0.2s ease;" title="Xóa đoạn trò chuyện này">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
            <path d="M9 6V4h6v2"></path>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();

  // Select session on click (exclude delete button)
  sidebarContainer.querySelectorAll('[data-session-id]').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-del-session-id]')) return;
      const sId = item.getAttribute('data-session-id');
      if (onSelectSession) onSelectSession(sId);
    });
  });

  // Delete session button
  sidebarContainer.querySelectorAll('[data-del-session-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const sId = btn.getAttribute('data-del-session-id');
      if (onDeleteSession) onDeleteSession(sId);
    });
  });
}

function renderAttachmentPreview(container, attachment) {
  if (!container || !attachment) return;

  const rawName = attachment.fileName || 'file';
  const truncatedName = rawName.length > 22 ? rawName.substring(0, 19) + '...' : rawName;

  container.style.display = 'flex';

  // Inline SVG icons for different file types
  const pdfIconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15h6"></path><path d="M9 18h6"></path><path d="M9 12h1"></path></svg>`;
  const excelIconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><line x1="10" y1="9" x2="14" y2="9"></line></svg>`;
  const docxIconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;

  const fileIconMap = { pdf: pdfIconSvg, excel: excelIconSvg, docx: docxIconSvg };
  const labelMap = { pdf: 'Tài liệu PDF', excel: 'Bảng tính Excel', docx: 'Tài liệu DOCX' };

  if (attachment.type === 'image') {
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-card); padding: 0.4rem 0.85rem; border-radius: var(--radius-md); border: 1.5px solid var(--accent-purple); box-shadow: 0 2px 8px rgba(117, 86, 217, 0.15);">
        <img src="${attachment.dataUrl}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover;">
        <span style="font-weight: 800; font-size: 0.825rem; color: var(--text-main); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 160px;" title="${rawName}">${truncatedName}</span>
        <button id="btn-remove-attachment" style="background: none; border: none; cursor: pointer; color: var(--danger); padding: 0 0.2rem; font-weight: 800; font-size: 1.2rem;">&times;</button>
      </div>
      <span class="text-xs text-muted" style="font-weight: 600;">Ảnh demo sẵn sàng để gửi</span>
    `;
  } else {
    const icon = fileIconMap[attachment.type] || pdfIconSvg;
    const label = labelMap[attachment.type] || 'Tài liệu';
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-card); padding: 0.4rem 0.85rem; border-radius: var(--radius-md); border: 1.5px solid var(--accent-purple); box-shadow: 0 2px 8px rgba(117, 86, 217, 0.15);">
        ${icon}
        <span style="font-weight: 800; font-size: 0.825rem; color: var(--text-main); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 160px;" title="${rawName}">${truncatedName}</span>
        <button id="btn-remove-attachment" style="background: none; border: none; cursor: pointer; color: var(--danger); padding: 0 0.2rem; font-weight: 800; font-size: 1.2rem;">&times;</button>
      </div>
      <span class="text-xs text-muted" style="font-weight: 600;">${label} sẵn sàng để gửi</span>
    `;
  }

  document.getElementById('btn-remove-attachment')?.addEventListener('click', () => {
    container.style.display = 'none';
    container.innerHTML = '';
  });
}

function showPageThinkingIndicator(container) {
  if (!container) return;
  const existing = document.getElementById('page-ai-thinking');
  if (existing) return;

  const thinkingDiv = document.createElement('div');
  thinkingDiv.id = 'page-ai-thinking';
  thinkingDiv.className = 'chat-bubble assistant thinking';
  thinkingDiv.style.cssText = 'display: flex; align-items: center; gap: 0.65rem; background: linear-gradient(135deg, rgba(117, 86, 217, 0.14), rgba(168, 145, 255, 0.08)); border: 1.5px solid rgba(117, 86, 217, 0.3); padding: 0.75rem 1.1rem; border-radius: 14px; margin-bottom: 0.75rem; width: fit-content; max-width: 900px; margin-left: auto; margin-right: auto;';

  thinkingDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.35rem;">
      <span style="width: 8px; height: 8px; background: var(--accent-purple); border-radius: 50%; display: inline-block; animation: pulseDot 1.4s infinite ease-in-out 0s;"></span>
      <span style="width: 8px; height: 8px; background: var(--accent-purple); border-radius: 50%; display: inline-block; animation: pulseDot 1.4s infinite ease-in-out 0.2s;"></span>
      <span style="width: 8px; height: 8px; background: var(--accent-purple); border-radius: 50%; display: inline-block; animation: pulseDot 1.4s infinite ease-in-out 0.4s;"></span>
    </div>
    <span style="font-size: 0.85rem; font-weight: 700; color: var(--accent-purple); animation: pulseText 1.5s infinite ease-in-out;">AI Coach đang suy nghĩ & phân tích...</span>
  `;

  container.appendChild(thinkingDiv);
  container.scrollTop = container.scrollHeight;
}

function hidePageThinkingIndicator() {
  const el = document.getElementById('page-ai-thinking');
  if (el) el.remove();
}

async function refreshMessages(container, sessionId, onStateUpdated) {
  if (!container) return;
  const history = await DataService.getChatHistory(sessionId);

  if (history.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; margin: auto 0; color: var(--text-muted); padding: 2rem;">
        <div style="width: 64px; height: 64px; background: rgba(117, 86, 217, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem auto; color: var(--accent-purple); box-shadow: 0 4px 16px rgba(117, 86, 217, 0.2);">
          ${renderGeminiIcon({ width: 36, height: 36 })}
        </div>
        <h3 style="font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem; font-size: 1.25rem;">AI Coach Smart Brain</h3>
        <p style="max-width: 520px; margin: 0 auto; font-size: 0.925rem; line-height: 1.6; color: var(--text-muted);">
          Bắt đầu đoạn trò chuyện mới! Tôi có thể giúp bạn lập thực đơn, phân tích món ăn, đính kèm file PDF/Hình ảnh, tính toán bảng calo & macro và tự động điều khiển dữ liệu hệ thống.
        </p>
      </div>
    `;
    return;
  }

  const html = history.map(m => {
    if (m.role === 'user') {
      return `<div class="chat-bubble user" style="max-width: 680px; margin-left: auto; border-radius: 20px;">${parseMarkdownPage(m.content)}</div>`;
    } else {
      return `
        <div class="chat-bubble assistant" style="max-width: 720px; margin-right: auto; border-radius: 20px;">
          <div class="chat-markdown-body" style="line-height: 1.6;">${parseMarkdownPage(m.content)}</div>
          ${m.proposedChange ? renderApprovalCardPage(m) : ''}
        </div>
      `;
    }
  }).join('');

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
  container.scrollTop = container.scrollHeight;

  // Attach approval listeners
  container.querySelectorAll('[data-approve-prop]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const msgId = parseInt(btn.getAttribute('data-approve-prop'));
      const msg = history.find(item => item.id === msgId);
      if (msg && msg.proposedChange) {
        const success = await DataService.applyProposedChange(msg.proposedChange);
        if (success) {
          await DataService.updateChatMessageStatus(msgId, 'approved');
          await DataService.addChatMessage({
            role: 'assistant',
            content: `✅ **Đã áp dụng thay đổi thành công!** ${msg.proposedChange.title} đã được cập nhật vào dữ liệu web.`
          });
          await refreshMessages(container, sessionId, onStateUpdated);
          if (onStateUpdated) onStateUpdated();
        }
      }
    });
  });

  container.querySelectorAll('[data-reject-prop]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const msgId = parseInt(btn.getAttribute('data-reject-prop'));
      const msg = history.find(item => item.id === msgId);
      if (msg) {
        await DataService.updateChatMessageStatus(msgId, 'rejected');
        await DataService.addChatMessage({
          role: 'assistant',
          content: `❌ **Đã từ chối đề xuất.** Bạn có muốn điều chỉnh thêm gì khác không?`
        });
        await refreshMessages(container, sessionId, onStateUpdated);
      }
    });
  });
}

function renderApprovalCardPage(msg) {
  const prop = msg.proposedChange;
  const status = msg.status || 'pending';

  if (status === 'approved') {
    return `
      <div class="approval-card" style="border-color: var(--primary); background: rgba(16, 185, 129, 0.1); margin-top: 0.75rem;">
        <div class="approval-title" style="color: var(--primary);"><i data-lucide="check-circle"></i> ĐÃ ÁP DỤNG THAY ĐỔI ✓</div>
        <div class="text-xs text-muted">${prop.title}</div>
      </div>
    `;
  }

  if (status === 'rejected') {
    return `
      <div class="approval-card" style="border-color: var(--danger); background: rgba(239, 68, 68, 0.1); margin-top: 0.75rem;">
        <div class="approval-title" style="color: var(--danger);"><i data-lucide="x-circle"></i> ĐÃ TỪ CHỐI ✗</div>
        <div class="text-xs text-muted">${prop.title}</div>
      </div>
    `;
  }

  return `
    <div class="approval-card" style="margin-top: 0.75rem;">
      <div class="approval-title"><i data-lucide="alert-circle"></i> ${prop.title || 'Đề Xuất Thay Đổi Dữ Liệu'}</div>
      <table class="approval-diff-table">
        ${(prop.details || []).map(d => `
          <tr>
            <td style="color: var(--text-muted); font-weight: 600;">${d.field}:</td>
            <td style="color: var(--danger); text-decoration: line-through;">${d.from}</td>
            <td style="color: var(--primary); font-weight: 700;">➔ ${d.to}</td>
          </tr>
        `).join('')}
      </table>
      <div class="approval-actions">
        <button class="btn btn-primary btn-sm" style="flex: 1;" data-approve-prop="${msg.id}">
          <i data-lucide="check"></i> Đồng Ý
        </button>
        <button class="btn btn-danger btn-sm" style="flex: 1;" data-reject-prop="${msg.id}">
          <i data-lucide="x"></i> Từ Chối
        </button>
      </div>
    </div>
  `;
}

/**
 * Rich Markdown Parser with Table Support
 */
function parseMarkdownPage(text = '') {
  if (!text) return '';
  let html = text;

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.18); padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; overflow-x: auto; margin: 0.5rem 0;"><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(117, 86, 217, 0.15); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.85rem; color: var(--accent-purple); font-weight: 600;">$1</code>');

  // Markdown Images ![alt](src)
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<div style="margin: 0.5rem 0;"><img src="$2" alt="$1" style="max-width: 280px; max-height: 240px; border-radius: 12px; object-fit: cover; border: 2px solid var(--accent-purple); box-shadow: 0 4px 14px rgba(0,0,0,0.15);"></div>');

  // Markdown Tables (| Header | Header |)
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

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h5 style="margin: 0.5rem 0; font-weight: 800; color: var(--accent-purple); font-size: 0.95rem;">$1</h5>');
  html = html.replace(/^## (.*$)/gim, '<h4 style="margin: 0.6rem 0; font-weight: 800; color: var(--text-main); font-size: 1rem;">$1</h4>');
  html = html.replace(/^# (.*$)/gim, '<h3 style="margin: 0.75rem 0; font-weight: 800; color: var(--text-main); font-size: 1.1rem;">$1</h3>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800; color: var(--text-main);">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^(\d+[\.\️⃣]|(?:[1-9]\d?️⃣))\s+(.*)$/gim, '<li style="margin-left: 1.2rem; margin-bottom: 0.3rem;"><strong>$1</strong> $2</li>');
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li style="margin-left: 1.2rem; list-style-type: disc; margin-bottom: 0.3rem;">$1</li>');
  html = html.replace(/(<li.*?>.*?<\/li>\n?)+/g, '<ul style="margin: 0.5rem 0; padding-left: 0.2rem;">$&</ul>');

  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  return html;
}
