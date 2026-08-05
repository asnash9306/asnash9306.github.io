/* Alle Minigames. Jede Session besitzt eigene Timer/Listener und räumt sie beim Ende auf. */
(() => {
  "use strict";

  function pointFromEvent(event) {
    const source = event.touches?.[0] || event.changedTouches?.[0] || event;
    return { x: source.clientX, y: source.clientY };
  }

  function createSession(root, api, quest) {
    const cleanupFns = [];
    let ended = false;

    function on(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      cleanupFns.push(() => target.removeEventListener(type, handler, options));
      return handler;
    }
    function later(fn, delay) {
      const id = window.setTimeout(() => { if (!ended) fn(); }, delay);
      cleanupFns.push(() => window.clearTimeout(id));
      return id;
    }
    function every(fn, delay) {
      const id = window.setInterval(() => { if (!ended) fn(); }, delay);
      cleanupFns.push(() => window.clearInterval(id));
      return id;
    }
    function addCleanup(fn) { cleanupFns.push(fn); }
    function cleanup() {
      if (ended) return;
      ended = true;
      cleanupFns.splice(0).reverse().forEach((fn) => {
        try { fn(); } catch (_) { /* Ein Cleanup darf keinen anderen blockieren. */ }
      });
    }
    function finish(success, payload = {}) {
      if (ended) return;
      cleanup();
      if (success) api.success(payload); else api.fail(payload);
    }

    return { root, api, quest, on, later, every, addCleanup, cleanup, finish, get ended() { return ended; } };
  }

  function bindDrag(session, element, callbacks) {
    let active = false;
    let pointerId = null;

    const start = (event) => {
      if (active) return;
      active = true;
      pointerId = event.pointerId ?? null;
      if (event.cancelable) event.preventDefault();
      if (pointerId !== null && element.setPointerCapture) {
        try { element.setPointerCapture(pointerId); } catch (_) { /* optional */ }
      }
      callbacks.start?.(pointFromEvent(event), event);
    };
    const move = (event) => {
      if (!active) return;
      if (event.cancelable) event.preventDefault();
      callbacks.move?.(pointFromEvent(event), event);
    };
    const end = (event) => {
      if (!active) return;
      active = false;
      if (event.cancelable) event.preventDefault();
      callbacks.end?.(pointFromEvent(event), event);
      pointerId = null;
    };

    if (window.PointerEvent) {
      session.on(element, "pointerdown", start);
      session.on(window, "pointermove", move, { passive: false });
      session.on(window, "pointerup", end, { passive: false });
      session.on(window, "pointercancel", end, { passive: false });
    } else {
      session.on(element, "mousedown", start);
      session.on(window, "mousemove", move);
      session.on(window, "mouseup", end);
      session.on(element, "touchstart", start, { passive: false });
      session.on(window, "touchmove", move, { passive: false });
      session.on(window, "touchend", end, { passive: false });
      session.on(window, "touchcancel", end, { passive: false });
    }
  }

  function bindHold(session, element, start, end) {
    let holding = false;
    const begin = (event) => {
      if (holding) return;
      holding = true;
      if (event.cancelable) event.preventDefault();
      start(event);
    };
    const stop = (event) => {
      if (!holding) return;
      holding = false;
      if (event?.cancelable) event.preventDefault();
      end(event);
    };
    if (window.PointerEvent) {
      session.on(element, "pointerdown", begin, { passive: false });
      session.on(window, "pointerup", stop, { passive: false });
      session.on(window, "pointercancel", stop, { passive: false });
    } else {
      session.on(element, "mousedown", begin);
      session.on(window, "mouseup", stop);
      session.on(element, "touchstart", begin, { passive: false });
      session.on(window, "touchend", stop, { passive: false });
      session.on(window, "touchcancel", stop, { passive: false });
    }
    session.on(element, "keydown", (event) => {
      if ((event.key === " " || event.key === "Enter") && !holding) begin(event);
    });
    session.on(element, "keyup", (event) => {
      if (event.key === " " || event.key === "Enter") stop(event);
    });
  }

  function setMessage(root, text, kind = "") {
    const node = root.querySelector(".game-message");
    if (!node) return;
    node.textContent = text;
    node.className = `game-message ${kind}`.trim();
  }

  function quiz(session) {
    const questions = [
      { q: "Kevin hat einen Browser-Tab geschlossen. Was ist weg?", a: ["Das Internet", "Nur der Tab", "Der Router", "HTML"], correct: 1 },
      { q: "Ist HTML eine Programmiersprache?", a: ["Ja, mit Gefühlen", "Nein, eine Auszeichnungssprache", "Nur freitags", "HTML ist ein Kabel"], correct: 1 },
      { q: "Darf Kevin auf dem Firmenserver Bitcoin minen?", a: ["Nur kurz", "Wenn er leise ist", "Nein", "Mit Emoji-Genehmigung"], correct: 2 },
      { q: "Was bedeutet ‚Have you tried turning it off and on again?‘?", a: ["Kapitulieren", "Ein legitimer erster Diagnose-Schritt", "Marketing", "Daten löschen"], correct: 1 }
    ];
    let index = 0;
    let correct = 0;

    function render() {
      const item = questions[index];
      session.api.setStatus(`${index + 1}/${questions.length}`);
      session.root.innerHTML = `
        <p class="game-instruction">${session.quest.instruction}</p>
        <div class="quiz-card">
          <div class="quiz-progress"><span>KEVINS WISSENSCHECK</span><span>FRAGE ${index + 1} / ${questions.length}</span></div>
          <h3>${item.q}</h3>
          <div class="choice-grid">
            ${item.a.map((answer, i) => `<button class="choice-button" data-answer="${i}" type="button"><span>${String.fromCharCode(65+i)}.</span> ${answer}</button>`).join("")}
          </div>
          <div class="game-message">Kevin wartet mit maximalem Halbwissen.</div>
        </div>`;

      session.root.querySelectorAll("[data-answer]").forEach((button) => {
        session.on(button, "click", () => {
          if (button.parentElement.dataset.locked) return;
          button.parentElement.dataset.locked = "1";
          const picked = Number(button.dataset.answer);
          const buttons = [...button.parentElement.children];
          buttons[item.correct].classList.add("correct");
          buttons.forEach((b) => { b.disabled = true; });
          if (picked === item.correct) {
            correct += 1;
            session.api.sound("good");
            button.classList.add("correct");
            setMessage(session.root, "Korrekt. Kevin notiert: ‚Internet ≠ Tab‘.", "good");
          } else {
            session.api.penalty(10, "Kevin bekam gefährliches Halbwissen");
            button.classList.add("wrong");
            setMessage(session.root, "Sicher? 🤨 Fachlich wackelig.", "bad");
          }
          session.later(() => {
            index += 1;
            if (index >= questions.length) session.finish(correct >= 3, { correct, total: questions.length });
            else render();
          }, 700);
        });
      });
    }
    render();
  }

  function simon(session) {
    const sequence = [1, 3, 0, 2, 1];
    let entered = 0;
    let errors = 0;
    let accepting = false;
    let timeoutId;

    session.root.innerHTML = `
      <p class="game-instruction">${session.quest.instruction}</p>
      <div class="simon-layout">
        <div class="router" aria-label="Router mit vier Leuchttasten">
          <div class="router-top"><span>ACME ROUTER 4B</span><span id="router-state">BOOT...</span></div>
          <div class="led-row">
            ${[0,1,2,3].map((i) => `<button class="router-led" data-led="${i}" data-color="${i}" type="button" aria-label="LED ${i+1}"></button>`).join("")}
          </div>
          <div class="router-labels"><span>WAN</span><span>2.4G</span><span>5G</span><span>GAST</span></div>
        </div>
        <div class="game-message">Zuerst beobachten, dann nachtippen.</div>
      </div>`;
    const leds = [...session.root.querySelectorAll("[data-led]")];
    const stateLabel = session.root.querySelector("#router-state");

    function light(i, duration = 330) {
      leds[i].classList.add("on");
      session.api.sound("tick", 220 + i * 70);
      session.later(() => leds[i]?.classList.remove("on"), duration);
    }
    function playSequence() {
      accepting = false;
      entered = 0;
      stateLabel.textContent = "MERKEN";
      session.api.setStatus("ZUSCHAUEN");
      setMessage(session.root, "Der Router spricht fließend Blink.");
      sequence.forEach((value, i) => session.later(() => light(value), 520 + i * 520));
      session.later(() => {
        accepting = true;
        stateLabel.textContent = "EINGABE";
        session.api.setStatus(`${entered}/${sequence.length}`);
        setMessage(session.root, "Jetzt dieselbe Reihenfolge tippen.", "good");
      }, 520 + sequence.length * 520);
    }

    leds.forEach((led) => {
      session.on(led, "click", () => {
        if (!accepting) return;
        const value = Number(led.dataset.led);
        light(value, 180);
        if (value === sequence[entered]) {
          entered += 1;
          session.api.setStatus(`${entered}/${sequence.length}`);
          if (entered === sequence.length) {
            accepting = false;
            stateLabel.textContent = "ONLINE";
            session.later(() => session.finish(true, { errors }), 450);
          }
        } else {
          errors += 1;
          accepting = false;
          session.api.penalty(10, "Falsche Router-Sequenz");
          stateLabel.textContent = "FEHLER";
          setMessage(session.root, `Falsches Licht. Versuch ${errors}/3.`, "bad");
          if (errors >= 3) session.later(() => session.finish(false, { errors }), 650);
          else session.later(playSequence, 900);
        }
      });
    });
    timeoutId = session.later(() => session.finish(false, { reason: "timeout", errors }), 38000);
    session.addCleanup(() => window.clearTimeout(timeoutId));
    playSequence();
  }

  function hdmi(session) {
    let flips = 0;
    let dragOrigin = null;
    let dragStart = null;

    session.root.innerHTML = `
      <p class="game-instruction">${session.quest.instruction}</p>
      <div class="pc-workbench">
        <div class="pc-back" aria-label="Rückseite eines Desktop-PCs">
          <div class="psu"><div class="fan" aria-hidden="true"></div></div>
          <div class="io-panel">
            <div class="port usb" data-port="usb">USB</div>
            <div class="port lan" data-port="lan">LAN</div>
            <div class="port hdmi trap" data-port="mainboard-hdmi">HDMI</div>
            <div class="port vga" data-port="vga">VGA</div>
            <div class="port audio" data-port="audio">●</div>
            <div class="port usb" data-port="usb">USB</div>
          </div>
          <div class="slot-lines" aria-hidden="true"></div>
          <div class="gpu-panel">
            <span class="pixel-tag">GPU</span>
            <div class="port hdmi" data-port="gpu-hdmi">HDMI</div>
            <div class="port dp" data-port="displayport">DP</div>
            <div class="port dp" data-port="displayport">DP</div>
          </div>
        </div>
        <div class="cable-zone">
          <div id="hdmi-cable" class="cable" role="button" tabindex="0" aria-label="HDMI-Stecker ziehen">HDMI</div>
          <button id="flip-hdmi" class="secondary-button flip-button" type="button">↻ STECKER DREHEN</button>
          <span class="flip-counter">Drehungen: <b id="flip-count">0</b> / 2+</span>
          <div class="game-message">Root: „der port weiter unten. wirklich.“</div>
        </div>
      </div>`;

    const cable = session.root.querySelector("#hdmi-cable");
    const ports = [...session.root.querySelectorAll("[data-port]")];
    const flipCount = session.root.querySelector("#flip-count");

    function updateCableTransform(dx = 0, dy = 0) {
      cable.style.transform = `translate(${dx}px, ${dy}px) rotate(${flips % 2 ? 180 : 0}deg)`;
    }
    function flip() {
      flips += 1;
      flipCount.textContent = flips;
      updateCableTransform();
      session.api.sound("tick", 180 + flips * 25);
      setMessage(session.root, flips >= 2 ? "Orientierung plausibel. Jetzt zur Grafikkarte ziehen." : "Einmal gedreht. USB-Logik sagt: noch einmal.", flips >= 2 ? "good" : "");
    }
    session.on(session.root.querySelector("#flip-hdmi"), "click", flip);
    session.on(cable, "keydown", (event) => { if (event.key === "r") flip(); });

    bindDrag(session, cable, {
      start(point) {
        dragOrigin = cable.getBoundingClientRect();
        dragStart = point;
        cable.classList.add("dragging");
        session.api.sound("tick", 150);
      },
      move(point) {
        const dx = point.x - dragStart.x;
        const dy = point.y - dragStart.y;
        updateCableTransform(dx, dy);
        ports.forEach((port) => {
          const r = port.getBoundingClientRect();
          const distance = Math.hypot(point.x - (r.left+r.width/2), point.y - (r.top+r.height/2));
          port.classList.toggle("near", distance < 72);
        });
      },
      end(point) {
        cable.classList.remove("dragging");
        ports.forEach((p) => p.classList.remove("near"));
        cable.style.pointerEvents = "none";
        const target = document.elementFromPoint(point.x, point.y)?.closest?.("[data-port]");
        cable.style.pointerEvents = "";
        updateCableTransform();
        if (!target) {
          setMessage(session.root, "Der Stecker hängt jetzt philosophisch im Raum.");
          return;
        }
        const port = target.dataset.port;
        if (port === "gpu-hdmi") {
          if (flips >= 2) {
            target.classList.add("near");
            setMessage(session.root, "KLICK. Bildsignal an der dedizierten GPU!", "good");
            session.api.sound("good");
            session.later(() => session.finish(true, { flips }), 550);
          } else {
            session.api.penalty(5, "HDMI-Stecker falsch orientiert");
            setMessage(session.root, "Fast. Der Stecker schaut noch in die falsche Realität.", "bad");
          }
          return;
        }
        const responses = {
          "mainboard-hdmi": [15, "Mainboard-HDMI: Die Falle schnappt zu. Kein Bild."],
          displayport: [10, "DisplayPort ist HDMI mit anderer Frisur. Passt trotzdem nicht."],
          vga: [10, "VGA stammt aus einer Zeit, in der Pixel noch Grundstücke waren."],
          usb: [10, "HDMI in USB: mutig, aber geometrisch schwierig."],
          lan: [10, "Das Internet braucht kein HDMI-Kabel."],
          audio: [10, "Der Monitor soll Bild, nicht Jazz bekommen."]
        };
        const [penalty, text] = responses[port] || [10, "Falscher Port."];
        session.api.penalty(penalty, text);
        setMessage(session.root, text, "bad");
      }
    });
  }

  function usb(session) {
    let flips = 0;
    let startPoint;
    session.root.innerHTML = `
      <p class="game-instruction">${session.quest.instruction}</p>
      <div class="usb-bench">
        <div>
          <div id="usb-plug" class="usb-plug upside" role="button" tabindex="0" aria-label="USB-Stecker ziehen">USB</div>
          <button id="rotate-usb" class="secondary-button idle-button" type="button">↻ USB DREHEN</button>
          <div class="game-message">Aktuelle Orientierung: klassisch falsch.</div>
        </div>
        <div class="usb-tower">
          <div class="usb-target" data-usb="audio">KOPFHÖRER</div>
          <div class="usb-target correct" data-usb="usb-blue">USB 3.0</div>
          <div class="usb-target" data-usb="lan">LAN</div>
          <div class="usb-target" data-usb="display">DISPLAY</div>
        </div>
      </div>`;
    const plug = session.root.querySelector("#usb-plug");
    const targets = [...session.root.querySelectorAll("[data-usb]")];
    function transform(dx = 0, dy = 0) { plug.style.transform = `translate(${dx}px,${dy}px) rotate(${flips % 2 ? 0 : 180}deg)`; }
    function rotate() {
      flips += 1;
      transform();
      setMessage(session.root, flips % 2 ? "Diese Seite fühlt sich verdächtig richtig an." : "Und wieder falsch. USB bleibt USB.", flips % 2 ? "good" : "");
      session.api.sound("tick", 190);
    }
    session.on(session.root.querySelector("#rotate-usb"), "click", rotate);
    bindDrag(session, plug, {
      start(point) { startPoint = point; plug.classList.add("dragging"); },
      move(point) {
        transform(point.x-startPoint.x, point.y-startPoint.y);
        targets.forEach((target) => {
          const r = target.getBoundingClientRect();
          target.classList.toggle("glow", Math.hypot(point.x-(r.left+r.width/2),point.y-(r.top+r.height/2)) < 75);
        });
      },
      end(point) {
        plug.classList.remove("dragging");
        targets.forEach((t) => t.classList.remove("glow"));
        plug.style.pointerEvents = "none";
        const target = document.elementFromPoint(point.x,point.y)?.closest?.("[data-usb]");
        plug.style.pointerEvents = "";
        transform();
        if (!target) return setMessage(session.root, "Die Maus bleibt drahtlos – nur leider ohne Funk.");
        if (target.dataset.usb === "usb-blue" && flips % 2 === 1) {
          target.classList.add("glow");
          setMessage(session.root, "KLICK. Die Maus erwacht.", "good");
          session.later(() => session.finish(true, { flips }), 500);
        } else if (target.dataset.usb === "usb-blue") {
          session.api.penalty(5, "USB falsch herum");
          setMessage(session.root, "Der richtige Port, die falsche Seite. USB-Tradition.", "bad");
        } else {
          session.api.penalty(8, "USB im falschen Anschluss");
          setMessage(session.root, "Dieser Anschluss hat andere Lebenspläne.", "bad");
        }
      }
    });
  }

  function password(session) {
    let remaining = 20;
    let timeouts = 0;
    let timer;
    session.root.innerHTML = `
      <p class="game-instruction">${session.quest.instruction}</p>
      <div class="password-layout">
        <div class="password-terminal">
          <label for="password-input">&gt; NEUES_PASSWORT:</label>
          <input id="password-input" class="password-field" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="password-rules">
          <div id="password-rules" class="rule-list">
            <div class="rule" data-rule="upper">Mindestens ein Großbuchstabe</div>
            <div class="rule" data-rule="special">Sonderzeichen ! @ # $ % ^ &amp; *</div>
            <div class="rule" data-rule="forbidden">Nicht „Passwort“ oder „admin“</div>
            <div class="rule" data-rule="emoji">Mindestens ein Emoji</div>
          </div>
          <div class="game-message">Frau Kalk beobachtet die Eingabe in amtlicher Stille.</div>
        </div>
        <div class="password-side">
          <div id="password-timer" class="timer-ring">20</div>
          <button id="save-password" class="primary-button" type="button" hidden>PASSWORT SPEICHERN</button>
          <p class="pixel-tag">4 / 4 Regeln nötig</p>
        </div>
      </div>`;
    const input = session.root.querySelector("#password-input");
    const save = session.root.querySelector("#save-password");
    const ring = session.root.querySelector("#password-timer");
    const rules = [...session.root.querySelectorAll("[data-rule]")];
    let allValid = false;

    function hasEmoji(value) {
      try { return /\p{Extended_Pictographic}/u.test(value); }
      catch (_) { return /[\u{1F300}-\u{1FAFF}]/u.test(value); }
    }
    function validate() {
      const value = input.value;
      const states = {
        upper: /[A-ZÄÖÜ]/.test(value),
        special: /[!@#$%^&*]/.test(value),
        forbidden: value.length > 0 && !/(passwort|admin)/i.test(value),
        emoji: hasEmoji(value)
      };
      rules.forEach((rule) => rule.classList.toggle("valid", states[rule.dataset.rule]));
      allValid = Object.values(states).every(Boolean);
      save.hidden = !allValid;
      session.api.setStatus(`${Object.values(states).filter(Boolean).length}/4`);
      if (allValid) setMessage(session.root, "Alle Regeln erfüllt. Sogar die mit dem Emoji.", "good");
    }
    function startTimer() {
      window.clearInterval(timer);
      remaining = 20;
      ring.textContent = remaining;
      timer = window.setInterval(() => {
        if (session.ended) return;
        remaining -= 1;
        ring.textContent = remaining;
        ring.style.borderTopColor = remaining <= 6 ? "#ff5d73" : "#ffd166";
        if (remaining <= 0) {
          window.clearInterval(timer);
          timeouts += 1;
          session.api.penalty(20, "Passwort-Timeout");
          input.value = "";
          validate();
          setMessage(session.root, `Zeit abgelaufen. Neuer Versuch (${timeouts}/2).`, "bad");
          if (timeouts >= 2) session.later(() => session.finish(false, { timeouts }), 700);
          else startTimer();
        }
      }, 1000);
    }
    session.addCleanup(() => window.clearInterval(timer));
    session.on(input, "input", validate);
    session.on(input, "keyup", validate);
    session.on(save, "click", () => {
      if (!allValid) return;
      session.api.sound("good");
      session.finish(true, { timeouts, length: input.value.length });
    });
    validate();
    startTimer();
    input.focus();
  }

  function triage(session) {
    const cards = [
      { from:"Kevin", text:"Der Drucker druckt mein PDF nicht, aber ich habe es noch nicht geöffnet.", dir:"left", reason:"Bedienfehler" },
      { from:"Monitoring", text:"RAID meldet zwei ausgefallene Platten im Produktionsserver.", dir:"right", reason:"Echter Notfall" },
      { from:"Jana", text:"Aus dem Netzteil kommen Funken und es riecht verbrannt.", dir:"right", reason:"Echter Notfall" },
      { from:"Kevin", text:"Meine Tastatur schreibt nur groß. Ist das ein Hacker?",
        dir:"left", reason:"Caps Lock" },
      { from:"Frau Kalk", text:"Die Lohnbuchhaltung zeigt fremde Kontodaten in allen Datensätzen.", dir:"right", reason:"Datenschutzvorfall" },
      { from:"Mogel", text:"Kann IT meinen Monitor größer machen, ohne einen neuen zu kaufen?",
        dir:"left", reason:"Zoom-Taste" }
    ];
    let index = 0;
    let score = 0;
    let start;

    function render() {
      if (index >= cards.length) {
        session.finish(score >= 5, { correct: score, total: cards.length });
        return;
      }
      session.api.setStatus(`${index + 1}/${cards.length}`);
      const upcoming = cards.slice(index, index + 3).reverse();
      session.root.innerHTML = `
        <p class="game-instruction">${session.quest.instruction}</p>
        <div class="triage-zone">
          <div class="swipe-stack">
            ${upcoming.map((card, reverseIndex) => {
              const realIndex = index + (upcoming.length - 1 - reverseIndex);
              return `<article class="swipe-card" data-card-index="${realIndex}">
                <span class="swipe-stamp left">IGNORIEREN</span><span class="swipe-stamp right">HANDELN</span>
                <span class="card-from">TICKET VON ${card.from.toUpperCase()}</span>
                <h3>${card.text}</h3>
                <p>← Unsinn · echter Notfall →</p>
              </article>`;
            }).join("")}
          </div>
          <div class="swipe-actions">
            <button class="secondary-button" data-swipe="left" type="button">← IGNORIEREN</button>
            <button class="primary-button" data-swipe="right" type="button">HANDELN →</button>
          </div>
          <div class="game-message">Entscheide nach Auswirkung, nicht nach Anzahl der Ausrufezeichen.</div>
        </div>`;
      const top = session.root.querySelector(`[data-card-index="${index}"]`);

      function submit(direction) {
        if (top.dataset.done) return;
        top.dataset.done = "1";
        const card = cards[index];
        const correct = direction === card.dir;
        top.style.transform = `translateX(${direction === "right" ? 520 : -520}px) rotate(${direction === "right" ? 18 : -18}deg)`;
        top.style.opacity = "0";
        if (correct) {
          score += 1;
          session.api.sound("good");
          setMessage(session.root, `Richtig: ${card.reason}.`, "good");
        } else {
          session.api.penalty(10, "Ticket falsch triagiert");
          setMessage(session.root, `Falsch: ${card.reason}.`, "bad");
        }
        session.later(() => { index += 1; render(); }, 480);
      }

      session.root.querySelectorAll("[data-swipe]").forEach((button) => session.on(button, "click", () => submit(button.dataset.swipe)));
      bindDrag(session, top, {
        start(point) { start = point; top.style.transition = "none"; },
        move(point) {
          const dx = point.x - start.x;
          top.style.transform = `translateX(${dx}px) rotate(${dx/22}deg)`;
          top.querySelector(".swipe-stamp.left").style.opacity = String(Math.min(1, Math.max(0, -dx/90)));
          top.querySelector(".swipe-stamp.right").style.opacity = String(Math.min(1, Math.max(0, dx/90)));
        },
        end(point) {
          const dx = point.x - start.x;
          top.style.transition = "transform .2s ease, opacity .2s ease";
          if (Math.abs(dx) > 70) submit(dx > 0 ? "right" : "left");
          else top.style.transform = "";
        }
      });
    }
    render();
  }

  function logs(session) {
    const lines = [
      ["INFO","09:00:01","backup: coffee-cache warm"],
      ["WARN","12:59:42","disk /dev/hope at 82%"],
      ["ERROR","13:00:02","cron recursion depth exceeded"],
      ["INFO","13:00:03","kevin logged in from chrome://dino"],
      ["ERROR","13:00:05","database connection pool exhausted"],
      ["WARN","13:00:07","temperature 74C; fan considering options"],
      ["ERROR","13:00:09","payment-api returned 500"],
      ["INFO","13:00:12","mogel denied installing executable"],
      ["ERROR","13:00:13","auth token signature invalid"],
      ["WARN","13:00:15","printer queue contains 847 copies"],
      ["INFO","13:00:17","ntp synchronized with microwave"],
      ["ERROR","13:00:19","filesystem became read-only"],
      ["WARN","13:00:21","memory pressure: emotionally high"],
      ["ERROR","13:00:23","healthcheck failed 6/6"],
      ["INFO","13:00:25","root is definitely resting"],
      ["ERROR","13:00:27","recursive logger logging itself"],
      ["WARN","13:00:30","dashboard color scheme: panic"],
      ["INFO","13:00:32","automatic recovery pending"],
      ["ERROR","13:00:34","kernel: coffee not found"],
      ["INFO","13:00:36","end of suspiciously long log"]
    ];
    let cursor = 0;
    let caught = 0;
    let remaining = 28;
    const speed = session.api.getEscalation() >= 2 ? 390 : 610;

    session.root.innerHTML = `
      <p class="game-instruction">${session.quest.instruction}</p>
      <div id="log-console" class="log-console" role="log" aria-live="polite"></div>
      <div class="game-message">Nur ERROR anklicken. WARN ist nervös, INFO nur gesprächig.</div>`;
    const consoleEl = session.root.querySelector("#log-console");
    session.api.setStatus(`6 ERROR · ${remaining}s`);

    function addLine() {
      if (cursor >= lines.length) return;
      const [level,time,text] = lines[cursor++];
      const button = document.createElement("button");
      button.type = "button";
      button.className = `log-line ${level.toLowerCase()}`;
      button.innerHTML = `<b>[${level}]</b> ${time} — ${text}`;
      session.on(button, "click", () => {
        if (button.dataset.hit) return;
        button.dataset.hit = "1";
        if (level === "ERROR") {
          caught += 1;
          button.classList.add("caught");
          session.api.sound("tick", 280 + caught * 35);
          setMessage(session.root, `ERROR markiert: ${caught}/6.`, "good");
          if (caught >= 6) session.later(() => session.finish(true, { caught }), 350);
        } else {
          button.classList.add("shake");
          session.api.penalty(8, `${level} fälschlich als Fehler markiert`);
          setMessage(session.root, `${level} ist kein ERROR. Die Logzeile fühlt sich missverstanden.`, "bad");
        }
      });
      consoleEl.appendChild(button);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
    session.every(addLine, speed);
    session.every(() => {
      remaining -= 1;
      session.api.setStatus(`${Math.max(0,6-caught)} ERROR · ${remaining}s`);
      if (remaining <= 0) session.finish(false, { caught, reason:"timeout" });
    }, 1000);
    addLine();
  }

  function virus(session) {
    let hits = 0;
    let remaining = 35;
    const stage = session.api.getEscalation();
    const speed = stage >= 2 ? 470 : stage === 1 ? 620 : 800;

    session.root.innerHTML = `
      <p class="game-instruction">${session.quest.instruction}</p>
      <div id="virus-desktop" class="virus-desktop">
        <div class="desktop-taskbar"><span class="desktop-start">☷ START</span><span style="margin-left:auto">MOGEL-PC · NICHT VERTRAUENSWÜRDIG</span></div>
      </div>
      <div class="game-message">Viren: 😈 👾 🦠 · Systemdateien: 📁 💾 ⚙️</div>`;
    const desktop = session.root.querySelector("#virus-desktop");

    function particles(x,y) {
      for (let i=0;i<8;i+=1) {
        const p=document.createElement("i");
        p.className="particle";
        p.style.left=`${x}px`; p.style.top=`${y}px`;
        p.style.setProperty("--tx",`${Math.cos(i*Math.PI/4)*45}px`);
        p.style.setProperty("--ty",`${Math.sin(i*Math.PI/4)*45}px`);
        desktop.appendChild(p);
        session.later(() => p.remove(), 600);
      }
    }
    function spawn() {
      if (session.ended) return;
      const isVirus = Math.random() > .32;
      const icon = document.createElement("button");
      const virusIcons = ["😈","👾","🦠"];
      const systemIcons = ["📁","💾","⚙️"];
      icon.type="button";
      icon.className="desktop-icon";
      icon.dataset.kind=isVirus?"virus":"system";
      icon.innerHTML=`${(isVirus?virusIcons:systemIcons)[Math.floor(Math.random()*3)]}<small>${isVirus?"free_game.exe":"SYSTEM"}</small>`;
      const maxX=Math.max(20,desktop.clientWidth-70);
      const maxY=Math.max(60,desktop.clientHeight-110);
      icon.style.left=`${10+Math.random()*(maxX-10)}px`;
      icon.style.top=`${10+Math.random()*(maxY-10)}px`;
      const removeTimer=session.later(() => icon.remove(), 2000);
      session.on(icon,"click",() => {
        if (!icon.isConnected) return;
        const r=icon.getBoundingClientRect();
        icon.remove();
        window.clearTimeout(removeTimer);
        if (isVirus) {
          hits+=1;
          particles(r.left-desktop.getBoundingClientRect().left+25,r.top-desktop.getBoundingClientRect().top+25);
          session.api.sound("pop",220+hits*20);
          session.api.setStatus(`${hits}/10`);
          setMessage(session.root, `Virus isoliert. Noch ${Math.max(0,10-hits)}.`, "good");
          if (hits>=10) session.later(() => session.finish(true,{hits,stage}),350);
        } else {
          session.api.penalty(25,"Systemdatei gelöscht");
          session.api.bsod();
          setMessage(session.root,"SYSTEMDATEI! Mogel behauptet, sie sei vorher schon weg gewesen.","bad");
        }
      });
      desktop.appendChild(icon);
      if(stage>=2 && Math.random()>.55) session.later(spawn,140);
    }
    session.api.setStatus("0/10");
    session.every(spawn,speed);
    session.every(() => {
      remaining-=1;
      if(remaining<=0) session.finish(false,{hits,reason:"timeout",stage});
    },1000);
    spawn();
  }

  function phishing(session) {
    const mails = [
      { from:"reise@acme-gmbh.de", subject:"Reisekosten Juli – Beleg fehlt", body:"Guten Tag, zu Ihrer Abrechnung fehlt der Hotelbeleg. Bitte laden Sie ihn im bekannten Intranet hoch.", phishing:false },
      { from:"ceo-acme@outlook-bonus.biz", subject:"DRINGEND: Geheime Zahlung", body:"Ich bin im Meeting. Kaufen Sie SOFORT 20 Gutscheinkarten und senden Sie Codes. Absolute Vertraulichkeit!", phishing:true },
      { from:"security@micros0ft-login.ru", subject:"Konto läuft in 9 Minuten ab", body:"Bestätigen Sie Ihr Passwort unter http://microsoft-sicher.ru/login, sonst werden alle Dateien gelöscht.", phishing:true },
      { from:"hr@acme-gmbh.de", subject:"Betriebsversammlung am Freitag", body:"Die Agenda liegt im Intranet unter Personal > Termine. Keine Anmeldung erforderlich.", phishing:false },
      { from:"prinz@royal-transfer.example", subject:"8.000.000 EUR FÜR SIE", body:"Werter Freund, nur Ihre IBAN und das Admin-Passwort trennen uns vom Reichtum.", phishing:true },
      { from:"monitoring@acme-gmbh.de", subject:"Ticket geschlossen: ACME-1842", body:"Das von Ihnen gemeldete WLAN-Problem wurde behoben. Details im internen Ticketsystem.", phishing:false }
    ];
    let index=0,correct=0;

    function render(){
      if(index>=mails.length){ session.finish(correct>=5,{correct,total:mails.length}); return; }
      const mail=mails[index];
      session.api.setStatus(`${index+1}/${mails.length}`);
      session.root.innerHTML=`
        <p class="game-instruction">${session.quest.instruction}</p>
        <article class="mail-card">
          <div class="mail-toolbar"><span>ACME MAIL</span><span>${index+1} / ${mails.length}</span></div>
          <header class="mail-head"><h3>${mail.subject}</h3><p><b>Von:</b> ${mail.from}</p><p><b>An:</b> mogel@acme-gmbh.de</p></header>
          <div class="mail-body">${mail.body}</div>
        </article>
        <div class="classify-actions">
          <button class="secondary-button" data-classify="real" type="button">✓ ECHT</button>
          <button class="danger-button" data-classify="phishing" type="button">⚠ PHISHING</button>
        </div>
        <div class="game-message">Prüfe Absenderdomain, Zeitdruck und ungewöhnliche Forderungen.</div>`;
      session.root.querySelectorAll("[data-classify]").forEach(button=>session.on(button,"click",()=>{
        const picked=button.dataset.classify==="phishing";
        const ok=picked===mail.phishing;
        session.root.querySelectorAll("[data-classify]").forEach(b=>b.disabled=true);
        if(ok){ correct+=1; session.api.sound("good"); setMessage(session.root,"Korrekt klassifiziert.","good"); }
        else { session.api.penalty(12,"Phishing-Mail falsch klassifiziert"); setMessage(session.root,mail.phishing?"Das war Phishing. Der Prinz ist enttäuscht.":"Das war eine echte interne Mail.","bad"); }
        session.later(()=>{index+=1;render();},650);
      }));
    }
    render();
  }

  function coffee(session) {
    let level=0;
    let holding=false;
    let fillTimer;
    let attempts=0;
    session.root.innerHTML=`
      <p class="game-instruction">${session.quest.instruction}</p>
      <div class="coffee-lab">
        <div class="coffee-machine">
          <div class="coffee-display">KAFFEMAT 3000<br><span id="coffee-status">WARTE AUF EINGABE_</span></div>
          <div class="coffee-spout"></div><div id="coffee-stream" class="coffee-stream"></div>
          <div class="cup"><div id="cup-fill" class="coffee-fill"></div></div>
        </div>
        <div class="coffee-controls">
          <div class="fill-gauge"><div class="target"></div><div class="perfect"></div><div id="gauge-level" class="level"></div></div>
          <div>
            <button id="hold-coffee" class="primary-button hold-button" type="button">GEDRÜCKT HALTEN</button>
            <div class="game-message">Grün = gut. Gold = verdächtig perfekt.</div>
          </div>
        </div>
      </div>`;
    const button=session.root.querySelector("#hold-coffee");
    const gauge=session.root.querySelector("#gauge-level");
    const cup=session.root.querySelector("#cup-fill");
    const stream=session.root.querySelector("#coffee-stream");
    const status=session.root.querySelector("#coffee-status");

    function paint(){
      gauge.style.height=`${Math.min(100,level)}%`;
      cup.style.height=`${Math.min(100,level)}%`;
      stream.style.height=holding?"105px":"0";
      session.api.setStatus(`${Math.round(level)}%`);
    }
    function start(){
      if(holding) return;
      holding=true;
      button.classList.add("holding");
      button.textContent="LÄUFT… LOSLASSEN";
      status.textContent="EXTRAKTION LÄUFT";
      fillTimer=window.setInterval(()=>{
        level=Math.min(108,level+2.15);
        paint();
        if(level>=108) stop();
      },60);
    }
    function stop(){
      if(!holding) return;
      holding=false;
      window.clearInterval(fillTimer);
      button.classList.remove("holding");
      button.textContent="GEDRÜCKT HALTEN";
      paint();
      attempts+=1;
      const perfect=level>=68&&level<=74;
      const good=level>=64&&level<=78;
      if(good){
        status.textContent=perfect?"PERFEKTE EXTRAKTION":"EXTRAKTION OK";
        setMessage(session.root,perfect?"Goldener Bereich! Die Maschine summt zufrieden.":"Im grünen Bereich. Trinkbar und wahrscheinlich legal.","good");
        session.api.sound("good");
        session.later(()=>session.finish(true,{perfect,level,attempts}),650);
      } else {
        status.textContent=level>78?"ÜBERLAUF":"UNTEREXTRAKTION";
        session.api.penalty(8,level>78?"Kaffee übergelaufen":"Tasse zu leer");
        setMessage(session.root,level>78?"Zu voll. KAFFEMAT protokolliert den Überlauf.":"Zu früh. Das ist braunes Wasser.","bad");
        if(attempts>=3) session.later(()=>session.finish(false,{perfect:false,level,attempts}),700);
        else session.later(()=>{level=0;paint();status.textContent="NEUER VERSUCH_";},650);
      }
    }
    session.addCleanup(()=>window.clearInterval(fillTimer));
    bindHold(session,button,start,stop);
    paint();
  }

  function printerBoss(session) {
    let phase=1;
    let paperStep=0;
    let tonerFlips=0;
    let questionIndex=0;
    let errors=0;
    const paperOrder=[1,0,2];
    const driverQuestions=[
      {q:"Der Drucker steht auf ‚Offline‘. Erster sinnvoller Schritt?",a:["Treiber löschen","Verbindung und Warteschlange prüfen","Drucker anschreien"],correct:1},
      {q:"Nach Tonerwechsel erscheinen Streifen. Was prüfen?",a:["Schutzstreifen entfernt?","WLAN-Passwort","Excel-Version"],correct:0},
      {q:"PC LOAD LETTER bedeutet am ehesten…",a:["Papierformat laden","PC überladen","Kevin anrufen"],correct:0}
    ];

    function frame(content,comment){
      session.root.innerHTML=`
        <p class="game-instruction">${session.quest.instruction}</p>
        <div class="boss-arena">
          <div class="printer-beast" aria-label="DRUCKO 5000">
            <div class="printer-top"></div><div class="printer-body"></div>
            <div class="printer-eyes"><i></i><i></i></div><div class="printer-mouth"></div>
          </div>
          <section class="boss-console">${content}<div class="boss-comment">DRUCKO: ${comment}</div></section>
        </div>`;
    }
    function renderPaper(){
      session.api.setStatus("PHASE 1/3");
      frame(`<h3>PHASE 1 · PAPIERSTAU</h3><p>Ziehe die drei Blätter in der Reihenfolge <b>B → A → C</b>.</p>
        <div class="paper-stack">${["A · RECHNUNG","B · DECKBLATT","C · MAHNUNG"].map((label,i)=>`<button class="paper-tab ${paperOrder.slice(0,paperStep).includes(i)?"pulled":""}" data-paper="${i}" type="button"><span>${label}</span><span>HERAUSZIEHEN →</span></button>`).join("")}</div>`,"PAPIER IST EIN PRIVILEG.");
      session.root.querySelectorAll("[data-paper]").forEach(button=>session.on(button,"click",()=>{
        const value=Number(button.dataset.paper);
        if(value===paperOrder[paperStep]){
          paperStep+=1;button.classList.add("pulled");session.api.sound("tick",180+paperStep*50);
          if(paperStep===paperOrder.length){ session.later(()=>{phase=2;renderToner();},550); }
        } else {
          errors+=1;paperStep=0;session.api.penalty(12,"Papierstau verschlimmert");
          session.root.querySelector(".boss-console").classList.add("shake");
          setMessage(session.root,"Falsches Blatt – der Stau knittert aggressiv.","bad");
          session.later(renderPaper,600);
        }
      }));
    }
    function renderToner(){
      session.api.setStatus("PHASE 2/3");
      frame(`<h3>PHASE 2 · TONER</h3><p>Druckerlogik: Kartusche zweimal drehen, dann einsetzen.</p>
        <div id="toner" class="toner-cartridge">TONER_CMYK</div>
        <div class="swipe-actions"><button id="turn-toner" class="secondary-button" type="button">↻ DREHEN</button><button id="install-toner" class="primary-button" type="button">EINSETZEN</button></div>`,"MAGENTA IST EINE HALTUNG.");
      const toner=session.root.querySelector("#toner");
      session.on(session.root.querySelector("#turn-toner"),"click",()=>{
        tonerFlips+=1;toner.classList.toggle("rotated",tonerFlips%2===1);session.api.sound("tick",200+tonerFlips*30);
        toner.textContent=`TONER · ${tonerFlips}/2`;
      });
      session.on(session.root.querySelector("#install-toner"),"click",()=>{
        if(tonerFlips>=2){session.api.sound("good");session.later(()=>{phase=3;renderDriver();},450);}
        else{errors+=1;session.api.penalty(10,"Toner falsch eingesetzt");toner.classList.add("shake");}
      });
    }
    function renderDriver(){
      session.api.setStatus(`PHASE 3/3 · ${questionIndex+1}/3`);
      const q=driverQuestions[questionIndex];
      frame(`<h3>PHASE 3 · TREIBER-DUELL</h3><p><b>${q.q}</b></p><div class="driver-grid">${q.a.map((a,i)=>`<button class="choice-button" data-driver="${i}" type="button">${a}</button>`).join("")}</div>`,questionIndex===0?"MEIN STATUS IST EMOTIONAL OFFLINE.":questionIndex===1?"TONER IST NUR DRUCKER-KAFFEE.":"PC. LOAD. LETTER.");
      session.root.querySelectorAll("[data-driver]").forEach(button=>session.on(button,"click",()=>{
        const picked=Number(button.dataset.driver);
        session.root.querySelectorAll("[data-driver]").forEach(b=>b.disabled=true);
        if(picked===q.correct){button.classList.add("correct");session.api.sound("good");}
        else{errors+=1;button.classList.add("wrong");session.api.penalty(12,"Treiberfrage falsch");}
        session.later(()=>{
          questionIndex+=1;
          if(questionIndex>=driverQuestions.length){session.finish(true,{errors,perfect:errors===0,phase});}
          else renderDriver();
        },600);
      }));
    }
    renderPaper();
  }

  const games = { quiz, simon, hdmi, usb, password, triage, logs, virus, phishing, coffee, printerBoss };

  function mount(name, root, api, quest) {
    const session = createSession(root, api, quest);
    const game = games[name];
    if (!game) {
      root.innerHTML = `<div class="game-message bad">Unbekanntes Minigame: ${name}</div>`;
      session.later(() => session.finish(false, { reason: "unknown-game" }), 500);
      return session.cleanup;
    }
    try {
      game(session);
    } catch (error) {
      console.error("Minigame konnte nicht gestartet werden:", name, error);
      root.innerHTML = `<div class="game-message bad">Das Minigame ist abgestürzt. Root nennt das „immersiv“.</div>`;
      session.later(() => session.finish(false, { reason: "exception" }), 800);
    }
    return session.cleanup;
  }

  window.ITMinigames = { mount, bindDrag, bindHold };
})();
