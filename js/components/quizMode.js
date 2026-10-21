/**
 * quizMode.js - Các chế độ ôn tập thông minh: Trắc nghiệm, Luyện gõ từ, Thử thách nghe & Nối từ
 */

import { storage } from '../services/storage.js';
import { audio } from '../services/audio.js';

class QuizMode {
  constructor() {
    this.container = null;
    this.currentMode = 'mcq'; // 'mcq' | 'spelling' | 'listening' | 'match'
    this.currentDeckId = null;
    this.cards = [];
    this.currentIndex = 0;
    this.score = 0;
    this.quizStreak = 0;
    this.totalQuestions = 10;

    // Match game state
    this.matchTiles = [];
    this.firstSelectedTile = null;
    this.matchesFound = 0;
    this.matchTimer = null;
    this.matchSeconds = 0;
  }

  init(containerEl) {
    this.container = containerEl;
  }

  startQuiz(deckId = null, mode = 'mcq') {
    const decks = storage.getDecks();
    if (decks.length === 0) return;

    this.currentDeckId = deckId || decks[0].id;
    this.currentMode = mode;
    this.loadCardsForDeck();
    this.render();
  }

  loadCardsForDeck() {
    const deck = storage.getDeckById(this.currentDeckId);
    if (!deck || !deck.cards || deck.cards.length === 0) {
      this.cards = [];
      return;
    }
    // Lấy thẻ và xáo trộn ngẫu nhiên
    this.cards = [...deck.cards].sort(() => Math.random() - 0.5);
    this.currentIndex = 0;
    this.score = 0;
    this.quizStreak = 0;
    this.totalQuestions = Math.min(10, this.cards.length);
  }

