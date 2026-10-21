/**
 * authModal.js - Giao diện Đăng ký (kèm VietQR 20k), Đăng nhập và Quản lý hồ sơ người dùng
 */

import { auth } from '../services/auth.js';
import { audio } from '../services/audio.js';
import { payment } from '../services/payment.js';

const AVATAR_OPTIONS = ['🧑‍🎓', '👩‍🎓', '👨‍💻', '👩‍💻', '🦁', '🦊', '🐼', '🚀', '💡', '⚡', '🦉', '🌟'];

class AuthModal {
  constructor() {
    this.selectedAvatar = '🧑‍🎓';
    this.pollInterval = null;
    this.countdownTimer = null;
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
    this.clearTimers();
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

              <div style="margin-top: 1.5rem;">
                <button class="btn btn-primary btn-lg" id="btn-submit-login" style="width: 100%;">
                  Đăng Nhập
                </button>
              </div>

              <div style="text-align: center; margin-top: 1.25rem; font-size: 0.88rem; color: var(--text-muted);">
                Chưa có tài khoản? <a href="#" id="link-switch-to-register" style="color: var(--color-primary); font-weight: 600; text-decoration: none;">Đăng ký kích hoạt ngay</a>
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

              <!-- Pay to register banner -->
              <div style="background: rgba(99, 102, 241, 0.1); border: 1px dashed var(--color-primary); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.6rem;">💳</span>
                <div>
                  Phí kích hoạt tài khoản vĩnh viễn: <strong style="color: #10b981; font-size: 0.95rem;">20.000 VNĐ</strong><br />
                  <span style="font-size: 0.78rem;">Quét mã VietQR tự động, tài khoản kích hoạt sau 1-3 giây.</span>
                </div>
              </div>

              <div style="margin-top: 1.25rem;">
                <button class="btn btn-primary btn-lg" id="btn-submit-register" style="width: 100%;">
                  Tiếp Tục Quét Mã VietQR (20.000đ) ⚡
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
      this.clearTimers();
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

    // Xử lý Đăng Ký -> Chuyển sang Quét mã VietQR 20.000đ
    document.getElementById('btn-submit-register')?.addEventListener('click', async () => {
      clearError();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const pass = document.getElementById('reg-password').value;
      const regBtn = document.getElementById('btn-submit-register');

      if (!name) {
        showError('Vui lòng nhập họ và tên của bạn!');
        return;
      }
      if (!email || !email.includes('@')) {
        showError('Email không hợp lệ!');
        return;
      }
      if (!pass || pass.length < 4) {
        showError('Mật khẩu phải có tối thiểu 4 ký tự!');
        return;
      }

      // Kiểm tra trùng lặp email
      const isExisted = Object.values(auth.users).some(u => u.email.toLowerCase() === email.toLowerCase());
      if (isExisted) {
        showError('Email này đã được đăng ký tài khoản! Vui lòng chọn email khác hoặc Đăng nhập.');
        return;
      }

      if (regBtn) {
        regBtn.disabled = true;
        regBtn.textContent = 'Đang khởi tạo mã VietQR...';
      }

      try {
        const order = await payment.createRegistrationOrder({
          name,
          email,
          password: pass,
          avatar: this.selectedAvatar
        });

        // Mở pop-up thanh toán VietQR
        this.openVietQRPaymentModal(order);
      } catch (e) {
        showError('Lỗi khởi tạo đơn: ' + e.message);
        if (regBtn) {
          regBtn.disabled = false;
          regBtn.textContent = 'Tiếp Tục Quét Mã VietQR (20.000đ) ⚡';
        }
      }
    });
  }

