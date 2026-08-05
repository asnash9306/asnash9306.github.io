/* =========================================================
   IT-SURVIVAL : Der 9-to-5 Simulator — Game Logic v2
   10 Screens: 0 Start · 1 HDMI · 2 Tickets · 3 Passwort ·
   4 Viren · 5 Logs · 6 Kaffee · 7 RAM · 8 Quiz · 9 Ende
   ========================================================= */

'use strict';

/* =========================================================
   1. GLOBAL STATE
   ========================================================= */
const gameState = {
  currentLevel: 0,
  bossPatience: 100,
  coffeeLevel: 100,
  won: false,
  timers: { coffee: null, pw: null, virus: null, log: null },
};

const COFFEE_TICK_MS = 2000;
const COFFEE_PER_TICK = 1;
const COFFEE_REFILL = 30;
const LOW_WARN = 20;

const LEVEL_META = {
  1: { tag: 'LVL 1/8', task: 'HARDWARE-SETUP',      clock: '09:00' },
  2: { tag: 'LVL 2/8', task: 'FIRST-LEVEL SUPPORT', clock: '10:00' },
  3: { tag: 'LVL 3/8', task: 'PASSWORT-PING-PONG',  clock: '11:00' },
  4: { tag: 'LVL 4/8', task: 'VIREN-JAGD',          clock: '12:00' },
  5: { tag: 'LVL 5/8', task: 'LOG-ANALYSE',         clock: '13:00' },
  6: { tag: 'LVL 6/8', task: 'KAFFEE-NOTFALL',      clock: '14:00' },
  7: { tag: 'LVL 7/8', task: 'RAM-UPGRADE',         clock: '15:00' },
  8: { tag: 'LVL 8/8', task: 'KAFFEE-QUIZ',         clock: '16:00' },
};

/* =========================================================
   2. HELPERS
   ========================================================= */
const $ = (id) => document.getElementById(id);

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function setDisplay(el, show, flex) {
  el.style.display = show ? (flex ? 'flex' : 'block') : 'none';
}

let toastTimeout = null;
function showToast(msg, type) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.className = type === 'good' ? 'show good' : 'show';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.className = ''; }, 2200);
}

function playOverlay(id) {
  const el = $(id);
  el.classList.remove('play');
  void el.offsetWidth;
  el.classList.add('play');
}

function flashRed() { playOverlay('flash-red'); }
function flashGreen() { playOverlay('flash-green'); }
function flickerScreen() { playOverlay('flicker'); }

let bsodTimeout = null;
function showBSOD(ms) {
  const b = $('bsod');
  b.classList.add('show');
  clearTimeout(bsodTimeout);
  bsodTimeout = setTimeout(() => b.classList.remove('show'), ms || 1000);
}

function confetti(count) {
  const layer = $('confetti-layer');
  const colors = ['#00ff41', '#4fc3f7', '#ff2a6d', '#ffd54f', '#ffffff', '#ff8a65'];
  const n = count || 90;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
    c.style.animationDelay = (Math.random() * 0.4) + 's';
    c.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
    layer.appendChild(c);
    setTimeout(() => c.remove(), 3800);
  }
}

/* =========================================================
   3. HUD
   ========================================================= */
function updateHUD() {
  const c = clamp(gameState.coffeeLevel, 0, 100);
  const p = clamp(gameState.bossPatience, 0, 100);
  const coffeeFill = $('coffee-fill');
  const patienceFill = $('patience-fill');
  coffeeFill.style.width = c + '%';
  patienceFill.style.width = p + '%';
  $('coffee-value').textContent = c;
  $('patience-value').textContent = p;
  coffeeFill.classList.toggle('low-coffee', c <= LOW_WARN && c > 0);
  patienceFill.classList.toggle('low-patience', p <= LOW_WARN && p > 0);

  const meta = LEVEL_META[gameState.currentLevel];
  if (meta) {
    $('hud-level').textContent = meta.tag;
    $('hud-task').textContent = meta.task;
  }
}

function changePatience(delta, reason) {
  if (gameState.currentLevel <= 0 || gameState.currentLevel >= 9) return;
  gameState.bossPatience = clamp(gameState.bossPatience + delta, 0, 100);
  updateHUD();
  if (reason) showToast(reason + '  (Boss ' + delta + ')');
  flashRed();
  checkGameOver();
}

