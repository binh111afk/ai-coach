import confetti from 'canvas-confetti';
import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import { Modal } from './ui/Modal.js';
import { renderGeminiIcon } from './ui/Icons.js';

const CUSTOM_SCALE_SVG_ICON = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; flex-shrink: 0;">
    <path d="M10 22H14C19 22 21 20 21 15V9C21 4 19 2 14 2H10C5 2 3 4 3 9V15C3 20 5 22 10 22Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M17.25 8.29004C14.26 5.63004 9.74 5.63004 6.75 8.29004L8.93 11.79C10.68 10.23 13.32 10.23 15.07 11.79L17.25 8.29004Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

let activeComparisonResult = null; // Holds current active comparison data or null
let currentUploadingDataUrl = null; // Holds transient uploading data URL
let currentLightboxPhoto = null; // Holds photo object currently viewed in Lightbox

export async function renderPhotoVault() {
  const profile = await DataService.getUserProfile();
  const photos = await DataService.getPhotos(); // sorted by date ascending

  // Default selection for popup modal: 2 MOST RECENT photo entries
  const newestPhoto = photos[photos.length - 1] || null;
  const secondNewestPhoto = photos[photos.length - 2] || newestPhoto;

  let modalSelectedIdA = secondNewestPhoto?.id || '';
  let modalSelectedIdB = newestPhoto?.id || '';

  const photoDropdownOptions = photos.map((p, idx) => {
    const dayNum = p.journeyDay || (idx + 1);
    return {
      value: p.id,
      label: `Ngày ${dayNum} (${formatDisplayDate(p.date)}${p.weight ? ' - ' + p.weight + 'kg' : ''})`
    };
  });

  const html = `
    <div style="display: flex; flex-direction: column; gap: 1.75rem;">
      
      <!-- Header Banner & Primary Actions -->
      <div class="card" style="background: linear-gradient(135deg, rgba(245, 241, 255, 0.95), rgba(251, 250, 255, 0.95)); border: 1px solid var(--border-highlight);">
        <div class="card-header">
          <div>
            <h2><i data-lucide="camera" class="text-purple"></i> Kho Ảnh Tiến Trình Cơ Thể</h2>
            <p class="text-sm text-muted" style="margin-top: 0.25rem;">Lưu giữ hình ảnh vóc dáng và nhận xét phân tích biến đổi cơ thể từ AI Coach.</p>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button class="btn btn-secondary" id="btn-open-compare-modal">
              <i data-lucide="columns"></i> So Sánh Before / After
            </button>
            <label class="btn btn-primary" style="cursor: pointer;">
              <i data-lucide="upload"></i> Upload Ảnh Mới
              <input type="file" id="photo-upload-input" accept="image/*" style="display: none;">
            </label>
          </div>
        </div>
      </div>

      <!-- 1. ALBUM GRID OF ALL PROGRESS PHOTOS (FIRST SECTION) -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i data-lucide="image" class="text-purple"></i> Thư Viện Tất Cả Ảnh Tiến Trình (${photos.length} ảnh)</div>
          <span class="badge badge-secondary" style="font-size: 0.8rem;">💡 Bấm vào ảnh để phóng to</span>
        </div>

        ${photos.length === 0 ? `
          <div style="text-align: center; padding: 3rem 1rem; border: 2px dashed var(--border-color); border-radius: var(--radius-md);">
            <i data-lucide="camera-off" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 0.75rem;"></i>
            <h4>Chưa Có Ảnh Tiến Trình Nào</h4>
            <p class="text-sm text-muted" style="margin-top: 0.25rem;">Hãy bấm "Upload Ảnh Mới" để lưu giữ bức ảnh vóc dáng đầu tiên của bạn!</p>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.25rem;">
            ${photos.map((p, idx) => {
              const dayNum = p.journeyDay || (idx + 1);
              return `
                <div class="card" style="padding: 0.6rem; position: relative; overflow: hidden; border: 1px solid var(--border-color); cursor: pointer;" data-zoom-photo-id="${p.id}">
                  <div style="position: relative;">
                    <img src="${p.photoDataUrl || p.url || p.photoUrl}" alt="Progress Photo" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; transition: transform 0.3s ease;">
                    <span class="badge badge-primary" style="position: absolute; top: 8px; left: 8px; font-size: 0.75rem; background: rgba(117, 86, 217, 0.85); color: #fff; backdrop-filter: blur(4px);">
                      Ngày ${dayNum}
                    </span>
                  </div>
                  <div style="padding: 0.6rem 0.25rem 0 0.25rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem;"><i data-lucide="calendar" style="width: 13px; height: 13px; color: var(--text-muted);"></i> ${formatDisplayDate(p.date)}</div>
                      <div style="font-weight: 700; font-size: 0.8rem; color: var(--accent-purple); display: flex; align-items: center; gap: 0.3rem; margin-top: 0.15rem;">${CUSTOM_SCALE_SVG_ICON} ${p.weight ? p.weight + ' kg' : 'Chưa nhập'}</div>
                    </div>
                    <button class="btn btn-secondary btn-icon btn-sm" data-delete-photo="${p.id}" style="width: 28px; height: 28px;" title="Xóa ảnh">
                      <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- 2. COMPARISON RESULT CONTAINER (RENDERED BELOW ALBUM BOX IF ACTIVE) -->
      <div id="pv-comparison-result-mount">
        ${activeComparisonResult ? renderComparisonResultCard(activeComparisonResult, photos) : ''}
      </div>

    </div>

    <!-- POPUP MODAL TẢI ẢNH TIẾN TRÌNH (LEFT: PREVIEW, RIGHT: INFO) -->
    <div class="modal-overlay" id="upload-photo-modal">
      <div class="modal-card" style="max-width: 780px;">
        <div class="card-header">
          <h3><i data-lucide="upload" class="text-purple"></i> Thêm Ảnh Tiến Trình Mới</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-upload-modal"><i data-lucide="x"></i></button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem; align-items: start;">
          <!-- Left Column: Photo Preview -->
          <div style="border: 1px solid var(--border-color); padding: 0.5rem; border-radius: 16px; background: var(--bg-subtle); text-align: center;">
            <img id="upload-preview-img" src="" style="width: 100%; height: 320px; object-fit: cover; border-radius: 12px;">
          </div>

          <!-- Right Column: Photo Details & Real-Time Journey Day Calculation -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="background: var(--accent-purple-light); padding: 0.85rem 1rem; border-radius: 14px; border: 1px solid rgba(117, 86, 217, 0.25);">
              <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--accent-purple); font-weight: 800; letter-spacing: 0.5px;">Tiến Trình Hành Trình</div>
              <div style="font-size: 1.4rem; font-weight: 900; color: var(--accent-purple); margin-top: 0.2rem;" id="upload-journey-day-badge">
                Ngày 1 trong hành trình
              </div>
              <div class="text-xs text-muted" style="margin-top: 0.25rem;" id="upload-journey-day-subtext">
                Tự động tính ngày nối tiếp theo thời gian thực
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Ngày Chụp (Thời gian thực)</label>
              <input type="date" class="form-input" id="input-upload-date" value="${DataService.getTodayString()}">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Cân Nặng Thực Tế (kg)</label>
              <input type="number" step="0.1" class="form-input" id="input-upload-weight" value="${profile.currentWeight || 70}">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Ghi Chú Tiến Trình (Tùy chọn)</label>
              <input type="text" class="form-input" id="input-upload-note" placeholder="Ví dụ: Vòng eo cảm thấy thon gọn hơn...">
            </div>

            <button class="btn btn-primary" style="width: 100%; height: 44px; margin-top: 0.5rem;" id="btn-submit-upload-photo">
              <i data-lucide="check-circle"></i> Xác Nhận Tải Ảnh Tiến Trình
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- POPUP MODAL CHỌN NGÀY SO SÁNH -->
    <div class="modal-overlay" id="compare-photos-modal">
      <div class="modal-card" style="max-width: 620px;">
        <div class="card-header">
          <h3><i data-lucide="columns" class="text-purple"></i> Chọn 2 Ngày So Sánh Tiến Trình</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-compare-modal"><i data-lucide="x"></i></button>
        </div>
        
        <p class="text-sm text-muted" style="margin-bottom: 1.25rem;">
          Mặc định hệ thống đã chọn 2 ngày mới nhất. Bạn có thể chọn 2 ngày bất kỳ trong quá khứ để so sánh vóc dáng.
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Chọn Ảnh 1 (Before / Ban Đầu)</label>
            <div id="pv-modal-dropdown-a-container">
              ${renderDropdown({
                id: 'pv-modal-dropdown-a',
                options: photoDropdownOptions,
                value: modalSelectedIdA,
                placeholder: 'Chọn ngày 1...'
              })}
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Chọn Ảnh 2 (After / Mới Nhất)</label>
            <div id="pv-modal-dropdown-b-container">
              ${renderDropdown({
                id: 'pv-modal-dropdown-b',
                options: photoDropdownOptions,
                value: modalSelectedIdB,
                placeholder: 'Chọn ngày 2...'
              })}
            </div>
          </div>
        </div>

        <button class="btn btn-primary" style="width: 100%; height: 44px;" id="btn-confirm-compare-modal">
          ${renderGeminiIcon({ width: 17, height: 17 })} Xác Nhận & Cho AI Phân Tích
        </button>
      </div>
    </div>

    <!-- LIGHTBOX MODAL PHÓNG TO ẢNH (IMAGE ZOOM LIGHTBOX) -->
    <div class="modal-overlay" id="lightbox-photo-modal">
      <div class="lightbox" id="lightbox-card">
        <!-- Header -->
        <div class="lb-header">
          <div class="lb-title">
            <h2 id="lightbox-title">Ảnh Tiến Trình Ngày 1</h2>
            <span class="day-pill" id="lightbox-journey-badge">Ngày 1</span>
          </div>
          <button class="btn-close" id="btn-close-lightbox-modal" title="Đóng">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Image -->
        <div class="lb-image">
          <img id="lightbox-img" src="" alt="Progress Photo" />
        </div>

        <!-- Meta -->
        <div class="lb-meta" id="lightbox-meta-container">
          <!-- Rendered dynamically -->
        </div>

        <!-- Actions -->
        <div class="lb-actions">
          <button class="btn-action" id="btn-lightbox-compare">
            <i data-lucide="columns" style="width: 14px; height: 14px;"></i>
            So sánh Before / After
          </button>
          <button class="btn-action danger" id="btn-lightbox-delete">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            Xóa ảnh
          </button>
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

    // Teleport popup modals to document.body to break out of parent CSS transform containing block
    ['upload-photo-modal', 'compare-photos-modal', 'lightbox-photo-modal'].forEach(modalId => {
      const el = document.getElementById(modalId);
      if (el && el.parentElement !== document.body) {
        document.body.appendChild(el);
      }
    });

    // Custom dropdown listener in popup modal
    initDropdownListeners(mountNode, (selectedVal, dropdownId) => {
      if (dropdownId === 'pv-modal-dropdown-a') {
        modalSelectedIdA = selectedVal;
      } else if (dropdownId === 'pv-modal-dropdown-b') {
        modalSelectedIdB = selectedVal;
      }
    });

    // 1. UPLOAD PHOTO TRIGGER -> SHOW UPLOAD POPUP MODAL
    const uploadModal = document.getElementById('upload-photo-modal');
    document.getElementById('photo-upload-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        currentUploadingDataUrl = event.target.result;
        
        // Show preview in upload modal
        const previewImg = document.getElementById('upload-preview-img');
        if (previewImg) previewImg.src = currentUploadingDataUrl;

        // Calculate and update journey day in real-time
        updateUploadJourneyDayDisplay(photos, document.getElementById('input-upload-date')?.value || DataService.getTodayString());

        uploadModal.classList.add('active');
      };
      reader.readAsDataURL(file);
    });

    // Update real-time journey day when upload date changes
    document.getElementById('input-upload-date')?.addEventListener('change', (e) => {
      updateUploadJourneyDayDisplay(photos, e.target.value);
    });

    document.getElementById('btn-close-upload-modal')?.addEventListener('click', () => {
      uploadModal.classList.remove('active');
    });

    // Confirm upload submit button
    document.getElementById('btn-submit-upload-photo')?.addEventListener('click', async () => {
      if (!currentUploadingDataUrl) return;

      const dateVal = document.getElementById('input-upload-date')?.value || DataService.getTodayString();
      const weightVal = parseFloat(document.getElementById('input-upload-weight')?.value) || profile.currentWeight;
      const noteVal = document.getElementById('input-upload-note')?.value || '';

      await DataService.addPhoto(currentUploadingDataUrl, weightVal, noteVal);

      uploadModal.classList.remove('active');
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
      renderPhotoVault();
    });

    // 2. LIGHTBOX ZOOM MODAL LISTENERS
    const lightboxModal = document.getElementById('lightbox-photo-modal');
    document.querySelectorAll('[data-zoom-photo-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        // Ignore delete button clicks
        if (e.target.closest('[data-delete-photo]')) return;

        const photoId = card.getAttribute('data-zoom-photo-id');
        const targetPhoto = photos.find(p => p.id === photoId);
        if (targetPhoto) {
          openLightboxModal(targetPhoto, photos);
        }
      });
    });

    document.getElementById('btn-close-lightbox-modal')?.addEventListener('click', () => {
      lightboxModal.classList.remove('active');
    });

    lightboxModal?.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        lightboxModal.classList.remove('active');
      }
    });

    // Lightbox Action 1: Compare Before / After
    document.getElementById('btn-lightbox-compare')?.addEventListener('click', () => {
      lightboxModal.classList.remove('active');
      const compareModal = document.getElementById('compare-photos-modal');
      if (compareModal) compareModal.classList.add('active');
    });

    // Lightbox Action 2: Delete Photo
    document.getElementById('btn-lightbox-delete')?.addEventListener('click', async () => {
      if (!currentLightboxPhoto) return;
      const targetPhoto = currentLightboxPhoto;
      lightboxModal.classList.remove('active');

      const confirmed = await Modal.confirm({
        title: 'Xóa Ảnh Tiến Trình',
        message: `Bạn có chắc chắn muốn xóa Ảnh Tiến Trình Ngày ${targetPhoto.journeyDay || 1} (${formatDisplayDate(targetPhoto.date)})? Hành động này không thể hoàn tác.`,
        type: 'warning',
        confirmText: 'Đồng Ý Xóa',
        cancelText: 'Hủy Bỏ'
      });

      if (confirmed) {
        await DataService.deletePhoto(targetPhoto.id);
        renderPhotoVault();
      }
    });

    // 3. DELETE PHOTO HANDLER with smooth animation
    document.querySelectorAll('[data-delete-photo]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete-photo');
        const confirmed = await Modal.confirm({
          title: 'Xóa Ảnh Tiến Trình',
          message: 'Bạn có chắc chắn muốn xóa bức ảnh tiến trình này không?',
          type: 'warning',
          confirmText: 'Đồng Ý Xóa',
          cancelText: 'Hủy Bỏ'
        });
        if (confirmed) {
          const photoCard = btn.closest('.photo-card');
          if (photoCard) {
            photoCard.classList.add('item-deleting');
            setTimeout(async () => {
              await DataService.deletePhoto(id);
              renderPhotoVault();
            }, 400);
          } else {
            await DataService.deletePhoto(id);
            renderPhotoVault();
          }
        }
      });
    });

    // 4. POPUP COMPARE MODAL HANDLERS
    const compareModal = document.getElementById('compare-photos-modal');
    document.getElementById('btn-open-compare-modal')?.addEventListener('click', async () => {
      if (photos.length < 2) {
        return Modal.warning({
          title: 'Cần Thêm Ảnh Tiến Trình',
          message: 'Bạn cần tải lên ít nhất 2 bức ảnh tiến trình để thực hiện so sánh Before / After!\n\nHãy bấm nút "Upload Ảnh Mới" để đăng bức ảnh thứ 2.'
        });
      }
      compareModal.classList.add('active');
    });

    document.getElementById('btn-close-compare-modal')?.addEventListener('click', () => {
      compareModal.classList.remove('active');
    });

    // Confirm popup comparison & generate AI Markdown assessment
    document.getElementById('btn-confirm-compare-modal')?.addEventListener('click', async () => {
      const pA = photos.find(p => p.id === modalSelectedIdA) || photos[0];
      const pB = photos.find(p => p.id === modalSelectedIdB) || photos[photos.length - 1];

      if (!pA || !pB) return alert("Vui lòng chọn 2 ảnh hợp lệ để so sánh!");

      compareModal.classList.remove('active');

      const btnConfirm = document.getElementById('btn-confirm-compare-modal');
      btnConfirm.disabled = true;

      // Calculate weight diff
      const weightDiff = (pB.weight && pA.weight) ? (pB.weight - pA.weight).toFixed(1) : 0;

      // Ask 9Router AI Coach for rich Markdown analysis
      let aiMarkdownText = "";
      try {
        const promptText = `Hãy đóng vai AI Coach phân tích chi tiết tiến trình thay đổi vóc dáng giữa 2 mốc ảnh:
- Mốc 1 (${pA.date}): Cân nặng ${pA.weight}kg
- Mốc 2 (${pB.date}): Cân nặng ${pB.weight}kg (Chênh lệch: ${weightDiff}kg)

Hãy trình bày nhận xét ngắn gọn, sắc nét bằng định dạng MARKDOWN (sử dụng tiêu đề h4, gạch đầu dòng -, chữ in đậm **, và lời khuyên chuyên sâu cho giai đoạn tiếp theo).`;
        
        const res = await AiCoachService.sendMessage(promptText);
        aiMarkdownText = res?.content || generateFallbackMarkdownAssessment(pA, pB, weightDiff);
      } catch (err) {
        aiMarkdownText = generateFallbackMarkdownAssessment(pA, pB, weightDiff);
      } finally {
        btnConfirm.disabled = false;
      }

      // Overwrite previous active comparison result with new comparison
      activeComparisonResult = {
        photoA: pA,
        photoB: pB,
        weightDiff,
        aiMarkdownText
      };

      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
      renderPhotoVault();

      // Scroll smoothly down to the comparison result
      setTimeout(() => {
        document.getElementById('pv-comparison-result-mount')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // Close/dismiss comparison result card ('X' button)
    document.getElementById('btn-dismiss-comparison-result')?.addEventListener('click', () => {
      activeComparisonResult = null;
      renderPhotoVault();
    });
  }
}

/**
 * Calculates real-time journey day number based on earliest photo date and target date
 */
function calculateJourneyDayNumber(photos, targetDateStr) {
  if (!photos || photos.length === 0) return 1;
  const earliestDateStr = photos[0].date;
  const startDate = new Date(earliestDateStr);
  const targetDate = new Date(targetDateStr);

  const diffTime = targetDate - startDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Updates Journey Day badge text in upload modal
 */
function updateUploadJourneyDayDisplay(photos, selectedDateStr) {
  const badge = document.getElementById('upload-journey-day-badge');
  const subtext = document.getElementById('upload-journey-day-subtext');
  
  if (!badge) return;

  const dayNum = calculateJourneyDayNumber(photos, selectedDateStr);
  badge.innerText = `Ngày ${dayNum} trong hành trình`;

  if (photos && photos.length > 0) {
    const lastPhoto = photos[photos.length - 1];
    const daysDiff = Math.floor((new Date(selectedDateStr) - new Date(lastPhoto.date)) / (1000 * 60 * 60 * 24));
    if (daysDiff > 1) {
      subtext.innerHTML = `<i data-lucide="alert-triangle" style="width: 14px; height: 14px; color: var(--accent-amber); display: inline-block; vertical-align: middle;"></i> Cách ${daysDiff} ngày so với lần chụp trước (${formatDisplayDate(lastPhoto.date)})`;
    } else {
      subtext.innerHTML = `<i data-lucide="check-circle-2" style="width: 14px; height: 14px; color: var(--accent-green); display: inline-block; vertical-align: middle;"></i> Ngày chụp liên tiếp nối tiếp mốc trước (${formatDisplayDate(lastPhoto.date)})`;
    }
  } else {
    subtext.innerHTML = `${renderGeminiIcon({ width: 14, height: 14, color: 'var(--accent-purple)' })} Đây là bức ảnh tiến trình Ngày 1 mở đầu hành trình!`;
  }
  if (window.lucide) window.lucide.createIcons();
}

function openLightboxModal(photo, photos) {
  currentLightboxPhoto = photo;
  const modal = document.getElementById('lightbox-photo-modal');
  const img = document.getElementById('lightbox-img');
  const metaContainer = document.getElementById('lightbox-meta-container');
  const badge = document.getElementById('lightbox-journey-badge');
  const title = document.getElementById('lightbox-title');

  if (!modal || !img) return;

  const dayNum = photo.journeyDay || calculateJourneyDayNumber(photos, photo.date);
  img.src = photo.photoDataUrl || photo.url || photo.photoUrl;
  if (badge) badge.innerText = `Ngày ${dayNum}`;
  if (title) title.innerText = `Ảnh Tiến Trình Ngày ${dayNum}`;

  if (metaContainer) {
    metaContainer.innerHTML = `
      <span class="item">
        <i data-lucide="calendar"></i>
        ${formatDisplayDate(photo.date)}
      </span>
      <span class="sep"></span>
      <span class="item weight">
        ${CUSTOM_SCALE_SVG_ICON}
        ${photo.weight ? photo.weight + ' kg' : 'Chưa nhập'}
      </span>
      ${photo.note ? `
        <span class="sep"></span>
        <span class="item note">
          <i data-lucide="file-text"></i>
          ${photo.note}
        </span>
      ` : ''}
    `;
  }

  modal.classList.add('active');
  if (window.lucide) window.lucide.createIcons();
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function renderComparisonResultCard(result, photos) {
  const { photoA, photoB, weightDiff, aiMarkdownText } = result;
  const dayNumA = calculateJourneyDayNumber(photos, photoA.date);
  const dayNumB = calculateJourneyDayNumber(photos, photoB.date);

  return `
    <div class="card" style="border: 1px solid var(--border-highlight); background: var(--bg-card); position: relative;" id="pv-active-comparison-card">
      <div class="card-header">
        <div>
          <div class="card-title" style="display: flex; align-items: center; gap: 0.6rem;">
            <i data-lucide="columns" class="text-purple"></i> Kết Quả So Sánh Tiến Trình (Ngày ${dayNumA} vs Ngày ${dayNumB})
          </div>
          <span class="badge ${weightDiff <= 0 ? 'badge-primary' : 'badge-secondary'}" style="margin-top: 0.35rem; display: inline-block;">
            ${CUSTOM_SCALE_SVG_ICON} Chênh lệch: ${weightDiff <= 0 ? `${Math.abs(weightDiff)} kg (Giảm)` : `+${weightDiff} kg`}
          </span>
        </div>

        <!-- 'X' Dismiss Button to remove current comparison -->
        <button class="btn btn-secondary btn-icon" id="btn-dismiss-comparison-result" title="Xóa kết quả so sánh này">
          <i data-lucide="x"></i>
        </button>
      </div>

      <!-- Side-by-Side Photo Comparison -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-top: 1rem;">
        <div class="card" style="padding: 0.6rem; border: 1px solid var(--border-color); text-align: center; cursor: pointer;" data-zoom-photo-id="${photoA.id}">
          <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">Mốc 1 (Before — Ngày ${dayNumA})</div>
          <img src="${photoA.photoDataUrl || photoA.url || photoA.photoUrl}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 12px;">
          <div style="margin-top: 0.5rem; font-weight: 800; font-size: 0.95rem; color: var(--accent-purple); display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <span><i data-lucide="calendar" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> ${formatDisplayDate(photoA.date)}</span>
            <span>—</span>
            <span>${CUSTOM_SCALE_SVG_ICON} ${photoA.weight} kg</span>
          </div>
        </div>

        <div class="card" style="padding: 0.6rem; border: 1px solid var(--border-color); text-align: center; cursor: pointer;" data-zoom-photo-id="${photoB.id}">
          <div style="font-weight: 800; font-size: 0.9rem; color: var(--accent-purple); margin-bottom: 0.5rem;">Mốc 2 (After — Ngày ${dayNumB})</div>
          <img src="${photoB.photoDataUrl || photoB.url || photoB.photoUrl}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 12px;">
          <div style="margin-top: 0.5rem; font-weight: 800; font-size: 0.95rem; color: var(--accent-purple); display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <span><i data-lucide="calendar" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> ${formatDisplayDate(photoB.date)}</span>
            <span>—</span>
            <span>${CUSTOM_SCALE_SVG_ICON} ${photoB.weight} kg</span>
          </div>
        </div>
      </div>

      <!-- AI Coach Markdown Assessment Box -->
      <div style="margin-top: 1.25rem; background: var(--bg-subtle); padding: 1.2rem; border-radius: 18px; border: 1px solid var(--border-color);">
        <h4 style="color: var(--accent-purple); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
          ${renderGeminiIcon({ width: 18, height: 18, color: 'var(--accent-purple)' })} Phân Tích & Đánh Giá Chi Tiết AI Coach (Markdown Supported)
        </h4>
        <div style="font-size: 0.925rem; line-height: 1.6; color: var(--text-main);" class="markdown-content">
          ${parseMarkdownToHtml(aiMarkdownText)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Lightweight Markdown-to-HTML parser for AI responses
 */
function parseMarkdownToHtml(markdownText = '') {
  if (!markdownText) return '';
  let html = markdownText
    // Headers
    .replace(/^#### (.*$)/gim, '<h5 style="color: var(--accent-purple); margin: 0.6rem 0 0.3rem 0;">$1</h5>')
    .replace(/^### (.*$)/gim, '<h4 style="color: var(--text-main); font-weight: 800; margin: 0.75rem 0 0.4rem 0;">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 style="color: var(--accent-purple); font-weight: 900; margin: 0.85rem 0 0.5rem 0;">$1</h3>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--accent-purple); font-weight: 800;">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Unordered List Items
    .replace(/^\- (.*$)/gim, '<li style="margin-left: 1.2rem; margin-bottom: 0.3rem;">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br>');

  return html;
}

function generateFallbackMarkdownAssessment(photoA, photoB, weightDiff) {
  if (weightDiff < 0) {
    return `### 🌟 Đánh Giá Biến Đổi Vóc Dáng AI Coach\n\n` +
           `- **Tiến Độ Thâm Hụt:** Giảm thành công **${Math.abs(weightDiff)} kg** từ **${formatDisplayDate(photoA.date)}** (${photoA.weight}kg) đến **${formatDisplayDate(photoB.date)}** (${photoB.weight}kg).\n` +
           `- **Đánh Giá Tỷ Lệ Mỡ:** Tỷ lệ thâm hụt calo chuẩn, khối mỡ vòng bụng được siết gọn rõ rệt.\n` +
           `- **Lời Khuyên:** Tiếp tục nạp đủ Protein để bảo vệ khối cơ bắp săn chắc!`;
  } else if (weightDiff > 0) {
    return `### 💡 Đánh Giá Biến Đổi Vóc Dáng AI Coach\n\n` +
           `- **Tăng Nhẹ Cân Nặng:** Giữa mốc **${formatDisplayDate(photoA.date)}** và **${formatDisplayDate(photoB.date)}**, cân nặng tăng nhẹ **+${weightDiff} kg**.\n` +
           `- **Nguyên Nhân:** Đây có thể là sự tăng khối lượng cơ (Muscle gain) hoặc tích nước sau tập luyện.\n` +
           `- **Lời Khuyên:** Tiếp tục duy trì dinh dưỡng lành mạnh và theo dõi thêm 3-5 ngày tới!`;
  } else {
    return `### 🎯 Đánh Giá Biến Đổi Vóc Dáng AI Coach\n\n` +
           `- **Vóc Dáng Ôn Định:** Giữa 2 mốc **${formatDisplayDate(photoA.date)}** và **${formatDisplayDate(photoB.date)}**, vóc dáng và cân nặng duy trì ổn định ở mức **${photoA.weight} kg**.\n` +
           `- **Lời Khuyên:** Cơ thể đang ở trạng thái cân bằng tốt.`;
  }
}
