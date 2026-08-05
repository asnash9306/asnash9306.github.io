/* =========================================================
   IT-SURVIVAL : Der 9-to-5 Simulator — Game Logic & State
   Vanilla JS, keine Abhängigkeiten, keine Build-Tools
   ========================================================= */

'use strict';

/* =========================================================
   1. GLOBAL STATE
   ========================================================= */
const gameState = {
  currentLevel: 0,     // 0 = Start, 1-6 = Minigames, 7 = Endscreen
  bossPatience: 100,   // sinkt bei Fehlern
  coffeeLevel: 100,    // sinkt alle 2s um 1, Level-Abschluss füllt auf
  won: false,
  timers: { coffee: null, pw: null, virus: null },
};

const COFFEE_TICK_MS = 2000;   // Kaffee-Intervall
const COFFEE_PER_TICK = 1;     // Verlust pro Tick
const COFFEE_REFILL = 35;      // Belohnung pro Level-Abschluss
const LOW_WARN = 20;

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
  void el.offsetWidth; // Reflow → Animation neu starten
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

function confetti() {
  const layer = $('confetti-layer');
  const colors = ['#00ff41', '#4fc3f7', '#ff2a6d', '#ffd54f', '#ffffff', '#ff8a65'];
  for (let i = 0; i < 90; i++) {
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
}

function changePatience(delta, reason) {
  if (gameState.currentLevel <= 0 || gameState.currentLevel >= 7) return;
  gameState.bossPatience = clamp(gameState.bossPatience + delta, 0, 100);
  updateHUD();
  if (reason) showToast(reason + '  (Boss ' + delta + ')');
  flashRed();
  checkGameOver();
}

function checkGameOver() {
  if (gameState.currentLevel <= 0 || gameState.currentLevel >= 7) return false;
  if (gameState.coffeeLevel <= 0 || gameState.bossPatience <= 0) {
    gameState.won = false;
    gotoLevel(7);
    return true;
  }
  return false;
}

/* Kaffee-Loop: sinkt alle 2 Sekunden um 1 */
function startCoffeeLoop() {
  stopTimer('coffee');
  gameState.timers.coffee = setInterval(() => {
    if (gameState.currentLevel <= 0 || gameState.currentLevel >= 7) return;
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
  stopTimer('coffee');
  stopTimer('pw');
  stopTimer('virus');
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
  if (n >= 1 && n <= 6) {
    setDisplay(hud, true);
    $('app').classList.add('hud-on');
  } else {
    setDisplay(hud, false);
    $('app').classList.remove('hud-on');
  }

  setDisplay($('level-' + n), true, true);

  if (n === 7) renderEndScreen();
  else if (levelInits[n]) levelInits[n]();
}

function completeLevel(next) {
  if (gameState.currentLevel >= 7) return;
  gameState.coffeeLevel = clamp(gameState.coffeeLevel + COFFEE_REFILL, 0, 100);
  updateHUD();
  setTimeout(() => {
    if (gameState.currentLevel < 7) gotoLevel(next);
  }, 750);
}

/* =========================================================
   5. LEVEL 7 : FEIERABEND (End-Screen)
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
    confetti();
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
   Alle Minigames nutzen Touch-Events UND Maus-Fallbacks.
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
   8. LEVEL 1 : HARDWARE-SETUP (HDMI-Kabel)
   ========================================================= */
levelInits[1] = function () {
  const cable = $('cable');
  const cableInner = $('cable-inner');
  const portMb = $('port-mb');
  const portGpu = $('port-gpu');

  let flipCount = 0;
  let home = null;          // Ausgangsposition des Kabels
  let startX = 0, startY = 0;
  let baseX = 0, baseY = 0; // kumulierte Verschiebung
  let moved = false;
  let done = false;

  home = cable.getBoundingClientRect();

  function resetCable() {
    baseX = 0; baseY = 0;
    cable.style.transform = 'translate(0px, 0px)';
  }

  function applyFlip() {
    cableInner.classList.remove('flip-1', 'flip-2');
    if (flipCount % 2 === 1) cableInner.classList.add('flip-1');
    else if (flipCount > 0) cableInner.classList.add('flip-2');
  }

  addPointer(cable, {
    start(x, y) {
      if (done) return;
      home = cable.getBoundingClientRect();
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
      }
    },
    end(x, y) {
      if (done) return;
      cable.classList.remove('dragging');

      // TAP: Kabel drehen (flipCount + 1, 180°-Animation)
      if (!moved) {
        flipCount++;
        applyFlip();
        return;
      }

      baseX += x - startX;
      baseY += y - startY;

      const rMb = portMb.getBoundingClientRect();
      const rGpu = portGpu.getBoundingClientRect();

      if (pointInRect(x, y, rMb, 12)) {
        // Fehler 1: Mainboard-Port
        changePatience(-15, 'Falscher Port! GPU ist verbaut!');
        resetCable();
        return;
      }

      if (pointInRect(x, y, rGpu, 12)) {
        if (flipCount < 2) {
          // Fehler 2: richtiger Port, falsche Orientierung
          showToast('Passt nicht. Dreh das Kabel!');
          resetCable();
          return;
        }
        // ERFOLG: GPU + flipCount >= 2
        done = true;
        cable.classList.add('dock');
        portGpu.classList.add('hot');
        flickerScreen();
        showToast('Monitor erkannt! Signal steht. ✅', 'good');
        completeLevel(2);
        return;
      }

      // Nirgends losgelassen → zurückspringen
      resetCable();
    },
  });
};

/* =========================================================
   9. LEVEL 2 : TICKET-TINDER (First-Level Support)
   ========================================================= */
const TICKETS = [
  { id: 'T-1042', emoji: '☕', text: 'Kaffee in Tastatur verschüttet', isDumbQuestion: true },
  { id: 'T-1043', emoji: '🔥', text: 'Datenbank brennt', isDumbQuestion: false },
  { id: 'T-1044', emoji: '🗑', text: 'User hat das Internet gelöscht', isDumbQuestion: true },
  { id: 'T-1045', emoji: '📉', text: 'Server offline – Shop down', isDumbQuestion: false },
  { id: 'T-1046', emoji: '🖱', text: 'Maus funktioniert nicht (USB nicht eingesteckt)', isDumbQuestion: true },
];

levelInits[2] = function () {
  const stack = $('card-stack');
  let swiped = 0;
  let queue = TICKETS.slice();

  $('counter-2').textContent = '0 / 5';

  function renderStack() {
    stack.innerHTML = '';
    // untere Karten zuerst, oberste zuletzt (höchster z-Index)
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
      move(x, y) {
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
          // Snap-back
          card.style.transform = 'translateX(0) rotate(0)';
          stampOk.style.opacity = 0;
          stampNo.style.opacity = 0;
          return;
        }
        const swipedRight = dx > 0;
        const correct = (swipedRight && !ticket.isDumbQuestion) || (!swipedRight && ticket.isDumbQuestion);

        // Karte wegfliegen lassen
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
    // Emoji = erweiterter Unicode außerhalb ASCII/BMP-Buchstaben
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
  input.addEventListener('input', checkAll); // Fallback für mobile Tastaturen

  btnSave.onclick = () => {
    stopTimer('pw');
    showToast('Passwort gespeichert. Erinnere dich in 30 Tagen nicht daran. 🔒', 'good');
    flashGreen();
    completeLevel(4);
  };

  // 20-Sekunden-Timer
  const t0 = Date.now();
  stopTimer('pw');
  gameState.timers.pw = setInterval(() => {
    if (gameState.currentLevel !== 3) { stopTimer('pw'); return; }
    const remain = PW_TIME_MS - (Date.now() - t0);
    if (remain <= 0) {
      stopTimer('pw');
      timerFill.style.width = '0%';
      timerText.textContent = '0s';
      // Zeitlimit verpasst: -20 Geduld, Timer startet neu
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
   11. LEVEL 4 : VIREN-JAGD (Whack-a-Mole)
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

    // Verschwindet nach 2 Sekunden von allein
    const despawn = setTimeout(() => { if (icon.parentNode) icon.remove(); }, 2000);

    addPointer(icon, {
      start(px, py, e) {
        if (e.cancelable) e.preventDefault();
        clearTimeout(despawn);
        if (!icon.parentNode) return;

        if (isVirus) {
          // Virus gelöscht → Partikel-Explosion
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
          // Systemdatei angefasst → BSOD + Geduld -25
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
   12. LEVEL 5 : RAM-UPGRADE (3 Phasen)
   ========================================================= */
const DUST_DISTANCE = 420;   // benötigte Wisch-Distanz in px
const CLIP_WINDOW_MS = 500;  // beide Klammern innerhalb von 0.5s

levelInits[5] = function () {
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

  // Reset UI
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

  /* --- Phase 1: Staub wegwischen --- */
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

  /* --- Phase 2: Klammern innerhalb 0.5s --- */
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
      // Beide rechtzeitig offen
      phase = 3;
      slot.classList.add('armed');
      phaseLabel.textContent = 'Phase 3/3: Dreh den RAM richtig und steck ihn ein!';
      setDisplay(ram, true, 'block');
      setDisplay(ramHint, true);
      flashGreen();
    } else {
      // Zu langsam → zurücksetzen
      firstClipTime = now;
      clipLeft.classList.remove('open');
      clipRight.classList.remove('open');
      btn.classList.add('open');
      showToast('Zu langsam! Beide Klammern gleichzeitig!');
    }
  }

  clipLeft.onclick = () => pressClip('left');
  clipRight.onclick = () => pressClip('right');

  /* --- Phase 3: RAM einstecken (Tap = drehen, Drag = einsetzen) --- */
  let ramRot = 0;        // 0 = korrekt, 180 = falsch
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

      // TAP: Riegel rotieren
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
        // ERFOLG: korrekt eingesetzt
        ramDone = true;
        ramBaseX = 0; ramBaseY = 0;
        ram.style.transform = 'translate(0px, 0px)';
        setDisplay(ram, false);
        slot.classList.remove('armed');
        slot.classList.add('filled');
        flickerScreen();
        showToast('16 GB erkannt. Der Rechner atmet auf. 🚀', 'good');
        completeLevel(6);
        return;
      }

      // Daneben → zurück
      ramBaseX = 0; ramBaseY = 0;
      ram.style.transform = 'translate(0px, 0px)';
    },
  });
};

/* =========================================================
   13. LEVEL 6 : DAS KAFFEE-QUIZ
   ========================================================= */
levelInits[6] = function () {
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
        confetti();
        showToast('Korrekt! HTML ist eine Auszeichnungssprache. 🎉', 'good');
        gameState.won = true;
        completeLevel(7);
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
   14. BOOT
   ========================================================= */
updateHUD();
// Level 0 ist per HTML-Default sichtbar (display:flex)
