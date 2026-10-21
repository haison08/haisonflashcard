# TÀI LIỆU THIẾT KẾ & ĐẶC TẢ KỸ THUẬT: ỨNG DỤNG WEB FLASHCARD HỌC TIẾNG ANH
*(LinguaFlash - Modern English Learning Flashcard Application)*

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

- **Tên dự án**: **LinguaFlash** (hoặc **WordCraft**)
- **Mục tiêu**: Xây dựng một ứng dụng web flashcard học tiếng Anh hiện đại, trực quan, thẩm mỹ cao (wow effect), hỗ trợ phát âm chuẩn bản ngữ (US/UK), tích hợp thuật toán học ngắt quãng Spaced Repetition (SRS), đa dạng chế độ học và trò chơi ôn tập, sẵn sàng sử dụng ngay với kho từ vựng phong phú.
- **Đối tượng người dùng**: Người học tiếng Anh ở mọi trình độ (Giao tiếp, IELTS, TOEIC, từ vựng học thuật, idioms).
- **Trải nghiệm cốt lõi**:
  - Giao diện Dark / Light mode thời thượng, phong cách Glassmorphism, card flip 3D siêu mượt.
  - Hỗ trợ giọng đọc chuẩn (Text-to-Speech) chỉnh được tốc độ và accent US/UK.
  - Luyện nói và kiểm tra phát âm qua micro (Speech Recognition).
  - Đầy đủ tính năng: Bộ từ mẫu (IELTS, TOEIC, Oxford, Idioms), tạo bộ từ riêng, xuất/nhập JSON/CSV, thống kê chuỗi ngày học (streak) và tỷ lệ ghi nhớ.

---

## 2. KIẾN TRÚC KỸ THUẬT (TECH STACK & ARCHITECTURE)

- **Frontend Core**: HTML5 Semantic, Modern JavaScript (ES6+ Modules).
- **Styling**: Vanilla CSS3 hiện đại, CSS Variables cho Theme Engine (Dark/Light), CSS 3D Transforms (`perspective`, `transform-style: preserve-3d`), Flexbox & CSS Grid, Glassmorphism (`backdrop-filter`).
- **Audio & Speech Engine**:
  - **Web Speech API (`SpeechSynthesis`)**: Phát âm giọng chuẩn US, UK với điều chỉnh tốc độ đọc (0.75x, 1x, 1.25x).
  - **Web Speech API (`SpeechRecognition`)**: Thu âm và chấm điểm phát âm tiếng Anh trực tiếp từ microphone.
  - **Web Audio API**: Bộ âm thanh tổng hợp tương tác (lật thẻ, trả lời đúng, sai, hoàn thành bài học, vỗ tay confetti).
- **Lưu trữ dữ liệu (Data Persistence)**:
  - `localStorage` lưu trữ bộ từ vựng, cài đặt, tiến độ học, lịch sử SRS và streak.
  - Tính năng Export / Import dữ liệu dạng JSON và CSV để sao lưu hoặc chia sẻ.
- **Không phụ thuộc thư viện nặng ngoài**: Tốc độ tải trang tức thì, chạy trực tiếp trên bất kỳ trình duyệt nào mà không cần build tool phức tạp, hoạt động mượt mà offline.

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT STRUCTURE)

```
/flashcard
│
├── index.html                   # Giao diện chính của ứng dụng
├── FLASHCARD_WEB_SPEC.md        # Tài liệu đặc tả và kế hoạch thực hiện
│
├── css/
│   ├── variables.css            # Biến màu sắc, font chữ, gradient, theme
│   ├── base.css                 # Reset, typography, layout chung
│   ├── components.css           # Button, modal, badge, input, tabs, tooltip
│   ├── flashcard.css            # Hiệu ứng 3D flip card, thanh điều khiển SRS
│   ├── quiz.css                 # Giao diện trắc nghiệm, gõ từ, nghe chép chính tả, game nối từ
│   └── stats.css                # Thống kê, biểu đồ tiến độ, chuỗi streak
│
└── js/
    ├── app.js                   # Điểm khởi chạy chính, quản lý điều hướng tab & sự kiện chung
    ├── data/
    │   └── defaultDecks.js      # Kho từ vựng dựng sẵn: IELTS, TOEIC, Oxford 3000, Daily Idioms, Travel
    ├── services/
    │   ├── storage.js           # Quản lý LocalStorage, backup/restore, lưu tiến độ
    │   ├── srs.js               # Thuật toán Spaced Repetition (Leitner 5 hộp / SM-2)
    │   ├── audio.js             # Web Speech TTS & Web Audio sound effects
    │   └── speechRec.js         # Kiểm tra phát âm qua micro (Speech Recognition)
    └── components/
        ├── deckManager.js       # Quản lý danh sách bộ từ, thêm/sửa/xoá bộ từ và thẻ, import/export
        ├── cardViewer.js        # Trình xem và lật thẻ 3D, điều khiển bàn phím, nút đánh giá SRS
        ├── quizMode.js          # Các chế độ học: Trắc nghiệm 4 đáp án, Gõ từ (Spelling), Nghe đoán từ, Ghép cặp (Match Game)
        └── statsView.js         # Màn hình thống kê thành tích, streak, biểu đồ nhớ từ
```

