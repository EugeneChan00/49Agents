// ─── Notification System ──────────────────────────────────────────────────
// Toast notifications, snooze/escalation, browser notifications, tab title badge.
// Manages notification state independently; receives callbacks for external actions.

import { escapeHtml } from './utils.js';
import { playNotificationSound, playDismissSound } from './sounds.js';

let _ctx = null;

export function initNotificationDeps(ctx) { _ctx = ctx; }

// ── State ──
const previousClaudeStates = new Map();
const notifiedStates = new Map();
let isFirstClaudeStateUpdate = true;
let notificationContainer = null;
const activeToasts = new Map();
const snoozedNotifications = new Map();
const snoozeCount = new Map();
const originalTitle = '49Agents';

// These are read from the IIFE via ctx
function getSnoozeDurationMs() { return _ctx.getSnoozeDurationMs(); }
function getAutoRemoveDoneNotifs() { return _ctx.getAutoRemoveDoneNotifs(); }

// Expose for updateClaudeStates (still in app.js)
export { previousClaudeStates, notifiedStates, activeToasts, snoozedNotifications, snoozeCount };
export function getNotificationContainer() { return notificationContainer; }
export function getIsFirstClaudeStateUpdate() { return isFirstClaudeStateUpdate; }
export function setIsFirstClaudeStateUpdate(val) { isFirstClaudeStateUpdate = val; }

// ── Init ──

export function initNotifications() {
  notificationContainer = document.createElement('div');
  notificationContainer.id = 'notification-container';
  document.body.appendChild(notificationContainer);

  setInterval(checkSnoozedNotifications, 10000);
  setInterval(checkActiveNotifications, 5000);
}

// ── Toast ──

