/**
 * payment.js - Dịch vụ Thanh toán VietQR & Xác thực Giao dịch Kích hoạt Tài khoản (20.000 VNĐ)
 */

import { cloudSync } from './cloudSync.js';
import { auth } from './auth.js';

const STORAGE_KEYS = {
  PAYMENT_CONFIG: 'linguaflash_payment_config',
  PENDING_ORDER: 'linguaflash_pending_order'
};

// Cấu hình tài khoản ngân hàng thụ hưởng mặc định
const DEFAULT_PAYMENT_CONFIG = {
  bankId: 'TCB', // Techcombank (Ngân hàng TMCP Kỹ Thương Việt Nam)
  bankName: 'Techcombank',
  accountNo: '6888200808', // STK Techcombank của Nguyễn Phúc Hải Sơn
  accountName: 'NGUYEN PHUC HAI SON',
  amount: 20000, // 20.000 VNĐ
  sepayApiKey: '', // API Token từ SePay nếu dùng webhook tự động
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
      const saved = localStorage.getItem(STORAGE_KEYS.PAYMENT_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Tự động nâng cấp nếu đang lưu STK cũ
        if (parsed.accountNo === '0868888888') {
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
   * Tạo link ảnh mã VietQR chuẩn quốc tế
   */
  getVietQRUrl(order) {
    const bank = order.bankId || this.config.bankId;
    const acc = order.accountNo || this.config.accountNo;
    const template = this.config.template || 'compact2';
    const amount = order.amount || this.config.amount;
    const memo = encodeURIComponent(order.orderId);
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
      const saved = localStorage.getItem(STORAGE_KEYS.PENDING_ORDER);
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

    // Đánh dấu đơn hàng là PAID
    order.status = 'PAID';
    order.paidAt = Date.now();

    // Cập nhật lên Firestore
    if (cloudSync.isConfigured && cloudSync.firestoreDb) {
      try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const orderRef = doc(cloudSync.firestoreDb, 'payment_orders', order.orderId);
        await updateDoc(orderRef, { status: 'PAID', paidAt: Date.now() });
      } catch (e) {}
    }

    // Tạo tài khoản chính thức qua AuthService
    const regResult = await auth.register({
      name: order.userData.name,
      email: order.userData.email,
      password: order.userData.password,
      avatar: order.userData.avatar
    });

    if (regResult.success) {
      // Xoá đơn chờ sau khi đã kích hoạt
      localStorage.removeItem(STORAGE_KEYS.PENDING_ORDER);
      this.currentOrder = null;
      return { success: true, user: regResult.user };
    }

    return regResult;
  }

  /**
   * Kích hoạt tức thì (Siêu tốc 1 giây sau khi chuyển tiền)
   */
  async instantActivate(orderCode) {
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

  /**
   * Mô phỏng xác nhận thanh toán thành công (dành cho Admin / Test)
   */
  async simulatePaymentSuccess(orderCode) {
    return await this.instantActivate(orderCode);
  }
}

export const payment = new PaymentService();