---

## 4. CHI TIẾT TÍNH NĂNG (FEATURE SPECIFICATIONS)

### 4.1. Giao diện & Trải nghiệm tương tác (UI / UX)
- **Theme Engine**: Chuyển đổi linh hoạt giữa Dark Mode (Cyber Indigo huyền bí, dịu mắt) và Light Mode (Sáng sủa, thanh lịch).
- **3D Flip Card Effect**:
  - Mặt trước: Từ vựng tiếng Anh (kích thước lớn), phiên âm quốc tế IPA (ví dụ `/ˈre.zɪ.li.ənt/`), từ loại (`adj`, `n`, `v`), nút nghe phát âm, nút ghi âm thử giọng, nút đánh dấu yêu thích (Star).
  - Mặt sau: Nghĩa tiếng Việt, định nghĩa tiếng Anh (English definition), câu ví dụ kèm dịch nghĩa, từ đồng nghĩa/trái nghĩa, ghi chú collocations.
  - Cơ chế lật: Nhấp chuột vào thẻ, bấm phím `Space` hoặc nút "Lật thẻ".
- **Hỗ trợ phím tắt toàn diện (Keyboard Shortcuts)**:
  - `Space` : Lật thẻ
  - `A` hoặc `P` : Phát âm thanh
  - `M` : Bật mic kiểm tra phát âm
  - `1` : Again (Học lại ngay)
  - `2` : Hard (Khó)
  - `3` : Good (Tốt)
  - `4` : Easy (Dễ)
  - `←` / `→` : Thẻ trước / Thẻ tiếp theo

### 4.2. Hệ thống Âm thanh & Phát âm (Audio & Pronunciation)
- **Text-to-Speech (TTS)**:
  - Giọng đọc tự nhiên chuẩn US (American) và UK (British).
  - Điều chỉnh tốc độ đọc linh hoạt: 0.8x (Chậm rõ cho người mới) và 1.0x (Tốc độ tự nhiên).
  - Tự động phát âm khi chuyển thẻ (tuỳ chọn bật/tắt trong cài đặt).
- **Luyện nói & Chấm điểm phát âm (Voice Practice)**:
  - Bấm biểu tượng Microphone và đọc từ tiếng Anh.
  - Ứng dụng phân tích qua Web Speech API và hiển thị kết quả:
    - Trùng khớp 100%: Lời khen "Tuyệt vời! Phát âm chuẩn bản ngữ!" (hiệu ứng xanh lá + âm thanh chiến thắng).
    - Chưa khớp: Hiển thị từ máy nghe được để người học chỉnh khẩu hình.
- **Sound Effects (Web Audio Synthesizer)**:
  - Âm thanh lật thẻ nhẹ nhàng, âm thanh ting khi trả lời đúng, tiếng gõ phím khi luyện chính tả, pháo hoa ăn mừng khi hoàn thành một bộ từ.

### 4.3. Thuật toán Lặp lại ngắt quãng (Spaced Repetition System - SRS)
- Áp dụng nguyên lý đường cong quên lãng Ebbinghaus kết hợp hệ thống hộp Leitner:
  - **Hộp 1 (New / Again)**: Ôn tập lại ngay sau 1 ngày hoặc ngay trong phiên học.
  - **Hộp 2 (Hard)**: Ôn lại sau 2 - 3 ngày.
  - **Hộp 3 (Good)**: Ôn lại sau 5 - 7 ngày.
  - **Hộp 4 (Easy / Mastered)**: Ôn lại sau 14 - 30 ngày.
- Tự động lọc ra "Các từ cần ôn hôm nay" (Due Today) giúp người học tối ưu thời gian.

