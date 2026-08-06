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

      // 2. Fetch Chat History context & call AI Coach Service
      const history = await DataService.getChatHistory();
      const aiResponse = await AiCoachService.sendMessage(msg, history);

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
      return `<div class="chat-bubble user">${escapeHtml(m.content)}</div>`;
    } else {
      // Assistant Bubble with Optional Proposed Change Approval Card
      return `
        <div class="chat-bubble assistant">
          <div>${escapeHtml(m.content)}</div>
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

function escapeHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
