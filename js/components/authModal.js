/**
 * authModal.js - Giao diện Đăng ký, Đăng nhập và Quản lý hồ sơ người dùng
 */

import { auth } from '../services/auth.js';
import { audio } from '../services/audio.js';

const AVATAR_OPTIONS = ['🧑‍🎓', '👩‍🎓', '👨‍💻', '👩‍💻', '🦁', '🦊', '🐼', '🚀', '💡', '⚡', '🦉', '🌟'];

class AuthModal {
  constructor() {
    this.selectedAvatar = '🧑‍🎓';
  }

  getContainer() {
    let container = document.getElementById('auth-modal-wrap');
    if (!container) {
      container = document.createElement('div');
      container.id = 'auth-modal-wrap';
      document.body.appendChild(container);
    }
    return container;
  }

  // Mở Modal Đăng nhập / Đăng ký
  open(defaultTab = 'login') {
    const container = this.getContainer();
    this.selectedAvatar = '🧑‍🎓';

    container.innerHTML = `
      <div class="modal-overlay active" id="auth-modal-overlay">
        <div class="modal-box" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title">Tài Khoản LinguaFlash</h3>
            <button class="modal-close" id="auth-modal-close">&times;</button>
          </div>

          <div class="modal-body" style="padding-top: 0.75rem;">
            <!-- Tabs Nav -->
            <div class="auth-nav-tabs">
              <button class="auth-nav-tab ${defaultTab === 'login' ? 'active' : ''}" id="tab-btn-login">
                Đăng Nhập
              </button>
              <button class="auth-nav-tab ${defaultTab === 'register' ? 'active' : ''}" id="tab-btn-register">
                Đăng Ký Tài Khoản
              </button>
            </div>

            <!-- Error Banner -->
            <div id="auth-error-banner" style="display: none; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; font-size: 0.88rem; margin-bottom: 1.25rem;"></div>

            <!-- Tab 1: Đăng Nhập Form -->
            <div id="auth-tab-content-login" style="${defaultTab === 'login' ? 'display: block;' : 'display: none;'}">
              <div class="form-group">
                <label class="form-label">Email hoặc Tên đăng nhập</label>
                <input type="text" class="form-input" id="login-email" placeholder="Nhập email hoặc tên của bạn..." autocomplete="username" />
              </div>

              <div class="form-group">
                <label class="form-label">Mật khẩu</label>
                <input type="password" class="form-input" id="login-password" placeholder="Nhập mật khẩu..." autocomplete="current-password" />
              </div>

              <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
                <button class="btn btn-primary btn-lg" id="btn-submit-login" style="width: 100%;">
                  Đăng Nhập
                </button>
                <button class="btn btn-secondary" id="btn-quick-demo-login" style="width: 100%;">
                  🚀 Trải nghiệm nhanh với Tài khoản Demo
                </button>
              </div>

              <div style="text-align: center; margin-top: 1.25rem; font-size: 0.88rem; color: var(--text-muted);">
                Chưa có tài khoản? <a href="#" id="link-switch-to-register" style="color: var(--color-primary); font-weight: 600; text-decoration: none;">Đăng ký ngay</a>
              </div>
            </div>

            <!-- Tab 2: Đăng Ký Form -->
            <div id="auth-tab-content-register" style="${defaultTab === 'register' ? 'display: block;' : 'display: none;'}">
              <div class="form-group">
                <label class="form-label">Họ và tên *</label>
                <input type="text" class="form-input" id="reg-name" placeholder="Ví dụ: Nguyễn Văn A" />
              </div>

              <div class="form-group">
                <label class="form-label">Email *</label>
                <input type="email" class="form-input" id="reg-email" placeholder="name@example.com" />
              </div>

              <div class="form-group">
                <label class="form-label">Mật khẩu (tối thiểu 4 ký tự) *</label>
                <input type="password" class="form-input" id="reg-password" placeholder="Nhập mật khẩu bí mật..." />
              </div>

              <div class="form-group">
                <label class="form-label">Chọn hình đại diện (Avatar)</label>
                <div class="avatar-grid">
                  ${AVATAR_OPTIONS.map(av => `
                    <button class="avatar-item ${av === this.selectedAvatar ? 'selected' : ''}" data-avatar="${av}">
                      ${av}
                    </button>
                  `).join('')}
                </div>
              </div>

              <div style="margin-top: 1.5rem;">
                <button class="btn btn-primary btn-lg" id="btn-submit-register" style="width: 100%;">
                  Tạo Tài Khoản & Bắt Đầu Học
                </button>
              </div>

              <div style="text-align: center; margin-top: 1.25rem; font-size: 0.88rem; color: var(--text-muted);">
                Đã có tài khoản? <a href="#" id="link-switch-to-login" style="color: var(--color-primary); font-weight: 600; text-decoration: none;">Đăng nhập</a>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    this.bindAuthEvents();
  }

  bindAuthEvents() {
    const container = this.getContainer();
    const closeBtn = document.getElementById('auth-modal-close');
    const tabLoginBtn = document.getElementById('tab-btn-login');
    const tabRegBtn = document.getElementById('tab-btn-register');
    const contentLogin = document.getElementById('auth-tab-content-login');
    const contentReg = document.getElementById('auth-tab-content-register');
    const errorBanner = document.getElementById('auth-error-banner');

    const showError = (msg) => {
      if (errorBanner) {
        errorBanner.style.display = 'block';
        errorBanner.textContent = msg;
      }
    };

    const clearError = () => {
      if (errorBanner) {
        errorBanner.style.display = 'none';
        errorBanner.textContent = '';
      }
    };

    const closeModal = () => {
      container.innerHTML = '';
    };

    closeBtn?.addEventListener('click', closeModal);

    // Chuyển tab Đăng nhập
    const switchToLogin = () => {
      clearError();
      tabLoginBtn?.classList.add('active');
      tabRegBtn?.classList.remove('active');
      if (contentLogin) contentLogin.style.display = 'block';
      if (contentReg) contentReg.style.display = 'none';
    };

    // Chuyển tab Đăng ký
    const switchToRegister = () => {
      clearError();
      tabRegBtn?.classList.add('active');
      tabLoginBtn?.classList.remove('active');
      if (contentLogin) contentLogin.style.display = 'none';
      if (contentReg) contentReg.style.display = 'block';
    };

    tabLoginBtn?.addEventListener('click', switchToLogin);
    tabRegBtn?.addEventListener('click', switchToRegister);
    document.getElementById('link-switch-to-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchToRegister();
    });
    document.getElementById('link-switch-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchToLogin();
    });

    // Chọn avatar trong form đăng ký
    container.querySelectorAll('.avatar-item').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.avatar-item').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedAvatar = btn.getAttribute('data-avatar');
      });
    });

    // Xử lý Đăng Nhập
    document.getElementById('btn-submit-login')?.addEventListener('click', async () => {
      clearError();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('btn-submit-login');

      if (!email || !pass) {
        showError('Vui lòng nhập đầy đủ Email/Tên và Mật khẩu!');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang kiểm tra...';
      }

      try {
        const res = await auth.login(email, pass);
        if (res.success) {
          audio.playSuccess();
          closeModal();
          if (window.app) window.app.onUserLoggedIn(res.user);
        } else {
          audio.playWrong();
          showError(res.error);
        }
      } catch (err) {
        showError('Lỗi xác thực: ' + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Đăng Nhập';
        }
      }
    });

    // Enter để đăng nhập
    document.getElementById('login-password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('btn-submit-login')?.click();
      }
    });

    // Đăng nhập nhanh tài khoản Demo
    document.getElementById('btn-quick-demo-login')?.addEventListener('click', async () => {
      const res = await auth.login('demo@linguaflash.com', 'demo');
      if (res.success) {
        audio.playSuccess();
        closeModal();
        if (window.app) window.app.onUserLoggedIn(res.user);
      }
    });


    // Xử lý Đăng Ký
    document.getElementById('btn-submit-register')?.addEventListener('click', () => {
      clearError();
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const pass = document.getElementById('reg-password').value;

      const res = auth.register({
        name,
        email,
        password: pass,
        avatar: this.selectedAvatar
      });

      if (res.success) {
        audio.playSuccess();
        closeModal();
        if (window.app) window.app.onUserLoggedIn(res.user);
      } else {
        audio.playWrong();
        showError(res.error);
      }
    });
  }

  // Mở Profile Modal của người dùng hiện tại
  openProfile() {
    const user = auth.getCurrentUser();
    if (!user) {
      this.open('login');
      return;
    }

    const container = this.getContainer();
    const allUsers = auth.getAllUsersList();

    const createdDate = new Date(user.createdAt || Date.now()).toLocaleDateString('vi-VN');
    const totalDecks = (user.decks || []).length;
    const totalCards = (user.decks || []).reduce((acc, d) => acc + (d.cards ? d.cards.length : 0), 0);

    container.innerHTML = `
      <div class="modal-overlay active" id="profile-modal-overlay">
        <div class="modal-box" style="max-width: 520px;">
          <div class="modal-header">
            <h3 class="modal-title">Hồ Sơ Học Viên</h3>
            <button class="modal-close" id="profile-modal-close">&times;</button>
          </div>

          <div class="modal-body">
            <!-- User Header Card -->
            <div style="display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem; background: var(--bg-surface-elevated); border-radius: var(--radius-lg); margin-bottom: 1.5rem;">
              <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--grad-primary); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; box-shadow: 0 4px 15px var(--color-primary-glow);">
                ${user.avatar || '🧑‍🎓'}
              </div>
              <div style="flex: 1; overflow: hidden;">
                <h4 style="font-family: var(--font-heading); font-size: 1.3rem; margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${this.escapeHtml(user.name)}
                </h4>
                <div style="font-size: 0.88rem; color: var(--text-muted);">${this.escapeHtml(user.email)}</div>
                <div style="font-size: 0.78rem; color: var(--text-subtle); margin-top: 0.2rem;">Tham gia ngày: ${createdDate}</div>
              </div>
            </div>