function checkGameOver() {
  if (gameState.currentLevel <= 0 || gameState.currentLevel >= 9) return false;
  if (gameState.coffeeLevel <= 0 || gameState.bossPatience <= 0) {
    gameState.won = false;
    gotoLevel(9);
    return true;
  }
  return false;
}

function startCoffeeLoop() {
  stopTimer('coffee');
  gameState.timers.coffee = setInterval(() => {
    if (gameState.currentLevel <= 0 || gameState.currentLevel >= 9) return;
    gameState.coffeeLevel = clamp(gameState.coffeeLevel - COFFEE_PER_TICK, 0, 100);
    updateHUD();
    checkGameOver();
  }, COFFEE_TICK_MS);
}

function stopTimer(key) {
  if (gameState.timers[key]) {
    clearInterval(gameState.timers[key]);
    gameState.timers[key] = null;
  }
}

function stopAllTimers() {
  Object.keys(gameState.timers).forEach(stopTimer);
}

/* =========================================================
   4. LEVEL-WECHSEL
   ========================================================= */
const levelInits = {};
const levelCleanups = {};

function gotoLevel(n) {
  const prev = $('level-' + gameState.currentLevel);
  if (prev) setDisplay(prev, false);
  const cleanup = levelCleanups[gameState.currentLevel];
  if (cleanup) cleanup();

  gameState.currentLevel = n;

  const hud = $('hud');
  if (n >= 1 && n <= 8) {
    setDisplay(hud, true);
    $('app').classList.add('hud-on');
  } else {
    setDisplay(hud, false);
    $('app').classList.remove('hud-on');
  }

  setDisplay($('level-' + n), true, true);

  if (n === 9) renderEndScreen();
  else if (levelInits[n]) levelInits[n]();
}

function completeLevel(next) {
  if (gameState.currentLevel >= 9) return;
  gameState.coffeeLevel = clamp(gameState.coffeeLevel + COFFEE_REFILL, 0, 100);
  updateHUD();
  setTimeout(() => {
    if (gameState.currentLevel < 9) gotoLevel(next);
  }, 750);
}

/* =========================================================
   5. LEVEL 9 : FEIERABEND
   ========================================================= */
function renderEndScreen() {
  stopAllTimers();
  const won = gameState.won && gameState.bossPatience > 0 && gameState.coffeeLevel > 0;
  const title = $('end-title');
  const rank = $('end-rank');
  const detail = $('end-detail');
  const now = new Date();
  $('stamp-time').textContent =
    String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  if (won) {
    title.textContent = '★ GEWONNEN! ★';
    title.classList.remove('gameover');
    let r;
    if (gameState.bossPatience > 80) r = 'ROOT-GOTT 👑';
    else if (gameState.bossPatience > 40) r = 'SYSADMIN 🖥';
    else r = 'MAUS-SCHUBSER 🐭';
    rank.textContent = 'Rang: ' + r;
    detail.innerHTML =
      'Du hast die Schicht überlebt!<br>' +
      '☕ Kaffee übrig: ' + gameState.coffeeLevel + '%<br>' +
      '😡 Boss-Geduld übrig: ' + gameState.bossPatience + '%';
    confetti(90);
  } else {
    title.textContent = 'GAME OVER';
    title.classList.add('gameover');
    rank.textContent = '';
    detail.innerHTML = gameState.bossPatience <= 0
      ? 'Du wurdest gefeuert. Der Boss hat genug. 📦'
      : 'Du bist eingeschlafen. Zu wenig Kaffee. 😴';
    flashRed();
  }
}

/* =========================================================
   6. LEVEL 0 : START + RESTART
   ========================================================= */
$('btn-start').addEventListener('click', () => {
  gameState.bossPatience = 100;
  gameState.coffeeLevel = 100;
  gameState.won = false;
  updateHUD();
  startCoffeeLoop();
  gotoLevel(1);
});

$('btn-restart').addEventListener('click', () => {
  stopAllTimers();
  gotoLevel(0);
});

/* =========================================================
   7. UNIFIED TOUCH + MOUSE HELPER
   ========================================================= */