### 4.4. Đa dạng chế độ học tập (Study Modes)
1. **Flashcard 3D cổ điển**: Chế độ học cốt lõi, lật thẻ, chấm điểm SRS, nghe phát âm.
2. **Trắc nghiệm (Multiple Choice Quiz)**: Chọn nghĩa tiếng Việt đúng cho từ tiếng Anh (hoặc ngược lại) trong 4 đáp án, có tính điểm và streak combo.
3. **Luyện gõ từ & Chính tả (Spelling Challenge)**: Nghe phát âm và đọc định nghĩa, người học phải gõ chính xác từ tiếng Anh, giúp rèn luyện khả năng viết và trí nhớ từ vựng.
4. **Thử thách Nghe (Listening Challenge)**: Ẩn mặt chữ, chỉ phát âm thanh, người học chọn từ hoặc gõ lại từ nghe được.
5. **Trò chơi Ghép từ (Word Matching Game)**: Bảng 12 thẻ (6 từ tiếng Anh và 6 nghĩa tiếng Việt bị xáo trộn), người học bấm ghép đôi đúng nhanh nhất để ghi điểm cao.

### 4.5. Kho từ vựng mẫu chất lượng cao (Built-in Decks)
1. **IELTS Academic Core (50+ từ vựng band 7.0+)**: *Ubiquitous, Resilient, Pragmatic, Mitigate, Substantiate, Proliferate...* kèm IPA, ví dụ học thuật và collocation.
2. **TOEIC Business Master (50+ từ vựng công sở & thương mại)**: *Negotiation, Merchandise, Agenda, Compliance, Revenue, Reimburse...*
3. **Oxford 3000 Everyday Essentials (50+ từ vựng giao tiếp cốt lõi)**: *Achieve, Benefit, Challenge, Dynamic, Efficient...*
4. **Thành ngữ & Cụm từ hay dùng (Idioms & Phrasal Verbs)**: *Bite the bullet, Break a leg, Piece of cake, Hit the books, Call it a day...*
5. **Tiếng Anh Du lịch & Sinh tồn (Travel Survival)**: *Boarding pass, Itinerary, Customs, Accommodate, Currency exchange...*

### 4.6. Quản lý Thẻ và Bộ từ (Deck & Card Management)
- Tạo mới bộ thẻ (Deck) với tên, mô tả, màu sắc biểu tượng đại diện.
- Thêm thẻ từ mới nhanh chóng: Nhập từ tiếng Anh, phiên âm, từ loại, nghĩa tiếng Việt, câu ví dụ.
- Chỉnh sửa, xoá thẻ, đánh dấu sao từ vựng quan trọng (Favorites).
- Tìm kiếm và lọc thẻ theo từ khoá, mức độ thành thạo, hoặc thẻ đã đánh dấu sao.
- **Import / Export**:
  - Xuất toàn bộ dữ liệu ra file JSON để sao lưu.
  - Nhập từ file JSON hoặc file CSV (định dạng `Word,IPA,Type,Meaning,Example`).

### 4.7. Bảng thống kê & Tiến độ học (Analytics & Streaks)
- **Chuỗi ngày học liên tục (Daily Streak 🔥)**: Khích lệ học viên duy trì thói quen học mỗi ngày.
- **Thống kê tổng quan**: Tổng số từ đã học, số từ đã ghi nhớ thành thạo (Mastered), số từ đang học (Learning), số từ mới (New).
- **Tỷ lệ chính xác & Độ hoàn thành (%)**: Thể hiện trực quan qua vòng tròn tiến độ và biểu đồ phân bổ.
- **Lịch sử hoạt động tuần**: Biểu đồ số lượng thẻ đã ôn trong 7 ngày gần nhất.

### 4.8. Hệ thống Tài khoản Người dùng & Phân tách Dữ liệu Độc lập (Authentication & Multi-User Data Isolation)
- **Đăng ký tài khoản (Register)**:
  - Cho phép người dùng mới tạo tài khoản với: Họ tên, Tên đăng nhập / Email, Mật khẩu, Chọn Avatar ngẫu nhiên hoặc theo phong cách yêu thích.
  - Tự động kiểm tra tính hợp lệ và chống trùng lặp email/username.
  - Khi tài khoản mới được tạo, hệ thống tự động cấp riêng một không gian dữ liệu độc lập kèm bản sao của các bộ từ vựng chuẩn (IELTS, TOEIC, Oxford, Idioms, Travel) để người dùng có thể học ngay mà không phụ thuộc vào ai.
