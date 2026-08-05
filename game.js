/* ============================================================
   IT-Survival: Der 9-to-5 Simulator - game.js
   Pure Vanilla JS - No dependencies - GitHub Pages ready
   ============================================================ */
'use strict';

// ---- GLOBAL STATE ----
const GS = {
  currentLevel: 0,
  bossPatience: 100,
  coffeeLevel:  100,
  coffeeTimer:  null,
  virusTimer:   null,
  pwCountdown:  null,
  pwTimeLeft:   20,
  virusKilled:  0,
  gameOver:     false,
};

// ---- UTILITIES ----
const el  = (id)           => document.getElementById(id);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const clamp = (v, lo, hi)  => Math.max(lo, Math.min(hi, v));

let toastTimer = null;
function showToast(msg, ms = 2800) {
  const t = el('toast');
  t.textContent = msg;
  t.className = 'toast-visible fixed top-16 left-1/2 z-[999] -translate-x-1/2 bg-gray-900 border border-yellow-500 text-yellow-300 text-xs px-4 py-2 rounded-xl max-w-[82vw] text-center shadow-lg pointer-events-none';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.className = t.className.replace('toast-visible', 'toast-hidden');
  }, ms);
}

function flash(type = 'success') {
  const f = el('flash');
  f.className = '';
  void f.offsetWidth; // force reflow
  f.className = 'fixed inset-0 z-[998] pointer-events-none flash-' + type;
}

function updateHUD() {
  const c = GS.coffeeLevel, b = GS.bossPatience;
  el('bar-coffee').style.width = c + '%';
  el('txt-coffee').textContent = c;
  el('bar-boss').style.width   = b + '%';
  el('txt-boss').textContent   = b;
  el('bar-coffee').style.background = c > 50 ? '#22c55e' : c > 25 ? '#eab308' : '#ef4444';
  el('bar-boss').style.background   = b > 50 ? '#ef4444' : b > 25 ? '#f97316' : '#7f1d1d';
}

function showLevel(n) {
  qsa('.level-container').forEach(d => {
    d.style.display = 'none';
    d.classList.remove('active');
  });
  const lvl = el('level-' + n);
  lvl.style.display = 'flex';
  lvl.classList.add('active');
  GS.currentLevel = n;
  el('hud').classList.toggle('hidden', n === 0 || n === 7);
  updateHUD();
}

function damageBoss(amount) {
  if (GS.gameOver) return;
  GS.bossPatience = clamp(GS.bossPatience - amount, 0, 100);
  updateHUD();
  flash('error');
  if (GS.bossPatience <= 0) endGame(false);
}

function refillCoffee(amount) {
  GS.coffeeLevel = clamp(GS.coffeeLevel + amount, 0, 100);
  updateHUD();
}

function startCoffeeDrain() {
  stopCoffeeDrain();
  GS.coffeeTimer = setInterval(() => {
    if (GS.gameOver) return;
    GS.coffeeLevel = clamp(GS.coffeeLevel - 1, 0, 100);
    updateHUD();
    if (GS.coffeeLevel <= 0) endGame(false);
  }, 2000);
}
function stopCoffeeDrain() {
  clearInterval(GS.coffeeTimer);
  GS.coffeeTimer = null;
}

function stopAllTimers() {
  stopCoffeeDrain();
  clearInterval(GS.virusTimer);  GS.virusTimer  = null;
  clearInterval(GS.pwCountdown); GS.pwCountdown = null;
}

// ---- CONFETTI ----
function spawnConfetti() {
  const colors = ['#4ade80','#facc15','#60a5fa','#f472b6','#fb923c','#a78bfa'];
  const cont = el('confetti-container');
  for (let i = 0; i < 70; i++) {
    const b = document.createElement('div');
    b.className = 'confetti-bit';
    b.style.setProperty('--dur',   (1.1 + Math.random() * 1.2) + 's');
    b.style.setProperty('--delay', (Math.random() * 0.7) + 's');
    b.style.left       = (Math.random() * 100) + 'vw';
    b.style.top        = '-12px';
    b.style.background = colors[Math.floor(Math.random() * colors.length)];
    if (Math.random() > 0.5) b.style.borderRadius = '50%';
    cont.appendChild(b);
    setTimeout(() => b.remove(), 2500);
  }
}