function addPointer(el, handlers) {
  const getXY = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  let active = false;

  const start = (e) => {
    if (active) return;
    active = true;
    const p = getXY(e);
    if (handlers.start) handlers.start(p.x, p.y, e);
  };

  const move = (e) => {
    if (!active) return;
    if (e.cancelable) e.preventDefault();
    const p = getXY(e);
    if (handlers.move) handlers.move(p.x, p.y, e);
  };

  const end = (e) => {
    if (!active) return;
    active = false;
    const p = getXY(e);
    if (handlers.end) handlers.end(p.x, p.y, e);
  };

  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchmove', move, { passive: false });
  el.addEventListener('touchend', end, { passive: true });
  el.addEventListener('touchcancel', end, { passive: true });
  el.addEventListener('mousedown', start);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
}

function pointInRect(x, y, rect, pad) {
  const p = pad || 0;
  return x >= rect.left - p && x <= rect.right + p &&
         y >= rect.top - p && y <= rect.bottom + p;
}

/* =========================================================
   8. LEVEL 1 : PC-RÜCKSEITE (HDMI — Mainboard vs. GPU)
   ========================================================= */
levelInits[1] = function () {
  const cable = $('cable');
  const cableInner = $('cable-inner');
  const portMb = $('port-mb');
  const portGpu = $('port-gpu-hdmi');

  // Alle anderen Anschlüsse sind ebenfalls Fallen
  const traps = [
    { sel: '#pc-back .io-vga', msg: 'VGA?! Wir haben 2026!', pen: -10 },
    { sel: '#pc-back .gpu-dp', msg: 'HDMI passt nicht in DisplayPort!', pen: -10 },
    { sel: '#pc-back .io-usb', msg: 'Das ist kein Monitor-Anschluss!', pen: -10 },
    { sel: '#pc-back .io-lan', msg: 'Das ist kein Monitor-Anschluss!', pen: -10 },
    { sel: '#pc-back .io-audio', msg: 'Sound ja, Bild nein. Falscher Port!', pen: -10 },
  ].map((t) => ({
    pen: t.pen,
    msg: t.msg,
    els: Array.from(document.querySelectorAll(t.sel)),
  }));

  let flipCount = 0;
  let startX = 0, startY = 0;
  let baseX = 0, baseY = 0;
  let moved = false;
  let done = false;

  function resetCable() {
    baseX = 0; baseY = 0;
    cable.style.transform = 'translate(0px, 0px)';
  }

  function applyFlip() {
    cableInner.classList.remove('flip-1', 'flip-2');
    if (flipCount % 2 === 1) cableInner.classList.add('flip-1');
    else if (flipCount > 0) cableInner.classList.add('flip-2');
  }

  function clearGlow() {
    portGpu.classList.remove('hot');
    portMb.classList.remove('trap-glow');
  }

  addPointer(cable, {
    start(x, y) {
      if (done) return;
      startX = x; startY = y;
      moved = false;
      cable.classList.add('dragging');
    },
    move(x, y) {
      if (done) return;
      const dx = x - startX;
      const dy = y - startY;
      if (Math.abs(dx) + Math.abs(dy) > 10) moved = true;
      if (moved) {
        cable.style.transform = 'translate(' + (baseX + dx) + 'px, ' + (baseY + dy) + 'px)';
        // Nähe-Feedback auf den HDMI-Buchsen
        portGpu.classList.toggle('hot', pointInRect(x, y, portGpu.getBoundingClientRect(), 24));
        portMb.classList.toggle('trap-glow', pointInRect(x, y, portMb.getBoundingClientRect(), 24));
      }
    },
    end(x, y) {
      if (done) return;
      cable.classList.remove('dragging');
      clearGlow();

      // TAP: Stecker drehen (flipCount + 1, 180°-Animation)
      if (!moved) {
        flipCount++;
        applyFlip();
        return;
      }

      baseX += x - startX;
      baseY += y - startY;

      // Falle 1: HDMI am Mainboard
      if (pointInRect(x, y, portMb.getBoundingClientRect(), 14)) {
        changePatience(-15, 'Falscher Port! GPU ist verbaut!');
        resetCable();
        return;
      }

      // Falle 2: alle anderen Anschlüsse
      for (const trap of traps) {
        for (const el of trap.els) {
          if (pointInRect(x, y, el.getBoundingClientRect(), 12)) {
            changePatience(trap.pen, trap.msg);
            resetCable();
            return;
          }
        }
      }

      // Ziel: HDMI an der GPU
      if (pointInRect(x, y, portGpu.getBoundingClientRect(), 14)) {
        if (flipCount < 2) {
          showToast('Passt nicht. Dreh das Kabel!');
          resetCable();
          return;
        }
        done = true;
        cable.classList.add('dock');
        portGpu.classList.add('hot');
        flickerScreen();
        showToast('Monitor erkannt! Signal steht. ✅', 'good');
        completeLevel(2);
        return;
      }

      resetCable();
    },
  });
};

