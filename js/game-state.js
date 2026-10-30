/**
 * Game Logic & State Management
 */
class GameState {
  constructor() {
    this.currentLevelIndex = 0;
    this.state = null;
    this.history = [];
    this.isOver = false;
    this.callbacks = {};
  }

  on(event, fn) {
    this.callbacks[event] = fn;
  }

  emit(event, ...args) {
    if (this.callbacks[event]) this.callbacks[event](...args);
  }

  loadLevel(index) {
    this.currentLevelIndex = index;
    const proto = window.GAME_LEVELS[index];
    const grid = proto.map.map((row) => [...row]);

    let totalCores = 0;
    for (let r = 0; r < proto.height; r++) {
      for (let c = 0; c < proto.width; c++) {
        if (grid[r][c] === window.TILE.CORE) totalCores++;
      }
    }

    this.state = {
      levelId: proto.id,
      name: proto.name,
      width: proto.width,
      height: proto.height,
      grid: grid,
      player: {
        x: proto.player.x,
        y: proto.player.y,
        dir: proto.player.dir,
        visualX: proto.player.x,
        visualY: proto.player.y
      },
      movesLeft: proto.moves,
      coresCollected: 0,
      totalCores: totalCores,
      skills: { ...proto.skills }
    };

    this.history = [];
    this.isOver = false;
    this.emit('update');
    this.emit('toast', proto.name, 1000);
  }

  saveSnapshot() {
    const snap = {
      grid: this.state.grid.map((row) => [...row]),
      player: { ...this.state.player },
      movesLeft: this.state.movesLeft,
      coresCollected: this.state.coresCollected
    };
    this.history.push(snap);
    if (this.history.length > 25) this.history.shift();
  }

  move(dx, dy) {
    if (this.isOver || !this.state) return;
    window.sounds.init();

    if (dx === 1) this.state.player.dir = 'right';
    if (dx === -1) this.state.player.dir = 'left';
    if (dy === 1) this.state.player.dir = 'down';
    if (dy === -1) this.state.player.dir = 'up';

    const targetX = this.state.player.x + dx;
    const targetY = this.state.player.y + dy;

    if (targetX < 0 || targetX >= this.state.width || targetY < 0 || targetY >= this.state.height) {
      return;
    }

    const tile = this.state.grid[targetY][targetX];

    if (tile === window.TILE.WALL) {
      this.emit('sparks', targetX, targetY, '#64748b', 4);
      return;
    }

    if (tile === window.TILE.BLOCK) {
      const nextX = targetX + dx;
      const nextY = targetY + dy;
      if (nextX < 0 || nextX >= this.state.width || nextY < 0 || nextY >= this.state.height) return;

      const nextTile = this.state.grid[nextY][nextX];
      if (nextTile === window.TILE.EMPTY) {
        this.saveSnapshot();
        this.state.grid[nextY][nextX] = window.TILE.BLOCK;
        this.state.grid[targetY][targetX] = window.TILE.EMPTY;
        this.stepInto(targetX, targetY);
        window.sounds.push();
        this.emit('sparks', nextX, nextY, '#00f0ff', 6);
        return;
      } else if (nextTile === window.TILE.TRAP) {
        this.saveSnapshot();
        this.state.grid[nextY][nextX] = window.TILE.DISARMED_TRAP;
        this.state.grid[targetY][targetX] = window.TILE.EMPTY;
        this.stepInto(targetX, targetY);
        window.sounds.push();
        this.emit('toast', 'Khối đá đã vô hiệu hóa bẫy!', 1200);
        this.emit('sparks', nextX, nextY, '#fbbf24', 12);
        return;
      }
      return;
    }

    this.saveSnapshot();
    this.stepInto(targetX, targetY);
  }