// ---- Touch/Mouse unified helpers ----
const getTX = (e) => (e.touches       ? e.touches[0]        : e).clientX;
const getTY = (e) => (e.touches       ? e.touches[0]        : e).clientY;
const getCX = (e) => (e.changedTouches? e.changedTouches[0] : e).clientX;
const getCY = (e) => (e.changedTouches? e.changedTouches[0] : e).clientY;

function addDown(target, fn) {
  target.addEventListener('mousedown',  fn);
  target.addEventListener('touchstart', fn, { passive: true });
}
function addMove(target, fn) {
  target.addEventListener('mousemove', fn);
  target.addEventListener('touchmove', fn, { passive: false });
}
function addUp(target, fn) {
  target.addEventListener('mouseup',  fn);
  target.addEventListener('touchend', fn, { passive: false });
}

// ============================================================
// LEVEL 0 - START SCREEN
// ============================================================
function initLevel0() {
  const btn   = el('btn-start');
  const fresh = btn.cloneNode(true);
  btn.replaceWith(fresh);
  const trigger = (e) => { e.preventDefault(); startGame(); };
  el('btn-start').addEventListener('click',    trigger);
  el('btn-start').addEventListener('touchend', trigger);
}

function startGame() {
  GS.bossPatience = 100;
  GS.coffeeLevel  = 100;
  GS.virusKilled  = 0;
  GS.gameOver     = false;
  updateHUD();
  startCoffeeDrain();
  showLevel(1);
  initLevel1();
}

// ============================================================
// LEVEL 1 - HDMI CABLE
// ============================================================
let hdmi = { flips: 0, dragged: false, dragClone: null };

function initLevel1() {
  hdmi.flips   = 0;
  hdmi.dragged = false;

  ['hdmi-cable','port-mainboard','port-gpu'].forEach(id => {
    const orig  = el(id);
    const fresh = orig.cloneNode(true);
    orig.replaceWith(fresh);
  });

  updateFlipBadge();

  const cable = el('hdmi-cable');
  const mb    = el('port-mainboard');
  const gp    = el('port-gpu');

  cable.addEventListener('click', handleCableTap);
  cable.addEventListener('touchend', (e) => {
    if (hdmi.dragged) { hdmi.dragged = false; return; }
    e.preventDefault();
    handleCableTap(e);
  });

  let startX = 0, startY = 0, clone = null;
  cable.addEventListener('touchstart', (e) => {
    hdmi.dragged = false;
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    const r = cable.getBoundingClientRect();
    clone = cable.cloneNode(true);
    clone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:0.82;margin:0;width:' + r.width + 'px;left:' + r.left + 'px;top:' + r.top + 'px;';
    document.body.appendChild(clone);
  }, { passive: true });

  cable.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!clone) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - startX) > 8 || Math.abs(t.clientY - startY) > 8) hdmi.dragged = true;
    const r = cable.getBoundingClientRect();
    clone.style.left = (t.clientX - r.width / 2) + 'px';
    clone.style.top  = (t.clientY - r.height / 2) + 'px';
  }, { passive: false });

  cable.addEventListener('touchend', (e) => {
    if (clone) { clone.remove(); clone = null; }
    if (!hdmi.dragged) return;
    const t   = e.changedTouches[0];
    const hit = document.elementFromPoint(t.clientX, t.clientY);
    const zone = hit && hit.closest('.drop-zone');
    if (zone) handleDrop(zone.id);
  });

  cable.setAttribute('draggable', 'true');
  cable.addEventListener('dragstart', (e) => {
    hdmi.dragged = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'hdmi');
  });
  [mb, gp].forEach(p => {
    p.addEventListener('dragover', (e) => e.preventDefault());
    p.addEventListener('drop',     (e) => { e.preventDefault(); handleDrop(p.id); });
  });
}