/* =========================================================
   9. LEVEL 2 : TICKET-TINDER
   ========================================================= */
const TICKETS = [
  { id: 'T-1042', emoji: '☕', text: 'Kaffee in Tastatur verschüttet', isDumbQuestion: true },
  { id: 'T-1043', emoji: '🔥', text: 'Datenbank brennt', isDumbQuestion: false },
  { id: 'T-1044', emoji: '🗑', text: 'User hat das Internet gelöscht', isDumbQuestion: true },
  { id: 'T-1045', emoji: '📉', text: 'Server offline – Shop down', isDumbQuestion: false },
  { id: 'T-1046', emoji: '🖱', text: 'Maus geht nicht (USB nicht eingesteckt)', isDumbQuestion: true },
];

levelInits[2] = function () {
  const stack = $('card-stack');
  let swiped = 0;
  let queue = TICKETS.slice();

  $('counter-2').textContent = '0 / 5';

  function renderStack() {
    stack.innerHTML = '';
    for (let i = queue.length - 1; i >= 0; i--) {
      const t = queue[i];
      const card = document.createElement('div');
      card.className = 'ticket-card';
      card.style.transform = 'translateY(' + i * 8 + 'px) scale(' + (1 - i * 0.04) + ')';
      card.style.zIndex = String(100 - i);
      card.innerHTML =
        '<span class="ticket-id">' + t.id + '</span>' +
        '<span class="ticket-emoji">' + t.emoji + '</span>' +
        '<span class="ticket-text">' + t.text + '</span>' +
        '<span class="stamp-ok">ESKALIERT</span>' +
        '<span class="stamp-no">IGNORIERT</span>';
      stack.appendChild(card);
      if (i === 0) attachSwipe(card, t);
    }
  }

  function attachSwipe(card, ticket) {
    let sx = 0;
    let dragging = false;
    const stampOk = card.querySelector('.stamp-ok');
    const stampNo = card.querySelector('.stamp-no');

    addPointer(card, {
      start(x) { sx = x; dragging = false; card.style.transition = 'none'; },
      move(x) {
        const dx = x - sx;
        if (Math.abs(dx) > 6) dragging = true;
        if (!dragging) return;
        card.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 14 + 'deg)';
        stampOk.style.opacity = clamp(dx / 80, 0, 1);
        stampNo.style.opacity = clamp(-dx / 80, 0, 1);
      },
      end(x) {
        card.style.transition = '';
        const dx = x - sx;
        if (!dragging || Math.abs(dx) < 70) {
          card.style.transform = 'translateX(0) rotate(0)';
          stampOk.style.opacity = 0;
          stampNo.style.opacity = 0;
          return;
        }
        const swipedRight = dx > 0;
        const correct = (swipedRight && !ticket.isDumbQuestion) || (!swipedRight && ticket.isDumbQuestion);

        card.style.transform = 'translateX(' + (swipedRight ? 1 : -1) * 140 + 'vw) rotate(' + (swipedRight ? 30 : -30) + 'deg)';
        card.style.opacity = '0';

        swiped++;
        $('counter-2').textContent = swiped + ' / 5';

        if (correct) {
          flashGreen();
        } else {
          changePatience(-10, swipedRight ? 'Das war KEIN Notfall!' : 'Das war wichtig!');
        }

        queue.shift();
        if (swiped >= 5) {
          showToast('Alle Tickets bearbeitet! 🎫', 'good');
          completeLevel(3);
        } else if (gameState.currentLevel === 2) {
          setTimeout(renderStack, 260);
        }
      },
    });
  }

  renderStack();
};

levelCleanups[2] = function () {
  $('card-stack').innerHTML = '';
};

/* =========================================================
   10. LEVEL 3 : PASSWORT-PING-PONG
   ========================================================= */
const PW_TIME_MS = 20000;

