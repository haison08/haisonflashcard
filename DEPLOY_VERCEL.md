# HƯỚNG DẪN ĐƯA ỨNG DỤNG LÊN VERCEL (haisonflashcard)

Dự án này đã được cấu hình sẵn tệp [vercel.json](file:///Users/haisonnguyenphuc/Desktop/project/flashcard/vercel.json) với tên dự án **`haisonflashcard`**.

Chỉ mất **khoảng 1 - 2 phút** để đưa trang web lên Internet và nhận link truy cập từ mọi máy tính / điện thoại.

---

## CÁCH 1: Triển khai qua GitHub (Được khuyên dùng, 100% Giao diện Web)

### Bước 1: Tạo Repository mới trên GitHub
1. Truy cập [github.com/new](https://github.com/new)
2. Đặt tên Repository: `haisonflashcard` (chọn Public hoặc Private đều được).
3. Bấm **Create repository**.

### Bước 2: Đẩy code từ máy lên GitHub
Mở Terminal trên máy bạn và chạy 3 lệnh sau:
```bash
cd /Users/haisonnguyenphuc/Desktop/project/flashcard
git remote add origin https://github.com/<tai-khoan-github-cua-ban>/haisonflashcard.git
git branch -M main
git push -u origin main
```

### Bước 3: Đưa lên Vercel
1. Truy cập [vercel.com/new](https://vercel.com/new) (Đăng nhập bằng tài khoản GitHub).
2. Tại mục **Import Git Repository**, bạn sẽ thấy `haisonflashcard` vừa tạo. Bấm nút **Import**.
3. Tại ô **Project Name**, giữ nguyên tên: `haisonflashcard`.
4. Bấm **Deploy**.
5. Sau ~30 giây, Vercel sẽ cấp cho bạn đường link trực tiếp:
   👉 **`https://haisonflashcard.vercel.app`**

---

## CÁCH 2: Triển khai trực tiếp qua Vercel CLI (Nếu có cài đặt Node/Vercel)

Chạy lệnh sau tại thư mục dự án:
```bash
npx vercel --prod
```
Làm theo hướng dẫn trên màn hình để đăng nhập và trang web sẽ được phát hành ngay lập tức.

---

## ☁️ Đồng bộ tài khoản đa thiết bị (Cross-Device Sync)

Mặc định khi chạy, ứng dụng lưu trữ cục bộ rất mượt mà. Để **tạo tài khoản ở máy này và sang máy khác/điện thoại vẫn đăng nhập được**:
1. Vào [Firebase Console](https://console.firebase.google.com/) (miễn phí của Google).
2. Tạo project tên `haisonflashcard`.
3. Bật **Firestore Database** (chọn *Start in test mode*).
4. Vào Project Settings > Thêm Web App (biểu tượng `</>`) > Copy đoạn `firebaseConfig`.
5. Mở web của bạn > Bấm nút ⚙️ (Cài đặt) trên thanh Header > Chọn **"⚡ Kết nối Firebase Cloud"** > Dán cấu hình vào!
6. Kể từ giây phút này, **mọi tài khoản tạo ở bất kỳ máy nào đều được lưu vào cơ sở dữ liệu chung và đăng nhập được ở mọi nơi!**