function handleCableTap(e) {
  hdmi.flips++;
  updateFlipBadge();
  el('hdmi-cable').style.transform = 'rotate(' + (hdmi.flips % 2 === 1 ? 180 : 0) + 'deg)';
}

function updateFlipBadge() {
  const b = el('flip-badge');
  if (b) b.textContent = (hdmi.flips % 2 === 0) ? '0°' : '180°';
}

function handleDrop(portId) {
  if (portId === 'port-mainboard') {
    showToast('❌ Falscher Port! Die GPU ist die richtige Wahl.');
    damageBoss(15);
    return;
  }
  if (portId === 'port-gpu') {
    if (hdmi.flips < 2) {
      showToast('🔌 Passt nicht. Dreh das Kabel erst mindestens 1x um!');
      return;
    }
    flash('success');
    refillCoffee(20);
    setTimeout(() => { showLevel(2); initLevel2(); }, 600);
  }
}

// ============================================================
// LEVEL 2 - TICKET TINDER
// ============================================================
const TICKETS = [
  { id: 'TK-001', text: '🪑 Mein Stuhl dreht sich zu schnell.',            isDumb: true  },
  { id: 'TK-002', text: '🔥 Produktionsdatenbank brennt! Alle Daten weg!',  isDumb: false },
  { id: 'TK-003', text: '☕ Tastatur nach Kaffeebad — jetzt Kaffeepause.',  isDumb: true  },
  { id: 'TK-004', text: '🌐 Haupt-Webserver seit 12 Min. offline!',         isDumb: false },
  { id: 'TK-005', text: '🗑 Ich glaub ich hab das Internet gelöscht.',      isDumb: true  },
];

let tk = { idx: 0, done: 0, busy: false };

function initLevel2() {
  tk.idx = 0; tk.done = 0; tk.busy = false;
  el('ticket-progress').textContent = '0 / 5';
  renderTicketStack();
}

function renderTicketStack() {
  const stack = el('ticket-stack');
  stack.innerHTML = '';
  const remaining = TICKETS.slice(tk.idx);
  if (!remaining.length) return;
  const visible = remaining.slice(0, 3);
  visible.forEach((ticket, i) => {
    const isTop  = i === visible.length - 1;
    const offset = visible.length - 1 - i;
    const card   = document.createElement('div');
    card.className = 'ticket-card';
    card.style.zIndex    = String(i + 1);
    card.style.transform = 'rotate(' + ((offset - 1) * 2.5) + 'deg) scale(' + (0.94 + i * 0.03) + ')';
    card.style.opacity   = isTop ? '1' : String(0.55 + i * 0.2);
    card.innerHTML =
      '<span class="t-priority ' + (ticket.isDumb ? 'text-yellow-600' : 'text-red-500') + '">' +
      (ticket.isDumb ? '🟡 LOW PRIORITY' : '🔴 CRITICAL') + '</span>' +
      '<p class="t-text">' + ticket.text + '</p>' +
      '<span class="t-id">' + ticket.id + '</span>';
    if (isTop) attachSwipe(card, ticket);
    stack.appendChild(card);
  });
}

function attachSwipe(card, ticket) {
  let startX = 0, dx = 0, active = false;

  const begin = (e) => { if (tk.busy) return; startX = getTX(e); dx = 0; active = true; };
  const move  = (e) => {
    if (!active || tk.busy) return;
    e.preventDefault();
    dx = getTX(e) - startX;
    card.style.transform  = 'translateX(' + dx + 'px) rotate(' + (dx * 0.07) + 'deg)';
    card.style.background = dx > 35 ? 'rgba(74,222,128,0.12)' : dx < -35 ? 'rgba(239,68,68,0.12)' : '#0f172a';
  };
  const end = (e) => {
    if (!active || tk.busy) return;
    active = false;
    if (Math.abs(dx) > 75) commitSwipe(card, ticket, dx > 0);
    else { card.style.transform = ''; card.style.background = '#0f172a'; }
    dx = 0;
  };

  addDown(card, begin);
  addMove(card, move);
  addUp  (card, end);
  card.addEventListener('mouseleave', (e) => { if (active) end(e); });
}