levelInits[3] = function () {
  const input = $('pw-input');
  const btnSave = $('btn-save-pw');
  const timerFill = $('timer-fill');
  const timerText = $('timer-text');

  const rules = {
    upper: { el: $('rule-case'), test: (v) => /[A-Z]/.test(v) },
    special: { el: $('rule-special'), test: (v) => /[!@#$%^&*]/.test(v) },
    forbidden: {
      el: $('rule-forbidden'),
      test: (v) => v.length > 0 && v.toLowerCase() !== 'passwort' && v.toLowerCase() !== 'admin',
    },
    emoji: { el: $('rule-emoji'), test: (v) => /[^\u0000-\u24FF]/.test(v) },
  };

  input.value = '';
  setDisplay(btnSave, false);
  Object.values(rules).forEach((r) => r.el.classList.remove('ok'));

  function checkAll() {
    const v = input.value;
    let allOk = v.length > 0;
    Object.values(rules).forEach((r) => {
      const ok = r.test(v);
      r.el.classList.toggle('ok', ok);
      if (!ok) allOk = false;
    });
    setDisplay(btnSave, allOk);
  }

  input.addEventListener('keyup', checkAll);
  input.addEventListener('input', checkAll);

  btnSave.onclick = () => {
    stopTimer('pw');
    showToast('Passwort gespeichert. Erinnere dich in 30 Tagen nicht daran. 🔒', 'good');
    flashGreen();
    completeLevel(4);
  };

  const t0 = Date.now();
  stopTimer('pw');
  gameState.timers.pw = setInterval(() => {
    if (gameState.currentLevel !== 3) { stopTimer('pw'); return; }
    const remain = PW_TIME_MS - (Date.now() - t0);
    if (remain <= 0) {
      stopTimer('pw');
      timerFill.style.width = '0%';
      timerText.textContent = '0s';
      changePatience(-20, 'Zu langsam! Der Boss wartet!');
      if (gameState.currentLevel === 3) {
        levelInits[3]();
      }
      return;
    }
    const pct = (remain / PW_TIME_MS) * 100;
    timerFill.style.width = pct + '%';
    timerFill.classList.toggle('danger', pct < 30);
    timerText.textContent = Math.ceil(remain / 1000) + 's';
  }, 100);
};

levelCleanups[3] = function () {
  stopTimer('pw');
};

/* =========================================================
   11. LEVEL 4 : VIREN-JAGD
   ========================================================= */
const VIRUS_EMOJIS = ['😈', '👾', '🦠', '💣'];
const SYSTEM_EMOJIS = ['📁', '💾', '📄', '🖥'];
const VIRUS_NAMES = ['crypt0.exe', 'trojan.dll', 'wurm.bat', 'sehr_echt.exe'];
const SYSTEM_NAMES = ['system32', 'dokumente', 'gehalt.xlsx', 'kernel'];

levelInits[4] = function () {
  const desktop = $('desktop');
  let kills = 0;
  $('kill-count').textContent = '0';

  function spawnIcon() {
    if (gameState.currentLevel !== 4) return;
    const isVirus = Math.random() < 0.45;
    const icon = document.createElement('div');
    icon.className = 'file-icon';

    const dr = desktop.getBoundingClientRect();
    const x = 8 + Math.random() * Math.max(dr.width - 80, 60);
    const y = 8 + Math.random() * Math.max(dr.height - 110, 60);
    icon.style.left = x + 'px';
    icon.style.top = y + 'px';

    const emoji = isVirus
      ? VIRUS_EMOJIS[Math.floor(Math.random() * VIRUS_EMOJIS.length)]
      : SYSTEM_EMOJIS[Math.floor(Math.random() * SYSTEM_EMOJIS.length)];
    const name = isVirus
      ? VIRUS_NAMES[Math.floor(Math.random() * VIRUS_NAMES.length)]
      : SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)];

    icon.innerHTML = '<span class="fi-emoji">' + emoji + '</span><span class="fi-name">' + name + '</span>';
    desktop.appendChild(icon);

    const despawn = setTimeout(() => { if (icon.parentNode) icon.remove(); }, 2000);

    addPointer(icon, {
      start(px, py, e) {
        if (e.cancelable) e.preventDefault();
        clearTimeout(despawn);
        if (!icon.parentNode) return;

        if (isVirus) {
          const ir = icon.getBoundingClientRect();
          const cx = ir.left + ir.width / 2;
          const cy = ir.top + ir.height / 2;
          for (let i = 0; i < 10; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const ang = (Math.PI * 2 * i) / 10 + Math.random();
            const dist = 26 + Math.random() * 30;
            p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
            p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
            p.style.left = cx - 3 + 'px';
            p.style.top = cy - 3 + 'px';
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 600);
          }
          icon.remove();
          kills++;
          $('kill-count').textContent = kills;
          if (kills >= 10) {
            stopTimer('virus');
            flashGreen();
            showToast('System bereinigt! 🛡', 'good');
            completeLevel(5);
          }
        } else {
          icon.remove();
          showBSOD(1000);
          changePatience(-25, 'SYSTEMDATEI GELÖSCHT!');
        }
      },
    });
  }

  stopTimer('virus');
  gameState.timers.virus = setInterval(spawnIcon, 800);
};