  stepInto(targetX, targetY) {
    this.state.player.x = targetX;
    this.state.player.y = targetY;
    this.state.movesLeft--;

    const cell = this.state.grid[targetY][targetX];

    if (cell === window.TILE.CORE) {
      this.state.coresCollected++;
      this.state.grid[targetY][targetX] = window.TILE.EMPTY;
      window.sounds.collect();
      this.emit('sparks', targetX, targetY, '#38bdf8', 14);
      if (this.state.coresCollected >= this.state.totalCores) {
        this.emit('toast', 'Đủ lõi! Cổng dịch chuyển đã mở!', 1500);
      }
    } else {
      window.sounds.step();
    }

    this.emit('update');

    if (cell === window.TILE.TRAP) {
      window.sounds.lose();
      this.emit('sparks', targetX, targetY, '#f43f5e', 20);
      this.isOver = true;
      this.emit('gameOver', 'Bẫy gai đã kích hoạt! Bạn bị tiêu diệt.');
      return;
    }

    if (cell === window.TILE.PORTAL) {
      if (this.state.coresCollected >= this.state.totalCores) {
        window.sounds.win();
        this.isOver = true;
        this.emit('win', this.state.levelId, this.state.movesLeft);
        return;
      }
      this.emit('toast', `Cần thêm ${this.state.totalCores - this.state.coresCollected} lõi!`, 1200);
    }

    if (this.state.movesLeft <= 0 && !this.isOver) {
      window.sounds.lose();
      this.isOver = true;
      this.emit('gameOver', 'Hết bước di chuyển! Nguồn năng lượng đã cạn.');
    }
  }

  useBreakSkill() {
    if (this.isOver || this.state.skills.break <= 0) return;
    window.sounds.init();

    const dirMap = {
      up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 },
      left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 }
    };
    const delta = dirMap[this.state.player.dir];
    const targetX = this.state.player.x + delta.dx;
    const targetY = this.state.player.y + delta.dy;

    if (targetX < 0 || targetX >= this.state.width || targetY < 0 || targetY >= this.state.height) {
      this.emit('toast', 'Không có vật cản hợp lệ phía trước!', 1000);
      return;
    }

    if (this.state.grid[targetY][targetX] === window.TILE.BLOCK) {
      this.saveSnapshot();
      this.state.grid[targetY][targetX] = window.TILE.EMPTY;
      this.state.skills.break--;
      window.sounds.breakRock();
      this.emit('sparks', targetX, targetY, '#fbbf24', 18);
      this.emit('toast', 'Đã phá hủy khối đá!', 1000);
      this.emit('update');
    } else {
      this.emit('toast', 'Chỉ có thể phá hủy Khối Đá trước mặt!', 1000);
    }
  }

  useJumpSkill() {
    if (this.isOver || this.state.skills.jump <= 0) return;
    window.sounds.init();

    const dirMap = {
      up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 },
      left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 }
    };
    const delta = dirMap[this.state.player.dir];
    const landX = this.state.player.x + delta.dx * 2;
    const landY = this.state.player.y + delta.dy * 2;

    if (landX < 0 || landX >= this.state.width || landY < 0 || landY >= this.state.height) {
      this.emit('toast', 'Vùng đáp vượt khỏi bản đồ!', 1000);
      return;
    }

    const landTile = this.state.grid[landY][landX];
    if (landTile === window.TILE.WALL || landTile === window.TILE.BLOCK) {
      this.emit('toast', 'Ô tiếp đất bị chặn bởi vật cản!', 1000);
      return;
    }

    this.saveSnapshot();
    this.state.skills.jump--;
    window.sounds.jump();
    this.emit('sparks', this.state.player.x, this.state.player.y, '#a855f7', 10);
    this.stepInto(landX, landY);
    this.emit('sparks', landX, landY, '#a855f7', 12);
    this.emit('toast', 'Nhảy vọt lượng tử thành công!', 1000);
  }

  useUndoSkill() {
    if (this.isOver || this.state.skills.undo <= 0 || this.history.length === 0) return;
    window.sounds.init();

    const snap = this.history.pop();
    this.state.grid = snap.grid;
    this.state.player.x = snap.player.x;
    this.state.player.y = snap.player.y;
    this.state.player.dir = snap.player.dir;
    this.state.player.visualX = snap.player.x;
    this.state.player.visualY = snap.player.y;
    this.state.movesLeft = snap.movesLeft;
    this.state.coresCollected = snap.coresCollected;
    this.state.skills.undo--;

    window.sounds.undo();
    this.emit('sparks', this.state.player.x, this.state.player.y, '#38bdf8', 10);
    this.emit('toast', 'Đã quay lại 1 bước!', 900);
    this.emit('update');
  }
}

window.gameState = new GameState();
