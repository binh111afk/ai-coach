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
  const photos = await DataService.getPhotos(true); // sorted by date ascending (bypass cache)

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
        <button class="px-5 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-sm transition hover:shadow-md cursor-pointer" id="btn-open-compare-modal" style="background: var(--bg-card); border: 1.5px solid rgba(124, 58, 237, 0.2); color: var(--text-main);">
          <i data-lucide="git-compare-arrows" class="w-4 h-4 text-[var(--accent-purple)]"></i> So Sánh Before / After
        </button>
        <label class="btn-primary px-5 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-bold cursor-pointer shadow-sm hover:shadow-md transition" id="btn-trigger-upload">
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
      <div class="modal-panel relative w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl" id="photoModalContent">
        <button id="btn-close-photo-modal" class="absolute top-4 right-4 text-white p-2 bg-black/50 hover:bg-black/80 rounded-full transition z-30 cursor-pointer">
          <i data-lucide="x" class="w-6 h-6"></i>
        </button>
        <img id="enlarged-img" src="" class="w-full h-auto object-contain max-h-[80vh]" alt="Progress Enlarged">
        <!-- Dark gradient backdrop so text is always 100% readable even over bright photos -->
        <div class="absolute inset-x-0 bottom-0 p-6 pt-16 text-white pointer-events-none" style="background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.5) 65%, transparent 100%);">
          <div class="display text-2xl font-semibold drop-shadow-md" id="enlarged-date">11/08/2026</div>
          <div class="text-sm opacity-90 flex items-center gap-2 mt-0.5 drop-shadow-md" id="enlarged-weight"><i data-lucide="scale" class="w-4 h-4"></i> 77.0 kg</div>
          <div class="text-xs opacity-95 mt-1.5 font-medium text-white leading-relaxed drop-shadow-md" id="enlarged-note"></div>
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

    <!-- ==================== 1. POPUP BEFORE / AFTER ==================== -->
    <div id="comparePopup" class="compare-popup-overlay">
      <div class="compare-popup-container">
        <div class="popup-bg-glow"></div>

        <button id="btn-close-compare-popup" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-muted hover:bg-gray-200 transition z-20 cursor-pointer">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="relative text-center mb-6">
          <div class="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] items-center justify-center text-white shadow-lg mb-3">
            <i data-lucide="git-compare-arrows" class="w-6 h-6"></i>
          </div>
          <h2 class="display text-2xl font-semibold" style="color: var(--text-main);">So Sánh Before / After</h2>
          <p class="text-xs text-muted mt-1.5 max-w-xs mx-auto" style="color: var(--text-muted);">Chọn 2 mốc ảnh từ kho để AI Coach phân tích chi tiết sự thay đổi vóc dáng của bạn.</p>
        </div>

        <!-- Selection Slots -->
        <div class="relative grid grid-cols-2 gap-4 mb-6">
          
          <!-- Slot Before -->
          <div class="flex flex-col gap-2">
            <span class="text-[10px] font-bold text-muted uppercase tracking-wider px-1" style="color: var(--text-muted);">Ảnh 1 (Before)</span>
            <div id="slot-before" class="img-slot cursor-pointer">
              <div id="placeholder-before" class="flex flex-col items-center p-2 text-center">
                <i data-lucide="image-plus" class="w-8 h-8 mb-2"></i>
                <span class="text-[10px] font-bold uppercase tracking-wider">Chọn từ kho ảnh</span>
              </div>
            </div>
          </div>

          <!-- Arrow Connector -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[var(--bg-card)] rounded-full shadow-md flex items-center justify-center z-10 border border-purple-200">
            <i data-lucide="arrow-right" class="w-5 h-5 text-[var(--accent-purple)]"></i>
          </div>

          <!-- Slot After -->
          <div class="flex flex-col gap-2">
            <span class="text-[10px] font-bold text-muted uppercase tracking-wider px-1 text-right ml-auto" style="color: var(--text-muted);">Ảnh 2 (After)</span>
            <div id="slot-after" class="img-slot cursor-pointer">
              <div id="placeholder-after" class="flex flex-col items-center p-2 text-center">
                <i data-lucide="image-plus" class="w-8 h-8 mb-2"></i>
                <span class="text-[10px] font-bold uppercase tracking-wider">Chọn từ kho ảnh</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Action Button -->
        <button id="analyzeBtn" class="btn-analyze w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-base cursor-pointer" disabled>
          <i data-lucide="sparkles" class="w-5 h-5"></i>
          <span id="btnText">Vui lòng chọn 2 ảnh</span>
        </button>

      </div>
    </div>

    <!-- ==================== 2. GALLERY PICKER (BOTTOM SHEET) ==================== -->
    <div id="galleryOverlay" class="gallery-sheet-overlay">
      <div id="gallerySheet" class="gallery-sheet">
        <div class="p-5 border-b border-color flex justify-between items-center" style="border-color: var(--border-color);">
          <div>
            <h3 class="display text-xl font-semibold" style="color: var(--text-main);">Kho Ảnh Của Bạn</h3>
            <p class="text-xs text-muted" style="color: var(--text-muted);">Đang chọn cho: <span id="galleryTargetLabel" class="font-bold text-[var(--accent-purple)]">...</span></p>
          </div>
          <button id="btn-close-gallery-sheet" class="w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-muted hover:bg-gray-200 transition cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="p-5 overflow-y-auto max-h-[65vh]">
          <div id="galleryGrid" class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            <!-- Gallery items rendered dynamically -->
          </div>
        </div>
      </div>
    </div>
  `;

  const mountNode = document.getElementById('view-mount');
  if (mountNode) {
    mountNode.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

    // Teleport popup modals to document.body to break free from parent transform / animation boundaries
    ['photoModal', 'uploadModal', 'comparePopup', 'galleryOverlay'].forEach(modalId => {
      const existingInBody = document.body.querySelector(`#${modalId}`);
      const newInMount = mountNode.querySelector(`#${modalId}`);
      if (existingInBody) existingInBody.remove();
      if (newInMount) document.body.appendChild(newInMount);
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

      // Check if a photo for this journey day ALREADY exists
      const existingPhoto = photos.find(p => p.journeyDay && Number(p.journeyDay) === journeyDayVal);
      if (existingPhoto) {
        const confirmOverwrite = await Modal.confirm({
          title: 'Cảnh Báo Ghi Đè Ảnh Tiến Trình',
          message: `Hệ thống ghi nhận Ngày ${journeyDayVal} đã có sẵn 1 bức ảnh tiến trình (${existingPhoto.date}).\n\nBạn có chắc chắn muốn GHI ĐÈ bằng bức ảnh mới này không?`,
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

    // ==================== COMPARE POPUP LOGIC & GALLERY SHEET ====================
    let currentSelectTarget = null;
    let selectedBefore = null;
    let selectedAfter = null;

    const updateSlotDisplay = (target, imgData) => {
      const slot = document.getElementById(`slot-${target}`);
      if (!slot) return;
      if (imgData) {
        const dayNum = imgData.journeyDay || 1;
        slot.classList.add('has-image');
        slot.innerHTML = `
          <img src="${imgData.photoDataUrl || imgData.url || imgData.photoUrl}" class="slot-img-display" alt="Selected">
          <div class="slot-info">Ngày ${dayNum} (${formatDisplayDate(imgData.date)}) ${imgData.weight ? '· ' + imgData.weight + 'kg' : ''}</div>
        `;
      } else {
        slot.classList.remove('has-image');
        slot.innerHTML = `
          <div id="placeholder-${target}" class="flex flex-col items-center p-2 text-center">
            <i data-lucide="image-plus" class="w-8 h-8 mb-2"></i>
            <span class="text-[10px] font-bold uppercase tracking-wider">Chọn từ kho ảnh</span>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      }
    };

    const checkAnalyzeButton = () => {
      const btn = document.getElementById('analyzeBtn');
      const btnText = document.getElementById('btnText');
      if (!btn) return;
      if (selectedBefore && selectedAfter) {
        btn.disabled = false;
        if (btnText) btnText.textContent = 'Xác Nhận & Cho AI Phân Tích';
      } else {
        btn.disabled = true;
        if (btnText) btnText.textContent = 'Vui lòng chọn 2 ảnh';
      }
    };

    const openComparePopup = () => {
      if (photos.length < 2) {
        return Modal.warning({
          title: 'Cần Thêm Ảnh Tiến Trình',
          message: 'Bạn cần tải lên ít nhất 2 bức ảnh tiến trình để thực hiện so sánh Before / After!\n\nHãy bấm "Upload Ảnh Mới" để thêm bức ảnh thứ 2.'
        });
      }
      selectedBefore = null;
      selectedAfter = null;
      const popup = document.getElementById('comparePopup');
      if (popup) popup.classList.add('active');
      updateSlotDisplay('before', null);
      updateSlotDisplay('after', null);
      checkAnalyzeButton();
    };

    const closeComparePopup = () => {
      const popup = document.getElementById('comparePopup');
      if (popup) popup.classList.remove('active');
    };

    document.getElementById('btn-open-compare-modal')?.addEventListener('click', openComparePopup);
    document.getElementById('btn-close-compare-popup')?.addEventListener('click', closeComparePopup);
    document.getElementById('comparePopup')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('comparePopup')) closeComparePopup();
    });

    document.getElementById('slot-before')?.addEventListener('click', () => openGallery('before'));
    document.getElementById('slot-after')?.addEventListener('click', () => openGallery('after'));

    // GALLERY PICKER (BOTTOM SHEET)
    const openGallery = (target) => {
      currentSelectTarget = target;
      const targetLabel = document.getElementById('galleryTargetLabel');
      if (targetLabel) targetLabel.textContent = target === 'before' ? 'Ảnh 1 (Before)' : 'Ảnh 2 (After)';

      const grid = document.getElementById('galleryGrid');
      if (grid) {
        grid.innerHTML = '';
        photos.forEach((p, idx) => {
          const dayNum = p.journeyDay || (idx + 1);
          const isSelected = (target === 'before' && selectedBefore?.id === p.id) ||
                             (target === 'after' && selectedAfter?.id === p.id);
          const itemDiv = document.createElement('div');
          itemDiv.className = `gallery-item ${isSelected ? 'selected' : ''}`;
          itemDiv.innerHTML = `
            <img src="${p.photoDataUrl || p.url || p.photoUrl}" alt="Photo Day ${dayNum}">
            <div class="gallery-check"><i data-lucide="check" class="w-3.5 h-3.5"></i></div>
            <div class="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] py-1 text-center font-bold">
              Ngày ${dayNum} · ${p.weight ? p.weight + 'kg' : formatDisplayDate(p.date)}
            </div>
          `;
          itemDiv.addEventListener('click', () => {
            if (target === 'before') selectedBefore = p;
            else selectedAfter = p;
            updateSlotDisplay(target, p);
            closeGallery();
            checkAnalyzeButton();
          });
          grid.appendChild(itemDiv);
        });
        if (window.lucide) window.lucide.createIcons();
      }

      const galleryOverlay = document.getElementById('galleryOverlay');
      if (galleryOverlay) galleryOverlay.classList.add('active');
    };

    const closeGallery = () => {
      const galleryOverlay = document.getElementById('galleryOverlay');
      if (galleryOverlay) galleryOverlay.classList.remove('active');
    };

    document.getElementById('btn-close-gallery-sheet')?.addEventListener('click', closeGallery);
    document.getElementById('galleryOverlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('galleryOverlay')) closeGallery();
    });

    // CONFIRM COMPARE & GENERATE AI ASSESSMENT
    document.getElementById('analyzeBtn')?.addEventListener('click', async () => {
      if (!selectedBefore || !selectedAfter) return;

      const btn = document.getElementById('analyzeBtn');
      btn.classList.add('loading');
      btn.innerHTML = `<div class="spinner-loader"></div> <span>AI Coach đang phân tích vóc dáng...</span>`;

      const weightDiff = (selectedAfter.weight && selectedBefore.weight) ? (selectedAfter.weight - selectedBefore.weight).toFixed(1) : 0;
      let aiMarkdownText = "";

      try {
        const promptText = `Hãy đóng vai AI Coach phân tích chi tiết tiến trình thay đổi vóc dáng giữa 2 mốc ảnh:
- Mốc 1 (Ngày ${selectedBefore.journeyDay || 1} - ${selectedBefore.date}): Cân nặng ${selectedBefore.weight}kg
- Mốc 2 (Ngày ${selectedAfter.journeyDay || 1} - ${selectedAfter.date}): Cân nặng ${selectedAfter.weight}kg (Chênh lệch: ${weightDiff}kg)

Hãy trình bày nhận xét ngắn gọn, sắc nét bằng định dạng MARKDOWN.`;

        const res = await AiCoachService.sendMessage(promptText);
        aiMarkdownText = res?.content || generateFallbackMarkdownAssessment(selectedBefore, selectedAfter, weightDiff);
      } catch (err) {
        aiMarkdownText = generateFallbackMarkdownAssessment(selectedBefore, selectedAfter, weightDiff);
      }

      activeComparisonResult = { photoA: selectedBefore, photoB: selectedAfter, weightDiff, aiMarkdownText };

      btn.classList.remove('loading');
      btn.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5"></i> <span>Phân tích hoàn tất!</span>`;
      if (window.lucide) window.lucide.createIcons();

      setTimeout(() => {
        closeComparePopup();
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
        renderPhotoVault();

        setTimeout(() => {
          const resEl = document.getElementById('pv-comparison-result-mount');
          if (resEl) resEl.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }, 800);
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
  const noteEl = document.getElementById('enlarged-note');

  if (!modal || !img) return;

  const dayNum = photo.journeyDay || 1;
  img.src = photo.photoDataUrl || photo.url || photo.photoUrl;
  if (dateEl) dateEl.innerText = `Ngày ${dayNum} (${formatDisplayDate(photo.date)})`;
  if (weightEl) weightEl.innerHTML = `<i data-lucide="scale" class="w-4 h-4 inline"></i> ${photo.weight ? photo.weight + ' kg' : 'Chưa nhập'}`;
  
  if (noteEl) {
    if (photo.note && photo.note.trim()) {
      noteEl.innerText = `📝 Ghi chú: ${photo.note.trim()}`;
      noteEl.style.display = 'block';
    } else {
      noteEl.innerText = '';
      noteEl.style.display = 'none';
    }
  }

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