levelCleanups[4] = function () {
  stopTimer('virus');
  const desktop = $('desktop');
  desktop.querySelectorAll('.file-icon').forEach((el) => el.remove());
};

/* =========================================================
   12. LEVEL 5 : LOG-ANALYSE (neu)
   ========================================================= */
const LOG_TIME_MS = 30000;
const LOG_LINES_NEEDED = 6;

const LOG_TEXTS = {
  err: [
    'segfault at 0x7fff in module auth.so',
    'FATAL: database connection lost',
    'kernel panic – not syncing',
    'OOM killer invoked on process java',
    'disk /dev/sda1: I/O error',
    'CRITICAL: raid array degraded',
    'panic: runtime error: index out of range',
  ],
  warn: [
    'cpu temperature above threshold',
    'deprecated API call detected',
    'swap usage at 87%',
    'tls certificate expires in 3 days',
    'slow query took 2.4s',
  ],
  info: [
    'backup completed successfully',
    'user admin logged in',
    'cron job finished: cleanup',
    'http 200 GET /index.html',
    'service nginx reloaded',
    'sync done in 12ms',
  ],
};

levelInits[5] = function () {
  const feed = $('log-lines');
  feed.innerHTML = '';
  let found = 0;
  let clockS = 0;
  $('log-count').textContent = '0';

  function stamp() {
    clockS += 1 + Math.floor(Math.random() * 4);
    const mm = String(Math.floor(clockS / 60)).padStart(2, '0');
    const ss = String(clockS % 60).padStart(2, '0');
    return '13:' + mm + ':' + ss;
  }

  function spawnLine() {
    if (gameState.currentLevel !== 5) return;
    const roll = Math.random();
    const type = roll < 0.35 ? 'err' : roll < 0.6 ? 'warn' : 'info';
    const texts = LOG_TEXTS[type];
    const text = texts[Math.floor(Math.random() * texts.length)];

    const line = document.createElement('div');
    line.className = 'log-line ' + type;
    const label = type === 'err' ? 'ERROR' : type.toUpperCase();
    line.innerHTML = '<span class="lt">[' + stamp() + ']</span> <span class="lv">[' + label + ']</span> ' + text;
    feed.prepend(line);

    while (feed.children.length > 9) feed.removeChild(feed.lastChild);

    addPointer(line, {
      start(px, py, e) {
        if (e.cancelable) e.preventDefault();
        if (line.classList.contains('caught')) return;
        if (type === 'err') {
          line.classList.add('caught');
          found++;
          $('log-count').textContent = found;
          setTimeout(() => { if (line.parentNode) line.remove(); }, 450);
          if (found >= LOG_LINES_NEEDED) {
            stopTimer('log');
            stopTimer('logt');
            flashGreen();
            showToast('Alle Errors gefixt! Server beruhigt. 📋', 'good');
            completeLevel(6);
          }
        } else {
          line.classList.remove('miss');
          void line.offsetWidth;
          line.classList.add('miss');
          changePatience(-10, 'Das war kein ERROR!');
        }
      },
    });
  }

  stopTimer('log');
  gameState.timers.log = setInterval(spawnLine, 900);

  // 30-Sekunden-Timer
  const t0 = Date.now();
  const fill = $('log-timer-fill');
  const txt = $('log-timer-text');
  stopTimer('logt');
  gameState.timers.logt = setInterval(() => {
    if (gameState.currentLevel !== 5) { stopTimer('logt'); return; }
    const remain = LOG_TIME_MS - (Date.now() - t0);
    if (remain <= 0) {
      stopTimer('logt');
      changePatience(-20, 'Logs nicht rechtzeitig gesichtet!');
      if (gameState.currentLevel === 5) levelInits[5]();
      return;
    }
    const pct = (remain / LOG_TIME_MS) * 100;
    fill.style.width = pct + '%';
    fill.classList.toggle('danger', pct < 30);
    txt.textContent = Math.ceil(remain / 1000) + 's';
  }, 100);
};