- **Đăng nhập (Login) & Duy trì phiên (Session Persistence)**:
  - Đăng nhập an toàn bằng Email / Tên đăng nhập và Mật khẩu.
  - Tự động duy trì phiên làm việc (`active_session`) để người dùng không phải đăng nhập lại mỗi khi mở lại trình duyệt.
  - Hỗ trợ tài khoản mẫu (Demo Account) để trải nghiệm nhanh bằng 1 click.
- **Phân tách Dữ liệu Độc lập Tuyệt đối (Strict Data Isolation)**:
  - Toàn bộ dữ liệu của mỗi tài khoản được lưu giữ độc lập trong cơ sở dữ liệu `linguaflash_users_db`:
    - Danh sách bộ từ và thẻ từ vựng (kể cả từ tự tạo, chỉnh sửa hay xoá).
    - Lịch sử hoạt động học tập (Study Logs: ngày giờ học, số thẻ ôn, chế độ học, độ chính xác).
    - Chuỗi ngày học liên tục (`streak`: ngày hiện tại, kỷ lục chuỗi dài nhất, ngày học gần nhất).
    - Tiến độ ghi nhớ theo từng hộp Leitner (Box 1 -> Box 4) của từng thẻ từ.
    - Danh sách từ vựng đánh dấu sao yêu thích (Favorites).
    - Cài đặt cá nhân hoá (Theme sáng/tối, giọng đọc US/UK, tốc độ phát âm).
  - Khi đăng xuất và đăng nhập tài khoản khác: Toàn bộ giao diện và dữ liệu lập tức chuyển đổi sang tài khoản tương ứng, đảm bảo tính riêng tư và bảo toàn 100% lịch sử học tập của từng người.
- **Giao diện Người dùng (User Profile Chip & Modal)**:
  - Thanh Header hiển thị Avatar, tên người dùng, huy hiệu chuỗi streak và nút mở Menu cá nhân.
  - Modal Đăng nhập / Đăng ký thiết kế phong cách Glassmorphism đồng bộ với ứng dụng, chuyển đổi tab mượt mà.
  - Cho phép Đăng xuất nhanh hoặc Đổi tài khoản bất kỳ lúc nào.

### 4.9. Kiến trúc Đám Mây & Đồng bộ Đa thiết bị Toàn hệ thống (Cloud Database & Cross-Device Sync)
- **Mục tiêu**: Khi một tài khoản được tạo trên bất kỳ thiết bị nào (máy tính A, điện thoại, máy tính B), tài khoản đó sẽ được lưu vào hệ thống chung trên Cloud. Khi mở máy khác lên, người dùng có thể đăng nhập ngay và toàn bộ bộ từ vựng, điểm số, chuỗi streak, lịch sử ôn tập đều được tải về tức thì.
- **Giải pháp Công nghệ Cloud**:
  - Tích hợp **Firebase Cloud Firestore & Authentication** (hoặc Supabase) với kiến trúc **Hybrid Sync (Cloud-First + Offline Cache)**:
    - Khi có mạng Internet: Mọi thao tác (đăng ký, đăng nhập, lật thẻ nhớ, cập nhật điểm SRS, tạo bộ từ mới) được đồng bộ thời gian thực lên Cloud Firestore collection `users/{userId}`.
    - Khi mất mạng hoặc chưa cấu hình Cloud: Ứng dụng tự động chuyển sang chế độ LocalStorage an toàn, không gián đoạn việc học và tự động đồng bộ lên mây ngay khi kết nối lại.
  - Cung cấp giao diện thiết lập Cloud trực quan ngay trong ứng dụng: Cho phép nhập/kết nối Firebase Config hoặc chuyển đổi giữa Local Mode và Cloud Sync Mode.

### 4.10. Cấu hình Triển khai Vercel (Project: haisonflashcard)
- **Tên dự án**: `haisonflashcard`
- **Tên miền truy cập dự kiến**: `https://haisonflashcard.vercel.app` (hoặc tên miền phụ do Vercel cấp phát).
- **Cấu hình `vercel.json`**:
  - Thiết lập dự án tĩnh tốc độ cao với bộ đệm Edge CDN toàn cầu của Vercel.
  - Cấu hình Clean URLs, Security Headers (CSP, XSS Protection, Frame Options).
