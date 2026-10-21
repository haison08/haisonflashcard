/**
 * app.js - Main Application Coordinator & Router with Auth Integration
 */

import { storage } from './services/storage.js';
import { audio } from './services/audio.js';
import { auth } from './services/auth.js';
import { authModal } from './components/authModal.js';
import { cardViewer } from './components/cardViewer.js';
import { quizMode } from './components/quizMode.js';
import { deckManager } from './components/deckManager.js';
import { statsView } from './components/statsView.js';

class App {
  constructor() {
    this.currentTab = 'decks';
    this.cardViewer = cardViewer;
    this.quizMode = quizMode;
    this.deckManager = deckManager;
    this.statsView = statsView;
    this.authModal = authModal;
  }

  init() {
    // Apply saved theme
    this.applyTheme(storage.settings.theme || 'dark');

    // Render User Avatar Chip & Auth controls
    this.renderUserHeader();

    // Update streak header pill
    this.updateStreakHeader();

    // Init components
    const decksContainer = document.getElementById('view-decks');
    const studyContainer = document.getElementById('view-study');
    const quizContainer = document.getElementById('view-quiz');
    const statsContainer = document.getElementById('view-stats');

    if (decksContainer) this.deckManager.init(decksContainer);
    if (studyContainer) this.cardViewer.init(studyContainer);
    if (quizContainer) this.quizMode.init(quizContainer);
    if (statsContainer) this.statsView.init(statsContainer);

    this.bindGlobalEvents();

    // Lắng nghe thay đổi trạng thái đăng nhập
    auth.onAuthStateChanged((user) => {
      this.renderUserHeader();
      this.updateStreakHeader();
      if (user && user.settings && user.settings.theme) {
        this.applyTheme(user.settings.theme);
      }
      this.refreshCurrentView();
    });
  }

  renderUserHeader() {
    const container = document.getElementById('user-header-container');
    if (!container) return;

    const user = auth.getCurrentUser();
    if (user) {
      container.innerHTML = `
        <div class="user-chip" id="btn-user-profile" title="Xem hồ sơ & đổi tài khoản (${this.escapeHtml(user.name)})">
          <div class="user-avatar-circle">${user.avatar || '🧑‍🎓'}</div>
          <span class="user-chip-name">${this.escapeHtml(user.name)}</span>
          <span style="font-size: 0.75rem; color: var(--text-subtle);">▼</span>
        </div>
      `;

      document.getElementById('btn-user-profile')?.addEventListener('click', () => {
        audio.playClick();
        this.authModal.openProfile();
      });
    } else {
      container.innerHTML = `
        <button class="btn btn-outline btn-sm" id="btn-header-login">
          👤 Đăng nhập
        </button>
      `;

      document.getElementById('btn-header-login')?.addEventListener('click', () => {
        audio.playClick();
        this.authModal.open('login');
      });
    }
  }

  onUserLoggedIn(user) {
    this.renderUserHeader();
    this.updateStreakHeader();
    if (user.settings && user.settings.theme) {
      this.applyTheme(user.settings.theme);
    }
    this.refreshCurrentView();
    this.showToast(`Chào mừng ${user.name} quay trở lại!`, 'success');
  }

  onUserLoggedOut() {
    this.renderUserHeader();
    this.updateStreakHeader();
    this.refreshCurrentView();
    this.showToast('Bạn đã đăng xuất tài khoản.', 'info');
    // Mở modal đăng nhập ngay sau khi đăng xuất
    setTimeout(() => {
      this.authModal.open('login');
    }, 400);
  }

