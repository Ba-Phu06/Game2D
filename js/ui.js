/**
 * UI Controller: HUD Updates & Modals
 */
class UIController {
  constructor(gameState) {
    this.gameState = gameState;
    this.toastTimer = null;
    this.initDOMElements();
    this.bindEvents();
    this.setupAuthSync();
  }

  initDOMElements() {
    this.levelTitleEl = document.getElementById('level-title');
    this.movesValEl = document.getElementById('moves-val');
    this.movesBadgeEl = document.getElementById('moves-badge');
    this.coresValEl = document.getElementById('cores-val');
    this.userBadgeEl = document.getElementById('user-badge');
    this.userAvatarEl = document.getElementById('user-avatar');
    this.userNameEl = document.getElementById('user-name');
    this.userRankTagEl = document.getElementById('user-rank-tag');

    this.breakBtn = document.getElementById('btn-break');
    this.jumpBtn = document.getElementById('btn-jump');
    this.undoBtn = document.getElementById('btn-undo');
    this.breakBadge = document.getElementById('break-badge');
    this.jumpBadge = document.getElementById('jump-badge');
    this.undoBadge = document.getElementById('undo-badge');

    this.toastEl = document.getElementById('toast-msg');
  }

  setupAuthSync() {
    const updateProfile = (user) => {
      this.userNameEl.textContent = user.name;
      this.userAvatarEl.textContent = user.avatar.length === 1 ? user.avatar : '🚀';
      const tier = window.rankSystem.getCurrentTier();
      this.userRankTagEl.textContent = tier.badge;
    };
    window.authSystem.onChange(updateProfile);
    updateProfile(window.authSystem.getUser());
  }

