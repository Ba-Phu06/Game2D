/**
 * Input Controller: Keyboard, D-Pad, Touch Swipe & Canvas Tap
 */
class InputController {
  constructor(gameState, canvas) {
    this.gameState = gameState;
    this.canvas = canvas;
    this.holdTimer = null;
    this.repeatInterval = null;
    this.activeDir = null;
    this.bindEvents();
  }

  startHold(dx, dy) {
    this.stopHold();
    this.activeDir = { dx, dy };
    this.gameState.move(dx, dy);
    this.holdTimer = setTimeout(() => {
      this.repeatInterval = setInterval(() => {
        if (this.activeDir) this.gameState.move(this.activeDir.dx, this.activeDir.dy);
      }, 130);
    }, 180);
  }

  stopHold() {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    if (this.repeatInterval) clearInterval(this.repeatInterval);
    this.holdTimer = null;
    this.repeatInterval = null;
    this.activeDir = null;
  }

  bindEvents() {
    const keyMap = {
      ArrowUp: [0, -1], KeyW: [0, -1],
      ArrowDown: [0, 1], KeyS: [0, 1],
      ArrowLeft: [-1, 0], KeyA: [-1, 0],
      ArrowRight: [1, 0], KeyD: [1, 0]
    };

    window.addEventListener('keydown', (e) => {
      if (keyMap[e.code]) {
        e.preventDefault();
        if (!e.repeat && !this.activeDir) {
          const [dx, dy] = keyMap[e.code];
          this.startHold(dx, dy);
        }
      } else if (e.code === 'Digit1' || e.key === '1') this.gameState.useBreakSkill();
      else if (e.code === 'Digit2' || e.key === '2') this.gameState.useJumpSkill();
      else if (e.code === 'Digit3' || e.code === 'KeyZ' || e.key === '3' || e.key === 'z') this.gameState.useUndoSkill();
      else if (e.code === 'KeyR' || e.key === 'r') this.gameState.loadLevel(this.gameState.currentLevelIndex);
    });

    window.addEventListener('keyup', (e) => {
      if (keyMap[e.code]) this.stopHold();
    });

    const bindDpad = (id, dx, dy) => {
      const btn = document.getElementById(id);
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.startHold(dx, dy);
      });
      btn.addEventListener('pointerup', () => this.stopHold());
      btn.addEventListener('pointerleave', () => this.stopHold());
    };
    bindDpad('dpad-up', 0, -1);
    bindDpad('dpad-down', 0, 1);
    bindDpad('dpad-left', -1, 0);
    bindDpad('dpad-right', 1, 0);

    this.bindTouchAndTap();
  }

  bindTouchAndTap() {
    let touchStartX = 0;
    let touchStartY = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      window.sounds.init();
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) {
          if (Math.abs(dx) > Math.abs(dy)) this.gameState.move(dx > 0 ? 1 : -1, 0);
          else this.gameState.move(0, dy > 0 ? 1 : -1);
        }
      }
    }, { passive: true });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
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
  }
}

window.InputController = InputController;