function commitSwipe(card, ticket, swipedRight) {
  tk.busy = true;
  const correct = swipedRight ? !ticket.isDumb : ticket.isDumb;
  if (!correct) {
    damageBoss(10);
    showToast(swipedRight
      ? '❌ Nicht eskalieren – das ist kein kritisches Ticket!'
      : '❌ Nicht ignorieren – das ist ein kritisches Problem!');
  }
  card.classList.add(swipedRight ? 'swipe-right-anim' : 'swipe-left-anim');
  setTimeout(() => {
    tk.idx++; tk.done++;
    el('ticket-progress').textContent = tk.done + ' / 5';
    if (tk.done >= 5) {
      flash('success');
      refillCoffee(20);
      setTimeout(() => { showLevel(3); initLevel3(); }, 500);
    } else {
      renderTicketStack();
      tk.busy = false;
    }
  }, 390);
}

// ============================================================
// LEVEL 3 - PASSWORD
// ============================================================
const PW_RULES = [
  { id: 'rule-0', test: (v) => /[A-Z]/.test(v) },
  { id: 'rule-1', test: (v) => /[!@#$%^&*]/.test(v) },
  { id: 'rule-2', test: (v) => v.length > 0 && !/(passwort|admin)/i.test(v) },
  { id: 'rule-3', test: (v) => /\p{Emoji_Presentation}/u.test(v) },
];

function initLevel3() {
  GS.pwTimeLeft = 20;
  el('pw-timer').textContent = '20';
  el('pw-save').classList.add('hidden');
  PW_RULES.forEach(r => el(r.id).classList.remove('ok'));

  const inp   = el('pw-input');
  const fresh = inp.cloneNode(true);
  fresh.value = '';
  inp.replaceWith(fresh);
  el('pw-input').addEventListener('input', checkPassword);

  const sb   = el('pw-save');
  const sbf  = sb.cloneNode(true);
  sb.replaceWith(sbf);
  el('pw-save').addEventListener('click', () => {
    clearInterval(GS.pwCountdown);
    flash('success');
    refillCoffee(20);
    setTimeout(() => { showLevel(4); initLevel4(); }, 550);
  });

  clearInterval(GS.pwCountdown);
  GS.pwCountdown = setInterval(() => {
    GS.pwTimeLeft--;
    el('pw-timer').textContent = GS.pwTimeLeft;
    if (GS.pwTimeLeft <= 0) {
      clearInterval(GS.pwCountdown);
      damageBoss(20);
      showToast('⏰ Zeit abgelaufen! −20 Boss-Geduld. Nochmal!');
      setTimeout(initLevel3, 1800);
    }
  }, 1000);
}

function checkPassword(e) {
  const v = e.target.value;
  let allOk = true;
  PW_RULES.forEach(r => {
    const ok = r.test(v);
    el(r.id).classList.toggle('ok', ok);
    if (!ok) allOk = false;
  });
  el('pw-save').classList.toggle('hidden', !allOk);
}

// ============================================================
// LEVEL 4 - WHACK-A-MOLE
// ============================================================
function initLevel4() {
  GS.virusKilled = 0;
  el('virus-count').textContent = '0';
  el('bsod').classList.add('hidden');

  const desk = el('win-desktop');
  qsa('.desktop-icon', desk).forEach(i => i.remove());

  const clockEl  = el('desktop-clock');
  const tickClock = () => {
    if (GS.currentLevel !== 4) return;
    clockEl.textContent = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };
  tickClock();

  clearInterval(GS.virusTimer);
  GS.virusTimer = setInterval(() => {
    if (GS.currentLevel !== 4) { clearInterval(GS.virusTimer); return; }
    tickClock();
    spawnIcon(desk);
  }, 800);
}

function spawnIcon(desk) {
  const isVirus = Math.random() < 0.52;
  const icon    = document.createElement('div');
  icon.className    = 'desktop-icon';
  icon.textContent  = isVirus ? '😈' : (Math.random() > 0.5 ? '📁' : '📄');
  icon.dataset.virus = isVirus ? '1' : '0';

  const pad = 36;
  const dw  = Math.max(desk.offsetWidth  - pad * 2, 10);
  const dh  = Math.max(desk.offsetHeight - pad * 2 - 26, 10);
  icon.style.left = (pad + Math.floor(Math.random() * dw)) + 'px';
  icon.style.top  = (pad + Math.floor(Math.random() * dh)) + 'px';

  let handled = false;
  const autoKill = setTimeout(() => { if (!handled) icon.remove(); }, 2000);

  const handle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (handled) return;
    handled = true;
    clearTimeout(autoKill);
    if (isVirus) {
      icon.classList.add('icon-kill');
      burstParticles(e);
      setTimeout(() => icon.remove(), 310);
      GS.virusKilled++;
      el('virus-count').textContent = GS.virusKilled;
      if (GS.virusKilled >= 10) {
        clearInterval(GS.virusTimer);
        flash('success');
        refillCoffee(25);
        setTimeout(() => { showLevel(5); initLevel5(); }, 600);
      }
    } else {
      icon.remove();
      showBSOD();
      damageBoss(25);
    }
  };

  icon.addEventListener('touchend', handle, { passive: false });
  icon.addEventListener('click',    handle);
  desk.appendChild(icon);
}

function burstParticles(e) {
  const bx = getCX(e), by = getCY(e);
  ['💥', '✨', '⚡', '🔥'].forEach((emoji, i) => {
    const p = document.createElement('div');
    p.className   = 'particle';
    p.textContent = emoji;
    p.style.left  = (bx + (i % 2 === 0 ? -18 : 18)) + 'px';
    p.style.top   = by + 'px';
    p.style.animationDelay = (i * 50) + 'ms';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 750);
  });
}