  showToast(text, duration = 1200) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), duration);
  }

  updateHUD() {
    const st = this.gameState.state;
    if (!st) return;
    this.levelTitleEl.textContent = st.name;
    this.movesValEl.textContent = st.movesLeft;
    this.coresValEl.textContent = `${st.coresCollected}/${st.totalCores}`;

    if (st.movesLeft <= 3) this.movesBadgeEl.classList.add('low');
    else this.movesBadgeEl.classList.remove('low');

    this.breakBadge.textContent = st.skills.break;
    this.jumpBadge.textContent = st.skills.jump;
    this.undoBadge.textContent = st.skills.undo;

    this.breakBtn.disabled = st.skills.break <= 0 || this.gameState.isOver;
    this.jumpBtn.disabled = st.skills.jump <= 0 || this.gameState.isOver;
    this.undoBtn.disabled = st.skills.undo <= 0 || this.gameState.history.length === 0 || this.gameState.isOver;
  }

  openModal(id) {
    document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
  }

  closeModal(id) {
    const target = document.getElementById(id);
    if (target) target.classList.remove('active');
  }

  bindEvents() {
    this.gameState.on('update', () => this.updateHUD());
    this.gameState.on('toast', (txt, dur) => this.showToast(txt, dur));

    this.gameState.on('win', (levelId, movesLeft) => {
      if (window.inputController) window.inputController.stopHold();
      const res = window.rankSystem.recordLevelVictory(levelId, movesLeft);
      document.getElementById('win-stars').textContent = '★'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
      document.getElementById('win-score-bonus').textContent = `+${res.score} Điểm Rank`;
      const nextBtn = document.getElementById('win-next-btn');
      if (this.gameState.currentLevelIndex < window.GAME_LEVELS.length - 1) {
        nextBtn.textContent = 'Màn Tiếp Theo';
        nextBtn.onclick = () => {
          this.closeModal('win-modal');
          this.gameState.loadLevel(this.gameState.currentLevelIndex + 1);
          if (window.gameRenderer) window.gameRenderer.resize();
        };
      } else {
        nextBtn.textContent = 'Hoàn Thành Game!';
        nextBtn.onclick = () => {
          this.closeModal('win-modal');
          this.openLeaderboard();
        };
      }
      this.openModal('win-modal');
    });

    this.gameState.on('gameOver', (reason) => {
      if (window.inputController) window.inputController.stopHold();
      document.getElementById('lose-reason').textContent = reason;
      this.openModal('lose-modal');
    });

    document.getElementById('btn-levels').onclick = () => this.openLevelSelect();
    document.getElementById('btn-rank').onclick = () => this.openLeaderboard();
    this.userBadgeEl.onclick = () => this.openModal('auth-modal');
    document.getElementById('btn-restart').onclick = () => {
      window.sounds.init();
      this.gameState.loadLevel(this.gameState.currentLevelIndex);
    };

    this.breakBtn.onclick = () => this.gameState.useBreakSkill();
    this.jumpBtn.onclick = () => this.gameState.useJumpSkill();
    this.undoBtn.onclick = () => this.gameState.useUndoSkill();

    this.bindAuthModal();
  }

  openLevelSelect() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    window.GAME_LEVELS.forEach((lvl, idx) => {
      const unlocked = window.rankSystem.isLevelUnlocked(lvl.id);
      const stars = window.rankSystem.getLevelStars(lvl.id);
      const card = document.createElement('div');
      card.className = `level-card ${unlocked ? '' : 'locked'} ${idx === this.gameState.currentLevelIndex ? 'active' : ''}`;
      card.innerHTML = `
        <span class="level-num">${unlocked ? lvl.id : '🔒'}</span>
        <span class="level-stars">${unlocked ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '---'}</span>
      `;
      if (unlocked) {
        card.onclick = () => {
          this.closeModal('level-modal');
          this.gameState.loadLevel(idx);
          if (window.gameRenderer) window.gameRenderer.resize();
        };
      }
      grid.appendChild(card);
    });
    this.openModal('level-modal');
  }

  async openLeaderboard() {
    this.openModal('rank-modal');
    const tier = window.rankSystem.getCurrentTier();
    document.getElementById('rank-tier-name').textContent = `${tier.badge} ${tier.name}`;
    document.getElementById('rank-score-val').textContent = `${window.rankSystem.progress.totalScore} RP (${window.rankSystem.progress.totalStars} ★)`;
    document.getElementById('rank-progress-fill').style.width = `${window.rankSystem.getTierProgress()}%`;

    const stateBox = document.getElementById('lb-state-box');
    const listEl = document.getElementById('lb-list');
    listEl.innerHTML = '';
    stateBox.innerHTML = '<div class="spinner"></div><span>Đang tải bảng xếp hạng...</span>';
    stateBox.style.display = 'block';

    try {
      const data = await window.rankSystem.fetchLeaderboard();
      stateBox.style.display = 'none';
      data.forEach((item) => {
        const row = document.createElement('div');
        row.className = `leaderboard-item ${item.isMe ? 'me' : ''}`;
        row.innerHTML = `
          <div class="lb-left">
            <span class="lb-rank">#${item.rank}</span>
            <span class="lb-name">${item.name}</span>
          </div>
          <span class="lb-score">${item.score} RP (${item.stars}★)</span>
        `;
        listEl.appendChild(row);
      });
    } catch (err) {
      stateBox.innerHTML = `<span style="color:var(--accent-danger)">${err.message}</span>`;
      stateBox.style.display = 'block';
    }
  }

  bindAuthModal() {
    const gmailInput = document.getElementById('auth-gmail-input');
    const guestInput = document.getElementById('auth-guest-input');

    document.getElementById('auth-gmail-btn').onclick = async () => {
      const email = gmailInput.value.trim();
      if (!email) return alert('Vui lòng nhập địa chỉ Gmail của bạn.');
      try {
        await window.authSystem.signInWithGmail(email);
        this.closeModal('auth-modal');
        this.showToast(`Xin chào, ${window.authSystem.getUser().name}!`);
      } catch (err) { alert(err.message); }
    };

    document.getElementById('auth-guest-btn').onclick = async () => {
      const name = guestInput.value.trim();
      await window.authSystem.signInWithGuest(name);
      this.closeModal('auth-modal');
      this.showToast(`Chơi với tài khoản: ${window.authSystem.getUser().name}`);
    };
  }
}

window.UIController = UIController;