export function showToast(terminalId, title, deviceName, locationName, icon, priority, claudeState, info = null) {
  dismissToast(terminalId);
  snoozedNotifications.delete(terminalId);

  const toast = document.createElement('div');
  toast.className = `notification-toast state-${claudeState || 'idle'}`;
  toast.dataset.terminalId = terminalId;
  toast.dataset.claudeState = claudeState || 'idle';

  const isHighPriority = priority === 'high';
  const actionButton = isHighPriority
    ? `<button class="notification-snooze" data-tooltip="Snooze for 3 minutes">\uD83D\uDD50</button>`
    : `<button class="notification-dismiss" data-tooltip="Dismiss">&times;</button>`;

  toast.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-body">
      <div class="notification-title">${escapeHtml(title)}</div>
      ${deviceName ? `<div class="notification-device">${escapeHtml(deviceName)}</div>` : ''}
      ${locationName ? `<div class="notification-path">${escapeHtml(locationName)}</div>` : ''}
    </div>
    ${actionButton}
  `;

  toast._notificationInfo = { title, deviceName, locationName, icon, priority, claudeState, info };

  if (!localStorage.getItem('hasSeenToastTooltip')) {
    const onFirstHover = () => {
      toast.removeEventListener('mouseenter', onFirstHover);
      const tip = document.createElement('div');
      tip.className = 'toast-tooltip';
      tip.textContent = isHighPriority ? 'Right-click to snooze' : 'Right-click to dismiss';
      toast.appendChild(tip);
      requestAnimationFrame(() => tip.classList.add('visible'));
      setTimeout(() => { tip.classList.remove('visible'); setTimeout(() => tip.remove(), 200); }, 3000);
      localStorage.setItem('hasSeenToastTooltip', '1');
    };
    toast.addEventListener('mouseenter', onFirstHover);
  }

  toast.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isDone = toast._notificationInfo.claudeState === 'idle';
    if (isDone) {
      dismissToast(terminalId);
    } else {
      snoozeNotification(terminalId, toast._notificationInfo);
    }
  });

  toast.addEventListener('click', (e) => {
    if (e.target.closest('.notification-dismiss') || e.target.closest('.notification-snooze')) return;
    _ctx.panToPane(terminalId);
  });

  const snoozeBtn = toast.querySelector('.notification-snooze');
  if (snoozeBtn) {
    snoozeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      snoozeNotification(terminalId, toast._notificationInfo);
    });
  }

  const dismissBtn = toast.querySelector('.notification-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissToast(terminalId);
    });
  }

  notificationContainer.prepend(toast);
  activeToasts.set(terminalId, toast);

  requestAnimationFrame(() => toast.classList.add('visible'));

  if (priority === 'medium' && getAutoRemoveDoneNotifs()) {
    toast._autoDismissTimer = setTimeout(() => dismissToast(terminalId), 15000);
  }

  const allToasts = notificationContainer.querySelectorAll('.notification-toast');
  if (allToasts.length > 8) {
    for (let i = 8; i < allToasts.length; i++) {
      const old = allToasts[i];
      if (old.dataset.terminalId) activeToasts.delete(old.dataset.terminalId);
      old.remove();
    }
  }
}

// ── Snooze ──

export function snoozeNotification(terminalId, notificationInfo) {
  const toast = activeToasts.get(terminalId);
  if (toast) {
    toast.classList.add('dismissing');
    activeToasts.delete(terminalId);
    setTimeout(() => toast.remove(), 200);
  }

  const key = `${terminalId}:${notificationInfo.claudeState}`;
  snoozeCount.set(key, (snoozeCount.get(key) || 0) + 1);

  snoozedNotifications.set(terminalId, {
    snoozeUntil: Date.now() + getSnoozeDurationMs(),
    ...notificationInfo,
  });
}

function checkSnoozedNotifications() {
  const now = Date.now();
  for (const [terminalId, snoozed] of snoozedNotifications) {
    if (now >= snoozed.snoozeUntil) {
      snoozedNotifications.delete(terminalId);

      const currentState = previousClaudeStates.get(terminalId);
      const stateStillNeedsAttention =
        currentState === undefined ||
        currentState === snoozed.claudeState;

      if (stateStillNeedsAttention) {
        const key = `${terminalId}:${snoozed.claudeState}`;
        const count = snoozeCount.get(key) || 0;

        showToast(
          terminalId, snoozed.title, snoozed.deviceName, snoozed.locationName,
          snoozed.icon, snoozed.priority, snoozed.claudeState, snoozed.info
        );

        const toast = activeToasts.get(terminalId);
        if (toast && count >= 5) {
          toast.classList.add('critical-escalated');
        } else if (toast && count >= 3) {
          toast.classList.add('escalated');
        }

        playNotificationSound(snoozed.claudeState, count);
      }
    }
  }
}

function checkActiveNotifications() {
  for (const [terminalId, toast] of activeToasts) {
    const notifState = toast.dataset.claudeState;
    const currentState = previousClaudeStates.get(terminalId);

    if (notifState === 'permission' || notifState === 'question' || notifState === 'inputNeeded') {
      if (currentState && currentState !== notifState) {
        dismissToast(terminalId);
      }
    }
  }
}

// ── Dismiss ──

export function dismissToast(terminalId) {
  const toast = activeToasts.get(terminalId);
  if (toast) {
    if (toast._autoDismissTimer) clearTimeout(toast._autoDismissTimer);
    if (toast._guestCountdown) clearInterval(toast._guestCountdown);
    const isHighPriority = toast.classList.contains('state-permission') ||
                           toast.classList.contains('state-question') ||
                           toast.classList.contains('state-inputNeeded');
    if (isHighPriority) {
      playDismissSound();
    }
    toast.classList.add('dismissing');
    activeToasts.delete(terminalId);
    setTimeout(() => toast.remove(), 200);
  }
}

// ── Browser notifications ──

export function sendBrowserNotification(terminalId, title, body) {
  if (!document.hidden) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
    return;
  }
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body: body,
    tag: `claude-${terminalId}`,
    icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23e87b35"><circle cx="8" cy="8" r="8"/></svg>'),
  });
  notification.onclick = () => {
    window.focus();
    _ctx.panToPane(terminalId);
    notification.close();
  };
}

// ── Tab title ──

export function updateTabTitleBadge(states) {
  let highPriorityCount = 0;
  for (const [, info] of Object.entries(states)) {
    if (info.isClaude && (info.state === 'permission' || info.state === 'question' || info.state === 'inputNeeded')) {
      highPriorityCount++;
    }
  }
  document.title = highPriorityCount > 0 ? `(${highPriorityCount}) ${originalTitle}` : originalTitle;
}

// ── State transition handler ──

export function handleStateTransition(terminalId, prevState, newState, info) {
  const paneData = _ctx.getState().panes.find(p => p.id === terminalId);
  const deviceName = paneData?.device || '';
  const locationName = info.location?.name || '';

  if (prevState && prevState !== newState) {
    snoozeCount.delete(`${terminalId}:${prevState}`);
  }

  let title, icon, priority;
  if (newState === 'permission') {
    title = 'Needs permission';
    icon = '\uD83D\uDD11';
    priority = 'high';
  } else if (newState === 'question' || newState === 'inputNeeded') {
    title = 'Needs input';
    icon = '\u2754';
    priority = 'high';
  } else if (newState === 'idle' && prevState === 'working') {
    title = 'Task complete';
    icon = '\u2705';
    priority = 'medium';
  } else {
    return;
  }

  if (notifiedStates.get(terminalId) === newState && !snoozedNotifications.has(terminalId)) return;
  notifiedStates.set(terminalId, newState);

  showToast(terminalId, title, deviceName, locationName, icon, priority, newState, info);
  playNotificationSound(newState);
  const detail = [deviceName, locationName].filter(Boolean).join(' \u00b7 ');
  sendBrowserNotification(terminalId, `Claude: ${title}`, detail);
}