function showBSOD() {
  el('bsod').classList.remove('hidden');
  setTimeout(() => el('bsod').classList.add('hidden'), 1100);
}

// ============================================================
// LEVEL 5 - RAM UPGRADE
// ============================================================
function initLevel5() {
  let phase      = 1;
  let wipeDist   = 0, wipeActive = false, prevX = 0, prevY = 0;
  let clampL     = false, clampR = false, clampTimer = null;
  let ramAngle   = 0;
  let ramDragClone = null, ramDragging = false;

  const dustEl     = el('dust-overlay');
  const slotEl     = el('ram-slot');
  const stickEl    = el('ram-stick');
  const phaseLabel = el('ram-phase-label');
  const instrEl    = el('ram-instruction');

  dustEl.style.opacity        = '1';
  dustEl.style.pointerEvents  = 'auto';
  el('clamp-left').classList.add('hidden');
  el('clamp-right').classList.add('hidden');
  stickEl.classList.add('hidden');
  slotEl.classList.remove('slot-ready');
  el('ram-angle-badge').textContent = '0°';

  const wipeStart = (e) => { if (phase !== 1) return; wipeActive = true; prevX = getTX(e); prevY = getTY(e); };
  const wipeMove  = (e) => {
    if (!wipeActive || phase !== 1) return;
    e.preventDefault();
    const nx = getTX(e), ny = getTY(e);
    wipeDist += Math.hypot(nx - prevX, ny - prevY);
    prevX = nx; prevY = ny;
    dustEl.style.opacity = String(Math.max(0, 1 - wipeDist / 650));
    if (wipeDist >= 650) goPhase2();
  };
  const wipeEnd = () => { wipeActive = false; };

  addDown(dustEl, wipeStart);
  addMove(dustEl, wipeMove);
  addUp  (dustEl, wipeEnd);

  function goPhase2() {
    phase = 2;
    dustEl.style.opacity       = '0';
    dustEl.style.pointerEvents = 'none';
    el('clamp-left').classList.remove('hidden');
    el('clamp-right').classList.remove('hidden');
    phaseLabel.textContent = 'Phase 2: Klemmen öffnen';
    instrEl.textContent    = 'Drücke BEIDE Klemmen innerhalb von 0.5 Sekunden!';
    clampL = false; clampR = false;

    const tryClamp = (side) => {
      if (side === 'L') clampL = true;
      if (side === 'R') clampR = true;
      if (!clampTimer) clampTimer = setTimeout(() => { clampL = false; clampR = false; clampTimer = null; }, 500);
      if (clampL && clampR) { clearTimeout(clampTimer); goPhase3(); }
    };

    [['clamp-left','L'], ['clamp-right','R']].forEach(([id, side]) => {
      const orig  = el(id);
      const fresh = orig.cloneNode(true);
      orig.replaceWith(fresh);
      el(id).addEventListener('click',    () => tryClamp(side));
      el(id).addEventListener('touchend', (e) => { e.preventDefault(); tryClamp(side); });
    });
  }

  function goPhase3() {
    phase = 3;
    el('clamp-left').classList.add('hidden');
    el('clamp-right').classList.add('hidden');
    stickEl.classList.remove('hidden');
    phaseLabel.textContent = 'Phase 3: RAM einstecken';
    instrEl.textContent    = 'Tippe zum Ausrichten auf 0° → dann in den Slot ziehen';

    const orig  = el('ram-stick');
    const stick = orig.cloneNode(true);
    orig.replaceWith(stick);

    stick.addEventListener('click', () => {
      ramAngle = (ramAngle + 45) % 360;
      el('ram-angle-badge').textContent = ramAngle + '°';
      stick.style.transform = 'rotate(' + ramAngle + 'deg)';
    });
    stick.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (ramDragging) { ramDragging = false; return; }
      ramAngle = (ramAngle + 45) % 360;
      el('ram-angle-badge').textContent = ramAngle + '°';
      stick.style.transform = 'rotate(' + ramAngle + 'deg)';
    });

    stick.addEventListener('touchstart', (e) => {
      ramDragging = false;
      const r = stick.getBoundingClientRect();
      ramDragClone = stick.cloneNode(true);
      ramDragClone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:0.82;width:' + r.width + 'px;left:' + r.left + 'px;top:' + r.top + 'px;transform:rotate(' + ramAngle + 'deg);';
      document.body.appendChild(ramDragClone);
    }, { passive: true });

    stick.addEventListener('touchmove', (e) => {
      e.preventDefault();
      ramDragging = true;
      if (!ramDragClone) return;
      const t = e.touches[0];
      const r = stick.getBoundingClientRect();
      ramDragClone.style.left = (t.clientX - r.width / 2) + 'px';
      ramDragClone.style.top  = (t.clientY - r.height / 2) + 'px';
    }, { passive: false });

    stick.addEventListener('touchend', (e) => {
      if (ramDragClone) { ramDragClone.remove(); ramDragClone = null; }
      if (!ramDragging) return;
      const t  = e.changedTouches[0];
      const sr = el('ram-slot').getBoundingClientRect();
      if (t.clientX >= sr.left && t.clientX <= sr.right && t.clientY >= sr.top && t.clientY <= sr.bottom) tryInsert();
    });

    stick.setAttribute('draggable', 'true');
    stick.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', 'ram'));
    el('ram-slot').addEventListener('dragover', (e) => e.preventDefault());
    el('ram-slot').addEventListener('drop',     (e) => { e.preventDefault(); tryInsert(); });
  }

  function tryInsert() {
    if (ramAngle === 0) {
      el('ram-slot').classList.add('slot-ready');
      el('ram-stick').style.visibility = 'hidden';
      flash('success');
      refillCoffee(25);
      setTimeout(() => { showLevel(6); initLevel6(); }, 750);
    } else {
      showToast('❌ Falscher Winkel (' + ramAngle + '°)! Drehe auf 0°.');
      damageBoss(10);
    }
  }
}

