/**
 * statsView.js - Quản lý màn hình Thống kê, Streak chuỗi ngày học, Biểu đồ tiến độ & Sao lưu JSON
 */

import { storage } from '../services/storage.js';
import { srs } from '../services/srs.js';
import { audio } from '../services/audio.js';
import { auth } from '../services/auth.js';

class StatsView {
  constructor() {
    this.container = null;
  }

  init(containerEl) {
    this.container = containerEl;
    this.render();
  }

  render() {
    if (!this.container) return;

    const currentUser = auth.getCurrentUser();


    const decks = storage.getDecks();
    let totalCards = 0;
    let allCards = [];
    decks.forEach(d => {
      totalCards += d.cards.length;
      allCards = allCards.concat(d.cards);
    });

    const dist = srs.getDistribution(allCards);
    const streak = storage.streak;
    const logs = storage.logs;

    // Tính số từ học hôm nay
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.dateStr === today);
    const todayCardsCount = todayLogs.length;

    // Tính tỷ lệ đúng tổng quan
    const totalAnswers = logs.length;
    const correctAnswers = logs.filter(l => l.isCorrect).length;
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 100;

    // Tính hoạt động 7 ngày gần nhất
    const daysData = [];
    const daysName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const count = logs.filter(l => l.dateStr === dStr).length;
      daysData.push({
        dayName: daysName[d.getDay()],
        date: dStr,
        count: count
      });
    }

    const maxDayCount = Math.max(1, ...daysData.map(d => d.count));

    // Tính % cho các hộp Leitner
    const pct1 = totalCards > 0 ? ((dist[1] || 0) / totalCards) * 100 : 0;
    const pct2 = totalCards > 0 ? ((dist[2] || 0) / totalCards) * 100 : 0;
    const pct3 = totalCards > 0 ? ((dist[3] || 0) / totalCards) * 100 : 0;
    const pct4 = totalCards > 0 ? ((dist[4] || 0) / totalCards) * 100 : 0;

    this.container.innerHTML = `
      <div class="stats-container">
        <!-- User Greeting Header -->
        ${currentUser ? `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 2rem;">${currentUser.avatar || '🧑‍🎓'}</span>
              <div>
                <h3 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 700; margin: 0;">Tiến độ học tập của ${this.escapeHtml(currentUser.name)}</h3>
                <span style="font-size: 0.85rem; color: var(--text-muted);">${this.escapeHtml(currentUser.email)}</span>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" id="btn-stats-switch-user">
              👤 Quản lý tài khoản
            </button>
          </div>
        ` : ''}

        <!-- Streak Hero Card -->
        <div class="streak-hero-card">
          <div class="streak-left-col">
            <div class="streak-big-flame">🔥</div>
            <div>
              <div class="streak-count-text">${streak.current || 0} ngày liên tục</div>
              <div class="streak-label-text">
                ${streak.current > 0 ? 'Tuyệt vời! Bạn đang duy trì phong độ học tập rất tốt.' : 'Bắt đầu học ngay hôm nay để thắp sáng ngọn lửa streak nhé!'}
              </div>
            </div>
          </div>


          <div class="streak-right-badge">
            <div>Kỷ lục chuỗi dài nhất</div>
            <div class="streak-longest-val">🏆 ${streak.longest || 0} ngày</div>
          </div>
        </div>

        <!-- 4 Metrics Stat Cards -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon-wrap" style="background: rgba(99, 102, 241, 0.15); color: #6366f1;">📚</div>
            <div class="metric-val">${totalCards}</div>
            <div class="metric-lbl">Tổng số từ vựng</div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-wrap" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">🎓</div>
            <div class="metric-val" style="color: #10b981;">${dist.mastered}</div>
            <div class="metric-lbl">Từ đã thành thạo (Hộp 4)</div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-wrap" style="background: rgba(14, 165, 233, 0.15); color: #0ea5e9;">⚡</div>
            <div class="metric-val">${todayCardsCount}</div>
            <div class="metric-lbl">Thẻ đã ôn hôm nay</div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-wrap" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">🎯</div>
            <div class="metric-val" style="color: #f59e0b;">${accuracy}%</div>
            <div class="metric-lbl">Tỷ lệ nhớ chính xác</div>
          </div>
        </div>

        <!-- Leitner Box Progress Visualizer -->
        <div class="card-section-box">
          <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem;">
            Phân bổ Trí nhớ theo Hộp Leitner (SRS)
          </h3>
          <p style="color: var(--text-muted); font-size: 0.88rem;">
            Từ vựng sẽ được dịch chuyển dần sang hộp 4 khi bạn ghi nhớ tốt qua thời gian
          </p>

          <div class="box-progress-bar-stack">
            <div class="box-progress-segment seg-box-1" style="width: ${pct1}%;" title="Hộp 1: ${dist[1]} từ"></div>
            <div class="box-progress-segment seg-box-2" style="width: ${pct2}%;" title="Hộp 2: ${dist[2]} từ"></div>
            <div class="box-progress-segment seg-box-3" style="width: ${pct3}%;" title="Hộp 3: ${dist[3]} từ"></div>
            <div class="box-progress-segment seg-box-4" style="width: ${pct4}%;" title="Hộp 4: ${dist[4]} từ"></div>
          </div>

          <div class="box-legend-grid">
            <div class="legend-item">
              <span class="legend-dot" style="background: #ef4444;"></span>
              <div>
                <div class="legend-name">Hộp 1 (Cần ôn gấp)</div>
                <div class="legend-count">${dist[1] || 0} từ (${Math.round(pct1)}%)</div>
              </div>
            </div>

            <div class="legend-item">
              <span class="legend-dot" style="background: #f59e0b;"></span>
              <div>
                <div class="legend-name">Hộp 2 (Đang nhớ ngắn hạn)</div>
                <div class="legend-count">${dist[2] || 0} từ (${Math.round(pct2)}%)</div>
              </div>
            </div>

            <div class="legend-item">
              <span class="legend-dot" style="background: #0ea5e9;"></span>
              <div>
                <div class="legend-name">Hộp 3 (Khá quen thuộc)</div>
                <div class="legend-count">${dist[3] || 0} từ (${Math.round(pct3)}%)</div>
              </div>
            </div>

            <div class="legend-item">
              <span class="legend-dot" style="background: #10b981;"></span>
              <div>
                <div class="legend-name">Hộp 4 (Đã thành thạo)</div>
                <div class="legend-count">${dist[4] || 0} từ (${Math.round(pct4)}%)</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 7-Day Activity Chart -->
        <div class="card-section-box">
          <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem;">
            Hoạt động 7 ngày gần nhất
          </h3>
          <p style="color: var(--text-muted); font-size: 0.88rem;">
            Số lượng lượt thẻ bạn đã ôn tập và luyện tập trong tuần
          </p>

          <div class="chart-bars-wrap">
            ${daysData.map(d => {
              const heightPct = Math.round((d.count / maxDayCount) * 100);
              return `
                <div class="chart-col">
                  <div class="chart-val-lbl">${d.count > 0 ? d.count : ''}</div>
                  <div class="chart-bar-fill" style="height: ${Math.max(6, heightPct)}%;"></div>
                  <div class="chart-day-lbl">${d.dayName}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Backup & Restore Actions -->
        <div class="backup-actions-bar">
          <div class="backup-text">
            <h4>Sao lưu & Đồng bộ dữ liệu</h4>
            <p>Xuất toàn bộ bộ từ và tiến độ học thành file JSON để lưu trữ hoặc chuyển sang máy khác.</p>
          </div>
          <div class="backup-btns">
            <button class="btn btn-outline btn-sm" id="btn-export-backup">
              📥 Tải bản sao lưu (JSON)
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-import-backup">
              📤 Khôi phục từ JSON
            </button>
            <button class="btn btn-ghost btn-sm" id="btn-reset-default" style="color: #ef4444;" title="Khôi phục về dữ liệu ban đầu">
              🔄 Reset dữ liệu
            </button>
          </div>
        </div>

        <input type="file" id="json-file-input" accept=".json" style="display: none;" />
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Mở hồ sơ / đổi tài khoản
    document.getElementById('btn-stats-switch-user')?.addEventListener('click', () => {
      audio.playClick();
      if (window.app && window.app.authModal) {
        window.app.authModal.openProfile();
      }
    });

    // Xuất JSON
    document.getElementById('btn-export-backup')?.addEventListener('click', () => {
      const dataStr = storage.exportAllDataJSON();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linguaflash_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      audio.playSuccess();
      if (window.app && window.app.showToast) {
        window.app.showToast('Đã tải xuống bản sao lưu dữ liệu!', 'success');
      }
    });

    // Nhập JSON
    const fileInput = document.getElementById('json-file-input');
    document.getElementById('btn-import-backup')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const res = storage.importDataJSON(event.target.result);
        if (res.success) {
          audio.playSuccess();
          alert(`Đã khôi phục thành công ${res.count} bộ từ!`);
          this.render();
          if (window.app && window.app.deckManager) {
            window.app.deckManager.render();
          }
        } else {
          alert('Lỗi nhập file: ' + res.error);
        }
      };
      reader.readAsText(file);
    });

    // Reset về mặc định
    document.getElementById('btn-reset-default')?.addEventListener('click', () => {
      if (confirm('CẢNH BÁO: Hành động này sẽ đặt lại toàn bộ bộ từ và tiến độ về mặc định ban đầu. Bạn có chắc không?')) {
        storage.resetToDefault();
        audio.playSuccess();
        this.render();
        if (window.app && window.app.deckManager) {
          window.app.deckManager.render();
        }
        if (window.app && window.app.showToast) {
          window.app.showToast('Đã khôi phục kho từ mặc định!', 'info');
        }
      }
    });
  }
}

export const statsView = new StatsView();