- **Khởi tạo Git Repository**:
  - Thiết lập `git init` với nhánh `main`, tạo `.gitignore` loại trừ các file rác hệ thống.
  - Hướng dẫn chi tiết từng bước đẩy lên GitHub và liên kết với Vercel chỉ với 1 click.

### 4.11. Chi tiết Thao tác Thiết lập Firebase Console Tự Động (Firebase Automation Steps)
1. **Khởi tạo Project**:
   - Truy cập Firebase Console (`console.firebase.google.com`).
   - Tạo Project mới với tên: `haisonflashcard`.
   - Bỏ chọn Google Analytics để tối ưu tốc độ khởi tạo.
2. **Kích hoạt Firestore Database**:
   - Vào menu Firestore Database > Bấm Create database.
   - Chọn chế độ *Test mode* (cho phép ứng dụng đọc/ghi dữ liệu học tập tự do).
   - Chọn khu vực máy chủ (Region) phù hợp (ví dụ: `asia-southeast1` hoặc `nam5 / us-central1`).
3. **Tạo Web App & Lấy `firebaseConfig`**:
   - Bấm biểu tượng Web `</>` > Đặt nickname: `haisonflashcard-web`.
   - Trích xuất đối tượng `firebaseConfig` bao gồm: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
4. **Nhúng trực tiếp vào mã nguồn**:
   - Cập nhật `firebaseConfig` vào `js/services/cloudSync.js` làm cấu hình mặc định (Default Production Config).
   - Bất kỳ ai mở `https://haisonflashcard.vercel.app` đều tự động kết nối vào Cloud Database này mà không cần dán thủ công!
5. **Cập nhật lên GitHub & Vercel**:
   - Tạo Git commit và push lên nhánh `main`.
   - Vercel tự động kích hoạt CI/CD build phiên bản mới trong 30 giây.

---

## 5. KẾ HOẠCH TRIỂN KHAI THEO CÁC BƯỚC (IMPLEMENTATION ROADMAP)

- [x] **Bước 1**: Khảo sát môi trường và biên soạn tài liệu thiết kế chi tiết `FLASHCARD_WEB_SPEC.md`.
- [x] **Bước 2**: Xây dựng kho từ vựng mẫu chất lượng cao (`js/data/defaultDecks.js`).
- [x] **Bước 3**: Xây dựng các dịch vụ lõi (Core Services: storage, srs, audio, speechRec).
- [x] **Bước 4**: Xây dựng hệ thống giao diện CSS (variables, base, components, flashcard, quiz, stats).
- [x] **Bước 5**: Lập trình các thành phần giao diện (cardViewer, quizMode, deckManager, statsView).
- [x] **Bước 6**: Ghép nối hoàn chỉnh `index.html` và `js/app.js`.
- [x] **Bước 7**: Khởi động server nội bộ `localhost:8888`.
- [x] **Bước 8**: Xây dựng Dịch vụ Xác thực & Quản lý Tài khoản (`js/services/auth.js`).
- [x] **Bước 9**: Cập nhật Dịch vụ Lưu trữ `js/services/storage.js` để gắn liền với tài khoản đang đăng nhập.
- [x] **Bước 10**: Xây dựng Giao diện Đăng nhập / Đăng ký (`js/components/authModal.js`).
- [x] **Bước 11**: Kiểm thử luồng dữ liệu độc lập của từng tài khoản.
- [x] **Bước 12**: Xây dựng Dịch vụ Đồng bộ Đám mây (`js/services/cloudSync.js`) kết nối Firebase Firestore.
- [x] **Bước 13**: Cập nhật `auth.js` và `storage.js` hỗ trợ tự động kéo/đẩy dữ liệu đồng bộ với Cloud.
- [x] **Bước 14**: Thiết lập cấu hình Vercel (`vercel.json`), khởi tạo Git repository và đẩy lên GitHub `haison08/haisonflashcard`.
- [x] **Bước 15**: Tự động thao tác trên tab Firebase Console: tạo project `haisonflashcard`, bật Cloud Firestore và tạo Web App.
- [x] **Bước 16**: Trích xuất `firebaseConfig` và nhúng trực tiếp vào `js/services/cloudSync.js`.
- [x] **Bước 17**: Push commit lên GitHub để Vercel tự động triển khai và kiểm tra đồng bộ tài khoản xuyên suốt các máy.

---

*Tài liệu này là kim chỉ nam để thực hiện toàn bộ ứng dụng web flashcard học tiếng Anh LinguaFlash.*




