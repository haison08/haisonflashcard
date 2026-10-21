/**
 * storage.js - Quản lý lưu trữ LocalStorage theo từng tài khoản người dùng độc lập
 */

import { DEFAULT_DECKS } from '../data/defaultDecks.js';
import { auth } from './auth.js';

class StorageService {
  constructor() {
    this.decks = [];
    this.settings = {};
    this.logs = [];
    this.streak = { current: 0, longest: 0, lastDate: null };

    // Khởi tạo theo người dùng hiện tại
    this.reloadForUser(auth.getCurrentUser());

    // Đăng ký lắng nghe khi chuyển đổi tài khoản hoặc đăng xuất
    auth.onAuthStateChanged((user) => {
      this.reloadForUser(user);
    });
  }

  // Tải lại toàn bộ dữ liệu ứng với tài khoản đang đăng nhập
  reloadForUser(user) {
    if (user) {
      this.decks = user.decks || JSON.parse(JSON.stringify(DEFAULT_DECKS));
      this.settings = user.settings || {
        theme: 'dark',
        accent: 'en-US',
        speechRate: 1.0,
        autoPlayAudio: false,
        soundEffects: true
      };
      this.logs = user.logs || [];
      this.streak = user.streak || { current: 0, longest: 0, lastDate: null };
    } else {
      // Nếu chưa đăng nhập, sử dụng bản sao tạm
      this.decks = JSON.parse(JSON.stringify(DEFAULT_DECKS));
      this.settings = {
        theme: 'dark',
        accent: 'en-US',
        speechRate: 1.0,
        autoPlayAudio: false,
        soundEffects: true
      };
      this.logs = [];
      this.streak = { current: 0, longest: 0, lastDate: null };
    }
  }

  // Lưu dữ liệu vào tài khoản đang đăng nhập
  persist() {
    if (auth.getCurrentUser()) {
      auth.saveCurrentUser({
        decks: this.decks,
        settings: this.settings,
        logs: this.logs,
        streak: this.streak
      });
    }
  }

  // ===== DECKS MANAGEMENT =====

  getDecks() {
    return this.decks;
  }

  saveDecks(decks = this.decks) {
    this.decks = decks;
    this.persist();
  }

  getDeckById(deckId) {
    return this.decks.find(d => d.id === deckId) || null;
  }

  createDeck({ name, description, icon = '📚', color = '#6366f1' }) {
    const newDeck = {
      id: 'deck-' + Date.now(),
      name: name.trim(),
      description: description.trim(),
      icon: icon || '📚',
      color: color || '#6366f1',
      cards: []
    };
    this.decks.push(newDeck);
    this.persist();
    return newDeck;
  }

  updateDeck(deckId, updates) {
    const deck = this.getDeckById(deckId);
    if (!deck) return null;
    Object.assign(deck, updates);
    this.persist();
    return deck;
  }

  deleteDeck(deckId) {
    this.decks = this.decks.filter(d => d.id !== deckId);
    this.persist();
    return true;
  }

  // ===== CARD MANAGEMENT =====

  addCard(deckId, cardData) {
    const deck = this.getDeckById(deckId);
    if (!deck) return null;

    const newCard = {
      id: 'card-' + Date.now(),
      word: cardData.word.trim(),
      ipa: cardData.ipa ? cardData.ipa.trim() : '',
      partOfSpeech: cardData.partOfSpeech || 'noun',
      meaning: cardData.meaning.trim(),
      definition: cardData.definition ? cardData.definition.trim() : '',
      example: cardData.example ? cardData.example.trim() : '',
      exampleTranslation: cardData.exampleTranslation ? cardData.exampleTranslation.trim() : '',
      synonyms: Array.isArray(cardData.synonyms) ? cardData.synonyms : (cardData.synonyms ? cardData.synonyms.split(',').map(s => s.trim()).filter(Boolean) : []),
      level: cardData.level || 'B1',
      box: 1,
      reps: 0,
      nextReview: null,
      isFavorite: false
    };

    deck.cards.push(newCard);
    this.persist();
    return newCard;
  }

  updateCard(deckId, cardId, updates) {
    const deck = this.getDeckById(deckId);
    if (!deck) return null;
    const card = deck.cards.find(c => c.id === cardId);
    if (!card) return null;

    Object.assign(card, updates);
    this.persist();
    return card;
  }

  deleteCard(deckId, cardId) {
    const deck = this.getDeckById(deckId);
    if (!deck) return false;
    deck.cards = deck.cards.filter(c => c.id !== cardId);
    this.persist();
    return true;
  }

  toggleFavorite(deckId, cardId) {
    const deck = this.getDeckById(deckId);
    if (!deck) return null;
    const card = deck.cards.find(c => c.id === cardId);
    if (!card) return null;

    card.isFavorite = !card.isFavorite;
    this.persist();
    return card.isFavorite;
  }

