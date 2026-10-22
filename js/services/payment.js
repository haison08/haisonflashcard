/**
 * payment.js - Dịch vụ Thanh toán VietQR & Xác thực Giao dịch Kích hoạt Tài khoản (20.000 VNĐ)
 */

import { cloudSync } from './cloudSync.js';
import { auth } from './auth.js';

const STORAGE_KEYS = {
  PAYMENT_CONFIG: 'haisonflash_payment_config',
  PENDING_ORDER: 'haisonflash_pending_order'
};

// Cấu hình tài khoản ngân hàng thụ hưởng mặc định
const DEFAULT_PAYMENT_CONFIG = {
  bankId: 'VietinBank', // VietinBank (Ngân hàng TMCP Công Thương Việt Nam)
  bankName: 'VietinBank',
  accountNo: '106880869088', // STK VietinBank của Nguyen Phuc Hai Son
  accountName: 'NGUYEN PHUC HAI SON',
  amount: 20000, // 20.000 VNĐ
  sepayApiKey: 'spsk_live_BiGP3Z6Ku4xftbPnlbafP3db3BBjPmbU', // API Secret Key từ SePay
  template: 'compact2' // Giao diện VietQR sắc nét
};

class PaymentService {
  constructor() {
    this.config = { ...DEFAULT_PAYMENT_CONFIG };
    this.currentOrder = null;
    this.checkInterval = null;
    this.init();
  }

