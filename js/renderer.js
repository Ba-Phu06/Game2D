/**
 * Ultra-Fast Canvas Rendering Engine (60/120 FPS Optimized)
 */
class GameRenderer {
  constructor(canvas, wrapper, gameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.wrapper = wrapper;
    this.gameState = gameState;
    this.particles = [];
    this.tileSize = 40;
    this.animTime = 0;
    this.lastFrame = performance.now();

    gameState.on('sparks', (gx, gy, col, cnt) => this.addSparks(gx, gy, col, cnt));
    window.addEventListener('resize', () => this.resize());
    this.resize();
    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    const state = this.gameState.state;
    if (!state) return;
    const wrapW = this.wrapper.clientWidth - 16;
    const wrapH = this.wrapper.clientHeight - 36;

    const tileW = Math.floor(wrapW / state.width);
    const tileH = Math.floor(wrapH / state.height);
    this.tileSize = Math.max(30, Math.min(tileW, tileH, 56));

    const displayW = this.tileSize * state.width;
    const displayH = this.tileSize * state.height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = displayW * dpr;
    this.canvas.height = displayH * dpr;
    this.canvas.style.width = displayW + 'px';
    this.canvas.style.height = displayH + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  addSparks(gridX, gridY, color, count = 6) {
    const cx = (gridX + 0.5) * this.tileSize;
    const cy = (gridY + 0.5) * this.tileSize;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.4;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1.0, decay: 0.04 + Math.random() * 0.04,
        size: 1.5 + Math.random() * 2, color: color
      });
    }
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastFrame) / 1000, 0.05);
    this.lastFrame = timestamp;
    this.animTime += dt;

    const state = this.gameState.state;
    if (state && state.player) {
      const p = state.player;
      // Snappy lerp (instant settling, 0 delay feeling)
      const factor = 1 - Math.exp(-36 * dt);
      p.visualX += (p.x - p.visualX) * factor;
      p.visualY += (p.y - p.visualY) * factor;
      if (Math.abs(p.visualX - p.x) < 0.003) p.visualX = p.x;
      if (Math.abs(p.visualY - p.y) < 0.003) p.visualY = p.y;
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  render() {
    const state = this.gameState.state;
    if (!state) return;
    const ctx = this.ctx;
    const ts = this.tileSize;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, state.width * ts, state.height * ts);

    for (let r = 0; r < state.height; r++) {
      for (let c = 0; c < state.width; c++) {
        const x = c * ts;
        const y = r * ts;
        const tile = state.grid[r][c];

        ctx.fillStyle = (r + c) % 2 === 0 ? '#0f172a' : '#111c33';
        ctx.fillRect(x, y, ts, ts);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, ts, ts);

        if (tile === window.TILE.WALL) this.drawWall(ctx, x, y, ts);
        else if (tile === window.TILE.TRAP) this.drawTrap(ctx, x, y, ts);
        else if (tile === window.TILE.DISARMED_TRAP) this.drawDisarmedTrap(ctx, x, y, ts);
        else if (tile === window.TILE.PORTAL) this.drawPortal(ctx, x, y, ts, state);
        else if (tile === window.TILE.CORE) this.drawCore(ctx, x, y, ts);
        else if (tile === window.TILE.BLOCK) this.drawBlock(ctx, x, y, ts);
      }
    }

    this.drawPlayer(ctx, state.player.visualX * ts, state.player.visualY * ts, ts, state.player);
    this.drawParticles(ctx);
  }

  drawWall(ctx, x, y, ts) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, ts - 4, ts - 4);
  }

  drawTrap(ctx, x, y, ts) {
    const pulse = Math.sin(this.animTime * 6) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(244, 63, 94, ${0.15 * pulse})`;
    ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    ctx.fillStyle = '#f43f5e';
    const cx = x + ts / 2;
    const cy = y + ts / 2;
    const size = ts * 0.24;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.7, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size * 0.7, cy);
    ctx.closePath();
    ctx.fill();
  }

  drawDisarmedTrap(ctx, x, y, ts) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + ts / 2);
    ctx.lineTo(x + ts - 8, y + ts / 2);
    ctx.stroke();
  }

  drawPortal(ctx, x, y, ts, state) {
    const cx = x + ts / 2;
    const cy = y + ts / 2;
    const isReady = state.coresCollected >= state.totalCores;
    ctx.strokeStyle = isReady ? '#00f0ff' : '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, ts * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawCore(ctx, x, y, ts) {
    const cx = x + ts / 2;
    const cy = y + ts / 2 + Math.sin(this.animTime * 4) * 2;
    const r = ts * 0.22;
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
  }

  drawBlock(ctx, x, y, ts) {
    const pad = 4;
    ctx.fillStyle = '#334155';
    ctx.fillRect(x + pad, y + pad, ts - pad * 2, ts - pad * 2);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + pad, y + pad, ts - pad * 2, ts - pad * 2);
  }

  drawPlayer(ctx, x, y, ts, player) {
    const cx = x + ts / 2;
    const cy = y + ts / 2;
    const r = ts * 0.32;

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00f0ff';
    const offset = r * 0.45;
    let eyeX = cx;
    let eyeY = cy;
    if (player.dir === 'right') eyeX += offset;
    if (player.dir === 'left') eyeX -= offset;
    if (player.dir === 'up') eyeY -= offset;
    if (player.dir === 'down') eyeY += offset;

    ctx.beginPath();
    ctx.arc(eyeX, eyeY, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  drawParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

window.GameRenderer = GameRenderer;
