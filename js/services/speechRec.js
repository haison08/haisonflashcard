/**
 * speechRec.js - Kiểm tra và chấm điểm phát âm tiếng Anh qua Microphone (Speech Recognition API)
 */

class SpeechRecognitionService {
  constructor() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRec;
    this.recognition = SpeechRec ? new SpeechRec() : null;
    this.isListening = false;

    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 3;
    }
  }

  /**
   * Tính toán độ tương đồng giữa từ mẫu và từ người học phát âm
   */
  calculateSimilarity(str1, str2) {
    const s1 = (str1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = (str2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    if (s1 === s2) return 100;
    if (!s1 || !s2) return 0;

    // Khoảng cách Levenshtein đơn giản
    const track = Array(s2.length + 1).fill(null).map(() =>
      Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }
    const distance = track[s2.length][s1.length];
    const maxLen = Math.max(s1.length, s2.length);
    const score = Math.max(0, Math.round((1 - distance / maxLen) * 100));
    return score;
  }

  /**
   * Bắt đầu lắng nghe người dùng phát âm
   * @param {string} targetWord - Từ cần đọc đúng
   * @param {Function} onResult - Callback({ recognized, score, isMatch, feedback })
   * @param {Function} onError - Callback(errorMessage)
   * @param {Function} onEnd - Callback khi kết thúc
   */
  listen(targetWord, onResult, onError, onEnd) {
    if (!this.isSupported) {
      if (onError) onError('Trình duyệt không hỗ trợ nhận diện giọng nói (Speech Recognition). Vui lòng thử Chrome hoặc Edge.');
      return;
    }

    if (this.isListening) {
      try {
        this.recognition.abort();
      } catch (e) {}
    }

    this.isListening = true;

    this.recognition.onresult = (event) => {
      this.isListening = false;
      let bestScore = 0;
      let bestTranscript = '';

      for (let i = 0; i < event.results[0].length; i++) {
        const transcript = event.results[0][i].transcript.trim();
        const score = this.calculateSimilarity(targetWord, transcript);
        if (score > bestScore) {
          bestScore = score;
          bestTranscript = transcript;
        }
      }

      const isMatch = bestScore >= 75;
      let feedback = '';
      if (bestScore >= 90) {
        feedback = '🌟 Xuất sắc! Phát âm rất chuẩn bản ngữ!';
      } else if (bestScore >= 75) {
        feedback = '👍 Khá tốt! Người bản xứ hiểu được bạn.';
      } else if (bestScore >= 50) {
        feedback = '⚠️ Gần đúng, hãy nghe lại và nhấn mạnh đúng trọng âm nhé.';
      } else {
        feedback = '❌ Chưa chuẩn, hãy nghe mẫu và thử lại nào!';
      }

      if (onResult) {
        onResult({
          targetWord,
          recognized: bestTranscript,
          score: bestScore,
          isMatch,
          feedback
        });
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      let msg = 'Lỗi thu âm: ' + event.error;
      if (event.error === 'not-allowed') {
        msg = 'Vui lòng cấp quyền truy cập Microphone trong trình duyệt để luyện nói.';
      } else if (event.error === 'no-speech') {
        msg = 'Chưa nghe thấy giọng nói. Hãy nói to và rõ hơn nhé!';
      }
      if (onError) onError(msg);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      this.isListening = false;
      if (onError) onError(e.message);
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }
}

export const speechRec = new SpeechRecognitionService();