            <!-- User Quick Stats Grid -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; text-align: center;">
              <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-md);">
                <div style="font-size: 1.4rem; font-weight: 800; color: #f59e0b;">🔥 ${user.streak ? user.streak.current : 0}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Streak ngày</div>
              </div>
              <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-md);">
                <div style="font-size: 1.4rem; font-weight: 800; color: var(--color-primary);">${totalDecks}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Bộ từ</div>
              </div>
              <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-md);">
                <div style="font-size: 1.4rem; font-weight: 800; color: #10b981;">${totalCards}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Từ vựng</div>
              </div>
            </div>

            <!-- Switch Account Section -->
            <div style="margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <label class="form-label" style="margin: 0; font-size: 0.9rem;">Chuyển đổi tài khoản khác:</label>
                <button class="btn btn-ghost btn-sm" id="btn-open-another-account" style="color: var(--color-primary); padding: 2px 6px;">
                  + Thêm tài khoản
                </button>
              </div>

              <div class="accounts-list">
                ${allUsers.map(u => `
                  <div class="account-item-card ${u.id === user.id ? 'current' : ''}">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <div style="font-size: 1.4rem;">${u.avatar}</div>
                      <div>
                        <div style="font-weight: 700; font-size: 0.92rem;">${this.escapeHtml(u.name)} ${u.id === user.id ? '<span style="font-size: 0.75rem; color: #10b981; margin-left: 4px;">(Đang dùng)</span>' : ''}</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">${this.escapeHtml(u.email)} • 🔥 ${u.streak} ngày</div>
                      </div>
                    </div>
                    ${u.id !== user.id ? `
                      <button class="btn btn-secondary btn-sm" data-switch-user-id="${u.id}">
                        Chuyển
                      </button>
                    ` : `
                      <span style="font-size: 1.2rem; color: #10b981;">✓</span>
                    `}
                  </div>
                `).join('')}
              </div>
            </div>

          </div>

          <div class="modal-footer" style="justify-content: space-between;">
            <button class="btn btn-danger btn-sm" id="btn-user-logout">
              🚪 Đăng xuất
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-close-profile">
              Đóng
            </button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => {
      container.innerHTML = '';
    };

    document.getElementById('profile-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('btn-close-profile')?.addEventListener('click', closeModal);

    // Đăng xuất
    document.getElementById('btn-user-logout')?.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn đăng xuất không? Dữ liệu của bạn đã được lưu an toàn.')) {
        auth.logout();
        closeModal();
        audio.playClick();
        if (window.app) window.app.onUserLoggedOut();
      }
    });

    // Thêm / Đổi tài khoản khác
    document.getElementById('btn-open-another-account')?.addEventListener('click', () => {
      this.open('register');
    });

    // Chuyển sang tài khoản khác
    container.querySelectorAll('[data-switch-user-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetUserId = btn.getAttribute('data-switch-user-id');
        const targetUser = auth.users[targetUserId];
        if (targetUser) {
          auth.currentUser = targetUser;
          localStorage.setItem('linguaflash_current_session', targetUserId);
          auth.notifyAuthChange();
          audio.playSuccess();
          closeModal();
          if (window.app) window.app.onUserLoggedIn(targetUser);
        }
      });
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

export const authModal = new AuthModal();
