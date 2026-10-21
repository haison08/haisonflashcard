/**
 * deckManager.js - Quản lý danh sách bộ từ, thêm/sửa/xoá thẻ, xuất nhập CSV & tìm kiếm
 */

import { storage } from '../services/storage.js';
import { srs } from '../services/srs.js';
import { audio } from '../services/audio.js';

class DeckManager {
  constructor() {
    this.container = null;
    this.searchTerm = '';
    this.activeDeckForCards = null;
  }

  init(containerEl) {
    this.container = containerEl;
    this.render();
  }

  render() {
    if (!this.container) return;

    const allDecks = storage.getDecks();
    const filteredDecks = allDecks.filter(d => 
      d.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      d.description.toLowerCase().includes(this.searchTerm.toLowerCase())
    );

    this.container.innerHTML = `
      <div class="deck-manager-view">
        <!-- Section Header -->
        <div class="section-header">
          <div>
            <h2 class="section-title">Thư viện Bộ từ vựng</h2>
            <p class="section-subtitle">Lựa chọn bộ từ vựng để bắt đầu học hoặc tự tạo bộ từ theo phong cách của bạn</p>
          </div>

          <div class="controls-bar">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input type="text" id="deck-search-input" placeholder="Tìm bộ từ..." value="${this.escapeHtml(this.searchTerm)}" />
            </div>
            <button class="btn btn-primary" id="btn-create-deck">
              + Tạo bộ từ mới
            </button>
          </div>
        </div>

        <!-- Decks Grid -->
        ${filteredDecks.length === 0 ? `
          <div style="text-align: center; padding: 4rem 1rem; background: var(--bg-surface); border-radius: var(--radius-xl); border: 1px solid var(--border-color);">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">📂</div>
            <h3>Không tìm thấy bộ từ nào!</h3>
            <p style="color: var(--text-muted); margin-top: 0.25rem;">Hãy thử tìm từ khoá khác hoặc bấm "+ Tạo bộ từ mới".</p>
          </div>
        ` : `
          <div class="deck-grid">
            ${filteredDecks.map(deck => {
              const dueCards = srs.getDueCards(deck.cards);
              return `
                <div class="deck-card" style="--deck-color: ${deck.color || '#6366f1'};">
                  <div class="deck-header-row">
                    <div class="deck-icon-wrapper" style="--deck-bg: ${deck.color ? deck.color + '22' : 'rgba(99,102,241,0.15)'};">
                      ${deck.icon || '📚'}
                    </div>
                    <div style="display: flex; gap: 4px;">
                      <button class="deck-menu-btn" data-action="export-csv" data-id="${deck.id}" title="Xuất CSV">
                        📥
                      </button>
                      <button class="deck-menu-btn" data-action="manage-cards" data-id="${deck.id}" title="Quản lý từ vựng">
                        ⚙️
                      </button>
                      <button class="deck-menu-btn" data-action="delete-deck" data-id="${deck.id}" title="Xóa bộ từ">
                        🗑️
                      </button>
                    </div>
                  </div>

                  <h3 class="deck-title">${this.escapeHtml(deck.name)}</h3>
                  <p class="deck-desc">${this.escapeHtml(deck.description)}</p>

                  <div class="deck-stats-row">
                    <span><strong>${deck.cards.length}</strong> từ vựng</span>
                    ${dueCards.length > 0 ? `
                      <span class="deck-due-pill">⏰ ${dueCards.length} từ cần ôn</span>
                    ` : `
                      <span style="color: #10b981; font-size: 0.82rem;">✓ Đã hoàn thành</span>
                    `}
                  </div>

                  <div class="deck-actions-row">
                    <button class="btn btn-primary" data-action="study-deck" data-id="${deck.id}">
                      🚀 Học ngay
                    </button>
                    <button class="btn btn-secondary" data-action="quiz-deck" data-id="${deck.id}">
                      🎯 Luyện tập
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Modal Container -->
      <div id="deck-modal-container"></div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('deck-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.render();
      });
    }

    // Nút tạo bộ từ mới
    document.getElementById('btn-create-deck')?.addEventListener('click', () => {
      this.openCreateDeckModal();
    });

    // Các nút hành động trên deck card
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const deckId = btn.getAttribute('data-id');

        if (action === 'study-deck') {
          if (window.app && window.app.switchTab) {
            window.app.switchTab('study');
            window.app.cardViewer.startSession(deckId);
          }
        } else if (action === 'quiz-deck') {
          if (window.app && window.app.switchTab) {
            window.app.switchTab('quiz');
            window.app.quizMode.startQuiz(deckId);
          }
        } else if (action === 'manage-cards') {
          this.openManageCardsModal(deckId);
        } else if (action === 'export-csv') {
          this.exportCSV(deckId);
        } else if (action === 'delete-deck') {
          this.deleteDeck(deckId);
        }
      });
    });
  }

  // ===== MODAL: TẠO BỘ TỪ MỚI =====
  openCreateDeckModal() {
    const modalContainer = document.getElementById('deck-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay active" id="create-deck-modal">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Tạo Bộ Từ Vựng Mới</h3>
            <button class="modal-close" id="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Tên bộ từ *</label>
              <input type="text" class="form-input" id="new-deck-name" placeholder="Ví dụ: Phrasal Verbs thông dụng, Từ vựng C1..." required />
            </div>

            <div class="form-group">
              <label class="form-label">Mô tả ngắn</label>
              <textarea class="form-textarea" id="new-deck-desc" placeholder="Ghi chú mục đích hoặc nội dung của bộ từ này..."></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Biểu tượng (Emoji)</label>
                <input type="text" class="form-input" id="new-deck-icon" value="📚" style="font-size: 1.25rem; text-align: center;" />
              </div>
              <div class="form-group">
                <label class="form-label">Màu sắc chủ đề</label>
                <input type="color" class="form-input" id="new-deck-color" value="#6366f1" style="height: 46px; padding: 4px;" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel-btn">Hủy bỏ</button>
            <button class="btn btn-primary" id="modal-save-deck-btn">Tạo bộ từ</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => {
      modalContainer.innerHTML = '';
    };

    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);

    document.getElementById('modal-save-deck-btn')?.addEventListener('click', () => {
      const name = document.getElementById('new-deck-name').value.trim();
      const desc = document.getElementById('new-deck-desc').value.trim();
      const icon = document.getElementById('new-deck-icon').value.trim() || '📚';
      const color = document.getElementById('new-deck-color').value || '#6366f1';

      if (!name) {
        alert('Vui lòng nhập tên bộ từ!');
        return;
      }

      const created = storage.createDeck({ name, description: desc, icon, color });
      audio.playSuccess();
      closeModal();
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast(`Đã tạo bộ từ "${name}" thành công!`, 'success');
      }
    });
  }

  // ===== MODAL: QUẢN LÝ TỪ TRONG BỘ & THÊM TỪ MỚI =====
  openManageCardsModal(deckId) {
    const deck = storage.getDeckById(deckId);
    if (!deck) return;

    this.activeDeckForCards = deck;
    const modalContainer = document.getElementById('deck-modal-container');
    if (!modalContainer) return;

    const renderCardListInner = () => {
      return `
        <div class="modal-overlay active" id="manage-cards-modal">
          <div class="modal-box" style="max-width: 760px;">
            <div class="modal-header">
              <div>
                <h3 class="modal-title">${deck.icon || '📚'} ${this.escapeHtml(deck.name)}</h3>
                <div style="font-size: 0.85rem; color: var(--text-muted);">${deck.cards.length} từ vựng</div>
              </div>
              <button class="modal-close" id="modal-close-btn">&times;</button>
            </div>

            <div class="modal-body" style="padding-top: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" id="btn-open-add-card">
                  + Thêm từ vựng mới
                </button>
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-outline btn-sm" id="btn-import-csv-modal">
                    📤 Nhập CSV
                  </button>
                  <button class="btn btn-secondary btn-sm" id="btn-export-csv-modal">
                    📥 Xuất CSV
                  </button>
                </div>
              </div>

              <!-- Cards List Table/Items -->
              <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                ${deck.cards.length === 0 ? `
                  <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    Chưa có từ vựng nào trong bộ này. Nhấn "+ Thêm từ vựng mới" để thêm nhé!
                  </div>
                ` : `
                  <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                    <thead>
                      <tr style="background: var(--bg-surface-elevated); border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                        <th style="padding: 0.65rem 1rem;">Từ vựng</th>
                        <th style="padding: 0.65rem 1rem;">Phiên âm / Loại</th>
                        <th style="padding: 0.65rem 1rem;">Nghĩa tiếng Việt</th>
                        <th style="padding: 0.65rem 1rem; text-align: center;">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${deck.cards.map(c => `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                          <td style="padding: 0.65rem 1rem; font-weight: 700; color: var(--text-main);">
                            ${this.escapeHtml(c.word)}
                          </td>
                          <td style="padding: 0.65rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
                            ${c.ipa ? `<span style="font-family: var(--font-mono); color: var(--color-primary);">${this.escapeHtml(c.ipa)}</span>` : ''}
                            <span class="badge badge-pos" style="margin-left: 4px;">${c.partOfSpeech || 'n'}</span>
                          </td>
                          <td style="padding: 0.65rem 1rem; color: var(--text-main);">
                            ${this.escapeHtml(c.meaning)}
                          </td>
                          <td style="padding: 0.65rem 1rem; text-align: center;">
                            <button class="btn-icon btn-sm" data-card-action="listen" data-word="${this.escapeHtml(c.word)}" title="Nghe đọc" style="width: 30px; height: 30px;">
                              🔊
                            </button>
                            <button class="btn-icon btn-sm" data-card-action="delete" data-card-id="${c.id}" title="Xoá" style="width: 30px; height: 30px; color: #ef4444;">
                              ✕
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                `}
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" id="modal-done-btn">Đóng</button>
            </div>
          </div>
        </div>
      `;
    };

    modalContainer.innerHTML = renderCardListInner();

    const closeModal = () => {
      modalContainer.innerHTML = '';
      this.render();
    };

    const bindInnerEvents = () => {
      document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
      document.getElementById('modal-done-btn')?.addEventListener('click', closeModal);

      // Thêm từ mới
      document.getElementById('btn-open-add-card')?.addEventListener('click', () => {
        this.openAddCardForm(deckId);
      });

      // Xuất / Nhập CSV
      document.getElementById('btn-export-csv-modal')?.addEventListener('click', () => {
        this.exportCSV(deckId);
      });

      document.getElementById('btn-import-csv-modal')?.addEventListener('click', () => {
        this.openImportCSVModal(deckId);
      });

      // Hành động trên từng thẻ
      modalContainer.querySelectorAll('[data-card-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-card-action');
          if (action === 'listen') {
            const word = btn.getAttribute('data-word');
            audio.speak(word);
          } else if (action === 'delete') {
            const cardId = btn.getAttribute('data-card-id');
            if (confirm('Bạn có chắc chắn muốn xoá từ vựng này không?')) {
              storage.deleteCard(deckId, cardId);
              modalContainer.innerHTML = renderCardListInner();
              bindInnerEvents();
            }
          }
        });
      });
    };

