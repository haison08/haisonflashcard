/**
 * audio.js - Hệ thống âm thanh tổng hợp Web Audio API & Phát âm chuẩn bản ngữ Web Speech API
 */

import { storage } from './storage.js';

class AudioService {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.voices = [];
    this.audioCtx = null;
    this.initVoices();
  }

  isTTSSupported() {
    return !!(window.speechSynthesis);
  }

  // Khởi tạo danh sách giọng nói của hệ thống
  initVoices() {
    if (!this.synth) return;
    const load = () => {
      this.voices = this.synth.getVoices();
    };
    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  // Khởi tạo AudioContext khi có tương tác người dùng
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Phát âm từ vựng hoặc câu tiếng Anh
   * @param {string} text - Từ hoặc câu cần đọc
   * @param {Object} options - { lang, rate, pitch }
   */
  speak(text, options = {}) {
    if (!this.synth) {
      console.warn('Trình duyệt không hỗ trợ Web Speech Synthesis.');
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      // Hủy bỏ câu đọc đang chạy dở
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const settings = storage.settings;
      const targetLang = options.lang || settings.accent || 'en-US';
      const rate = options.rate !== undefined ? options.rate : settings.speechRate || 1.0;

      utterance.lang = targetLang;
      utterance.rate = rate;
      utterance.pitch = options.pitch || 1.0;

      // Ưu tiên chọn giọng tự nhiên nếu có
      if (this.voices.length === 0) {
        this.voices = this.synth.getVoices();
      }

      const matchingVoices = this.voices.filter(v => v.lang === targetLang || v.lang.startsWith(targetLang.split('-')[0]));
      // Tìm giọng Google, Samantha hoặc Natural
      const naturalVoice = matchingVoices.find(v => 
        v.name.includes('Natural') || 
        v.name.includes('Google') || 
        v.name.includes('Samantha') || 
        v.name.includes('Daniel')
      );

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      } else if (matchingVoices.length > 0) {
        utterance.voice = matchingVoices[0];
      }

      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);

      this.synth.speak(utterance);
    });
  }

  // Dừng phát âm
  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // ===== BỘ ÂM THANH TƯƠNG TÁC (WEB AUDIO SYNTHESIZER) =====

  // Âm thanh lật thẻ (Card Flip)
  playFlip() {
    if (!storage.settings.soundEffects) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }

  // Âm thanh trả lời đúng (Success Chime)
  playSuccess() {
    if (!storage.settings.soundEffects) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch (e) {}
  }

  // Âm thanh trả lời sai (Wrong thud)
  playWrong() {
    if (!storage.settings.soundEffects) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.18);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  // Âm thanh click nhẹ
  playClick() {
    if (!storage.settings.soundEffects) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {}
  }

  // Âm thanh chiến thắng hoàn thành bộ từ (Victory Fanfare)
  playVictory() {
    if (!storage.settings.soundEffects) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [
        { f: 523.25, t: 0.0 }, // C5
        { f: 659.25, t: 0.1 }, // E5
        { f: 783.99, t: 0.2 }, // G5
        { f: 1046.5, t: 0.35 } // C6
      ];

      notes.forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, ctx.currentTime + t);

        gain.gain.setValueAtTime(0.18, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.4);
      });
    } catch (e) {}
  }
}

export const audio = new AudioService();
