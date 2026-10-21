/**
 * srs.js - Spaced Repetition System (Thuật toán học lặp lại ngắt quãng theo hộp Leitner & SM-2)
 */

export const SRS_BOXES = {
  1: { name: 'Cần ôn ngay', days: 1, label: 'Mới / Chưa nhớ' },
  2: { name: 'Đang ghi nhớ', days: 3, label: 'Ghi nhớ ngắn hạn' },
  3: { name: 'Khá quen thuộc', days: 7, label: 'Ghi nhớ trung hạn' },
  4: { name: 'Đã thành thạo', days: 21, label: 'Thành thạo dài hạn' }
};

export const RATINGS = {
  AGAIN: 1, // Chưa thuộc
  HARD: 2,  // Khó nhớ
  GOOD: 3,  // Nhớ tốt
  EASY: 4   // Quá dễ
};

class SRSService {
  /**
   * Tính toán box tiếp theo và ngày cần ôn tập
   * @param {Object} card 
   * @param {number} rating - 1: again, 2: hard, 3: good, 4: easy
   */
  calculateNextReview(card, rating) {
    let currentBox = card.box || 1;
    let nextBox = currentBox;
    let intervalDays = 1;

    switch (rating) {
      case RATINGS.AGAIN:
        // Đặt lại về hộp 1
        nextBox = 1;
        intervalDays = 0.5; // Ôn lại trong nửa ngày hoặc trong phiên
        break;

      case RATINGS.HARD:
        // Giữ nguyên hộp hoặc lùi 1 hộp
        nextBox = Math.max(1, currentBox);
        intervalDays = currentBox === 1 ? 1 : 2;
        break;

      case RATINGS.GOOD:
        // Tiến lên 1 hộp
        nextBox = Math.min(4, currentBox + 1);
        intervalDays = SRS_BOXES[nextBox].days;
        break;

      case RATINGS.EASY:
        // Nhảy vọt lên 2 hộp hoặc tối đa hộp 4
        nextBox = Math.min(4, currentBox + 2);
        intervalDays = SRS_BOXES[nextBox].days * 1.5;
        break;

      default:
        nextBox = currentBox;
        intervalDays = 1;
    }

    const nextReviewTime = Date.now() + intervalDays * 24 * 60 * 60 * 1000;

    return {
      box: nextBox,
      intervalDays: Math.round(intervalDays),
      nextReview: nextReviewTime,
      reps: (card.reps || 0) + 1,
      lastReviewed: Date.now()
    };
  }

  /**
   * Kiểm tra thẻ đã đến hạn cần ôn tập chưa
   */
  isCardDue(card) {
    if (!card.nextReview) return true; // Chưa học lần nào
    return Date.now() >= card.nextReview;
  }

  /**
   * Lấy danh sách các thẻ đến hạn ôn tập trong danh sách thẻ
   */
  getDueCards(cards) {
    if (!cards || !Array.isArray(cards)) return [];
    return cards.filter(card => this.isCardDue(card));
  }

  /**
   * Thống kê phân bổ các thẻ theo hộp Leitner
   */
  getDistribution(cards) {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, total: 0, mastered: 0 };
    if (!cards || !Array.isArray(cards)) return dist;

    dist.total = cards.length;
    cards.forEach(card => {
      const box = card.box || 1;
      dist[box] = (dist[box] || 0) + 1;
      if (box >= 4) dist.mastered++;
    });

    return dist;
  }
}

export const srs = new SRSService();