levelCleanups[5] = function () {
  stopTimer('log');
  stopTimer('logt');
  $('log-lines').innerHTML = '';
};

/* =========================================================
   13. LEVEL 6 : KAFFEE-NOTFALL (neu)
   ========================================================= */
levelInits[6] = function () {
  const liquid = $('coffee-liquid');
  const btn = $('btn-brew');

  let fill = 10;
  let brewing = false;
  let done = false;

  liquid.style.height = fill + '%';
  btn.classList.remove('brewing');

  function win() {
    done = true;
    brewing = false;
    btn.classList.remove('brewing');
    stopTimer('brew');
    gameState.coffeeLevel = 100;
    updateHUD();
    confetti(30);
    showToast('Gerettet! Koffein-Level wiederhergestellt. ☕', 'good');
    completeLevel(7);
  }

  addPointer(btn, {
    start(px, py, e) {
      if (done) return;
      if (e.cancelable) e.preventDefault();
      brewing = true;
      btn.classList.add('brewing');
    },
    end() {
      if (done) return;
      brewing = false;
      btn.classList.remove('brewing');
      if (fill >= 76 && fill <= 92) {
        win();
      } else if (fill > 92) {
        showToast('Fast zu viel – Achtung, gleich läuft es über!');
      } else {
        showToast('Noch zu wenig – weiter füllen!');
      }
    },
  });

  stopTimer('brew');
  gameState.timers.brew = setInterval(() => {
    if (gameState.currentLevel !== 6 || done) { return; }
    if (brewing) {
      fill = Math.min(fill + 1.3, 104);
    } else {
      fill = Math.max(fill - 0.35, 10);
    }
    liquid.style.height = Math.min(fill, 100) + '%';
    if (fill >= 100) {
      brewing = false;
      btn.classList.remove('brewing');
      fill = 10;
      liquid.style.height = '10%';
      changePatience(-15, 'Überlaufen! Die Tastatur ist nass!');
    }
  }, 50);
};

levelCleanups[6] = function () {
  stopTimer('brew');
};

/* =========================================================
   14. LEVEL 7 : RAM-UPGRADE (3 Phasen)
   ========================================================= */
const DUST_DISTANCE = 420;
const CLIP_WINDOW_MS = 500;

