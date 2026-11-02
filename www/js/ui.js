// Shared UI helpers: modal stack, toasts, haptics, app state.

import { loadSave, persist } from './storage.js';

export const save = loadSave();
export const commit = (immediate = false) => persist(save, immediate);

export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const modalStack = [];

/** Opens a modal. Returns {el, close}. `dismiss` allows tapping the backdrop / back button. */
export function openModal(html, { cls = '', dismiss = true, onClose } = {}) {
  const root = $('#modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  let closed = false;
  const entry = { dismiss, close: null };
  const close = () => {
    if (closed) return;
    closed = true;
    const i = modalStack.indexOf(entry);
    if (i >= 0) modalStack.splice(i, 1);
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 220);
    if (onClose) onClose();
  };
  entry.close = close;
  modalStack.push(entry);
  if (dismiss) wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  return { el: wrap.querySelector('.modal'), close };
}

/** Handles the Android back button for modals. Returns true if a modal consumed it. */
export function backModal() {
  const top = modalStack[modalStack.length - 1];
  if (!top) return false;
  if (top.dismiss) top.close();
  return true;
}
export function hasModal() { return modalStack.length > 0; }
export function closeAllModals() { while (modalStack.length) modalStack[modalStack.length - 1].close(); }

/** Simple choice dialog → resolves with the chosen button id. */
export function choose(html, buttons, opts = {}) {
  return new Promise((resolve) => {
    let result = null;
    const btns = buttons.map((b) => `<button class="btn ${b.cls || ''}" data-id="${b.id}">${b.label}</button>`).join('');
    const m = openModal(`${html}<div class="modal-actions">${btns}</div>`, { ...opts, onClose: () => resolve(result) });
    m.el.querySelectorAll('[data-id]').forEach((el) => el.addEventListener('click', () => { result = el.dataset.id; m.close(); }));
  });
}

let toastTimer = null;
export function toast(msg, ms = 2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function haptic(ms = 15) {
  if (!save.settings.haptics) return;
  const H = window.Capacitor?.Plugins?.Haptics;
  if (H) { H.impact({ style: ms >= 30 ? 'MEDIUM' : 'LIGHT' }).catch(() => {}); return; }
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* ignore */ } }
}

export function animateNumber(el, from, to, ms = 600) {
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / ms);
    el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function confetti(container, n = 60) {
  const colors = ['#ff8a00', '#e0115f', '#ffd23f', '#2fae4f', '#00a6a6', '#9b3fb5'];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.4 + 's';
    p.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    if (i % 3 === 0) p.style.borderRadius = '50%';
    frag.appendChild(p);
  }
  container.appendChild(frag);
  setTimeout(() => container.querySelectorAll('.confetti').forEach((c) => c.remove()), 3200);
}