  refreshCurrentView() {
    if (this.currentTab === 'decks') {
      this.deckManager.render();
    } else if (this.currentTab === 'stats') {
      this.statsView.render();
    } else if (this.currentTab === 'quiz') {
      this.quizMode.loadCardsForDeck();
      this.quizMode.render();
    } else if (this.currentTab === 'study') {
      const decks = storage.getDecks();
      if (decks.length > 0) {
        this.cardViewer.startSession(decks[0].id);
      }
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    storage.saveSettings({ theme });

    const themeToggleBtn = document.getElementById('btn-theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
      themeToggleBtn.setAttribute('title', theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối');
    }
  }

  updateStreakHeader() {
    const streakPill = document.getElementById('streak-counter-pill');
    if (streakPill) {
      streakPill.innerHTML = `<span class="flame-icon">🔥</span> <span>${storage.streak ? storage.streak.current : 0}</span>`;
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    // Cập nhật trạng thái nút tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Ẩn hiện các view section
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeView = document.getElementById(`view-${tabId}`);
    if (activeView) {
      activeView.classList.add('active');
    }

    // Refresh nội dung theo tab
    if (tabId === 'decks') {
      this.deckManager.render();
    } else if (tabId === 'study') {
      // Nếu chưa có phiên học nào đang chạy, bắt đầu với bộ từ đầu tiên
      if (!this.cardViewer.currentDeck) {
        const decks = storage.getDecks();
        if (decks.length > 0) {
          this.cardViewer.startSession(decks[0].id);
        }
      }
    } else if (tabId === 'quiz') {
      if (!this.quizMode.currentDeckId) {
        this.quizMode.startQuiz();
      } else {
        this.quizMode.render();
      }
    } else if (tabId === 'stats') {
      this.statsView.render();
    }

    this.updateStreakHeader();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    toast.innerHTML = `<span>${icon}</span> <span>${this.escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  openSettingsModal() {
    const modalContainer = document.getElementById('app-settings-modal-wrap');
    if (!modalContainer) return;

    const currentSettings = storage.settings;

    modalContainer.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal-box" style="max-width: 500px;">
          <div class="modal-header">
            <h3 class="modal-title">⚙️ Cài đặt Ứng dụng</h3>
            <button class="modal-close" id="settings-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Giọng phát âm chuẩn (Accent)</label>
              <select class="form-select" id="setting-accent">
                <option value="en-US" ${currentSettings.accent === 'en-US' ? 'selected' : ''}>🇺🇸 English (American - US)</option>
                <option value="en-GB" ${currentSettings.accent === 'en-GB' ? 'selected' : ''}>🇬🇧 English (British - UK)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Tốc độ đọc phát âm</label>
              <select class="form-select" id="setting-speed">
                <option value="0.8" ${currentSettings.speechRate === 0.8 ? 'selected' : ''}>0.8x (Chậm, rõ ràng cho người mới)</option>
                <option value="1.0" ${currentSettings.speechRate === 1.0 ? 'selected' : ''}>1.0x (Tốc độ tự nhiên - Chuẩn)</option>
                <option value="1.2" ${currentSettings.speechRate === 1.2 ? 'selected' : ''}>1.2x (Nhanh, phản xạ cao)</option>
              </select>
            </div>

            <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0;">
              <div>
                <label class="form-label" style="margin: 0;">Tự động phát âm khi lật thẻ</label>
                <div style="font-size: 0.82rem; color: var(--text-muted);">Đọc to từ vựng ngay khi chuyển thẻ</div>
              </div>
              <input type="checkbox" id="setting-autoplay" ${currentSettings.autoPlayAudio ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;" />
            </div>

            <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0;">
              <div>
                <label class="form-label" style="margin: 0;">Hiệu ứng âm thanh (Sound Effects)</label>
                <div style="font-size: 0.82rem; color: var(--text-muted);">Tiếng lật thẻ, âm thanh trả lời đúng/sai</div>
              </div>
              <input type="checkbox" id="setting-sfx" ${currentSettings.soundEffects ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="settings-cancel-btn">Đóng</button>
            <button class="btn btn-primary" id="settings-save-btn">Lưu cài đặt</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => {
      modalContainer.innerHTML = '';
    };

    document.getElementById('settings-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('settings-cancel-btn')?.addEventListener('click', closeModal);

    document.getElementById('settings-save-btn')?.addEventListener('click', () => {
      const accent = document.getElementById('setting-accent').value;
      const speed = parseFloat(document.getElementById('setting-speed').value);
      const autoplay = document.getElementById('setting-autoplay').checked;
      const sfx = document.getElementById('setting-sfx').checked;

      storage.saveSettings({
        accent,
        speechRate: speed,
        autoPlayAudio: autoplay,
        soundEffects: sfx
      });

      audio.playSuccess();
      closeModal();
      this.showToast('Đã lưu cài đặt thành công!', 'success');
    });
  }

  bindGlobalEvents() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        audio.playClick();
        this.switchTab(tab);
      });
    });

    // Theme toggle button
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      audio.playClick();
      this.applyTheme(next);
    });

    // Settings button
    document.getElementById('btn-settings-open')?.addEventListener('click', () => {
      audio.playClick();
      this.openSettingsModal();
    });

    // Streak pill click -> jump to stats
    document.getElementById('streak-counter-pill')?.addEventListener('click', () => {
      audio.playClick();
      this.switchTab('stats');
    });

    // Brand click -> jump to decks
    document.getElementById('brand-logo-btn')?.addEventListener('click', () => {
      audio.playClick();
      this.switchTab('decks');
    });
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

export const app = new App();

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  window.app = app;
  app.init();
});