// ============================================================
// LEVEL 6 - QUIZ
// ============================================================
function initLevel6() {
  el('colleague-reply').classList.add('hidden');
  const cont  = el('quiz-btns');
  const fresh = cont.cloneNode(true);
  cont.replaceWith(fresh);
  qsa('.quiz-opt', el('quiz-btns')).forEach(btn => {
    btn.addEventListener('click',    () => handleQuiz(btn.dataset.val));
    btn.addEventListener('touchend', (e) => { e.preventDefault(); handleQuiz(btn.dataset.val); });
  });
}

function handleQuiz(val) {
  qsa('.quiz-opt').forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
  const replyEl = el('colleague-reply');
  const bubble  = el('reply-bubble');
  replyEl.classList.remove('hidden');

  if (val === 'HTML') {
    bubble.textContent = '🎉 Absolut richtig! HTML ist Markup, keine Programmiersprache. Du bist gerettet!';
    spawnConfetti();
    flash('success');
    refillCoffee(30);
    setTimeout(() => { showLevel(7); renderEndScreen(true); }, 1900);
  } else {
    bubble.textContent = '🤔 Sicher? ' + val + ' ist eine echte Programmiersprache...';
    damageBoss(15);
    setTimeout(() => {
      replyEl.classList.add('hidden');
      qsa('.quiz-opt').forEach(b => { b.disabled = false; b.style.opacity = '1'; });
    }, 1600);
  }
}