    bindInnerEvents();
  }

  // Form thêm từ vựng mới
  openAddCardForm(deckId) {
    const modalContainer = document.getElementById('deck-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">+ Thêm Từ Vựng Mới</h3>
            <button class="modal-close" id="add-card-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Từ tiếng Anh *</label>
                <input type="text" class="form-input" id="card-input-word" placeholder="Ví dụ: Serendipity" required />
              </div>
              <div class="form-group">
                <label class="form-label">Phiên âm IPA</label>
                <input type="text" class="form-input" id="card-input-ipa" placeholder="/ˌser.ənˈdɪp.ə.t̬i/" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Từ loại</label>
                <select class="form-select" id="card-input-pos">
                  <option value="noun">noun (danh từ)</option>
                  <option value="verb">verb (động từ)</option>
                  <option value="adjective">adjective (tính từ)</option>
                  <option value="adverb">adverb (trạng từ)</option>
                  <option value="idiom">idiom / phrase (thành ngữ)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Cấp độ</label>
                <select class="form-select" id="card-input-level">
                  <option value="A2">A2 (Cơ bản)</option>
                  <option value="B1" selected>B1 (Trung cấp)</option>
                  <option value="B2">B2 (Khá)</option>
                  <option value="C1">C1 (Nâng cao)</option>
                  <option value="C2">C2 (Bản ngữ)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Nghĩa tiếng Việt *</label>
              <input type="text" class="form-input" id="card-input-meaning" placeholder="Sự tình cờ may mắn, duyên may kỳ ngộ" required />
            </div>

            <div class="form-group">
              <label class="form-label">Định nghĩa tiếng Anh</label>
              <input type="text" class="form-input" id="card-input-definition" placeholder="The occurrence of events by chance in a happy or beneficial way" />
            </div>

            <div class="form-group">
              <label class="form-label">Câu ví dụ tiếng Anh</label>
              <input type="text" class="form-input" id="card-input-example" placeholder="Meeting my best friend in Paris was pure serendipity." />
            </div>

            <div class="form-group">
              <label class="form-label">Dịch nghĩa câu ví dụ</label>
              <input type="text" class="form-input" id="card-input-example-vi" placeholder="Gặp lại người bạn thân nhất ở Paris là một sự tình cờ may mắn tuyệt vời." />
            </div>

            <div class="form-group">
              <label class="form-label">Từ đồng nghĩa (phân cách bởi dấu phẩy)</label>
              <input type="text" class="form-input" id="card-input-synonyms" placeholder="chance, luck, fluke" />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" id="add-card-cancel">Quay lại danh sách</button>
            <button class="btn btn-primary" id="add-card-submit">Lưu từ vựng</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('add-card-close')?.addEventListener('click', () => this.openManageCardsModal(deckId));
    document.getElementById('add-card-cancel')?.addEventListener('click', () => this.openManageCardsModal(deckId));

    document.getElementById('add-card-submit')?.addEventListener('click', () => {
      const word = document.getElementById('card-input-word').value.trim();
      const ipa = document.getElementById('card-input-ipa').value.trim();
      const partOfSpeech = document.getElementById('card-input-pos').value;
      const level = document.getElementById('card-input-level').value;
      const meaning = document.getElementById('card-input-meaning').value.trim();
      const definition = document.getElementById('card-input-definition').value.trim();
      const example = document.getElementById('card-input-example').value.trim();
      const exampleTranslation = document.getElementById('card-input-example-vi').value.trim();
      const synonyms = document.getElementById('card-input-synonyms').value.trim();

      if (!word || !meaning) {
        alert('Vui lòng nhập Từ tiếng Anh và Nghĩa tiếng Việt!');
        return;
      }

      storage.addCard(deckId, {
        word, ipa, partOfSpeech, level, meaning, definition, example, exampleTranslation, synonyms
      });

      audio.playSuccess();
      this.openManageCardsModal(deckId);
      if (window.app && window.app.showToast) {
        window.app.showToast(`Đã thêm từ "${word}" vào bộ từ!`, 'success');
      }
    });
  }

  // Modal Nhập CSV
  openImportCSVModal(deckId) {
    const modalContainer = document.getElementById('deck-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Nhập danh sách từ từ CSV</h3>
            <button class="modal-close" id="csv-close">&times;</button>
          </div>
          <div class="modal-body">
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1rem;">
              Dán nội dung file CSV của bạn vào ô dưới hoặc chọn file CSV từ máy tính.<br />
              Định dạng tiêu chuẩn: <code>Word,IPA,PartOfSpeech,Meaning,Definition,Example</code>
            </p>

            <div class="form-group">
              <input type="file" id="csv-file-input" accept=".csv,text/csv" class="form-input" style="padding: 0.5rem;" />
            </div>

            <div class="form-group">
              <label class="form-label">Hoặc dán nội dung CSV trực tiếp:</label>
              <textarea class="form-textarea" id="csv-text-input" style="min-height: 120px;" placeholder="Word,IPA,PartOfSpeech,Meaning&#10;Resilient,/rɪˈzɪl.jənt/,adjective,Kiên cường&#10;Pragmatic,/præɡˈmæt.ɪk/,adjective,Thực tế"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="csv-cancel">Hủy</button>
            <button class="btn btn-primary" id="csv-submit">Nhập dữ liệu</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('csv-close')?.addEventListener('click', () => this.openManageCardsModal(deckId));
    document.getElementById('csv-cancel')?.addEventListener('click', () => this.openManageCardsModal(deckId));

    const fileInput = document.getElementById('csv-file-input');
    const textInput = document.getElementById('csv-text-input');

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          textInput.value = event.target.result;
        };
        reader.readAsText(file);
      }
    });

    document.getElementById('csv-submit')?.addEventListener('click', () => {
      const content = textInput.value.trim();
      if (!content) {
        alert('Vui lòng chọn file CSV hoặc dán nội dung CSV!');
        return;
      }

      const result = storage.importCSVToDeck(deckId, content);
      if (result.success) {
        audio.playSuccess();
        alert(`Đã nhập thành công ${result.count} thẻ từ mới!`);
        this.openManageCardsModal(deckId);
      } else {
        alert('Lỗi nhập CSV: ' + result.error);
      }
    });
  }

  exportCSV(deckId) {
    const csvData = storage.exportDeckToCSV(deckId);
    if (!csvData) {
      alert('Không có dữ liệu để xuất!');
      return;
    }

    const deck = storage.getDeckById(deckId);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck ? deck.name.replace(/[^a-zA-Z0-9]/g, '_') : 'deck'}_flashcards.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  deleteDeck(deckId) {
    const deck = storage.getDeckById(deckId);
    if (!deck) return;

    if (confirm(`Bạn có chắc chắn muốn xóa bộ từ "${deck.name}" và toàn bộ ${deck.cards.length} thẻ từ bên trong không?`)) {
      storage.deleteDeck(deckId);
      audio.playWrong();
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast(`Đã xoá bộ từ "${deck.name}".`, 'info');
      }
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const deckManager = new DeckManager();
