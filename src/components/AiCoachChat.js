import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { renderGeminiIcon } from './ui/Icons.js';

export async function renderAiCoachChat(onStateUpdated) {
  let isSending = false;

  const chatDrawerHtml = `
    <!-- Floating FAB Trigger Button -->
    <button class="chat-fab" id="chat-fab-toggle" title="Mở AI Coach">
      ${renderGeminiIcon({ width: 28, height: 28, strokeWidth: 1.8 })}
    </button>

    <!-- Floating Chat Drawer -->
    <div class="chat-drawer" id="chat-drawer">
      <div class="chat-header">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <div style="width: 32px; height: 32px; background: linear-gradient(135deg, var(--accent-purple), var(--primary)); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: #fff;">
            ${renderGeminiIcon({ width: 18, height: 18, strokeWidth: 1.8, color: '#fff' })}
          </div>
          <div>
            <div style="font-weight: 700; font-size: 0.95rem;">AI Coach Smart Brain</div>
            <div class="text-xs text-muted">Điều khiển toàn bộ dữ liệu & Kế hoạch</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-icon btn-sm" id="chat-drawer-close"><i data-lucide="x"></i></button>
      </div>

      <!-- Messages History Area -->
      <div class="chat-messages" id="chat-messages-container">
        <!-- Rendered dynamically -->
      </div>

      <!-- Input Bar -->
      <div class="chat-input-area">
        <input type="text" class="form-input" id="chat-input-text" placeholder="Hỏi AI, dán thực đơn hoặc nhập yêu cầu..." style="font-size: 0.85rem;">
        <button class="btn btn-ai btn-sm" id="chat-btn-send">
          <i data-lucide="send"></i>
        </button>
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
    fab.addEventListener('click', toggleDrawer);
    closeBtn.addEventListener('click', () => drawer.classList.remove('open'));

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

    sendBtn.addEventListener('click', sendMessageHandler);
    inputText.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessageHandler();
    });
  }
}

function showThinkingIndicator() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const existing = document.getElementById('ai-thinking-indicator');
  if (existing) return;

  const thinkingDiv = document.createElement('div');
  thinkingDiv.id = 'ai-thinking-indicator';
  thinkingDiv.className = 'chat-bubble assistant thinking';
  thinkingDiv.style.cssText = 'display: flex; align-items: center; gap: 0.65rem; background: linear-gradient(135deg, rgba(117, 86, 217, 0.14), rgba(168, 145, 255, 0.08)); border: 1.5px solid rgba(117, 86, 217, 0.3); padding: 0.65rem 0.95rem; border-radius: 14px; margin-bottom: 0.75rem; box-shadow: 0 4px 12px rgba(117, 86, 217, 0.1); width: fit-content;';

  thinkingDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.35rem;">
      <span style="width: 8px; height: 8px; background: var(--accent-purple); border-radius: 50%; display: inline-block; animation: pulseDot 1.4s infinite ease-in-out 0s;"></span>
      <span style="width: 8px; height: 8px; background: var(--accent-purple); border-radius: 50%; display: inline-block; animation: pulseDot 1.4s infinite ease-in-out 0.2s;"></span>
      <span style="width: 8px; height: 8px; background: var(--accent-purple); border-radius: 50%; display: inline-block; animation: pulseDot 1.4s infinite ease-in-out 0.4s;"></span>
    </div>
    <span style="font-size: 0.825rem; font-weight: 700; color: var(--accent-purple); animation: pulseText 1.5s infinite ease-in-out;">AI Coach đang suy nghĩ & phân tích...</span>
  `;

  container.appendChild(thinkingDiv);
  container.scrollTop = container.scrollHeight;
}

function hideThinkingIndicator() {
  const indicator = document.getElementById('ai-thinking-indicator');
  if (indicator) indicator.remove();
}