  /**
   * Màn hình Modal Quét mã VietQR 20.000 VNĐ
   */
  openVietQRPaymentModal(order) {
    this.clearTimers();
    const container = this.getContainer();
    const qrUrl = payment.getVietQRUrl(order);

    container.innerHTML = `
      <div class="modal-overlay active" id="vietqr-modal-overlay">
        <div class="modal-box" style="max-width: 520px; text-align: center;">
          <div class="modal-header" style="justify-content: center; position: relative;">
            <h3 class="modal-title" style="display: flex; align-items: center; gap: 0.5rem;">
              <span>💳</span> Kích Hoạt Tài Khoản (20.000đ)
            </h3>
            <button class="modal-close" id="btn-payment-close" style="position: absolute; right: 1rem;">&times;</button>
          </div>

          <div class="modal-body" style="padding-top: 0.5rem;" id="payment-modal-body">
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1rem;">
              Mở app ngân hàng bất kỳ (MB, Vietcombank, Techcombank, MoMo,...) quét mã để thanh toán tự động:
            </p>

            <!-- QR Code Card -->
            <div class="vietqr-box">
              <img src="${qrUrl}" alt="VietQR Payment 20.000 VND" class="vietqr-img" id="vietqr-image-el" />
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 6px; font-weight: 600;">
                Quét mã qua ứng dụng ngân hàng hoặc MoMo
              </div>
            </div>

            <!-- Payment Details Table with 1-click Copy -->
            <div class="payment-detail-card" style="text-align: left;">
              <div class="payment-row">
                <span class="payment-row-label">Ngân hàng:</span>
                <span class="payment-row-val">${order.bankId}</span>
              </div>
              <div class="payment-row">
                <span class="payment-row-label">Số tài khoản:</span>
                <span class="payment-row-val">
                  <span>${order.accountNo}</span>
                  <button class="copy-badge" data-copy="${order.accountNo}">Sao chép</button>
                </span>
              </div>
              <div class="payment-row">
                <span class="payment-row-label">Chủ tài khoản:</span>
                <span class="payment-row-val">${order.accountName}</span>
              </div>
              <div class="payment-row">
                <span class="payment-row-label">Số tiền:</span>
                <span class="payment-row-val" style="color: #10b981; font-size: 1.05rem;">
                  <span>20.000 VNĐ</span>
                  <button class="copy-badge" data-copy="20000">Sao chép</button>
                </span>
              </div>
              <div class="payment-row" style="background: rgba(245, 158, 11, 0.1); padding: 6px 10px; border-radius: var(--radius-sm); border: 1px dashed #f59e0b;">
                <span class="payment-row-label" style="color: #f59e0b; font-weight: 700;">Nội dung CK (bắt buộc):</span>
                <span class="payment-row-val" style="color: #f59e0b; font-size: 1.1rem; font-family: var(--font-mono);">
                  <span>${order.orderId}</span>
                  <button class="copy-badge" data-copy="${order.orderId}" style="background: #f59e0b; color: #ffffff; border-color: #f59e0b;">Sao chép mã</button>
                </span>
              </div>
            </div>

            <!-- Listening Radar Status & Countdown Timer -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin: 0.75rem 0; font-size: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; color: #10b981;">
                <span class="pulsing-radar-dot"></span>
                <span id="payment-status-text">Đang chờ xác nhận chuyển khoản (1-3s)...</span>
              </div>
              <div style="color: var(--text-muted);" id="payment-countdown-text">
                Hết hạn: <strong style="color: var(--text-main);" id="timer-val">10:00</strong>
              </div>
            </div>

            <!-- Actions -->
            <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-top: 1rem;">
              <button class="btn btn-primary" id="btn-instant-verify" style="width: 100%; padding: 0.85rem 1rem; font-size: 1rem; font-weight: 700; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <span>⚡</span> Tôi Đã Chuyển Tiền (Xác Nhận Tức Thì 1s)
              </button>

              <!-- In-Modal Visual Status Feedback Banner (Báo rõ ràng Thành công / Thất bại) -->
              <div id="payment-feedback-banner" class="payment-feedback-banner" style="display: none;"></div>

              <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.4; text-align: center;">
                💡 Sau khi chuyển tiền trên app Techcombank (hoặc quét QR), hãy bấm nút xanh phía trên để tài khoản kích hoạt ngay lập tức!
              </div>
              <button class="btn btn-outline btn-sm" id="btn-manual-check-payment" style="width: 100%; margin-top: 0.25rem;">
                🔄 Kiểm tra tín hiệu Webhook tự động
              </button>
              <button class="btn btn-ghost btn-sm" id="btn-back-to-edit" style="color: var(--text-muted);">
                ← Quay lại sửa thông tin đăng ký
              </button>
            </div>

          </div>
        </div>
      </div>
    `;

    this.bindPaymentModalEvents(order);
  }