// ============================================================
// LEVEL 7 - END SCREEN
// ============================================================
function endGame(won) {
  if (GS.gameOver) return;
  GS.gameOver = true;
  stopAllTimers();
  showLevel(7);
  renderEndScreen(won);
}

function renderEndScreen(won) {
  stopAllTimers();
  GS.gameOver = true;

  el('end-stats').innerHTML =
    '&#9749; Kaffee: <span style="color:#4ade80">' + GS.coffeeLevel + '%</span>' +
    ' &nbsp;|&nbsp; ' +
    '&#128545; Boss: <span style="color:#f87171">' + GS.bossPatience + '%</span>';

  if (won) {
    el('end-icon').textContent  = '🏆';
    el('end-title').textContent = 'Schicht erfolgreich überlebt!';
    el('end-title').style.color = '#86efac';

    let rank, color;
    if      (GS.bossPatience > 80) { rank = '👑 ROOT-GOTT';     color = '#fde047'; }
    else if (GS.bossPatience > 40) { rank = '⚙️ SYSADMIN';      color = '#93c5fd'; }
    else                            { rank = '🖱 MAUS-SCHUBSER'; color = '#9ca3af'; }

    el('end-rank').textContent = rank;
    el('end-rank').style.color = color;
  } else {
    el('end-icon').textContent  = '💀';
    el('end-title').textContent = 'GAME OVER';
    el('end-title').style.color = '#f87171';

    const reason = GS.coffeeLevel <= 0
      ? '☕ Totaler Koffeinentzug — du bist eingeschlafen.'
      : '😡 Boss-Geduld aufgebraucht — du wurdest gefeuert.';
    el('end-rank').textContent = reason;
    el('end-rank').style.color = '#fca5a5';
  }

  const btn   = el('btn-restart');
  const fresh = btn.cloneNode(true);
  btn.replaceWith(fresh);
  const trigger = (e) => { e.preventDefault(); resetGame(); };
  el('btn-restart').addEventListener('click',    trigger);
  el('btn-restart').addEventListener('touchend', trigger);
}

function resetGame() {
  stopAllTimers();
  GS.gameOver = false;
  el('confetti-container').innerHTML = '';
  el('bsod').classList.add('hidden');
  el('ram-slot').classList.remove('slot-ready');
  showLevel(0);
  initLevel0();
}

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  showLevel(0);
  initLevel0();
});
