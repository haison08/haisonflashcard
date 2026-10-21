/**
 * cardViewer.js - Quản lý trải nghiệm học flashcard 3D, lật thẻ, phím tắt, SRS & hiệu ứng ăn mừng
 */

import { storage } from '../services/storage.js';
import { srs, RATINGS } from '../services/srs.js';
import { audio } from '../services/audio.js';
import { speechRec } from '../services/speechRec.js';

class CardViewer {
  constructor() {
    this.currentDeck = null;
    this.cards = [];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.isRecording = false;
    this.sessionStats = {
      studied: 0,
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
      startTime: Date.now()
    };
    this.keyListenerAttached = false;
  }

  init(containerEl) {
    this.container = containerEl;
    this.attachGlobalKeys();
  }

  // Khởi động phiên học với một deck
  startSession(deckId, mode = 'all') {
    const deck = storage.getDeckById(deckId);
    if (!deck || !deck.cards || deck.cards.length === 0) {
      alert('Bộ từ này chưa có thẻ nào! Hãy thêm thẻ trước khi bắt đầu học nhé.');
      return false;
    }

    this.currentDeck = deck;
    let cardList = [...deck.cards];

    if (mode === 'due') {
      const dueCards = srs.getDueCards(cardList);
      cardList = dueCards.length > 0 ? dueCards : cardList;
    } else if (mode === 'favorites') {
      const favCards = cardList.filter(c => c.isFavorite);
      if (favCards.length > 0) cardList = favCards;
    }

    // Xáo trộn nhẹ để học tự nhiên hơn
    this.cards = cardList.sort(() => Math.random() - 0.5);
    this.currentIndex = 0;
    this.isFlipped = false;
    this.sessionStats = {
      studied: 0,
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
      startTime: Date.now()
    };

    this.render();
    return true;
  }

  getCurrentCard() {
    return this.cards[this.currentIndex] || null;
  }