  render() {
    if (!this.container) return;
    const decks = storage.getDecks();

    if (this.cards.length < 4) {
      this.container.innerHTML = `
        <div class="quiz-container">
          <div class="quiz-box" style="text-align: center; padding: 3rem 1.5rem;">
            <h3>Bộ từ cần tối thiểu 4 thẻ để bắt đầu kiểm tra!</h3>
            <p style="color: var(--text-muted); margin: 1rem 0 1.5rem;">
              Vui lòng chọn bộ từ khác hoặc thêm thêm từ vựng mới vào bộ này nhé.
            </p>
            <div style="max-width: 280px; margin: 0 auto;">
              <select class="form-select" id="quiz-deck-select">
                ${decks.map(d => `<option value="${d.id}" ${d.id === this.currentDeckId ? 'selected' : ''}>${d.icon} ${this.escapeHtml(d.name)} (${d.cards.length} thẻ)</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
      `;
      document.getElementById('quiz-deck-select')?.addEventListener('change', (e) => {
        this.currentDeckId = e.target.value;
        this.loadCardsForDeck();
        this.render();
      });
      return;
    }

    this.container.innerHTML = `
      <div class="quiz-container">
        <!-- Deck Selector & Modes Nav -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label class="form-label" style="margin: 0; font-size: 0.9rem;">Bộ từ:</label>
            <select class="form-select" id="quiz-deck-select" style="width: auto; padding: 0.45rem 1rem;">
              ${decks.map(d => `<option value="${d.id}" ${d.id === this.currentDeckId ? 'selected' : ''}>${d.icon} ${this.escapeHtml(d.name)} (${d.cards.length} thẻ)</option>`).join('')}
            </select>
          </div>

          <div class="quiz-modes-nav" style="margin-bottom: 0;">
            <button class="quiz-mode-pill ${this.currentMode === 'mcq' ? 'active' : ''}" data-mode="mcq">
              🎯 Trắc nghiệm
            </button>
            <button class="quiz-mode-pill ${this.currentMode === 'spelling' ? 'active' : ''}" data-mode="spelling">
              ✍️ Gõ từ
            </button>
            <button class="quiz-mode-pill ${this.currentMode === 'listening' ? 'active' : ''}" data-mode="listening">
              🎧 Thử thách nghe
            </button>
            <button class="quiz-mode-pill ${this.currentMode === 'match' ? 'active' : ''}" data-mode="match">
              🧩 Ghép cặp
            </button>
          </div>
        </div>

        <!-- Mode Content Container -->
        <div id="quiz-content-area"></div>
      </div>
    `;

    // Bind dropdown deck
    document.getElementById('quiz-deck-select')?.addEventListener('change', (e) => {
      this.currentDeckId = e.target.value;
      this.loadCardsForDeck();
      this.render();
    });

    // Bind mode pills
    this.container.querySelectorAll('.quiz-mode-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.currentMode = mode;
        this.loadCardsForDeck();
        this.render();
      });
    });

    // Render specific mode
    const contentArea = document.getElementById('quiz-content-area');
    if (this.currentMode === 'mcq') {
      this.renderMCQ(contentArea);
    } else if (this.currentMode === 'spelling') {
      this.renderSpelling(contentArea);
    } else if (this.currentMode === 'listening') {
      this.renderListening(contentArea);
    } else if (this.currentMode === 'match') {
      this.renderMatchGame(contentArea);
    }
  }

  // ===== 1. MULTIPLE CHOICE QUIZ (TRẮC NGHIỆM) =====
  renderMCQ(contentArea) {
    if (this.currentIndex >= this.totalQuestions) {
      this.renderSummary(contentArea);
      return;
    }

    const currentCard = this.cards[this.currentIndex];
    // Tạo 4 đáp án (1 đúng, 3 distractors)
    const otherCards = this.cards.filter(c => c.id !== currentCard.id);
    const shuffledOthers = otherCards.sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [currentCard, ...shuffledOthers].sort(() => Math.random() - 0.5);

    contentArea.innerHTML = `
      <div class="quiz-box">
        <div class="quiz-header-bar">
          <div>Câu <strong>${this.currentIndex + 1}</strong> / ${this.totalQuestions}</div>
          <div class="quiz-score-pill">Điểm: ${this.score} ${this.quizStreak >= 2 ? `🔥x${this.quizStreak}` : ''}</div>
        </div>

        <div class="quiz-question-center">
          <div class="quiz-prompt-label">Nghĩa của từ vựng này là gì?</div>
          <div class="quiz-prompt-word">${this.escapeHtml(currentCard.word)}</div>
          ${currentCard.ipa ? `<div class="quiz-prompt-hint">${this.escapeHtml(currentCard.ipa)} • <em>${currentCard.partOfSpeech || ''}</em></div>` : ''}
        </div>

        <div class="quiz-options-grid">
          ${options.map(opt => `
            <button class="quiz-option-btn" data-card-id="${opt.id}">
              <span>${this.escapeHtml(opt.meaning)}</span>
              <span class="opt-badge" style="opacity: 0.5; font-size: 0.85rem;">${opt.level || 'B1'}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Tự động phát âm từ để tăng phản xạ nghe
    audio.speak(currentCard.word);

    const optionBtns = contentArea.querySelectorAll('.quiz-option-btn');
    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const selectedId = btn.getAttribute('data-card-id');
        const isCorrect = selectedId === currentCard.id;

        // Disable all buttons to prevent spamming
        optionBtns.forEach(b => {
          b.disabled = true;
          if (b.getAttribute('data-card-id') === currentCard.id) {
            b.classList.add('correct');
          }
        });

        if (isCorrect) {
          btn.classList.add('correct');
          this.score += 10 + (this.quizStreak * 2);
          this.quizStreak++;
          audio.playSuccess();
        } else {
          btn.classList.add('wrong');
          this.quizStreak = 0;
          audio.playWrong();
        }

        // Lưu log
        storage.recordStudySession({
          cardId: currentCard.id,
          deckId: this.currentDeckId,
          isCorrect: isCorrect,
          mode: 'quiz-mcq'
        });

        setTimeout(() => {
          this.currentIndex++;
          this.renderMCQ(contentArea);
        }, 1100);
      });
    });
  }

  // ===== 2. SPELLING CHALLENGE (LUYỆN GÕ TỪ) =====
  renderSpelling(contentArea) {
    if (this.currentIndex >= this.totalQuestions) {
      this.renderSummary(contentArea);
      return;
    }

    const currentCard = this.cards[this.currentIndex];

    contentArea.innerHTML = `
      <div class="quiz-box">
        <div class="quiz-header-bar">
          <div>Câu <strong>${this.currentIndex + 1}</strong> / ${this.totalQuestions}</div>
          <div class="quiz-score-pill">Điểm: ${this.score}</div>
        </div>

        <div class="quiz-question-center">
          <div class="quiz-prompt-label">Gõ từ tiếng Anh tương ứng với nghĩa:</div>
          <div class="quiz-prompt-word" style="font-size: 2rem; color: var(--color-primary);">${this.escapeHtml(currentCard.meaning)}</div>
          ${currentCard.definition ? `<div class="quiz-prompt-hint" style="color: var(--text-muted);">"${this.escapeHtml(currentCard.definition)}"</div>` : ''}
          <div style="margin-top: 1rem;">
            <button class="btn btn-outline btn-sm" id="btn-spelling-audio">
              🔊 Nghe phát âm gợi ý
            </button>
          </div>
        </div>

        <div class="spelling-box">
          <div class="spelling-input-row">
            <input type="text" class="spelling-input" id="spelling-input" placeholder="Nhập từ tiếng Anh..." autofocus autocomplete="off" />
            <button class="btn btn-primary" id="btn-spelling-submit">Kiểm tra</button>
          </div>
          <div id="spelling-feedback" style="min-height: 24px; font-weight: 600; font-size: 0.95rem;"></div>
        </div>
      </div>
    `;

    const inputEl = document.getElementById('spelling-input');
    const submitBtn = document.getElementById('btn-spelling-submit');
    const audioBtn = document.getElementById('btn-spelling-audio');
    const feedbackEl = document.getElementById('spelling-feedback');

    audioBtn?.addEventListener('click', () => {
      audio.speak(currentCard.word);
    });

    const checkSpelling = () => {
      const userVal = inputEl.value.trim().toLowerCase();
      const targetVal = currentCard.word.trim().toLowerCase();
      const isCorrect = userVal === targetVal;

      inputEl.disabled = true;
      submitBtn.disabled = true;

      if (isCorrect) {
        inputEl.classList.add('correct');
        feedbackEl.style.color = '#10b981';
        feedbackEl.textContent = '🌟 Chính xác 100%! Tuyệt vời!';
        this.score += 15;
        this.quizStreak++;
        audio.playSuccess();
      } else {
        inputEl.classList.add('wrong');
        feedbackEl.style.color = '#ef4444';
        feedbackEl.innerHTML = `❌ Chưa đúng! Từ chính xác là: <strong>${this.escapeHtml(currentCard.word)}</strong>`;
        this.quizStreak = 0;
        audio.playWrong();
      }

      storage.recordStudySession({
        cardId: currentCard.id,
        deckId: this.currentDeckId,
        isCorrect: isCorrect,
        mode: 'quiz-spelling'
      });

      setTimeout(() => {
        this.currentIndex++;
        this.renderSpelling(contentArea);
      }, 1500);
    };

    submitBtn?.addEventListener('click', checkSpelling);
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') checkSpelling();
    });
  }

  // ===== 3. LISTENING CHALLENGE (THỬ THÁCH NGHE) =====
  renderListening(contentArea) {
    if (this.currentIndex >= this.totalQuestions) {
      this.renderSummary(contentArea);
      return;
    }

    const currentCard = this.cards[this.currentIndex];
    const otherCards = this.cards.filter(c => c.id !== currentCard.id);
    const options = [currentCard, ...otherCards.slice(0, 3)].sort(() => Math.random() - 0.5);

    contentArea.innerHTML = `
      <div class="quiz-box">
        <div class="quiz-header-bar">
          <div>Câu <strong>${this.currentIndex + 1}</strong> / ${this.totalQuestions}</div>
          <div class="quiz-score-pill">Điểm: ${this.score}</div>
        </div>

        <div class="quiz-question-center">
          <div class="quiz-prompt-label">Lắng nghe phát âm và chọn từ đúng:</div>
          <div class="listening-center-wave">
            <button class="pulse-speaker-btn" id="btn-pulse-listen" title="Bấm để nghe lại">
              🔊
            </button>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.75rem;">
              Bấm loa để nghe lại nếu cần
            </div>
          </div>
        </div>

        <div class="quiz-options-grid" style="grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          ${options.map(opt => `
            <button class="quiz-option-btn" data-card-id="${opt.id}" style="justify-content: center; text-align: center; font-size: 1.15rem; font-weight: 700;">
              ${this.escapeHtml(opt.word)}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Tự động phát âm thanh khi vào câu
    audio.speak(currentCard.word);

    document.getElementById('btn-pulse-listen')?.addEventListener('click', () => {
      audio.speak(currentCard.word);
    });

    const optionBtns = contentArea.querySelectorAll('.quiz-option-btn');
    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const isCorrect = btn.getAttribute('data-card-id') === currentCard.id;
        optionBtns.forEach(b => {
          b.disabled = true;
          if (b.getAttribute('data-card-id') === currentCard.id) b.classList.add('correct');
        });

        if (isCorrect) {
          btn.classList.add('correct');
          this.score += 10;
          audio.playSuccess();
        } else {
          btn.classList.add('wrong');
          audio.playWrong();
        }

        setTimeout(() => {
          this.currentIndex++;
          this.renderListening(contentArea);
        }, 1200);
      });
    });
  }

  // ===== 4. WORD MATCHING GAME (GHÉP CẶP TỪ - NGHĨA) =====
  renderMatchGame(contentArea) {
    if (this.cards.length < 6) {
      contentArea.innerHTML = `<div class="quiz-box" style="text-align: center;">Cần tối thiểu 6 từ để chơi trò chơi ghép cặp!</div>`;
      return;
    }

    // Chọn 6 từ ngẫu nhiên
    const sampleCards = [...this.cards].sort(() => Math.random() - 0.5).slice(0, 6);
    this.matchesFound = 0;
    this.matchSeconds = 0;
    clearInterval(this.matchTimer);

    // Tạo 12 ô (6 ô tiếng Anh, 6 ô tiếng Việt)
    const tiles = [];
    sampleCards.forEach(c => {
      tiles.push({ id: `en-${c.id}`, cardId: c.id, text: c.word, type: 'en' });
      tiles.push({ id: `vi-${c.id}`, cardId: c.id, text: c.meaning, type: 'vi' });
    });

    this.matchTiles = tiles.sort(() => Math.random() - 0.5);

    contentArea.innerHTML = `
      <div class="quiz-box">
        <div class="quiz-header-bar">
          <div>Đã ghép: <strong id="match-count">0</strong> / 6 cặp</div>
          <div class="quiz-score-pill">⏱️ Thời gian: <span id="match-timer-val">0s</span></div>
        </div>

        <div style="text-align: center; margin-bottom: 1.25rem; font-size: 0.9rem; color: var(--text-muted);">
          Nhấp chọn một từ tiếng Anh và ghép với nghĩa tiếng Việt tương ứng càng nhanh càng tốt!
        </div>

        <div class="match-game-grid" id="match-grid">
          ${this.matchTiles.map(tile => `
            <div class="match-tile" data-tile-id="${tile.id}" data-card-id="${tile.cardId}" data-type="${tile.type}">
              ${this.escapeHtml(tile.text)}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Đồng hồ đếm giây
    const timerValEl = document.getElementById('match-timer-val');
    this.matchTimer = setInterval(() => {
      this.matchSeconds++;
      if (timerValEl) timerValEl.textContent = `${this.matchSeconds}s`;
    }, 1000);

    const tileElements = contentArea.querySelectorAll('.match-tile');
    tileElements.forEach(el => {
      el.addEventListener('click', () => this.handleTileClick(el, contentArea));
    });
  }

  handleTileClick(tileEl, contentArea) {
    if (tileEl.classList.contains('matched') || tileEl === this.firstSelectedTile) return;

    audio.playClick();

    if (!this.firstSelectedTile) {
      // Chọn ô đầu tiên
      this.firstSelectedTile = tileEl;
      tileEl.classList.add('selected');
    } else {
      // Đã chọn ô thứ hai -> Kiểm tra khớp
      const first = this.firstSelectedTile;
      const second = tileEl;
      this.firstSelectedTile = null;

      const cardId1 = first.getAttribute('data-card-id');
      const cardId2 = second.getAttribute('data-card-id');
      const type1 = first.getAttribute('data-type');
      const type2 = second.getAttribute('data-type');

      // Phải khác loại (một bên là EN, một bên là VI) và cùng cardId
      if (cardId1 === cardId2 && type1 !== type2) {
        // Đúng cặp!
        first.classList.remove('selected');
        second.classList.remove('selected');
        first.classList.add('matched');
        second.classList.add('matched');
        this.matchesFound++;
        audio.playSuccess();

        document.getElementById('match-count').textContent = this.matchesFound;

        // Nếu đã hoàn thành cả 6 cặp
        if (this.matchesFound >= 6) {
          clearInterval(this.matchTimer);
          audio.playVictory();
          if (window.app && window.app.cardViewer) {
            window.app.cardViewer.fireConfetti();
          }

          setTimeout(() => {
            contentArea.innerHTML = `
              <div class="quiz-box" style="text-align: center; padding: 3rem 1.5rem;">
                <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">⚡</div>
                <h2 style="font-family: var(--font-heading); margin-bottom: 0.5rem;">Xuất sắc! Đã ghép hết 6 cặp!</h2>
                <p style="color: var(--text-muted); font-size: 1.05rem;">
                  Thời gian hoàn thành: <strong>${this.matchSeconds} giây</strong>. Trí nhớ của bạn rất tuyệt vời!
                </p>
                <div style="margin-top: 2rem; display: flex; justify-content: center; gap: 1rem;">
                  <button class="btn btn-primary" id="btn-rematch">Chơi lại ván mới</button>
                  <button class="btn btn-outline" id="btn-back-mcq">Ôn trắc nghiệm</button>
                </div>
              </div>
            `;
            document.getElementById('btn-rematch')?.addEventListener('click', () => {
              this.renderMatchGame(contentArea);
            });
            document.getElementById('btn-back-mcq')?.addEventListener('click', () => {
              this.currentMode = 'mcq';
              this.loadCardsForDeck();
              this.render();
            });
          }, 600);
        }
      } else {
        // Sai cặp!
        second.classList.add('wrong');
        first.classList.add('wrong');
        audio.playWrong();

        setTimeout(() => {
          first.classList.remove('selected', 'wrong');
          second.classList.remove('wrong');
        }, 500);
      }
    }
  }

  // Màn hình tổng kết sau phiên trắc nghiệm / gõ từ / nghe
  renderSummary(contentArea) {
    audio.playVictory();
    if (window.app && window.app.cardViewer) {
      window.app.cardViewer.fireConfetti();
    }

    const accuracy = Math.round((this.score / (this.totalQuestions * 10)) * 100);

    contentArea.innerHTML = `
      <div class="quiz-box" style="text-align: center; padding: 3rem 2rem;">
        <div style="font-size: 3.5rem; margin-bottom: 0.75rem;">🎉</div>
        <h2 style="font-family: var(--font-heading); font-size: 1.85rem; margin-bottom: 0.5rem;">Hoàn thành bài kiểm tra!</h2>
        <p style="color: var(--text-muted); font-size: 1rem;">
          Bạn vừa hoàn thành xuất sắc ${this.totalQuestions} câu hỏi ôn tập.
        </p>

        <div style="display: flex; justify-content: center; gap: 2rem; margin: 2rem 0;">
          <div style="background: var(--bg-surface-elevated); padding: 1rem 1.5rem; border-radius: var(--radius-lg); min-width: 130px;">
            <div style="font-size: 2.2rem; font-weight: 800; color: var(--color-primary);">${this.score}</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">Tổng điểm</div>
          </div>
          <div style="background: var(--bg-surface-elevated); padding: 1rem 1.5rem; border-radius: var(--radius-lg); min-width: 130px;">
            <div style="font-size: 2.2rem; font-weight: 800; color: #10b981;">${accuracy}%</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">Độ chính xác</div>
          </div>
        </div>

        <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
          <button class="btn btn-primary" id="btn-quiz-retry">
            🔄 Làm bài kiểm tra khác
          </button>
          <button class="btn btn-outline" id="btn-quiz-to-flashcard">
            📖 Ôn lại dạng Flashcard 3D
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-quiz-retry')?.addEventListener('click', () => {
      this.loadCardsForDeck();
      this.render();
    });

    document.getElementById('btn-quiz-to-flashcard')?.addEventListener('click', () => {
      if (window.app && window.app.switchTab) {
        window.app.switchTab('study');
        if (window.app.cardViewer) {
          window.app.cardViewer.startSession(this.currentDeckId);
        }
      }
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

export const quizMode = new QuizMode();