  // ===== SETTINGS =====

  loadSettings() {
    return this.settings;
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.persist();
    return this.settings;
  }

  // ===== STUDY LOGS & STREAK =====

  recordStudySession({ cardId, deckId, rating, isCorrect = true, mode = 'flashcard' }) {
    const log = {
      timestamp: Date.now(),
      dateStr: new Date().toISOString().split('T')[0],
      cardId,
      deckId,
      rating,
      isCorrect,
      mode
    };
    this.logs.push(log);
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // Cập nhật streak của tài khoản này
    this.updateStreak();
    this.persist();
    return log;
  }

  updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const streak = this.streak || { current: 0, longest: 0, lastDate: null };

    if (!streak.lastDate) {
      streak.current = 1;
      streak.longest = 1;
      streak.lastDate = today;
    } else if (streak.lastDate === today) {
      // Đã học hôm nay rồi
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (streak.lastDate === yesterdayStr) {
        streak.current += 1;
        if (streak.current > streak.longest) {
          streak.longest = streak.current;
        }
      } else {
        streak.current = 1;
      }
      streak.lastDate = today;
    }

    this.streak = streak;
    this.persist();
    return streak;
  }

  getStreak() {
    return this.streak || { current: 0, longest: 0, lastDate: null };
  }

  // ===== IMPORT & EXPORT =====

  exportAllDataJSON() {
    const user = auth.getCurrentUser();
    const exportObject = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      user: user ? { name: user.name, email: user.email, avatar: user.avatar } : null,
      decks: this.decks,
      settings: this.settings,
      streak: this.streak,
      logs: this.logs
    };
    return JSON.stringify(exportObject, null, 2);
  }

  importDataJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.decks || !Array.isArray(parsed.decks)) {
        throw new Error('Dữ liệu JSON không hợp lệ: thiếu danh sách decks.');
      }
      this.decks = parsed.decks;
      if (parsed.settings) this.settings = { ...this.settings, ...parsed.settings };
      if (parsed.streak) this.streak = parsed.streak;
      if (parsed.logs) this.logs = parsed.logs;

      this.persist();
      return { success: true, count: parsed.decks.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  exportDeckToCSV(deckId) {
    const deck = this.getDeckById(deckId);
    if (!deck) return '';

    const headers = ['Word', 'IPA', 'PartOfSpeech', 'Meaning', 'Definition', 'Example', 'ExampleTranslation', 'Synonyms', 'Level'];
    const rows = deck.cards.map(c => [
      `"${(c.word || '').replace(/"/g, '""')}"`,
      `"${(c.ipa || '').replace(/"/g, '""')}"`,
      `"${(c.partOfSpeech || '').replace(/"/g, '""')}"`,
      `"${(c.meaning || '').replace(/"/g, '""')}"`,
      `"${(c.definition || '').replace(/"/g, '""')}"`,
      `"${(c.example || '').replace(/"/g, '""')}"`,
      `"${(c.exampleTranslation || '').replace(/"/g, '""')}"`,
      `"${((c.synonyms || []).join(', ')).replace(/"/g, '""')}"`,
      `"${(c.level || 'B1').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  importCSVToDeck(deckId, csvString) {
    const deck = this.getDeckById(deckId);
    if (!deck) return { success: false, error: 'Không tìm thấy bộ từ' };

    try {
      const lines = csvString.trim().split(/\r?\n/);
      if (lines.length < 2) return { success: false, error: 'File CSV không có dữ liệu' };

      let addedCount = 0;
      const startIdx = lines[0].toLowerCase().includes('word') ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const matches = line.match(/(?:\"([^\"]*(?:\"\"[^\"]*)*)\")|([^\",]+)/g);
        if (!matches || matches.length < 2) continue;

        const clean = matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        const word = clean[0];
        const meaning = clean[3] || clean[1] || '';

        if (!word) continue;

        const newCard = {
          id: 'card-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          word: word,
          ipa: clean[1] && clean[1].startsWith('/') ? clean[1] : '',
          partOfSpeech: clean[2] || 'noun',
          meaning: meaning,
          definition: clean[4] || '',
          example: clean[5] || '',
          exampleTranslation: clean[6] || '',
          synonyms: clean[7] ? clean[7].split(',').map(s => s.trim()) : [],
          level: clean[8] || 'B1',
          box: 1,
          reps: 0,
          nextReview: null,
          isFavorite: false
        };

        deck.cards.push(newCard);
        addedCount++;
      }

      this.persist();
      return { success: true, count: addedCount };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Khôi phục bộ từ về mặc định cho tài khoản hiện tại
  resetToDefault() {
    this.decks = JSON.parse(JSON.stringify(DEFAULT_DECKS));
    this.logs = [];
    this.streak = { current: 0, longest: 0, lastDate: null };
    this.persist();
    return this.decks;
  }
}

export const storage = new StorageService();
