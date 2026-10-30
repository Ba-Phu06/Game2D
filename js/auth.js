/**
 * Authentication Module: Google Sign-In & Guest Accounts
 */
class AuthSystem {
  constructor() {
    this.storageKey = 'chrono_aether_user';
    this.currentUser = this.loadUser();
    this.listeners = [];
  }

  loadUser() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) return JSON.parse(data);
    } catch (e) {
      // Storage error
    }
    return this.createGuestUser();
  }

  saveUser(user) {
    this.currentUser = user;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(user));
    } catch (e) {
      // Storage error
    }
    this.notify();
  }

  createGuestUser(customName = '') {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const guestUser = {
      type: 'guest',
      id: `guest_${randomId}`,
      name: customName.trim() || `Phi Hành Gia #${randomId}`,
      email: '',
      avatar: '🚀',
      createdAt: Date.now()
    };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(guestUser));
    } catch (e) {
      // Storage error
    }
    return guestUser;
  }

  async signInWithGuest(name = '') {
    const user = this.createGuestUser(name);
    this.saveUser(user);
    return { success: true, user };
  }

  async signInWithGmail(email, displayName = '') {
    if (!email || !email.includes('@')) {
      throw new Error('Địa chỉ email không hợp lệ!');
    }
    const cleanName = displayName.trim() || email.split('@')[0];
    const user = {
      type: 'google',
      id: `google_${btoa(email).substring(0, 12)}`,
      name: cleanName,
      email: email.trim().toLowerCase(),
      avatar: 'G',
      createdAt: Date.now()
    };
    this.saveUser(user);
    return { success: true, user };
  }

  handleGoogleCredential(credential) {
    try {
      // Decode JWT payload
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      const user = {
        type: 'google',
        id: `google_${payload.sub}`,
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        avatar: payload.picture || 'G',
        createdAt: Date.now()
      };
      this.saveUser(user);
      return { success: true, user };
    } catch (err) {
      throw new Error('Giải mã thông tin Google thất bại.');
    }
  }

  signOut() {
    const guest = this.createGuestUser();
    this.saveUser(guest);
    return guest;
  }

  getUser() {
    return this.currentUser;
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach((cb) => {
      try {
        cb(this.currentUser);
      } catch (e) {
        // Listener error
      }
    });
  }
}

window.authSystem = new AuthSystem();
