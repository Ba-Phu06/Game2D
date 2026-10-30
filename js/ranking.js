/**
 * Ranking & Progression System
 */
class RankSystem {
  constructor() {
    this.storageKey = 'chrono_aether_progress';
    this.progress = this.loadProgress();
    this.tiers = [
      { name: 'Tập Sự (Bronze)', min: 0, max: 299, badge: '🥉' },
      { name: 'Chiến Binh (Silver)', min: 300, max: 699, badge: '🥈' },
      { name: 'Bậc Thầy (Gold)', min: 700, max: 1199, badge: '🥇' },
      { name: 'Huyền Thoại (Diamond)', min: 1200, max: 1799, badge: '💎' },
      { name: 'Siêu Việt (Aether)', min: 1800, max: Infinity, badge: '🌌' }
    ];
  }

  loadProgress() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) return JSON.parse(data);
    } catch (e) {
      // Storage error
    }
    return {
      unlockedLevel: 1,
      totalScore: 0,
      totalStars: 0,
      levels: {}
    };
  }

  saveProgress() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
    } catch (e) {
      // Storage error
    }
  }

  calculateLevelStars(levelId, remainingMoves) {
    const level = window.GAME_LEVELS.find((l) => l.id === levelId);
    if (!level || !level.stars) return 1;
    if (remainingMoves >= level.stars[0]) return 3;
    if (remainingMoves >= level.stars[1]) return 2;
    return 1;
  }

  recordLevelVictory(levelId, remainingMoves) {
    const stars = this.calculateLevelStars(levelId, remainingMoves);
    const score = 100 + stars * 50 + remainingMoves * 5;

    const prevRecord = this.progress.levels[levelId] || { stars: 0, score: 0 };
    const newStars = Math.max(prevRecord.stars, stars);
    const newScore = Math.max(prevRecord.score, score);

    this.progress.levels[levelId] = {
      stars: newStars,
      score: newScore,
      remainingMoves: Math.max(prevRecord.remainingMoves || 0, remainingMoves)
    };

    if (levelId >= this.progress.unlockedLevel && levelId < window.GAME_LEVELS.length) {
      this.progress.unlockedLevel = levelId + 1;
    }

    this.recalculateTotals();
    this.saveProgress();

    return { stars, score, isNewUnlock: levelId === this.progress.unlockedLevel - 1 };
  }

  recalculateTotals() {
    let totalScore = 0;
    let totalStars = 0;
    Object.values(this.progress.levels).forEach((rec) => {
      totalScore += rec.score || 0;
      totalStars += rec.stars || 0;
    });
    this.progress.totalScore = totalScore;
    this.progress.totalStars = totalStars;
  }

  getCurrentTier(score = null) {
    const pts = score !== null ? score : this.progress.totalScore;
    return this.tiers.find((t) => pts >= t.min && pts <= t.max) || this.tiers[0];
  }

  getTierProgress(score = null) {
    const pts = score !== null ? score : this.progress.totalScore;
    const tier = this.getCurrentTier(pts);
    if (tier.max === Infinity) return 100;
    const range = tier.max - tier.min;
    const current = pts - tier.min;
    return Math.min(100, Math.max(0, Math.round((current / range) * 100)));
  }

  isLevelUnlocked(levelId) {
    return levelId <= (this.progress.unlockedLevel || 1);
  }

  getLevelStars(levelId) {
    return (this.progress.levels[levelId] && this.progress.levels[levelId].stars) || 0;
  }

  async fetchLeaderboard() {
    // Simulated network async request with Loading / Success / Empty / Error handling
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const user = window.authSystem.getUser();
          const baseBoard = [
            { rank: 1, name: 'Vortex_Master', score: 2450, stars: 30, tier: 'Siêu Việt (Aether)' },
            { rank: 2, name: 'CyberKnight_99', score: 2180, stars: 29, tier: 'Siêu Việt (Aether)' },
            { rank: 3, name: 'QuantumGlider', score: 1950, stars: 27, tier: 'Huyền Thoại (Diamond)' },
            { rank: 4, name: 'AetherSeeker', score: 1620, stars: 25, tier: 'Huyền Thoại (Diamond)' },
            { rank: 5, name: 'PuzzleGuru', score: 1340, stars: 22, tier: 'Bậc Thầy (Gold)' }
          ];

          const userEntry = {
            name: `${user.name} (Bạn)`,
            score: this.progress.totalScore,
            stars: this.progress.totalStars,
            tier: this.getCurrentTier().name,
            isMe: true
          };

          const combined = [...baseBoard, userEntry].sort((a, b) => b.score - a.score);
          combined.forEach((item, idx) => {
            item.rank = idx + 1;
          });

          resolve(combined);
        } catch (err) {
          reject(new Error('Không thể tải dữ liệu bảng xếp hạng. Vui lòng thử lại.'));
        }
      }, 400);
    });
  }
}

window.rankSystem = new RankSystem();
