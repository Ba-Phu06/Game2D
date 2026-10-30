/**
 * UI Controller: Modals, HUD, Input & Event Listeners
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
    this.canvas = document.getElementById('game-canvas');
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

  openLevelSelect() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    window.GAME_LEVELS.forEach((lvl, idx) => {
      const isUnlocked = window.rankSystem.isLevelUnlocked(lvl.id);
      const stars = window.rankSystem.getLevelStars(lvl.id);
      const card = document.createElement('div');
      card.className = `level-card ${isUnlocked ? '' : 'locked'} ${idx === this.gameState.currentLevelIndex ? 'active' : ''}`;
      card.innerHTML = `
        <span class="level-num">${isUnlocked ? lvl.id : '🔒'}</span>
        <span class="level-stars">${isUnlocked ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '---'}</span>
      `;
      if (isUnlocked) {
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
      if (!data || data.length === 0) {
        stateBox.innerHTML = '<span>Chưa có dữ liệu xếp hạng.</span>';
        stateBox.style.display = 'block';
        return;
      }
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
      stateBox.innerHTML = `
        <span style="color:var(--accent-danger)">${err.message}</span>
        <button class="modal-btn secondary" style="margin-top:8px" onclick="window.uiController.openLeaderboard()">Thử lại</button>
      `;
      stateBox.style.display = 'block';
    }
  }

  bindEvents() {
    this.gameState.on('update', () => this.updateHUD());
    this.gameState.on('toast', (txt, dur) => this.showToast(txt, dur));

    this.gameState.on('win', (levelId, movesLeft) => {
      const result = window.rankSystem.recordLevelVictory(levelId, movesLeft);
      document.getElementById('win-stars').textContent = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
      document.getElementById('win-score-bonus').textContent = `+${result.score} Điểm Rank`;
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
      document.getElementById('lose-reason').textContent = reason;
      this.openModal('lose-modal');
    });

    // Header buttons
    document.getElementById('btn-levels').onclick = () => this.openLevelSelect();
    document.getElementById('btn-rank').onclick = () => this.openLeaderboard();
    this.userBadgeEl.onclick = () => this.openModal('auth-modal');
    document.getElementById('btn-restart').onclick = () => {
      window.sounds.init();
      this.gameState.loadLevel(this.gameState.currentLevelIndex);
    };

    // Skills
    this.breakBtn.onclick = () => this.gameState.useBreakSkill();
    this.jumpBtn.onclick = () => this.gameState.useJumpSkill();
    this.undoBtn.onclick = () => this.gameState.useUndoSkill();

    // D-Pad
    const bindDpad = (id, dx, dy) => {
      document.getElementById(id).addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.gameState.move(dx, dy);
      });
    };
    bindDpad('dpad-up', 0, -1);
    bindDpad('dpad-down', 0, 1);
    bindDpad('dpad-left', -1, 0);
    bindDpad('dpad-right', 1, 0);

    // Keyboard
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      const key = e.key;
      if (code === 'ArrowUp' || code === 'KeyW' || key === 'ArrowUp' || key === 'w' || key === 'W') {
        e.preventDefault();
        this.gameState.move(0, -1);
      } else if (code === 'ArrowDown' || code === 'KeyS' || key === 'ArrowDown' || key === 's' || key === 'S') {
        e.preventDefault();
        this.gameState.move(0, 1);
      } else if (code === 'ArrowLeft' || code === 'KeyA' || key === 'ArrowLeft' || key === 'a' || key === 'A') {
        e.preventDefault();
        this.gameState.move(-1, 0);
      } else if (code === 'ArrowRight' || code === 'KeyD' || key === 'ArrowRight' || key === 'd' || key === 'D') {
        e.preventDefault();
        this.gameState.move(1, 0);
      } else if (code === 'Digit1' || key === '1') this.gameState.useBreakSkill();
      else if (code === 'Digit2' || key === '2') this.gameState.useJumpSkill();
      else if (code === 'Digit3' || code === 'KeyZ' || key === '3' || key === 'z' || key === 'Z') this.gameState.useUndoSkill();
      else if (code === 'KeyR' || key === 'r' || key === 'R') this.gameState.loadLevel(this.gameState.currentLevelIndex);
    });

    // Canvas Tap
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.gameState.isOver || !this.gameState.state) return;
      window.sounds.init();
      const rect = this.canvas.getBoundingClientRect();
      const ts = window.gameRenderer.tileSize;
      const tx = Math.floor((e.clientX - rect.left) / ts);
      const ty = Math.floor((e.clientY - rect.top) / ts);
      const dx = tx - this.gameState.state.player.x;
      const dy = ty - this.gameState.state.player.y;
      if (Math.abs(dx) + Math.abs(dy) === 1) this.gameState.move(dx, dy);
      else if (Math.abs(dx) > Math.abs(dy) && dx !== 0) this.gameState.move(dx > 0 ? 1 : -1, 0);
      else if (dy !== 0) this.gameState.move(0, dy > 0 ? 1 : -1);
    });

    this.bindAuthModal();
  }

  bindAuthModal() {
    const gmailInput = document.getElementById('auth-gmail-input');
    const guestInput = document.getElementById('auth-guest-input');

    document.getElementById('auth-gmail-btn').onclick = async () => {
      const email = gmailInput.value.trim();
      if (!email) {
        alert('Vui lòng nhập địa chỉ Gmail của bạn.');
        return;
      }
      try {
        await window.authSystem.signInWithGmail(email);
        this.closeModal('auth-modal');
        this.showToast(`Xin chào, ${window.authSystem.getUser().name}!`);
      } catch (err) {
        alert(err.message);
      }
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