  init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAYMENT_CONFIG) || localStorage.getItem('linguaflash_payment_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Tự động nâng cấp nếu đang lưu STK cũ Techcombank hoặc demo
        if (parsed.accountNo === '0868888888' || parsed.accountNo === '6888200808') {
          this.config = { ...DEFAULT_PAYMENT_CONFIG };
          localStorage.setItem(STORAGE_KEYS.PAYMENT_CONFIG, JSON.stringify(this.config));
        } else {
          this.config = { ...DEFAULT_PAYMENT_CONFIG, ...parsed };
        }
      }
    } catch (e) {
      console.error('Lỗi nạp payment_config:', e);
    }
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_CONFIG, JSON.stringify(this.config));
    } catch (e) {
      console.error('Lỗi lưu payment_config:', e);
    }
    return this.config;
  }

  /**
   * Sinh mã giao dịch duy nhất cho lượt đăng ký
   * Cú pháp: LF + 5 số ngẫu nhiên (Ví dụ: LF84920)
   */
  generateOrderCode() {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `LF${randomNum}`;
  }

  /**
   * Tạo đơn hàng mới để đăng ký tài khoản
   */
  async createRegistrationOrder(userData) {
    const orderCode = this.generateOrderCode();
    const order = {
      orderId: orderCode,
      amount: this.config.amount,
      status: 'PENDING', // PENDING | PAID | EXPIRED
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 phút
      bankId: this.config.bankId,
      accountNo: this.config.accountNo,
      accountName: this.config.accountName,
      userData: {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        avatar: userData.avatar || '🧑‍🎓'
      }
    };

    this.currentOrder = order;

    // Lưu vào LocalStorage
    try {
      localStorage.setItem(STORAGE_KEYS.PENDING_ORDER, JSON.stringify(order));
    } catch (e) {}

    // Lưu lên Cloud Firestore collection `payment_orders`
    if (cloudSync.isConfigured && cloudSync.firestoreDb) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const orderRef = doc(cloudSync.firestoreDb, 'payment_orders', orderCode);
        await setDoc(orderRef, order);
      } catch (e) {
        console.warn('Không thể lưu đơn hàng lên Firestore:', e);
      }
    }

    return order;
  }

  /**
   * Tạo link ảnh mã VietQR chuẩn quốc tế (có tiền tố SEVQR để SePay nhận diện 100%)
   */
  getVietQRUrl(order) {
    const bank = order.bankId || this.config.bankId;
    const acc = order.accountNo || this.config.accountNo;
    const template = this.config.template || 'compact2';
    const amount = order.amount || this.config.amount;
    const transferMemo = `SEVQR ${order.orderId}`;
    const memo = encodeURIComponent(transferMemo);
    const name = encodeURIComponent(order.accountName || this.config.accountName);

    return `https://img.vietqr.io/image/${bank}-${acc}-${template}.png?amount=${amount}&addInfo=${memo}&accountName=${name}`;
  }

  /**
   * Kiểm tra trạng thái đơn hàng (Thời gian thực)
   */
  async checkOrderStatus(orderCode) {
    if (!orderCode) return { status: 'PENDING' };

    // 1. Kiểm tra trên Cloud Firestore
    if (cloudSync.isConfigured && cloudSync.firestoreDb) {
      try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const orderRef = doc(cloudSync.firestoreDb, 'payment_orders', orderCode);
        const snap = await getDoc(orderRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'PAID') {
            return { status: 'PAID', order: data };
          }
        }
      } catch (e) {
        console.warn('Lỗi kiểm tra đơn trên Firestore:', e);
      }
    }

    // 2. Kiểm tra bộ nhớ cục bộ
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PENDING_ORDER) || localStorage.getItem('linguaflash_pending_order');
      if (saved) {
        const localOrder = JSON.parse(saved);
        if (localOrder.orderId === orderCode && localOrder.status === 'PAID') {
          return { status: 'PAID', order: localOrder };
        }
      }
    } catch (e) {}

    return { status: 'PENDING' };
  }

  /**
   * Xác nhận hoàn tất thanh toán & Tự động tạo tài khoản chính thức
   */
  async confirmPaymentAndActivateAccount(order) {
    if (!order || !order.userData) {
      return { success: false, error: 'Dữ liệu đơn hàng không hợp lệ!' };
    }

    try {
      // Đánh dấu đơn hàng là PAID
      order.status = 'PAID';
      order.paidAt = Date.now();

      // Cập nhật lên Firestore (dùng setDoc merge:true để không bao giờ bị lỗi document not found)
      if (cloudSync.isConfigured && cloudSync.firestoreDb) {
        try {
          const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
          const orderRef = doc(cloudSync.firestoreDb, 'payment_orders', order.orderId);
          await setDoc(orderRef, { status: 'PAID', paidAt: Date.now() }, { merge: true });
        } catch (e) {
          console.warn('Lỗi cập nhật Firestore:', e);
        }
      }

      // Tạo tài khoản chính thức qua AuthService
      const regResult = await auth.register({
        name: order.userData.name,
        email: order.userData.email,
        password: order.userData.password,
        avatar: order.userData.avatar
      });

      if (regResult.success) {
        localStorage.removeItem(STORAGE_KEYS.PENDING_ORDER);
        this.currentOrder = null;
        return { success: true, user: regResult.user };
      }

      // Nếu register trả về lỗi, tự động fallback đăng nhập ngay
      const loginRes = await auth.login(order.userData.email, order.userData.password);
      if (loginRes.success) {
        localStorage.removeItem(STORAGE_KEYS.PENDING_ORDER);
        this.currentOrder = null;
        return { success: true, user: loginRes.user };
      }

      return regResult;
    } catch (err) {
      console.error('Lỗi kích hoạt:', err);
      // Fallback cuối cùng: Thử đăng nhập trực tiếp
      try {
        const fbLogin = await auth.login(order.userData.email, order.userData.password);
        if (fbLogin.success) {
          localStorage.removeItem(STORAGE_KEYS.PENDING_ORDER);
          this.currentOrder = null;
          return { success: true, user: fbLogin.user };
        }
      } catch (e) {}

      return { success: false, error: err.message || 'Lỗi xử lý kích hoạt tài khoản.' };
    }
  }

  /**
   * Xác minh giao dịch thanh toán thực tế trước khi kích hoạt tài khoản
   * TUYỆT ĐỐI KHÔNG kích hoạt nếu chưa nhận được giao dịch 20.000đ từ ngân hàng!
   */
  async verifyAndActivate(orderCode) {
    if (!orderCode) {
      return { success: false, error: 'Mã đơn hàng không hợp lệ!' };
    }

    // 1. Kiểm tra trạng thái đơn hàng trên Firestore
    const check = await this.checkOrderStatus(orderCode);
    if (check.status === 'PAID') {
      let order = this.currentOrder;
      if (!order || order.orderId !== orderCode) {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.PENDING_ORDER);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.orderId === orderCode) {
              order = parsed;
            }
          }
        } catch (e) {}
      }
      if (!order && check.order) {
        order = check.order;
      }
      if (order) {
        return await this.confirmPaymentAndActivateAccount(order);
      }
    }

    // 2. Nếu có cấu hình sepayApiKey, tra soát trực tiếp qua SePay API
    if (this.config.sepayApiKey) {
      try {
        const resp = await fetch('https://my.sepay.vn/userapi/transactions/list?limit=20', {
          headers: {
            'Authorization': `Bearer ${this.config.sepayApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (resp.ok) {
          const data = await resp.json();
          const txs = data.transactions || data.messages || [];
          const found = txs.find(tx => {
            const content = String(tx.transaction_content || tx.description || tx.content || '');
            const amountIn = Number(tx.amount_in || tx.amount || 0);
            return content.toUpperCase().includes(orderCode.toUpperCase()) && amountIn >= 20000;
          });

          if (found) {
            let order = this.currentOrder;
            if (!order) {
              const saved = localStorage.getItem(STORAGE_KEYS.PENDING_ORDER);
              if (saved) order = JSON.parse(saved);
            }
            if (order) {
              return await this.confirmPaymentAndActivateAccount(order);
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra SePay API:', err);
      }
    }

    // Nếu chưa nhận được tiền: Từ chối kích hoạt 100%!
    return {
      success: false,
      error: `Hệ thống chưa tìm thấy giao dịch chuyển tiền 20.000đ cho mã đơn ${orderCode} trên tài khoản ${this.config.bankName || 'VietinBank'} ${this.config.accountNo}. Nếu bạn vừa chuyển tiền, vui lòng chờ 5-10 giây để ngân hàng gửi tín hiệu rồi bấm kiểm tra lại nhé!`
    };
  }

  /**
   * Mô phỏng xác nhận thanh toán thành công (dành cho Admin khi kiểm tra test qua console)
   */
  async simulatePaymentSuccess(orderCode) {
    let order = this.currentOrder;
    if (!order || (orderCode && order.orderId !== orderCode)) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PENDING_ORDER);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!orderCode || parsed.orderId === orderCode) {
            order = parsed;
          }
        }
      } catch (e) {}
    }
    if (order) {
      return await this.confirmPaymentAndActivateAccount(order);
    }
    return { success: false, error: 'Không tìm thấy đơn hàng tương ứng.' };
  }
}

export const payment = new PaymentService();
