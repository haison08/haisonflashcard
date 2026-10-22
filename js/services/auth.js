/**
 * auth.js - Dịch vụ Xác thực, Quản lý Tài khoản & Phân tách Dữ liệu Độc lập cho từng người dùng
 */

import { DEFAULT_DECKS } from '../data/defaultDecks.js';
import { cloudSync } from './cloudSync.js';

const STORAGE_KEYS = {
  USERS_DB: 'haisonflash_users_db',
  CURRENT_SESSION: 'haisonflash_current_session'
};


const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: 'en-US',
  speechRate: 1.0,
  autoPlayAudio: false,
  soundEffects: true
};

class AuthService {
  constructor() {
    this.users = {};
    this.currentUser = null;
    this.authListeners = [];
    this.init();
  }

  init() {
    // Tự động dọn sạch 100% toàn bộ tài khoản test cũ trên trình duyệt theo yêu cầu
    try {
      const WIPE_FLAG = 'haisonflash_wipe_v42';
      if (!localStorage.getItem(WIPE_FLAG) && !localStorage.getItem('linguaflash_wipe_v42')) {
        localStorage.clear();
        localStorage.setItem(WIPE_FLAG, 'true');
        this.users = {};
        this.currentUser = null;
        return;
      } else {
        localStorage.setItem(WIPE_FLAG, 'true');
      }
    } catch (e) {}

    // Đọc danh sách người dùng
    try {
      let data = localStorage.getItem(STORAGE_KEYS.USERS_DB);
      if (!data) {
        data = localStorage.getItem('linguaflash_users_db');
        if (data) {
          localStorage.setItem(STORAGE_KEYS.USERS_DB, data);
        }
      }
      if (data) {
        this.users = JSON.parse(data);
      }
    } catch (e) {
      console.error('Lỗi khi đọc users_db:', e);
      this.users = {};
    }

    // Khôi phục phiên làm việc (Session) nếu người dùng đã đăng nhập hợp lệ từ trước
    try {
      const sessionUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION) || localStorage.getItem('linguaflash_current_session');
      if (sessionUserId && this.users[sessionUserId]) {
        this.currentUser = this.users[sessionUserId];
        if (!localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION)) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, sessionUserId);
        }
      } else {
        this.currentUser = null;
      }
    } catch (e) {
      console.error('Lỗi khôi phục session:', e);
      this.currentUser = null;
    }
  }

  saveUsersDb() {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(this.users));
    } catch (e) {
      console.error('Lỗi khi lưu users_db:', e);
    }
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Đăng ký tài khoản mới
   */
  async register({ name, email, password, avatar = '🧑‍🎓' }) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName) {
      return { success: false, error: 'Vui lòng nhập họ và tên của bạn!' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Email không hợp lệ!' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'Mật khẩu phải có tối thiểu 4 ký tự!' };
    }

    // Kiểm tra trùng lặp email ở database cục bộ
    const existingUser = Object.values(this.users).find(u => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      // Nếu email đã tồn tại, tự động đăng nhập người dùng vào tài khoản này
      this.currentUser = existingUser;
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, existingUser.id);
      this.notifyAuthChange();
      return { success: true, user: existingUser, isExisting: true };
    }

    const newUserId = 'user_' + Date.now();
    const newUser = {
      id: newUserId,
      name: cleanName,
      email: cleanEmail,
      password: password,
      avatar: avatar || '🧑‍🎓',
      createdAt: Date.now(),
      // Khởi tạo bản sao độc lập của các bộ từ vựng chuẩn cho người dùng này
      decks: JSON.parse(JSON.stringify(DEFAULT_DECKS)),
      settings: { ...DEFAULT_SETTINGS },
      streak: { current: 0, longest: 0, lastDate: null },
      logs: []
    };

    this.users[newUserId] = newUser;
    this.saveUsersDb();

    // Tự động đẩy lên Cloud Firestore để máy khác truy cập được ngay lập tức
    try {
      await cloudSync.uploadUserToCloud(newUser);
    } catch (e) {
      console.warn('Lỗi đồng bộ Cloud:', e);
    }

    // Tự động đăng nhập
    this.currentUser = newUser;
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, newUserId);

    this.notifyAuthChange();
    return { success: true, user: newUser };
  }

  /**
   * Đăng nhập tài khoản (Kiểm tra Local trước, nếu máy mới thì kéo từ Cloud về)
   */
  async login(emailOrUsername, password) {
    const query = emailOrUsername.trim().toLowerCase();

    // 1. Kiểm tra tài khoản trong database cục bộ của máy
    let user = Object.values(this.users).find(u => 
      u.email.toLowerCase() === query || u.name.toLowerCase() === query
    );

    // 2. Nếu máy mới chưa có tài khoản này, tìm trên Cloud Firestore
    if (!user) {
      if (!cloudSync.isConfigured) {
        await cloudSync.initFirebase();
      }
      const cloudRes = await cloudSync.findUserOnCloud(query, password);
      if (cloudRes) {
        if (cloudRes.error === 'wrong-password') {
          return { success: false, error: 'Mật khẩu không chính xác! Vui lòng thử lại.' };
        }
        // Lưu tài khoản từ Cloud về máy này
        user = cloudRes;
        this.users[user.id] = user;
        this.saveUsersDb();
      }
    }

    if (!user) {
      return { success: false, error: 'Không tìm thấy tài khoản với email hoặc tên này!' };
    }

    if (user.password !== password) {
      return { success: false, error: 'Mật khẩu không chính xác! Vui lòng thử lại.' };
    }

    this.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, user.id);

    this.notifyAuthChange();
    return { success: true, user: user };
  }

  /**
   * Đăng xuất
   */
  logout() {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    this.notifyAuthChange();
  }

  /**
   * Chuyển đổi nhanh giữa các tài khoản đã lưu trên máy
   */
  switchUser(targetUserId) {
    const targetUser = this.users[targetUserId];
    if (!targetUser) return false;
    this.currentUser = targetUser;
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, targetUserId);
    this.notifyAuthChange();
    return true;
  }

  /**
   * Lưu cập nhật dữ liệu của user hiện tại và đẩy lên Cloud
   */
  saveCurrentUser(updates = {}) {
    if (!this.currentUser) return false;
    Object.assign(this.currentUser, updates);
    this.users[this.currentUser.id] = this.currentUser;
    this.saveUsersDb();

    // Tự động đồng bộ lên Cloud
    cloudSync.uploadUserToCloud(this.currentUser).catch(() => {});
    return true;
  }

  /**
   * Đăng ký lắng nghe thay đổi trạng thái Auth
   */
  onAuthStateChanged(callback) {
    if (typeof callback === 'function') {
      this.authListeners.push(callback);
    }
  }

  notifyAuthChange() {
    this.authListeners.forEach(cb => {
      try {
        cb(this.currentUser);
      } catch (e) {
        console.error('Lỗi callback auth listener:', e);
      }
    });
  }

  getAllUsersList() {
    return Object.values(this.users).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar || '🧑‍🎓',
      streak: u.streak ? u.streak.current : 0,
      cardsCount: (u.decks || []).reduce((acc, d) => acc + (d.cards ? d.cards.length : 0), 0)
    }));
  }

  /**
   * Xoá sạch toàn bộ tài khoản và dữ liệu lưu trên thiết bị này
   */
  wipeAllLocalAccounts() {
    try {
      localStorage.clear();
      localStorage.setItem('haisonflash_wipe_v42', 'true');
      this.users = {};
      this.currentUser = null;
      this.notifyAuthChange();
      window.location.reload();
    } catch (e) {
      console.error('Lỗi khi xoá tài khoản trên máy:', e);
    }
  }
}

export const auth = new AuthService();
