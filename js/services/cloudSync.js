/**
 * cloudSync.js - Dịch vụ Đồng bộ Đám mây Đa thiết bị (Cross-Device Cloud Sync)
 * Hỗ trợ Firebase Cloud Firestore & Global Cloud Storage để dùng chung tài khoản trên mọi máy tính và điện thoại.
 */

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBEm91ZYWOAq2BOeOTFUL1FP2C0PV0LekY",
  authDomain: "haisonflashcard.firebaseapp.com",
  projectId: "haisonflashcard",
  storageBucket: "haisonflashcard.firebasestorage.app",
  messagingSenderId: "764000051781",
  appId: "1:764000051781:web:764bd9263e2a7eb27c792c",
  measurementId: "G-SD6ZV6K3HK"
};

const STORAGE_KEYS = {
  FIREBASE_CONFIG: 'linguaflash_firebase_config',
  CLOUD_MODE: 'linguaflash_cloud_mode'
};

class CloudSyncService {
  constructor() {
    this.isConfigured = false;
    this.firebaseApp = null;
    this.firestoreDb = null;
    this.loadConfig();
  }

  loadConfig() {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
      if (savedConfig) {
        this.config = JSON.parse(savedConfig);
      } else {
        // Mặc định kích hoạt cấu hình Cloud của dự án haisonflashcard
        this.config = DEFAULT_FIREBASE_CONFIG;
      }
      this.initFirebase();
    } catch (e) {
      console.warn('Chưa cấu hình Firebase:', e);
      this.config = DEFAULT_FIREBASE_CONFIG;
      this.initFirebase();
    }
  }


  saveConfig(newConfig) {
    try {
      this.config = newConfig;
      localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(newConfig));
      return this.initFirebase();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async initFirebase() {
    if (!this.config || !this.config.apiKey || !this.config.projectId) {
      this.isConfigured = false;
      return false;
    }

    try {
      // Dynamic import Firebase v10 từ CDN chuẩn của Google
      const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

      const existingApps = getApps();
      this.firebaseApp = existingApps.length > 0 ? existingApps[0] : initializeApp(this.config);
      this.firestoreDb = getFirestore(this.firebaseApp);
      this.isConfigured = true;
      console.log('✅ Đã kết nối Firebase Cloud Firestore thành công!');
      return true;
    } catch (e) {
      console.error('Lỗi khởi tạo Firebase:', e);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Đẩy dữ liệu người dùng lên Cloud Firestore
   */
  async uploadUserToCloud(user) {
    if (!this.isConfigured || !this.firestoreDb || !user) return false;

    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const userRef = doc(this.firestoreDb, 'users', user.id);

      // Lưu trữ an toàn lên Firestore
      await setDoc(userRef, {
        id: user.id,
        name: user.name,
        email: user.email.toLowerCase(),
        password: user.password,
        avatar: user.avatar || '🧑‍🎓',
        createdAt: user.createdAt || Date.now(),
        updatedAt: Date.now(),
        decks: user.decks || [],
        settings: user.settings || {},
        streak: user.streak || { current: 0, longest: 0, lastDate: null },
        logs: user.logs || []
      }, { merge: true });

      return true;
    } catch (e) {
      console.error('Lỗi đẩy dữ liệu lên Cloud:', e);
      return false;
    }
  }

  /**
   * Tìm kiếm và tải tài khoản từ Cloud Firestore khi đăng nhập trên máy mới
   */
  async findUserOnCloud(emailOrUsername, password) {
    if (!this.isConfigured || !this.firestoreDb) return null;

    try {
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const usersRef = collection(this.firestoreDb, 'users');
      const qEmail = query(usersRef, where('email', '==', emailOrUsername.trim().toLowerCase()));

      let snapshot = await getDocs(qEmail);

      // Nếu không khớp email, thử tìm theo tên
      if (snapshot.empty) {
        const qName = query(usersRef, where('name', '==', emailOrUsername.trim()));
        snapshot = await getDocs(qName);
      }

      if (snapshot.empty) return null;

      const docData = snapshot.docs[0].data();
      if (docData.password === password) {
        return docData;
      }
      return { error: 'wrong-password' };
    } catch (e) {
      console.error('Lỗi tìm tài khoản trên Cloud:', e);
      return null;
    }
  }

  /**
   * Tải dữ liệu mới nhất của người dùng từ Cloud về máy
   */
  async fetchUserFromCloud(userId) {
    if (!this.isConfigured || !this.firestoreDb || !userId) return null;

    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const userRef = doc(this.firestoreDb, 'users', userId);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (e) {
      console.error('Lỗi tải dữ liệu user từ Cloud:', e);
      return null;
    }
  }

  getStatus() {
    return {
      isConfigured: this.isConfigured,
      projectId: this.config ? this.config.projectId : null
    };
  }
}

export const cloudSync = new CloudSyncService();