levelInits[7] = function () {
  const cleanArea = $('clean-area');
  const dust = $('dust');
  const clipLeft = $('clip-left');
  const clipRight = $('clip-right');
  const slot = $('slot');
  const ram = $('ram');
  const ramInner = $('ram-inner');
  const phaseLabel = $('phase-label');
  const ramHint = $('ram-hint');

  let phase = 1;

  dust.classList.remove('gone');
  clipLeft.disabled = true;
  clipRight.disabled = true;
  clipLeft.classList.remove('open');
  clipRight.classList.remove('open');
  slot.classList.remove('armed', 'filled');
  setDisplay(ram, false);
  setDisplay(ramHint, false);
  ram.style.transform = 'translate(0px, 0px)';
  ramInner.classList.remove('rot');
  phaseLabel.textContent = 'Phase 1/3: Wische den Staub vom Mainboard!';

  let dustDist = 0;
  let lastX = null, lastY = null;

  addPointer(cleanArea, {
    start(x, y) { lastX = x; lastY = y; },
    move(x, y) {
      if (phase !== 1 || lastX === null) return;
      dustDist += Math.hypot(x - lastX, y - lastY);
      lastX = x; lastY = y;
      dust.style.opacity = String(clamp(1 - dustDist / DUST_DISTANCE, 0, 1));
      if (dustDist >= DUST_DISTANCE) {
        phase = 2;
        dust.classList.add('gone');
        clipLeft.disabled = false;
        clipRight.disabled = false;
        phaseLabel.textContent = 'Phase 2/3: Öffne beide Klammern – innerhalb von 0,5s!';
        flashGreen();
      }
    },
    end() { lastX = null; lastY = null; },
  });

  let firstClipTime = 0;

  function pressClip(which) {
    if (phase !== 2) return;
    const now = Date.now();
    const btn = which === 'left' ? clipLeft : clipRight;
    btn.classList.add('open');

    if (firstClipTime === 0) {
      firstClipTime = now;
      return;
    }

    if (now - firstClipTime <= CLIP_WINDOW_MS &&
        clipLeft.classList.contains('open') &&
        clipRight.classList.contains('open')) {
      phase = 3;
      slot.classList.add('armed');
      phaseLabel.textContent = 'Phase 3/3: Dreh den RAM richtig und steck ihn ein!';
      setDisplay(ram, true, 'block');
      setDisplay(ramHint, true);
      flashGreen();
    } else {
      firstClipTime = now;
      clipLeft.classList.remove('open');
      clipRight.classList.remove('open');
      btn.classList.add('open');
      showToast('Zu langsam! Beide Klammern gleichzeitig!');
    }
  }

  clipLeft.onclick = () => pressClip('left');
  clipRight.onclick = () => pressClip('right');

  let ramRot = 0;
  let ramDone = false;
  let rsx = 0, rsy = 0;
  let ramMoved = false;
  let ramBaseX = 0, ramBaseY = 0;

  addPointer(ram, {
    start(x, y) {
      if (phase !== 3 || ramDone) return;
      rsx = x; rsy = y;
      ramMoved = false;
      ram.classList.add('dragging');
    },
    move(x, y) {
      if (phase !== 3 || ramDone) return;
      const dx = x - rsx;
      const dy = y - rsy;
      if (Math.abs(dx) + Math.abs(dy) > 10) ramMoved = true;
      if (ramMoved) {
        ram.style.transform = 'translate(' + (ramBaseX + dx) + 'px, ' + (ramBaseY + dy) + 'px)';
      }
    },
    end(x, y) {
      if (phase !== 3 || ramDone) return;
      ram.classList.remove('dragging');

      if (!ramMoved) {
        ramRot = (ramRot + 180) % 360;
        ramInner.classList.toggle('rot', ramRot === 180);
        return;
      }

      ramBaseX += x - rsx;
      ramBaseY += y - rsy;

      const rSlot = slot.getBoundingClientRect();
      if (pointInRect(x, y, rSlot, 16)) {
        if (ramRot !== 0) {
          showToast('Rastet nicht ein – falscher Winkel! Dreh den Riegel!');
          ramBaseX = 0; ramBaseY = 0;
          ram.style.transform = 'translate(0px, 0px)';
          return;
        }
        ramDone = true;
        ramBaseX = 0; ramBaseY = 0;
        ram.style.transform = 'translate(0px, 0px)';
        setDisplay(ram, false);
        slot.classList.remove('armed');
        slot.classList.add('filled');
        flickerScreen();
        showToast('16 GB erkannt. Der Rechner atmet auf. 🚀', 'good');
        completeLevel(8);
        return;
      }

      ramBaseX = 0; ramBaseY = 0;
      ram.style.transform = 'translate(0px, 0px)';
    },
  });
};

/* =========================================================
   15. LEVEL 8 : FACHWISSEN-CHECK
   ========================================================= */
levelInits[8] = function () {
  const reply = $('colleague-reply');
  setDisplay(reply, false);
  const buttons = document.querySelectorAll('.answer-btn');
  let solved = false;

  buttons.forEach((btn) => {
    btn.classList.remove('correct', 'wrong');
    btn.onclick = () => {
      if (solved) return;
      if (btn.dataset.answer === 'HTML') {
        solved = true;
        btn.classList.add('correct');
        confetti(90);
        showToast('Korrekt! HTML ist eine Auszeichnungssprache. 🎉', 'good');
        gameState.won = true;
        completeLevel(9);
      } else {
        btn.classList.add('wrong');
        setDisplay(reply, true);
        changePatience(-15, 'Der Kollege zweifelt an dir.');
        setTimeout(() => btn.classList.remove('wrong'), 500);
      }
    };
  });
};

/* =========================================================
   16. BOOT
   ========================================================= */
updateHUD();