async function refreshChatMessages(onStateUpdated) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const history = await DataService.getChatHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; margin: auto 0; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">
        <i data-lucide="bot" style="width: 40px; height: 40px; color: var(--accent-purple); margin-bottom: 0.5rem;"></i>
        <div>Xin chào! Tôi là <b>AI Coach</b> điều khiển dữ liệu web của bạn.</div>
        <div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-dim);">Hãy dán thực đơn, hỏi lời khuyên hoặc yêu cầu đổi mục tiêu (ví dụ: "Đổi mục tiêu nước thành 4L").</div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const html = history.map(m => {
    if (m.role === 'user') {
      return `<div class="chat-bubble user">${parseMarkdown(m.content)}</div>`;
    } else {
      // Assistant Bubble with Rich Markdown Formatting & Optional Proposed Change Card
      return `
        <div class="chat-bubble assistant">
          <div class="chat-markdown-body" style="line-height: 1.55;">${parseMarkdown(m.content)}</div>
          ${m.proposedChange ? renderApprovalCard(m) : ''}
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
      const msgId = parseInt(btn.getAttribute('data-approve-prop'));
      const msg = history.find(item => item.id === msgId);
      if (msg && msg.proposedChange) {
        const success = await DataService.applyProposedChange(msg.proposedChange);
        if (success) {
          await DataService.updateChatMessageStatus(msgId, 'approved');
          // Add confirmation response
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
      const msgId = parseInt(btn.getAttribute('data-reject-prop'));
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
}

function renderApprovalCard(msg) {
  const prop = msg.proposedChange;
  const status = msg.status || 'pending';

  if (status === 'approved') {
    return `
      <div class="approval-card" style="border-color: var(--primary); background: rgba(16, 185, 129, 0.1);">
        <div class="approval-title" style="color: var(--primary);"><i data-lucide="check-circle"></i> ĐÃ ÁP DỤNG THAY ĐỔI ✓</div>
        <div class="text-xs text-muted">${prop.title}</div>
      </div>
    `;
  }

  if (status === 'rejected') {
    return `
      <div class="approval-card" style="border-color: var(--danger); background: rgba(239, 68, 68, 0.1);">
        <div class="approval-title" style="color: var(--danger);"><i data-lucide="x-circle"></i> ĐÃ TỪ CHỐI ✗</div>
        <div class="text-xs text-muted">${prop.title}</div>
      </div>
    `;
  }

  // Pending Status -> Render Action Buttons [Đồng ý] & [Từ chối]
  return `
    <div class="approval-card">
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
 * Lightweight Markdown Parser for AI Coach Rich Text Responses
 */
function parseMarkdown(text = '') {
  if (!text) return '';
  let html = text;

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.18); padding: 0.6rem; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; margin: 0.4rem 0;"><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(117, 86, 217, 0.15); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.82rem; color: var(--accent-purple); font-weight: 600;">$1</code>');

  // Headers (### Heading 3, ## Heading 2, # Heading 1)
  html = html.replace(/^### (.*$)/gim, '<h5 style="margin: 0.4rem 0; font-weight: 800; color: var(--accent-purple); font-size: 0.9rem;">$1</h5>');
  html = html.replace(/^## (.*$)/gim, '<h4 style="margin: 0.5rem 0; font-weight: 800; color: var(--text-main); font-size: 0.95rem;">$1</h4>');
  html = html.replace(/^# (.*$)/gim, '<h3 style="margin: 0.6rem 0; font-weight: 800; color: var(--text-main); font-size: 1.05rem;">$1</h3>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800; color: var(--text-main);">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Numbered list items (1. item or 1️⃣ item)
  html = html.replace(/^(\d+[\.\️⃣]|(?:[1-9]\d?️⃣))\s+(.*)$/gim, '<li style="margin-left: 1.1rem; margin-bottom: 0.25rem;"><strong>$1</strong> $2</li>');

  // Unordered list items (- item or * item)
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li style="margin-left: 1.1rem; list-style-type: disc; margin-bottom: 0.25rem;">$1</li>');

  // Group consecutive <li> items into <ul>
  html = html.replace(/(<li.*?>.*?<\/li>\n?)+/g, '<ul style="margin: 0.4rem 0; padding-left: 0.2rem;">$&</ul>');

  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  return html;
}
