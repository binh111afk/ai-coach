import confetti from 'canvas-confetti';
import { DataService } from '../services/dataService.js';
import { AiCoachService } from '../services/aiCoachService.js';
import { renderDropdown, initDropdownListeners } from './ui/Dropdown.js';
import { Modal } from './ui/Modal.js';
import { renderGeminiIcon } from './ui/Icons.js';

let activeComparisonResult = null;
let currentUploadingDataUrl = null;
let currentLightboxPhoto = null;

export async function renderPhotoVault() {
  const profile = await DataService.getUserProfile();
  const goal = await DataService.getUserGoal();
  const photos = await DataService.getPhotos(); // sorted by date ascending

  const currentJourneyDay = DataService.calculateCurrentJourneyDay ? DataService.calculateCurrentJourneyDay(goal.startDate) : (photos.length + 1);

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
    <div class="max-w-6xl mx-auto py-2 fade-up">
      
      <!-- Title Header Banner -->
      <div class="mb-8 fade-up">
        <h1 class="display text-4xl md:text-5xl font-medium leading-[1.05]" style="color: var(--text-main);">
          Kho Ảnh<br><span class="italic" style="color: var(--accent-purple);">Tiến Trình Cơ Thể</span>
        </h1>
        <p class="text-sm text-muted mt-3 max-w-xl flex items-center gap-2" style="color: var(--text-muted);">
          <i data-lucide="camera" class="w-4 h-4" style="color: var(--accent-purple);"></i> 
          Lưu giữ hình ảnh vóc dáng và nhận xét phân tích biến đổi cơ thể từ AI Coach.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-3 mb-8 fade-up" style="animation-delay: 0.14s">
        <button class="btn-ghost px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold" id="btn-open-compare-modal">
          <i data-lucide="images" class="w-4 h-4"></i> So Sánh Before / After
        </button>
        <label class="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold cursor-pointer" id="btn-trigger-upload">
          <i data-lucide="upload" class="w-4 h-4"></i> Upload Ảnh Mới
          <input type="file" id="photo-file-hidden-input" accept="image/*" class="hidden">
        </label>
      </div>

      <!-- Gallery Grid Section -->
      <div class="mb-8 fade-up" style="animation-delay: 0.2s">
        <h2 class="display text-xl font-semibold mb-4" style="color: var(--text-main);">Tất Cả Ảnh Tiến Trình (${photos.length} ảnh)</h2>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          
          ${photos.map((p, idx) => {
            const dayNum = p.journeyDay || (idx + 1);
            return `
              <div class="card card-hover overflow-hidden cursor-pointer fade-up group photo-card p-0" style="animation-delay: ${0.25 + idx * 0.05}s" data-zoom-photo-id="${p.id}">
                <div class="relative aspect-[3/4] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <img src="${p.photoDataUrl || p.url || p.photoUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Progress Day ${dayNum}">
                  
                  <!-- Top Overlay -->
                  <div class="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                    <div class="text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg" style="background: var(--accent-purple);">
                      Ngày ${dayNum}
                    </div>
                    <button class="w-8 h-8 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition shadow-lg z-20 cursor-pointer" data-delete-photo="${p.id}" title="Xóa ảnh">
                      <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                  </div>

                  <!-- Bottom Gradient -->
                  <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

                  <!-- Info -->
                  <div class="absolute bottom-0 left-0 p-4 text-white z-10">
                    <div class="display text-lg font-semibold leading-tight">${formatDisplayDate(p.date)}</div>
                    <div class="flex items-center gap-1.5 text-xs mt-1 opacity-90">
                      <i data-lucide="scale" class="w-3.5 h-3.5"></i> ${p.weight ? p.weight + ' kg' : 'Chưa nhập'}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}

          <!-- Upload Placeholder -->
          <div id="btn-placeholder-upload" class="border-2 border-dashed border-color rounded-2xl flex flex-col items-center justify-center aspect-[3/4] hover:bg-[var(--bg-subtle)] cursor-pointer transition group fade-up" style="border-color: var(--border-color); animation-delay: 0.35s">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition" style="background: rgba(124, 58, 237, 0.12); color: var(--accent-purple);">
              <i data-lucide="plus" class="w-6 h-6"></i>
            </div>
            <span class="text-xs font-semibold text-muted text-center px-4" style="color: var(--text-muted);">Upload ảnh mới</span>
          </div>

        </div>

        <!-- Helper Text -->
        <p class="text-center text-xs text-muted mt-6 flex items-center justify-center gap-1.5" style="color: var(--text-muted);">
          <i data-lucide="mouse-pointer-click" class="w-3.5 h-3.5"></i> Bấm vào ảnh để xem phóng to
        </p>
      </div>

      <!-- ACTIVE COMPARISON RESULT MOUNT -->
      <div id="pv-comparison-result-mount">
        ${activeComparisonResult ? renderComparisonResultCard(activeComparisonResult, photos) : ''}
      </div>

    </div>

    <!-- MODAL PHÓNG TO ẢNH (LIGHTBOX MODAL) -->
    <div id="photoModal" class="fixed inset-0 z-50 hidden items-center justify-center p-4 modal-backdrop">
      <div class="modal-panel relative w-full max-w-2xl" id="photoModalContent">
        <button id="btn-close-photo-modal" class="absolute -top-12 right-0 text-white p-2 hover:bg-white/10 rounded-full transition">
          <i data-lucide="x" class="w-6 h-6"></i>
        </button>
        <img id="enlarged-img" src="" class="w-full h-auto rounded-2xl shadow-2xl object-contain max-h-[80vh]" alt="Progress Enlarged">
        <div class="absolute bottom-4 left-4 text-white drop-shadow-md">
          <div class="display text-2xl font-semibold" id="enlarged-date">11/08/2026</div>
          <div class="text-sm opacity-90 flex items-center gap-2" id="enlarged-weight"><i data-lucide="scale" class="w-4 h-4"></i> 77.0 kg</div>
        </div>
      </div>
    </div>

    <!-- MODAL UPLOAD ẢNH MỚI -->
    <div id="uploadModal" class="fixed inset-0 z-50 hidden items-center justify-center p-4 modal-backdrop">
      <div class="modal-panel bg-card rounded-3xl w-full max-w-md p-6 shadow-2xl" style="background: var(--bg-card);">
        <div class="flex justify-between items-center mb-6">
          <h2 class="display text-2xl font-semibold" style="color: var(--text-main);">Upload Ảnh Tiến Trình Mới</h2>
          <button id="btn-close-upload-modal" class="w-9 h-9 rounded-full hover:bg-[var(--bg-subtle)] flex items-center justify-center transition">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
        
        <label for="photo-file-modal-input" class="border-2 border-dashed border-color rounded-2xl p-8 text-center cursor-pointer hover:bg-[var(--bg-subtle)] transition mb-4 block" style="border-color: var(--border-color);">
          <div class="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style="background: rgba(124, 58, 237, 0.12); color: var(--accent-purple);">
            <i data-lucide="upload-cloud" class="w-7 h-7"></i>
          </div>
          <p class="text-sm font-semibold mb-1" style="color: var(--text-main);" id="upload-file-status-text">Kéo thả hoặc bấm để chọn ảnh</p>
          <p class="text-xs text-muted" style="color: var(--text-muted);">PNG, JPG, WEBP tối đa 5MB</p>
          <input type="file" id="photo-file-modal-input" accept="image/*" class="hidden">
        </label>

        <!-- Preview Img Container -->
        <div id="modal-upload-preview-container" class="hidden mb-4 rounded-xl overflow-hidden border border-color" style="max-height: 180px;">
          <img id="modal-upload-preview-img" src="" class="w-full h-full object-cover">
        </div>

        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-bold text-muted uppercase tracking-wider" style="color: var(--text-muted);">Ngày hành trình</label>
              <input type="number" min="1" max="365" id="input-modal-upload-journey-day" value="${currentJourneyDay}" class="search-input w-full mt-1 px-4 py-2.5 rounded-xl text-sm font-bold text-[var(--primary)]" style="background: var(--bg-input);" title="Mốc ngày trong hành trình">
            </div>
            <div>
              <label class="text-xs font-bold text-muted uppercase tracking-wider" style="color: var(--text-muted);">Ngày chụp</label>
              <input type="date" id="input-modal-upload-date" value="${DataService.getTodayString()}" class="search-input w-full mt-1 px-4 py-2.5 rounded-xl text-sm font-medium" style="background: var(--bg-input); color: var(--text-main);">
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-muted uppercase tracking-wider" style="color: var(--text-muted);">Cân nặng (kg)</label>
            <input type="number" step="0.1" id="input-modal-upload-weight" value="${profile.currentWeight || 70}" class="search-input w-full mt-1 px-4 py-2.5 rounded-xl text-sm font-medium" style="background: var(--bg-input); color: var(--text-main);">
          </div>
          <div>
            <label class="text-xs font-bold text-muted uppercase tracking-wider" style="color: var(--text-muted);">Ghi chú (Tùy chọn)</label>
            <input type="text" id="input-modal-upload-note" placeholder="VD: Vòng eo giảm 1cm..." class="search-input w-full mt-1 px-4 py-2.5 rounded-xl text-sm font-medium" style="background: var(--bg-input); color: var(--text-main);">
          </div>
        </div>

        <button id="btn-submit-modal-upload" class="w-full btn-primary py-3 rounded-xl text-sm font-semibold mt-6 flex items-center justify-center gap-2">
          <i data-lucide="check" class="w-4 h-4"></i> Lưu Ảnh Tiến Trình
        </button>
      </div>
    </div>

    <!-- MODAL CHỌN 2 NGÀY SO SÁNH BEFORE / AFTER -->
    <div id="comparePhotosModal" class="fixed inset-0 z-50 hidden items-center justify-center p-4 modal-backdrop">
      <div class="modal-panel bg-card rounded-3xl w-full max-w-lg p-6 shadow-2xl" style="background: var(--bg-card);">
        <div class="flex justify-between items-center mb-4">
          <h2 class="display text-2xl font-semibold" style="color: var(--text-main);">So Sánh Before / After</h2>
          <button id="btn-close-compare-modal" class="w-9 h-9 rounded-full hover:bg-[var(--bg-subtle)] flex items-center justify-center transition">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
        
        <p class="text-xs text-muted mb-4" style="color: var(--text-muted);">
          Chọn 2 mốc ảnh để AI Coach phân tích chi tiết sự thay đổi vóc dáng và chỉ số cơ thể của bạn.
        </p>

        <div class="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label class="text-xs font-bold text-muted uppercase tracking-wider mb-1 block" style="color: var(--text-muted);">Ảnh 1 (Before)</label>
            <div id="pv-modal-dropdown-a-container">
              ${renderDropdown({
                id: 'pv-modal-dropdown-a',
                options: photoDropdownOptions,
                value: modalSelectedIdA,
                placeholder: 'Chọn mốc 1...'
              })}
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-muted uppercase tracking-wider mb-1 block" style="color: var(--text-muted);">Ảnh 2 (After)</label>
            <div id="pv-modal-dropdown-b-container">
              ${renderDropdown({
                id: 'pv-modal-dropdown-b',
                options: photoDropdownOptions,
                value: modalSelectedIdB,
                placeholder: 'Chọn mốc 2...'
              })}
            </div>
          </div>
        </div>

        <button id="btn-confirm-compare-modal" class="w-full btn-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
          ${renderGeminiIcon({ width: 18, height: 18, color: '#FFFFFF' })} Xác Nhận & Cho AI Phân Tích
        </button>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

    // Teleport popup modals to document.body to break free from parent transform / animation boundaries
    ['photoModal', 'uploadModal', 'comparePhotosModal'].forEach(modalId => {
      const existingInBody = document.body.querySelector(`#${modalId}`);
      const newInMount = mountNode.querySelector(`#${modalId}`);
      if (existingInBody) existingInBody.remove();
      if (newInMount) document.body.appendChild(newInMount);
    });

    // Dropdown listener for compare modal
    initDropdownListeners(mountNode, (selectedVal, dropdownId) => {
      if (dropdownId === 'pv-modal-dropdown-a') {
        modalSelectedIdA = selectedVal;
      } else if (dropdownId === 'pv-modal-dropdown-b') {
        modalSelectedIdB = selectedVal;
      }
    });

    // OPEN LIGHTBOX MODAL ON PHOTO CARD CLICK
    mountNode.querySelectorAll('[data-zoom-photo-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-delete-photo]')) return;

        const photoId = card.getAttribute('data-zoom-photo-id');
        const targetPhoto = photos.find(p => p.id === photoId);
        if (targetPhoto) {
          openPhotoModal(targetPhoto, photos);
        }
      });
    });

    // CLOSE LIGHTBOX MODAL HANDLERS
    const photoModal = document.getElementById('photoModal');
    const closePhotoModal = () => {
      photoModal.classList.add('hidden');
      photoModal.classList.remove('flex');
    };

    document.getElementById('btn-close-photo-modal')?.addEventListener('click', closePhotoModal);
    photoModal?.addEventListener('click', (e) => {
      if (e.target === photoModal) closePhotoModal();
    });

    // DELETE PHOTO HANDLER
    mountNode.querySelectorAll('[data-delete-photo]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const deleteBtn = e.target.closest('[data-delete-photo]');
        const id = deleteBtn ? deleteBtn.getAttribute('data-delete-photo') : btn.getAttribute('data-delete-photo');
        if (!id) return;

        const confirmed = await Modal.confirm({
          title: 'Xóa Ảnh Tiến Trình',
          message: 'Bạn có chắc chắn muốn xóa bức ảnh tiến trình này không?',
          type: 'warning',
          confirmText: 'Đồng Ý Xóa',
          cancelText: 'Hủy Bỏ'
        });

        if (confirmed) {
          if (activeComparisonResult && (activeComparisonResult.photoA?.id === id || activeComparisonResult.photoB?.id === id)) {
            activeComparisonResult = null;
          }
          await DataService.deletePhoto(id);
          renderPhotoVault();
        }
      });
    });

    // UPLOAD MODAL CONTROL HANDLERS
    const uploadModal = document.getElementById('uploadModal');
    const openUploadModal = (resetData = true) => {
      if (resetData) {
        currentUploadingDataUrl = null;
        const modalInput = document.getElementById('photo-file-modal-input');
        const hiddenInput = document.getElementById('photo-file-hidden-input');
        if (modalInput) modalInput.value = '';
        if (hiddenInput) hiddenInput.value = '';

        const previewContainer = document.getElementById('modal-upload-preview-container');
        const previewImg = document.getElementById('modal-upload-preview-img');
        const statusText = document.getElementById('upload-file-status-text');
        const noteInput = document.getElementById('input-modal-upload-note');

        if (previewContainer) previewContainer.classList.add('hidden');
        if (previewImg) previewImg.src = '';
        if (statusText) statusText.innerText = 'Kéo thả hoặc bấm để chọn ảnh';
        if (noteInput) noteInput.value = '';
      }

      uploadModal.classList.remove('hidden');
      uploadModal.classList.add('flex');
    };
    const closeUploadModal = () => {
      uploadModal.classList.add('hidden');
      uploadModal.classList.remove('flex');
    };

    document.getElementById('btn-placeholder-upload')?.addEventListener('click', () => openUploadModal(true));
    document.getElementById('btn-trigger-upload')?.addEventListener('click', (e) => {
      e.preventDefault();
      openUploadModal(true);
    });
    document.getElementById('btn-close-upload-modal')?.addEventListener('click', closeUploadModal);
    uploadModal?.addEventListener('click', (e) => {
      if (e.target === uploadModal) closeUploadModal();
    });

    // FILE INPUT READER HANDLER
    const handleFileSelect = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        currentUploadingDataUrl = event.target.result;
        const previewContainer = document.getElementById('modal-upload-preview-container');
        const previewImg = document.getElementById('modal-upload-preview-img');
        const statusText = document.getElementById('upload-file-status-text');

        if (previewImg) previewImg.src = currentUploadingDataUrl;
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (statusText) statusText.innerText = `Đã chọn: ${file.name}`;
      };
      reader.readAsDataURL(file);
    };

    document.getElementById('photo-file-modal-input')?.addEventListener('change', (e) => {
      handleFileSelect(e.target.files[0]);
    });

    document.getElementById('photo-file-hidden-input')?.addEventListener('change', (e) => {
      openUploadModal(false);
      handleFileSelect(e.target.files[0]);
    });

    // SUBMIT UPLOAD PHOTO WITH OVERWRITE WARNING MODAL
    document.getElementById('btn-submit-modal-upload')?.addEventListener('click', async () => {
      if (!currentUploadingDataUrl) {
        return Modal.warning({
          title: 'Chưa Chọn Ảnh',
          message: 'Vui lòng chọn bức ảnh tiến trình trước khi lưu!'
        });
      }

      const jDayInput = document.getElementById('input-modal-upload-journey-day');
      const journeyDayVal = jDayInput ? (parseInt(jDayInput.value) || currentJourneyDay) : currentJourneyDay;
      const dateVal = document.getElementById('input-modal-upload-date')?.value || DataService.getTodayString();
      const weightVal = parseFloat(document.getElementById('input-modal-upload-weight')?.value) || profile.currentWeight;
      const noteVal = document.getElementById('input-modal-upload-note')?.value || '';

      // Check if a photo for this journey day or date ALREADY exists
      const existingPhoto = photos.find(p => (p.journeyDay && Number(p.journeyDay) === journeyDayVal) || p.date === dateVal);
      if (existingPhoto) {
        const confirmOverwrite = await Modal.confirm({
          title: 'Cảnh Báo Ghi Đè Ảnh Tiến Trình',
          message: `Hệ thống ghi nhận đã có 1 bức ảnh tiến trình cho Ngày ${journeyDayVal} (${existingPhoto.date}).\n\nBạn có chắc chắn muốn GHI ĐÈ bằng bức ảnh mới này không?`,
          type: 'warning',
          confirmText: 'Đồng Ý Ghi Đè',
          cancelText: 'Hủy Bỏ'
        });
        if (!confirmOverwrite) return;
      }

      await DataService.addPhoto(currentUploadingDataUrl, weightVal, noteVal, dateVal, journeyDayVal);
      currentUploadingDataUrl = null;
      closeUploadModal();
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
      renderPhotoVault();
    });

    // COMPARE MODAL CONTROL HANDLERS
    const compareModal = document.getElementById('comparePhotosModal');
    const openCompareModal = () => {
      if (photos.length < 2) {
        return Modal.warning({
          title: 'Cần Thêm Ảnh Tiến Trình',
          message: 'Bạn cần tải lên ít nhất 2 bức ảnh tiến trình để thực hiện so sánh Before / After!\n\nHãy bấm "Upload Ảnh Mới" để thêm bức ảnh thứ 2.'
        });
      }
      compareModal.classList.remove('hidden');
      compareModal.classList.add('flex');
    };
    const closeCompareModal = () => {
      compareModal.classList.add('hidden');
      compareModal.classList.remove('flex');
    };

    document.getElementById('btn-open-compare-modal')?.addEventListener('click', openCompareModal);
    document.getElementById('btn-close-compare-modal')?.addEventListener('click', closeCompareModal);
    compareModal?.addEventListener('click', (e) => {
      if (e.target === compareModal) closeCompareModal();
    });

    // CONFIRM COMPARE & GENERATE AI ASSESSMENT
    document.getElementById('btn-confirm-compare-modal')?.addEventListener('click', async () => {
      const pA = photos.find(p => p.id === modalSelectedIdA) || photos[0];
      const pB = photos.find(p => p.id === modalSelectedIdB) || photos[photos.length - 1];

      if (!pA || !pB) return;

      closeCompareModal();
      const weightDiff = (pB.weight && pA.weight) ? (pB.weight - pA.weight).toFixed(1) : 0;

      let aiMarkdownText = "";
      try {
        const promptText = `Hãy đóng vai AI Coach phân tích chi tiết tiến trình thay đổi vóc dáng giữa 2 mốc ảnh:
- Mốc 1 (${pA.date}): Cân nặng ${pA.weight}kg
- Mốc 2 (${pB.date}): Cân nặng ${pB.weight}kg (Chênh lệch: ${weightDiff}kg)

Hãy trình bày nhận xét ngắn gọn, sắc nét bằng định dạng MARKDOWN.`;
        
        const res = await AiCoachService.sendMessage(promptText);
        aiMarkdownText = res?.content || generateFallbackMarkdownAssessment(pA, pB, weightDiff);
      } catch (err) {
        aiMarkdownText = generateFallbackMarkdownAssessment(pA, pB, weightDiff);
      }

      activeComparisonResult = { photoA: pA, photoB: pB, weightDiff, aiMarkdownText };
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
      renderPhotoVault();

      setTimeout(() => {
        document.getElementById('pv-comparison-result-mount')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // DISMISS COMPARISON RESULT
    document.getElementById('btn-dismiss-comparison-result')?.addEventListener('click', () => {
      activeComparisonResult = null;
      renderPhotoVault();
    });
  }
}

function openPhotoModal(photo, photos) {
  currentLightboxPhoto = photo;
  const modal = document.getElementById('photoModal');
  const img = document.getElementById('enlarged-img');
  const dateEl = document.getElementById('enlarged-date');
  const weightEl = document.getElementById('enlarged-weight');

  if (!modal || !img) return;

  const dayNum = photo.journeyDay || 1;
  img.src = photo.photoDataUrl || photo.url || photo.photoUrl;
  if (dateEl) dateEl.innerText = `Ngày ${dayNum} (${formatDisplayDate(photo.date)})`;
  if (weightEl) weightEl.innerHTML = `<i data-lucide="scale" class="w-4 h-4"></i> ${photo.weight ? photo.weight + ' kg' : 'Chưa nhập'}`;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
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
  const dayNumA = photoA.journeyDay || 1;
  const dayNumB = photoB.journeyDay || 1;

  return `
    <div class="card p-6 mt-6 fade-up" style="border: 1px solid var(--border-color); background: var(--bg-card); position: relative;" id="pv-active-comparison-card">
      <div class="flex justify-between items-start mb-4">
        <div>
          <div class="display text-xl font-semibold flex items-center gap-2" style="color: var(--text-main);">
            <i data-lucide="columns" class="w-5 h-5" style="color: var(--accent-purple);"></i> 
            Kết Quả So Sánh Tiến Trình (Ngày ${dayNumA} vs Ngày ${dayNumB})
          </div>
          <span class="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold text-white" style="background: var(--accent-purple);">
            Chênh lệch: ${weightDiff <= 0 ? `${Math.abs(weightDiff)} kg (Giảm)` : `+${weightDiff} kg`}
          </span>
        </div>

        <button class="btn btn-secondary btn-icon" id="btn-dismiss-comparison-result" title="Xóa kết quả so sánh">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Side-by-Side Photo Comparison -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div class="card p-3 text-center border border-color" style="background: var(--bg-subtle);">
          <div class="font-bold text-xs text-muted mb-2" style="color: var(--text-muted);">Mốc 1 (Before — Ngày ${dayNumA})</div>
          <img src="${photoA.photoDataUrl || photoA.url || photoA.photoUrl}" class="w-full h-64 object-cover rounded-xl">
          <div class="mt-2 text-xs font-bold flex items-center justify-center gap-2" style="color: var(--accent-purple);">
            <span>${formatDisplayDate(photoA.date)}</span> · <span>${photoA.weight} kg</span>
          </div>
        </div>

        <div class="card p-3 text-center border border-color" style="background: var(--bg-subtle);">
          <div class="font-bold text-xs text-muted mb-2" style="color: var(--accent-purple);">Mốc 2 (After — Ngày ${dayNumB})</div>
          <img src="${photoB.photoDataUrl || photoB.url || photoB.photoUrl}" class="w-full h-64 object-cover rounded-xl">
          <div class="mt-2 text-xs font-bold flex items-center justify-center gap-2" style="color: var(--accent-purple);">
            <span>${formatDisplayDate(photoB.date)}</span> · <span>${photoB.weight} kg</span>
          </div>
        </div>
      </div>

      <!-- AI Assessment Box -->
      <div class="mt-5 p-4 rounded-2xl border border-color" style="background: var(--bg-subtle);">
        <h4 class="font-bold text-sm mb-2 flex items-center gap-2" style="color: var(--accent-purple);">
          ${renderGeminiIcon({ width: 18, height: 18, color: 'var(--accent-purple)' })} Phân Tích & Đánh Giá AI Coach
        </h4>
        <div class="text-xs leading-relaxed" style="color: var(--text-main);">
          ${parseMarkdownToHtml(aiMarkdownText)}
        </div>
      </div>
    </div>
  `;
}

function parseMarkdownToHtml(markdownText = '') {
  if (!markdownText) return '';
  return markdownText
    .replace(/^#### (.*$)/gim, '<h5 class="font-bold text-xs mt-2 mb-1" style="color: var(--accent-purple);">$1</h5>')
    .replace(/^### (.*$)/gim, '<h4 class="font-bold text-sm mt-2 mb-1" style="color: var(--text-main);">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--accent-purple); font-weight: 800;">$1</strong>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    .replace(/\n/g, '<br>');
}

function generateFallbackMarkdownAssessment(photoA, photoB, weightDiff) {
  if (weightDiff < 0) {
    return `### 🌟 Đánh Giá Biến Đổi Vóc Dáng AI Coach\n\n` +
           `- **Tiến Độ Thâm Hụt:** Giảm thành công **${Math.abs(weightDiff)} kg** từ **${formatDisplayDate(photoA.date)}** (${photoA.weight}kg) đến **${formatDisplayDate(photoB.date)}** (${photoB.weight}kg).\n` +
           `- **Lời Khuyên:** Tiếp tục duy trì kỷ luật tập luyện và nạp đủ đạm!`;
  } else if (weightDiff > 0) {
    return `### 💡 Đánh Giá Biến Đổi Vóc Dáng AI Coach\n\n` +
           `- **Tăng Nhẹ Cân Nặng:** Giữa mốc **${formatDisplayDate(photoA.date)}** và **${formatDisplayDate(photoB.date)}**, cân nặng tăng **+${weightDiff} kg**.\n` +
           `- **Lời Khuyên:** Đây có thể là sự tăng khối lượng cơ (Muscle gain). Đừng quá lo lắng!`;
  } else {
    return `### 🎯 Đánh Giá Biến Đổi Vóc Dáng AI Coach\n\n` +
           `- **Vóc Dáng Ôn Định:** Giữa 2 mốc **${formatDisplayDate(photoA.date)}** và **${formatDisplayDate(photoB.date)}**, cân nặng ổn định ở mức **${photoA.weight} kg**.\n`;
  }
}