  render() {
    if (!this.container) return;

    // Nếu đã học hết các thẻ trong phiên
    if (this.currentIndex >= this.cards.length) {
      this.renderCompleteScreen();
      return;
    }

    const card = this.getCurrentCard();
    if (!card) return;

    const progressPct = Math.round(((this.currentIndex) / this.cards.length) * 100);

    this.container.innerHTML = `
      <div class="study-view-container">
        <!-- Top Bar -->
        <div class="study-top-bar">
          <div class="study-deck-info">
            <button class="btn btn-icon btn-sm" id="btn-back-to-decks" title="Quay lại danh sách bộ từ">
              ←
            </button>
            <div>
              <div class="study-deck-title">${this.currentDeck.icon || '📚'} ${this.escapeHtml(this.currentDeck.name)}</div>
            </div>
          </div>

          <div class="study-progress-wrap">
            <div class="progress-text">
              <span>Tiến độ</span>
              <span><strong>${this.currentIndex + 1}</strong> / ${this.cards.length}</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
            </div>
          </div>
        </div>

        <!-- 3D Flashcard Container -->
        <div class="card-perspective-container">
          <div class="flashcard ${this.isFlipped ? 'is-flipped' : ''}" id="main-flashcard">
            
            <!-- Mặt trước (Front) -->
            <div class="card-face card-front">
              <div class="card-header-inner">
                <div class="card-meta-tags">
                  <span class="badge badge-level">${card.level || 'B1'}</span>
                  <span class="badge badge-pos">${card.partOfSpeech || 'noun'}</span>
                  <span class="badge badge-box-${card.box || 1}">Hộp ${card.box || 1}</span>
                </div>
                <button class="card-star-btn ${card.isFavorite ? 'active' : ''}" id="btn-toggle-star" title="Đánh dấu yêu thích">
                  ${card.isFavorite ? '★' : '☆'}
                </button>
              </div>

              <div class="card-body-front">
                <div class="word-display">${this.escapeHtml(card.word)}</div>
                ${card.ipa ? `<div class="ipa-display">${this.escapeHtml(card.ipa)}</div>` : ''}

                <div class="card-audio-controls">
                  <button class="audio-play-btn" id="btn-card-audio" title="Nghe phát âm (Phím A)">
                    🔊
                  </button>
                  <button class="mic-record-btn ${this.isRecording ? 'recording' : ''}" id="btn-card-mic" title="Kiểm tra phát âm (Phím M)">
                    🎙️
                  </button>
                </div>

                <!-- Hộp kết quả nhận diện giọng nói -->
                <div class="speech-result-box" id="speech-result-box"></div>
              </div>

              <div class="card-footer-hint">
                <span>Nhấn <span class="kbd">Space</span> hoặc nhấp vào thẻ để lật</span>
              </div>
            </div>

            <!-- Mặt sau (Back) -->
            <div class="card-face card-back">
              <div class="card-header-inner">
                <div class="card-meta-tags">
                  <span class="badge badge-level">${card.level || 'B1'}</span>
                  <span class="badge badge-pos">${card.partOfSpeech || 'noun'}</span>
                </div>
                <button class="card-star-btn ${card.isFavorite ? 'active' : ''}" id="btn-toggle-star-back">
                  ${card.isFavorite ? '★' : '☆'}
                </button>
              </div>

              <div class="card-body-back">
                <div class="meaning-section">
                  <div class="meaning-text">${this.escapeHtml(card.meaning)}</div>
                  ${card.definition ? `<div class="definition-text">"${this.escapeHtml(card.definition)}"</div>` : ''}
                </div>

                ${card.example ? `
                  <div class="example-box">
                    <div class="example-en">💬 ${this.highlightWord(card.example, card.word)}</div>
                    ${card.exampleTranslation ? `<div class="example-vi">${this.escapeHtml(card.exampleTranslation)}</div>` : ''}
                  </div>
                ` : ''}

                ${card.synonyms && card.synonyms.length > 0 ? `
                  <div class="synonyms-row">
                    <span>Đồng nghĩa:</span>
                    ${card.synonyms.map(syn => `<span class="synonym-pill">${this.escapeHtml(syn)}</span>`).join('')}
                  </div>
                ` : ''}
              </div>

              <div class="card-footer-hint">
                <span>Chọn mức độ nhớ bên dưới để tiếp tục</span>
              </div>
            </div>

          </div>
        </div>

        <!-- SRS Buttons Grid -->
        <div class="srs-controls-wrapper">
          <div class="srs-buttons-grid">
            <button class="srs-btn srs-btn-again" data-rating="1">
              <span class="srs-shortcut-key">1</span>
              <span class="srs-btn-title">Chưa nhớ</span>
              <span class="srs-btn-interval">&lt; 10 phút</span>
            </button>
            <button class="srs-btn srs-btn-hard" data-rating="2">
              <span class="srs-shortcut-key">2</span>
              <span class="srs-btn-title">Khó</span>
              <span class="srs-btn-interval">1 ngày</span>
            </button>
            <button class="srs-btn srs-btn-good" data-rating="3">
              <span class="srs-shortcut-key">3</span>
              <span class="srs-btn-title">Nhớ tốt</span>
              <span class="srs-btn-interval">3 ngày</span>
            </button>
            <button class="srs-btn srs-btn-easy" data-rating="4">
              <span class="srs-shortcut-key">4</span>
              <span class="srs-btn-title">Quá dễ</span>
              <span class="srs-btn-interval">7 ngày</span>
            </button>
          </div>

          <div class="card-nav-row">
            <button class="btn btn-secondary btn-sm" id="btn-card-prev" ${this.currentIndex === 0 ? 'disabled' : ''}>
              ← Thẻ trước
            </button>
            <button class="btn btn-outline btn-sm" id="btn-card-flip">
              🔄 Lật thẻ (Space)
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-card-next">
              Bỏ qua →
            </button>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();

    // Tự động phát âm nếu bật trong cài đặt
    if (storage.settings.autoPlayAudio) {
      audio.speak(card.word);
    }
  }

  bindEvents() {
    const flashcardEl = document.getElementById('main-flashcard');
    const btnFlip = document.getElementById('btn-card-flip');
    const btnAudio = document.getElementById('btn-card-audio');
    const btnMic = document.getElementById('btn-card-mic');
    const btnBack = document.getElementById('btn-back-to-decks');
    const btnPrev = document.getElementById('btn-card-prev');
    const btnNext = document.getElementById('btn-card-next');
    const btnStarFront = document.getElementById('btn-toggle-star');
    const btnStarBack = document.getElementById('btn-toggle-star-back');

    // Lật thẻ khi nhấp vào thân thẻ (trừ khi nhấp vào nút âm thanh hoặc nút sao)
    if (flashcardEl) {
      flashcardEl.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        this.toggleFlip();
      });
    }

    if (btnFlip) {
      btnFlip.addEventListener('click', () => this.toggleFlip());
    }

    if (btnAudio) {
      btnAudio.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playAudio();
      });
    }

    if (btnMic) {
      btnMic.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSpeechRecognition();
      });
    }

    if (btnStarFront) {
      btnStarFront.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleStar();
      });
    }

    if (btnStarBack) {
      btnStarBack.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleStar();
      });
    }

    if (btnPrev && this.currentIndex > 0) {
      btnPrev.addEventListener('click', () => {
        this.currentIndex--;
        this.isFlipped = false;
        audio.playClick();
        this.render();
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.currentIndex++;
        this.isFlipped = false;
        audio.playClick();
        this.render();
      });
    }

    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (window.app && window.app.switchTab) {
          window.app.switchTab('decks');
        }
      });
    }

    // Các nút đánh giá SRS
    const srsBtns = this.container.querySelectorAll('.srs-btn');
    srsBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.getAttribute('data-rating'), 10);
        this.handleSRSAnswer(rating);
      });
    });
  }

  toggleFlip() {
    this.isFlipped = !this.isFlipped;
    const cardEl = document.getElementById('main-flashcard');
    if (cardEl) {
      cardEl.classList.toggle('is-flipped', this.isFlipped);
    }
    audio.playFlip();
  }

  playAudio() {
    const card = this.getCurrentCard();
    if (!card) return;
    audio.speak(card.word);
  }

  toggleSpeechRecognition() {
    const card = this.getCurrentCard();
    if (!card) return;

    const micBtn = document.getElementById('btn-card-mic');
    const resultBox = document.getElementById('speech-result-box');

    if (this.isRecording) {
      speechRec.stop();
      this.isRecording = false;
      if (micBtn) micBtn.classList.remove('recording');
      return;
    }

    this.isRecording = true;
    if (micBtn) micBtn.classList.add('recording');
    if (resultBox) {
      resultBox.classList.add('active');
      resultBox.innerHTML = `<em>Đang lắng nghe bạn đọc từ "<strong>${this.escapeHtml(card.word)}</strong>"...</em>`;
    }

    speechRec.listen(
      card.word,
      (res) => {
        this.isRecording = false;
        if (micBtn) micBtn.classList.remove('recording');

        if (res.isMatch) {
          audio.playSuccess();
        } else {
          audio.playWrong();
        }

        if (resultBox) {
          resultBox.innerHTML = `
            <div style="font-weight: 700; color: ${res.isMatch ? '#10b981' : '#ef4444'}; margin-bottom: 2px;">
              ${res.feedback}
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">
              Máy nghe được: "<strong>${this.escapeHtml(res.recognized || '(chưa rõ)')}</strong>" (${res.score}% khớp)
            </div>
          `;
        }
      },
      (err) => {
        this.isRecording = false;
        if (micBtn) micBtn.classList.remove('recording');
        if (resultBox) {
          resultBox.innerHTML = `<span style="color: #ef4444;">${this.escapeHtml(err)}</span>`;
        }
      },
      () => {
        this.isRecording = false;
        if (micBtn) micBtn.classList.remove('recording');
      }
    );
  }

  toggleStar() {
    const card = this.getCurrentCard();
    if (!card) return;
    const isFav = storage.toggleFavorite(this.currentDeck.id, card.id);
    card.isFavorite = isFav;

    const star1 = document.getElementById('btn-toggle-star');
    const star2 = document.getElementById('btn-toggle-star-back');
    if (star1) {
      star1.classList.toggle('active', isFav);
      star1.textContent = isFav ? '★' : '☆';
    }
    if (star2) {
      star2.classList.toggle('active', isFav);
      star2.textContent = isFav ? '★' : '☆';
    }
  }

  handleSRSAnswer(rating) {
    const card = this.getCurrentCard();
    if (!card) return;

    // Cập nhật card theo thuật toán SRS
    const srsResult = srs.calculateNextReview(card, rating);
    storage.updateCard(this.currentDeck.id, card.id, srsResult);

    // Ghi log học tập
    storage.recordStudySession({
      cardId: card.id,
      deckId: this.currentDeck.id,
      rating: rating,
      isCorrect: rating >= RATINGS.GOOD,
      mode: 'flashcard'
    });

    // Thống kê phiên học
    this.sessionStats.studied++;
    if (rating === RATINGS.AGAIN) this.sessionStats.again++;
    else if (rating === RATINGS.HARD) this.sessionStats.hard++;
    else if (rating === RATINGS.GOOD) this.sessionStats.good++;
    else if (rating === RATINGS.EASY) this.sessionStats.easy++;

    if (rating >= RATINGS.GOOD) {
      audio.playSuccess();
    } else {
      audio.playWrong();
    }

    // Chuyển sang thẻ tiếp theo
    this.currentIndex++;
    this.isFlipped = false;
    this.render();
  }

  renderCompleteScreen() {
    audio.playVictory();
    this.fireConfetti();

    const accuracy = this.sessionStats.studied > 0
      ? Math.round(((this.sessionStats.good + this.sessionStats.easy) / this.sessionStats.studied) * 100)
      : 100;

    this.container.innerHTML = `
      <div class="study-view-container">
        <div class="complete-screen active">
          <div class="trophy-icon">🏆</div>
          <h2 class="complete-title">Tuyệt vời! Bạn đã hoàn thành bài học!</h2>
          <p style="color: var(--text-muted); font-size: 1.05rem;">
            Bạn đã ôn tập toàn bộ <strong>${this.sessionStats.studied}</strong> thẻ trong bộ <strong>${this.escapeHtml(this.currentDeck.name)}</strong>.
          </p>

          <div class="complete-stats-row">
            <div class="stat-bubble">
              <div class="stat-bubble-val">${this.sessionStats.studied}</div>
              <div class="stat-bubble-lbl">Thẻ đã học</div>
            </div>
            <div class="stat-bubble">
              <div class="stat-bubble-val" style="color: #10b981;">${accuracy}%</div>
              <div class="stat-bubble-lbl">Tỷ lệ nhớ tốt</div>
            </div>
            <div class="stat-bubble">
              <div class="stat-bubble-val" style="color: #f59e0b;">🔥 ${storage.streak.current}</div>
              <div class="stat-bubble-lbl">Ngày liên tiếp</div>
            </div>
          </div>

          <div class="complete-actions">
            <button class="btn btn-primary" id="btn-complete-restart">
              🔄 Học lại bộ từ này
            </button>
            <button class="btn btn-outline" id="btn-complete-quiz">
              🎯 Thử thách Trắc nghiệm
            </button>
            <button class="btn btn-secondary" id="btn-complete-back">
              📚 Về danh sách bộ từ
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-complete-restart')?.addEventListener('click', () => {
      this.startSession(this.currentDeck.id);
    });

    document.getElementById('btn-complete-quiz')?.addEventListener('click', () => {
      if (window.app && window.app.switchTab) {
        window.app.switchTab('quiz');
        if (window.app.quizMode) {
          window.app.quizMode.startQuiz(this.currentDeck.id);
        }
      }
    });

    document.getElementById('btn-complete-back')?.addEventListener('click', () => {
      if (window.app && window.app.switchTab) {
        window.app.switchTab('decks');
      }
    });
  }

  // Hiệu ứng pháo hoa ăn mừng nhẹ nhàng trên canvas
  fireConfetti() {
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '9999';
      document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899'];

    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.8) * 15,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // trọng lực
        p.rotation += p.rSpeed;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (frame < 90) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(animate);
  }

  attachGlobalKeys() {
    if (this.keyListenerAttached) return;
    this.keyListenerAttached = true;

    window.addEventListener('keydown', (e) => {
      // Chỉ kích hoạt khi đang ở view flashcard và không đang gõ text input
      const activeTab = document.querySelector('.tab-btn.active');
      if (!activeTab || activeTab.getAttribute('data-tab') !== 'study') return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.toggleFlip();
      } else if (e.key === '1') {
        this.handleSRSAnswer(RATINGS.AGAIN);
      } else if (e.key === '2') {
        this.handleSRSAnswer(RATINGS.HARD);
      } else if (e.key === '3') {
        this.handleSRSAnswer(RATINGS.GOOD);
      } else if (e.key === '4') {
        this.handleSRSAnswer(RATINGS.EASY);
      } else if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'p') {
        this.playAudio();
      } else if (e.key.toLowerCase() === 'm') {
        this.toggleSpeechRecognition();
      }
    });
  }

  highlightWord(sentence, word) {
    if (!sentence || !word) return this.escapeHtml(sentence || '');
    const cleanWord = word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${cleanWord})`, 'gi');
    return this.escapeHtml(sentence).replace(regex, '<strong style="color: var(--color-primary); text-decoration: underline;">$1</strong>');
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

export const cardViewer = new CardViewer();