  bindPaymentModalEvents(order) {
    const container = this.getContainer();

    const closeModal = () => {
      this.clearTimers();
      container.innerHTML = '';
    };

    document.getElementById('btn-payment-close')?.addEventListener('click', closeModal);

    // Quay lại form đăng ký
    document.getElementById('btn-back-to-edit')?.addEventListener('click', () => {
      this.clearTimers();
      this.open('register');
    });

    // Helper hiển thị thông báo trạng thái trực quan trong modal (không dùng alert)
    const showFeedback = (type, message) => {
      const banner = document.getElementById('payment-feedback-banner');
      if (!banner) return;

      banner.style.display = 'flex';
      banner.className = `payment-feedback-banner feedback-${type}`;

      let icon = 'ℹ️';
      if (type === 'processing') icon = '⏳';
      if (type === 'success') icon = '✅';
      if (type === 'error') {
        icon = '❌';
        audio.playWrong();
      }
      if (type === 'warning') icon = '⚠️';

      banner.innerHTML = `
        <div style="font-size: 1.2rem; line-height: 1;">${icon}</div>
        <div style="flex: 1;">${message}</div>
      `;
    };

    // Xử lý nút Copy nhanh
    container.querySelectorAll('.copy-badge').forEach(btn => {
      btn.addEventListener('click', () => {
        const textToCopy = btn.getAttribute('data-copy');
        if (textToCopy) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = btn.textContent;
            btn.textContent = '✓ Đã chép!';
            btn.style.color = '#10b981';
            audio.playClick();
            setTimeout(() => {
              btn.textContent = originalText;
              btn.style.color = '';
            }, 1500);
          });
        }
      });
    });

    // Countdown Timer 10 phút
    let timeLeft = 10 * 60;
    const timerValEl = document.getElementById('timer-val');
    this.countdownTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        this.clearTimers();
        if (timerValEl) timerValEl.textContent = '00:00 (Hết hạn)';
        const statusText = document.getElementById('payment-status-text');
        if (statusText) statusText.textContent = 'Đơn hàng đã hết hạn. Vui lòng tạo đơn mới.';
        showFeedback('error', 'Đơn hàng đã quá hạn 10 phút. Bạn vui lòng quay lại tạo đơn mới nhé!');
      } else {
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        if (timerValEl) timerValEl.textContent = `${m}:${s}`;
      }
    }, 1000);

    // Hàm xử lý kích hoạt tài khoản khi thanh toán thành công
    const handleSuccess = async (res) => {
      this.clearTimers();
      audio.playVictoryFanfare();
      if (window.cardViewer && window.cardViewer.fireConfetti) {
        window.cardViewer.fireConfetti();
      }

      const bodyEl = document.getElementById('payment-modal-body');
      if (bodyEl) {
        bodyEl.innerHTML = `
          <div style="padding: 2.5rem 1rem; text-align: center;">
            <div style="font-size: 4rem; animation: bounce 0.6s ease infinite alternate;">🎉</div>
            <h2 style="color: #10b981; font-size: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem;">
              Thanh Toán Thành Công!
            </h2>
            <p style="color: var(--text-muted); font-size: 1rem; margin-bottom: 1.75rem;">
              Hệ thống đã nhận <strong>20.000 VNĐ</strong> với mã <strong>${order.orderId}</strong>.<br />
              Tài khoản <strong>${this.escapeHtml(order.userData.name)}</strong> đã được kích hoạt vĩnh viễn trên toàn hệ thống!
            </p>
            <button class="btn btn-primary btn-lg" id="btn-start-studying-now" style="min-width: 200px;">
              🚀 Bắt Đầu Học Ngay
            </button>
          </div>
        `;

        document.getElementById('btn-start-studying-now')?.addEventListener('click', () => {
          closeModal();
          if (window.app) window.app.onUserLoggedIn(res.user);
        });
      }
    };

    // Kiểm tra tín hiệu Webhook tự động
    document.getElementById('btn-manual-check-payment')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-manual-check-payment');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Đang kiểm tra từ máy chủ...';
      }

      showFeedback('processing', 'Đang kết nối kiểm tra tín hiệu Webhook tự động từ ngân hàng...');

      try {
        const check = await payment.checkOrderStatus(order.orderId);
        if (check.status === 'PAID') {
          showFeedback('success', 'Đã nhận được biến động số dư 20.000đ! Đang kích hoạt tài khoản...');
          const activateRes = await payment.confirmPaymentAndActivateAccount(order);
          if (activateRes.success) {
            setTimeout(() => {
              handleSuccess(activateRes);
            }, 600);
            return;
          }
        }
        showFeedback('warning', 'Hệ thống chưa nhận được tín hiệu Webhook tự động từ ngân hàng. Nếu bạn đã chuyển tiền trên App Techcombank rồi, hãy bấm nút màu xanh "⚡ Tôi Đã Chuyển Tiền (Xác Nhận Tức Thì 1s)" ở trên để kích hoạt ngay nhé!');
      } catch (err) {
        console.error('Lỗi kiểm tra:', err);
        showFeedback('error', 'Lỗi kiểm tra: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🔄 Kiểm tra tín hiệu Webhook tự động';
        }
      }
    });

    // Nút xác nhận tức thì 1 giây (Siêu tốc)
    document.getElementById('btn-instant-verify')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-instant-verify');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Đang kích hoạt tài khoản...';
      }

      showFeedback('processing', 'Đang xác minh giao dịch 20.000đ và kích hoạt tài khoản cho bạn...');

      try {
        const res = await payment.instantActivate(order.orderId);
        if (res.success) {
          showFeedback('success', 'Xác nhận nạp tiền thành công! Đang mở khóa học tập...');
          setTimeout(() => {
            handleSuccess(res);
          }, 600);
          return;
        } else {
          showFeedback('error', `Chưa thể kích hoạt: ${res.error}. Vui lòng thử lại sau giây lát!`);
        }
      } catch (err) {
        console.error('Lỗi khi bấm kích hoạt:', err);
        showFeedback('error', `Có lỗi xảy ra: ${err.message}. Vui lòng thử lại!`);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>⚡</span> Tôi Đã Chuyển Tiền (Xác Nhận Tức Thì 1s)';
        }
      }
    });

    // Polling tự động mỗi 1.2 giây (Siêu nhạy với biến động Webhook)
    this.pollInterval = setInterval(async () => {
      const check = await payment.checkOrderStatus(order.orderId);
      if (check.status === 'PAID') {
        const activateRes = await payment.confirmPaymentAndActivateAccount(order);
        if (activateRes.success) {
          handleSuccess(activateRes);
        }
      }
    }, 1200);
  }

  clearTimers() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
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
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <h4 style="margin: 0; font-size: 1.25rem; font-weight: 700;">${this.escapeHtml(user.name)}</h4>
                  <span style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Đã kích hoạt</span>
                </div>
                <div style="font-size: 0.88rem; color: var(--text-muted); margin-top: 2px;">${this.escapeHtml(user.email)}</div>
                <div style="font-size: 0.78rem; color: var(--text-subtle); margin-top: 4px;">Tham gia từ: ${createdDate}</div>
              </div>
            </div>

            <!-- Stats Mini Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem;">
              <div style="background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-align: center;">
                <div style="font-size: 1.4rem; font-weight: 800; color: #f59e0b;">🔥 ${user.streak ? user.streak.current : 0}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Ngày Streak</div>
              </div>
              <div style="background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-align: center;">
                <div style="font-size: 1.4rem; font-weight: 800; color: #6366f1;">📚 ${totalDecks}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Bộ Từ Vựng</div>
              </div>
              <div style="background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-align: center;">
                <div style="font-size: 1.4rem; font-weight: 800; color: #10b981;">🗂️ ${totalCards}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Thẻ Ghi Nhớ</div>
              </div>
            </div>

            <!-- Account Switcher Section -->
            <div style="border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <div style="font-weight: 700; font-size: 0.95rem;">Tài Khoản Trên Thiết Bị Này</div>
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
                        <div style="font-size: 0.78rem; color: var(--text-muted);">${this.escapeHtml(u.email)} • 🔥 ${u.streak ? u.streak.current : 0} ngày</div>
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
        const success = auth.switchUser(targetUserId);
        if (success) {
          audio.playSuccess();
          closeModal();
          if (window.app) window.app.onUserLoggedIn(auth.currentUser);
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
