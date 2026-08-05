/* IT-SURVIVAL — State-Machine, Scheduler, HUD, Audio und Endings. */
(() => {
  "use strict";

  const Story = window.ITStory;
  const Characters = window.ITCharacters;
  const Minigames = window.ITMinigames;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const ui = {
    start: $("#start-screen"), startButton: $("#start-button"), startMute: $("#start-mute"),
    shell: $("#game-shell"), stage: $("#main-stage"), end: $("#end-screen"),
    dialogue: $("#dialogue-layer"), portrait: $("#dialogue-portrait"), dialogueMood: $("#dialogue-mood"),
    dialogueName: $("#dialogue-name"), dialogueText: $("#dialogue-text"), dialogueBubble: $("#dialogue-bubble"),
    dialogueTime: $("#dialogue-time"), dialogueStep: $("#dialogue-step"), dialogueNext: $("#dialogue-next"),
    coffeeBar: $("#coffee-bar"), coffeeValue: $("#coffee-value"), patienceBar: $("#patience-bar"),
    patienceValue: $("#patience-value"), clock: $("#clock"), phase: $("#phase-label"),
    questCounter: $("#quest-counter"), hudMute: $("#hud-mute"), toasts: $("#toast-region"),
    fx: $("#fx-layer"), bsod: $("#bsod-overlay")
  };

  const allQuests = [...Story.quests, Story.coreEvents.server, Story.coreEvents.coffee, Story.coreEvents.printer];
  const questMap = new Map(allQuests.map(q => [q.id, q]));
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;

  const storage = {
    get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  };

  const Audio = {
    muted: storage.get("it-survival-muted", "0") === "1",
    context: null,
    init() {
      if (this.muted) return;
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      try {
        if (!this.context) this.context = new Context();
        if (this.context.state === "suspended") this.context.resume();
      } catch (_) { this.context = null; }
    },
    tone(frequency = 330, duration = .06, type = "square", volume = .03, delay = 0) {
      if (this.muted) return;
      this.init();
      if (!this.context) return;
      try {
        const start = this.context.currentTime + delay;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(gain).connect(this.context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + .02);
      } catch (_) {}
    },
    play(kind, frequency) {
      if (kind === "tick") this.tone(frequency || 360, .035, "square", .018);
      else if (kind === "pop") this.tone(frequency || 240, .065, "square", .035);
      else if (kind === "message") { this.tone(620,.06,"square",.035); this.tone(840,.08,"square",.025,.07); }
      else if (kind === "good") [440,660,880].forEach((f,i) => this.tone(f,.12,"square",.035,i*.075));
      else if (kind === "bad") { this.tone(150,.18,"sawtooth",.05); this.tone(105,.22,"sawtooth",.035,.1); }
      else if (kind === "boss") [82,74,65].forEach((f,i) => this.tone(f,.3,"sawtooth",.06,i*.12));
    },
    toggle() {
      this.muted = !this.muted;
      storage.set("it-survival-muted", this.muted ? "1" : "0");
      updateMuteButtons();
      if (!this.muted) { this.init(); this.play("message"); }
    }
  };

  function freshState() {
    return {
      mode: "start", activeRun: false, ending: false,
      time: 540, coffee: 100, patience: 100,
      active: [], backlog: [], released: {}, completed: {}, ticketMeta: {}, currentQuest: null,
      eventFlags: { server: false, coffee: false, boss: false },
      moodScores: { brumm:0, kevin:0, jana:0, kalk:0, mogel:0, root:0, kaffemat:0, drucko:-1 },
      logs: ["root@acme: systemcheck unauffällig. verdächtig.", "root@acme: der drucker lügt.", "nerddesk: warteschlange verbunden."],
      kaffematPerfect: false, bossPerfect: false,
      stats: { penalties:0, escalations:0, mistakes:0, idleSkips:0 }
    };
  }

  let state = freshState();
  let globalIntervals = [];
  let transientTimers = new Set();
  let activeGameCleanup = null;
  let dialogue = null;
  let dialogueTypingTimer = null;

  function later(fn, ms) {
    const id = setTimeout(() => { transientTimers.delete(id); fn(); }, ms);
    transientTimers.add(id);
    return id;
  }
  function clearRuntimeTimers() {
    globalIntervals.forEach(clearInterval);
    globalIntervals = [];
    transientTimers.forEach(id => { clearTimeout(id); clearInterval(id); });
    transientTimers.clear();
    clearInterval(dialogueTypingTimer);
    dialogueTypingTimer = null;
  }
  function formatTime(minutes) { return `${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`; }
  function phaseForTime(minutes) {
    let label = Story.phaseNames[0][1];
    Story.phaseNames.forEach(([start,name]) => { if (minutes >= start) label = name; });
    return label;
  }
  function moodFor(id) {
    if (id === "brumm") return state.patience > 70 ? "happy" : state.patience > 35 ? "neutral" : "angry";
    const score = state.moodScores[id] || 0;
    return score > 0 ? "happy" : score < 0 ? "angry" : "neutral";
  }
  function moodEmoji(id) { return Characters.moodEmoji[moodFor(id)]; }
  function adjustMood(id, amount) {
    if (id === "brumm" || !(id in state.moodScores)) return;
    state.moodScores[id] = Math.max(-1, Math.min(1, state.moodScores[id] + amount));
  }
  function solvedCount() { return Story.totalQuestIds.filter(id => state.completed[id]).length; }

  function updateHud() {
    const coffee = Math.max(0,Math.min(100,Math.round(state.coffee)));
    const patience = Math.max(0,Math.min(100,Math.round(state.patience)));
    ui.coffeeValue.textContent = coffee;
    ui.coffeeBar.style.width = `${coffee}%`;
    ui.coffeeBar.parentElement.setAttribute("aria-valuenow", coffee);
    ui.patienceValue.textContent = patience;
    ui.patienceBar.style.width = `${patience}%`;
    ui.patienceBar.parentElement.setAttribute("aria-valuenow", patience);
    ui.clock.textContent = formatTime(state.time);
    ui.phase.textContent = phaseForTime(state.time);
    ui.questCounter.textContent = `${solvedCount()}/${Story.totalQuestIds.length} GELÖST`;
  }
  function updateMuteButtons() {
    const icon = Audio.muted ? "🔇" : "🔊";
    const label = Audio.muted ? "Ton einschalten" : "Ton ausschalten";
    [ui.startMute,ui.hudMute].forEach(button => { button.textContent=icon; button.title=label; button.setAttribute("aria-label",label); });
  }
  function toast(message, kind="") {
    const node = document.createElement("div");
    node.className = `toast ${kind}`.trim();
    node.textContent = message;
    ui.toasts.appendChild(node);
    later(() => node.remove(), 3100);
  }
  function flash(kind) {
    const className = kind === "good" ? "flash-good" : "flash-bad";
    ui.fx.classList.remove("flash-good","flash-bad");
    void ui.fx.offsetWidth;
    ui.fx.classList.add(className);
    later(() => ui.fx.classList.remove(className), 450);
  }
  function confetti(amount=42) {
    if (reducedMotion) return;
    const colors=["#4df29a","#5cc8ff","#ffd166","#ff5d73","#b892ff"];
    for(let i=0;i<amount;i+=1){
      const p=document.createElement("i"); p.className="confetti";
      p.style.setProperty("--x",`${Math.random()*100}%`); p.style.setProperty("--dx",`${(Math.random()-.5)*170}px`);
      p.style.setProperty("--c",colors[i%colors.length]); p.style.animationDelay=`${Math.random()*.45}s`;
      ui.fx.appendChild(p); later(()=>p.remove(),1900);
    }
  }
  function showBsod(){ ui.bsod.hidden=false; Audio.play("bad"); later(()=>{ui.bsod.hidden=true;},1000); }
  function changeCoffee(amount, reason="") {
    if(state.ending) return;
    state.coffee=Math.max(0,Math.min(100,state.coffee+amount)); updateHud();
    if(reason&&amount>0) toast(`${reason}: +${amount} Kaffee`,"good");
    if(state.coffee<=0) endDay("asleep");
  }
  function changePatience(amount, reason="") {
    if(state.ending) return;
    state.patience=Math.max(0,Math.min(100,state.patience+amount)); updateHud();
    if(amount<0){ state.stats.penalties+=Math.abs(amount); state.stats.mistakes+=1; toast(`${reason||"Chef Brumm missbilligt das"}: ${amount} Geduld`,"bad"); flash("bad"); Audio.play("bad"); }
    if(state.patience<=0) endDay("fired");
  }
  function addLog(text){ state.logs.push(text); if(state.logs.length>14) state.logs.shift(); }
  function getQuest(id){ return questMap.get(id); }


  /* ---------- Ticket-Scheduler und Board ---------- */
  function canRelease(quest){
    if(state.released[quest.id]||state.completed[quest.id]||state.time<quest.releaseAt) return false;
    return !quest.unlockAfter || Boolean(state.completed[quest.unlockAfter]);
  }
  function dispatchQuest(quest){
    if(!quest||state.released[quest.id]) return false;
    state.released[quest.id]=true;
    state.ticketMeta[quest.id]={born:state.time,stage:0,typed:false,chars:0,messageKey:"base",typingTimer:null};
    (state.active.length<3?state.active:state.backlog).push(quest.id);
    addLog(`nerddesk: neue anfrage von ${Characters.data[quest.character].short.toLowerCase()}.`);
    toast(`${Characters.data[quest.character].short} tippt…`,"warn"); Audio.play("message");
    return true;
  }
  function drainBacklog(){ while(state.active.length<3&&state.backlog.length) state.active.push(state.backlog.shift()); }
  function ticketMessage(quest,meta){ return meta.stage>0?(quest.escalation?.[meta.stage-1]||quest.summary):quest.summary; }
  function resetTicketTyping(id,key){
    const meta=state.ticketMeta[id]; if(!meta)return;
    if(meta.typingTimer){ clearInterval(meta.typingTimer); transientTimers.delete(meta.typingTimer); }
    Object.assign(meta,{typed:false,chars:0,messageKey:key,typingTimer:null});
  }
  function ensureTicketTyping(id){
    const meta=state.ticketMeta[id],quest=getQuest(id); if(!meta||!quest||meta.typed||meta.typingTimer)return;
    const full=ticketMessage(quest,meta);
    const timer=setInterval(()=>{
      if(!state.ticketMeta[id]||state.mode!=="board")return;
      meta.chars=Math.min(full.length,meta.chars+1);
      const target=$(`[data-ticket-message="${id}"]`,ui.stage); if(target)target.textContent=full.slice(0,meta.chars);
      if(meta.chars%4===0)Audio.play("tick",300+(meta.chars%6)*20);
      if(meta.chars>=full.length){meta.typed=true;meta.typingTimer=null;clearInterval(timer);transientTimers.delete(timer);}
    },reducedMotion?1:18);
    meta.typingTimer=timer; transientTimers.add(timer);
  }
  function updateEscalations(){
    let changed=false;
    [...state.active,...state.backlog].forEach(id=>{
      const meta=state.ticketMeta[id],quest=getQuest(id); if(!meta||!quest)return;
      const age=state.time-meta.born,desired=age>=55?2:age>=30?1:0;
      if(desired<=meta.stage)return;
      for(let stage=meta.stage+1;stage<=desired;stage+=1){
        meta.stage=stage; state.stats.escalations+=1; adjustMood(quest.character,-1); resetTicketTyping(id,`stage-${stage}`);
        if(stage===1){changePatience(-5,`${Characters.data[quest.character].short} wartet zu lange`);toast(`${Characters.data[quest.character].short}: „??“`,"warn");}
        else{const extra=quest.character==="kalk"?5:0;changePatience(-(10+extra),"Eskalation an Chef Brumm");toast(`CHEF BRUMM wurde bei „${quest.title}“ ins CC gesetzt`,"bad");}
      }
      changed=true;
    });
    return changed;
  }
  function nextMandatory(){
    return [["server",Story.coreEvents.server],["coffee",Story.coreEvents.coffee],["boss",Story.coreEvents.printer]]
      .find(([flag,quest])=>!state.eventFlags[flag]&&state.time>=quest.releaseAt)||null;
  }
  function checkSchedule(){
    if(state.mode!=="board"||state.ending)return{interrupted:false,changed:false};
    const mandatory=nextMandatory();
    if(mandatory){startMandatory(mandatory[0],mandatory[1]);return{interrupted:true,changed:true};}
    let changed=false;
    [...Story.quests].sort((a,b)=>a.order-b.order).forEach(quest=>{if(canRelease(quest))changed=dispatchQuest(quest)||changed;});
    drainBacklog(); return{interrupted:false,changed};
  }
  function updateBoardDynamic(){
    if(state.mode!=="board")return;
    const timeNode=$("[data-board-time]",ui.stage); if(timeNode)timeNode.textContent=formatTime(state.time);
    const segment=Math.max(0,Math.min(7,Math.floor((state.time-540)/60)));
    $$('[data-time-segment]',ui.stage).forEach(node=>{const i=Number(node.dataset.timeSegment);node.classList.toggle("passed",i<segment);node.classList.toggle("current",i===segment);});
    state.active.forEach(id=>{const card=$(`[data-ticket="${id}"]`,ui.stage),meta=state.ticketMeta[id];if(card&&meta)card.style.setProperty("--age",`${Math.min(100,((state.time-meta.born)/55)*100)}%`);});
  }
  function renderBoard(){
    if(state.mode!=="board"||state.ending)return;
    const cards=state.active.map(id=>{
      const quest=getQuest(id),meta=state.ticketMeta[id],mood=moodFor(quest.character),full=ticketMessage(quest,meta),shown=meta.typed?full:full.slice(0,meta.chars);
      const stageLabel=meta.stage===2?"ESKALIERT · CC CHEF":meta.stage===1?"WARTET · ??":"NEU";
      return `<article class="ticket-card escalated-${meta.stage}" data-ticket="${quest.id}" style="--age:${Math.min(100,((state.time-meta.born)/55)*100)}%">
        <div class="portrait-frame"><canvas data-character="${quest.character}" data-mood="${mood}" aria-label="${Characters.data[quest.character].name}"></canvas><span class="mood-badge">${Characters.moodEmoji[mood]}</span></div>
        <div class="ticket-copy"><div class="ticket-topline"><strong>${Characters.data[quest.character].name}</strong><time>${formatTime(meta.born)}</time><span class="pixel-tag ${meta.stage===2?"alert":meta.stage===1?"":"good"}">${stageLabel}</span></div><h3>${quest.title}</h3><p class="ticket-message" data-ticket-message="${quest.id}">${shown}</p></div>
        <button class="primary-button accept-button" data-accept="${quest.id}" type="button">ANNEHMEN</button>
      </article>`;
    }).join("");
    const segment=Math.max(0,Math.min(7,Math.floor((state.time-540)/60)));
    const moodIds=["kevin","jana","kalk","mogel","root","kaffemat"];
    const logs=state.logs.slice(-7).map((line,i,a)=>`<p class="${i<a.length-3?"dim":""}"><b>&gt;</b> ${line}</p>`).join("");
    const empty=`<div class="empty-queue"><div><div class="radar"></div><b>POSTEINGANG RUHIG</b><p>Das ist verdächtiger als drei offene Tickets.</p></div></div>`;
    ui.stage.innerHTML=`<section class="board-screen">
      <div class="ticket-column">
        <div class="board-heading"><div><h2>NERDPHONE · ANFRAGEN</h2><p>Maximal 3 sichtbar. Du bestimmst die Reihenfolge – und trägst die Folgen.</p></div><span class="queue-chip">${state.active.length}/3 AKTIV · ${state.backlog.length} WARTEND</span></div>
        <div class="ticket-list">${cards||empty}</div>
        <button id="idle-skip" class="secondary-button idle-button" type="button">▸ 10 MINUTEN LOGS BEOBACHTEN <small>(Tickets altern)</small></button>
      </div>
      <aside class="side-column">
        <section class="side-card timeline"><div class="side-card-header"><span>SCHICHTVERLAUF</span><span data-board-time>${formatTime(state.time)}</span></div><div class="timeline-track">${Array.from({length:8},(_,i)=>`<i data-time-segment="${i}" class="${i<segment?"passed":i===segment?"current":""}"></i>`).join("")}</div><div class="timeline-labels"><span>09</span><span>11</span><span>13</span><span>15</span><span>17</span></div></section>
        <section class="side-card"><div class="side-card-header"><span>BÜRO-STIMMUNG</span><span>${moodEmoji("brumm")} CHEF</span></div><div class="mood-grid">${moodIds.map(id=>`<div class="mood-person" title="${Characters.data[id].name}: ${moodFor(id)}"><canvas data-character="${id}" data-mood="${moodFor(id)}" aria-label="${Characters.data[id].name}"></canvas><span>${moodEmoji(id)}</span></div>`).join("")}</div></section>
        <section class="side-card" style="min-height:0;flex:1"><div class="side-card-header"><span>ROOT // REMOTE</span><span>ONLINE?</span></div><div class="root-terminal">${logs}</div></section>
      </aside>
    </section>`;
    $$('[data-accept]',ui.stage).forEach(button=>button.addEventListener("click",()=>acceptQuest(button.dataset.accept),{once:true}));
    $("#idle-skip",ui.stage)?.addEventListener("click",()=>{state.stats.idleSkips+=1;addLog("du: 10 minuten professionell auf logs geschaut.");changeCoffee(-2);if(!state.ending)advanceTime(10);},{once:true});
    state.active.forEach(ensureTicketTyping); Characters.renderAll(ui.stage);
  }
  function advanceTime(minutes){
    if(state.ending)return;
    const target=state.time+minutes; state.time=!state.eventFlags.boss&&target>1005?1005:Math.min(1020,target);
    const escalated=updateEscalations(); if(state.ending)return; updateHud();
    if(state.mode==="board"){
      const scheduled=checkSchedule(); if(scheduled.interrupted)return;
      if(scheduled.changed||escalated)renderBoard();else updateBoardDynamic();
    }
  }
  function startTimers(){
    globalIntervals.forEach(clearInterval);
    globalIntervals=[
      setInterval(()=>{if(state.activeRun&&state.mode==="board"&&!state.ending)advanceTime(1);},2000),
      setInterval(()=>{if(state.activeRun&&!state.ending&&!['start','ending'].includes(state.mode))changeCoffee(-1);},2000)
    ];
  }

  /* ---------- Dialog-State ---------- */
  function showDialogue(messages,onDone){
    if(!messages?.length){onDone?.();return;}
    state.mode="dialogue"; dialogue={messages,index:0,onDone,typing:false,full:""}; ui.dialogue.hidden=false; renderDialogue();
  }
  function renderDialogue(){
    const item=dialogue.messages[dialogue.index],character=Characters.data[item.speaker]||Characters.data.root,mood=moodFor(item.speaker);
    dialogue.full=item.text; dialogue.typing=!reducedMotion;
    Object.assign(ui.portrait.dataset,{character:item.speaker,mood});
    ui.dialogueMood.textContent=Characters.moodEmoji[mood]; ui.dialogueName.textContent=character.name;
    ui.dialogueTime.textContent=formatTime(state.time); ui.dialogueStep.textContent=`${dialogue.index+1} / ${dialogue.messages.length}`;
    ui.dialogueNext.innerHTML=dialogue.index===dialogue.messages.length-1?'LOS <span>›</span>':'WEITER <span>›</span>';
    ui.dialogueBubble.classList.toggle("terminal",Boolean(item.terminal||["root","kaffemat","drucko"].includes(item.speaker)));
    Characters.draw(ui.portrait,item.speaker,mood,Characters.frame); clearInterval(dialogueTypingTimer);
    if(reducedMotion){ui.dialogueText.textContent=item.text;dialogue.typing=false;return;}
    ui.dialogueText.textContent="";let cursor=0;
    dialogueTypingTimer=setInterval(()=>{
      cursor+=1;ui.dialogueText.textContent=item.text.slice(0,cursor);
      if(cursor%3===0&&item.text[cursor-1]!==" ")Audio.play("tick",item.terminal?260:390);
      if(cursor>=item.text.length){clearInterval(dialogueTypingTimer);dialogueTypingTimer=null;dialogue.typing=false;}
    },17);
  }
  function nextDialogue(){
    if(!dialogue)return;
    if(dialogue.typing){clearInterval(dialogueTypingTimer);dialogueTypingTimer=null;ui.dialogueText.textContent=dialogue.full;dialogue.typing=false;return;}
    Audio.play("tick",440);dialogue.index+=1;
    if(dialogue.index<dialogue.messages.length){renderDialogue();return;}
    const done=dialogue.onDone;dialogue=null;ui.dialogue.hidden=true;done?.();
  }
  function enterBoard(){
    if(state.ending)return;state.mode="board";state.currentQuest=null;
    const scheduled=checkSchedule();if(!scheduled.interrupted)renderBoard();updateHud();
  }
  function acceptQuest(id){
    if(state.mode!=="board"||state.ending||!state.active.includes(id))return;
    const quest=getQuest(id),meta=state.ticketMeta[id];
    if(meta?.typingTimer){clearInterval(meta.typingTimer);transientTimers.delete(meta.typingTimer);meta.typingTimer=null;meta.typed=true;}
    state.active=state.active.filter(qid=>qid!==id);drainBacklog();state.currentQuest=id;addLog(`du: ticket ${id} angenommen.`);
    showDialogue(quest.intro,()=>runMinigame(quest));
  }
  function startMandatory(flag,quest){
    if(state.ending||state.eventFlags[flag])return;
    state.eventFlags[flag]=true;state.released[quest.id]=true;state.currentQuest=quest.id;
    if(flag==="server"){addLog("ALARM: prod-01 antwortet nur noch in ERRORs.");toast("⚠ PFLICHT-EVENT: SERVER-ALARM","bad");Audio.play("bad");}
    else if(flag==="coffee"){addLog("kaffemat3000: ICH HABE GETRÄUMT.");toast("☕ KAFFEMAT 3000 fordert Wartung","warn");Audio.play("message");}
    else{addLog("drucko5000: PC LOAD LETTER.");toast("🖨 16:45 · DRUCKO 5000 ERWACHT","bad");Audio.play("boss");}
    showDialogue(quest.intro,()=>runMinigame(quest));
  }


  /* ---------- Minigame-Bridge ---------- */
  function runMinigame(quest){
    if(state.ending)return;
    state.mode="minigame";state.currentQuest=quest.id;
    const mood=moodFor(quest.character),bossClass=quest.minigame==="printerBoss"?"boss-screen":"";
    ui.stage.innerHTML=`<section class="minigame-screen ${bossClass}">
      <header class="mini-header"><div class="portrait-frame"><canvas data-character="${quest.character}" data-mood="${mood}" aria-label="${Characters.data[quest.character].name}"></canvas></div><div class="mini-title"><h2>${quest.title}</h2><p>${Characters.data[quest.character].name} · ${quest.duration} In-Game-Minuten</p></div><output id="mini-status" class="mini-status">BEREIT</output></header>
      <div class="game-panel"><div id="minigame-root" class="game-inner"></div></div>
    </section>`;
    Characters.renderAll(ui.stage);
    const root=$("#minigame-root",ui.stage);let settled=false;
    const api={
      setStatus(text){const output=$("#mini-status",ui.stage);if(output)output.textContent=text;},
      penalty(amount,message){changePatience(-Math.abs(amount),message);},
      rewardCoffee(amount,message){changeCoffee(Math.abs(amount),message);},
      toast,flash,sound(kind,frequency){Audio.play(kind,frequency);},bsod:showBsod,
      getEscalation(){return state.ticketMeta[quest.id]?.stage||0;},
      success(payload){if(!settled){settled=true;finishQuest(quest,true,payload||{});}},
      fail(payload){if(!settled){settled=true;finishQuest(quest,false,payload||{});}}
    };
    activeGameCleanup=Minigames.mount(quest.minigame,root,api,quest);
  }
  function finishQuest(quest,success,payload={}){
    if(state.ending)return;
    if(activeGameCleanup){try{activeGameCleanup();}catch(_){}activeGameCleanup=null;}
    state.completed[quest.id]={success,at:state.time,payload};adjustMood(quest.character,success?1:-1);
    if(!success)changePatience(-8,`${quest.title} verpatzt`);if(state.ending)return;
    if(success&&quest.rewardCoffee)changeCoffee(quest.rewardCoffee,Characters.data[quest.character].short);
    if(quest.id===Story.coreEvents.coffee.id){state.kaffematPerfect=Boolean(success&&payload.perfect);state.moodScores.kaffemat=state.kaffematPerfect?1:success?0:-1;}
    if(quest.id===Story.coreEvents.server.id&&success)addLog("prod-01: status grün. cronjob in therapie.");
    if(quest.id==="mogel-virus")addLog(`scanner: ${success?"10 viren isoliert":"scan unvollständig"}.`);
    if(quest.id===Story.coreEvents.printer.id){state.bossPerfect=Boolean(payload.perfect);if(success){state.moodScores.drucko=0;adjustMood("kalk",1);}}
    if(quest.id!==Story.coreEvents.printer.id)advanceTime(quest.duration+(success?0:10));
    updateHud();flash(success?"good":"bad");Audio.play(success?"good":"bad");if(success)confetti(quest.id===Story.coreEvents.printer.id?70:24);
    showDialogue(success?quest.success:quest.fail,()=>{
      if(quest.id===Story.coreEvents.printer.id){state.time=1020;updateHud();endDay("review");}
      else enterBoard();
    });
  }

  /* ---------- Endings ---------- */
  function rankForPatience(){
    if(state.patience>80)return{title:"ROOT-GOTT 👑",copy:"Du hast nicht nur überlebt – du hast das Büro administriert, ohne sichtbar zu weinen.",stamp:"ROOT-GOTT"};
    if(state.patience>40)return{title:"SYSADMIN 🖥",copy:"Der Betrieb läuft. Niemand weiß genau warum. Das ist professionelle IT.",stamp:"ÜBERLEBT"};
    return{title:"MAUS-SCHUBSER 🐭",copy:"Der Tag ist geschafft. Chef Brumm auch. Morgen bitte weniger Rauch.",stamp:"KNAPP ÜBERLEBT"};
  }
  function endingData(reason){
    if(reason==="fired")return{title:"GEFEUERT 📦",copy:"Chef Brumm hat genug. Dein Firmenkonto wurde schneller deaktiviert als Mogels Antivirus.",stamp:"VERTRAG BEENDET",kind:"bad"};
    if(reason==="asleep")return{title:"EINGESCHLAFEN 😴",copy:"Zu wenig Koffein. Du wachst unter dem Schreibtisch auf. Root nennt es Energiesparmodus.",stamp:"KAFFEE 0%",kind:"bad"};
    const allSuccess=Story.totalQuestIds.every(id=>state.completed[id]?.success);
    const happy=Story.promotionMoodIds.every(id=>moodFor(id)==="happy");
    if(allSuccess&&happy)return{title:"BEFÖRDERUNG 🏆",copy:"Alle Tickets gelöst, alle Kolleg:innen zufrieden. Chef Brumm befördert dich zur gesamten IT-Abteilung – diesmal offiziell.",stamp:"BEFÖRDERT",kind:"good"};
    if(state.kaffematPerfect)return{title:"KAFFEMAT 3000 ÜBERNIMMT ☕🤖",copy:"Perfekte Extraktion aktiviert BARISTA-OMEGA. KAFFEMAT übernimmt die Geschäftsführung. Erster Beschluss: kostenlose Doppel-Espressi.",stamp:"NEUE LEITUNG",kind:"secret"};
    return{...rankForPatience(),kind:"normal"};
  }
  function endDay(reason){
    if(state.ending)return;
    state.ending=true;state.mode="ending";state.activeRun=false;
    if(activeGameCleanup){try{activeGameCleanup();}catch(_){}activeGameCleanup=null;}
    clearRuntimeTimers();dialogue=null;ui.dialogue.hidden=true;ui.bsod.hidden=true;ui.shell.hidden=true;ui.start.hidden=true;ui.end.hidden=false;
    const data=endingData(reason),now=new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date());
    const moodIds=["brumm","kevin","jana","kalk","mogel","root","kaffemat"];
    ui.end.innerHTML=`<article class="punch-card">
      <p class="end-kicker">ACME GMBH · STECHUHRKARTE · ${formatTime(state.time)}</p><h2 id="ending-title">${data.title}</h2><div class="stamp">${data.stamp}</div><p class="ending-copy">${data.copy}</p>
      <div class="end-stats"><div class="stat-box"><span>TICKETS</span><b>${solvedCount()}/${Story.totalQuestIds.length}</b></div><div class="stat-box"><span>BRUMM</span><b>${Math.round(state.patience)}%</b></div><div class="stat-box"><span>KAFFEE</span><b>${Math.round(state.coffee)}%</b></div><div class="stat-box"><span>ESKALATIONEN</span><b>${state.stats.escalations}</b></div></div>
      <div class="end-moods">${moodIds.map(id=>`<span class="end-mood">${Characters.data[id].short} ${moodEmoji(id)}</span>`).join("")}</div>
      <div class="end-actions"><button id="restart-button" class="primary-button" type="button">NOCHMAL SPIELEN</button><span class="real-stamp-time">Ausgestempelt: ${now} Uhr · ${state.stats.penalties} Geduldspunkte verloren</span></div>
    </article>`;
    $("#restart-button",ui.end).addEventListener("click",startGame,{once:true});
    if(data.kind==="good"||data.kind==="secret"||data.title.includes("ROOT-GOTT")){confetti(data.kind==="good"?90:66);Audio.play("good");}
    else if(data.kind==="bad")Audio.play("bad");
  }

  /* ---------- Lifecycle ---------- */
  function resetState(){
    if(activeGameCleanup){try{activeGameCleanup();}catch(_){}activeGameCleanup=null;}
    clearRuntimeTimers();ui.toasts.innerHTML="";ui.fx.innerHTML="";ui.bsod.hidden=true;ui.dialogue.hidden=true;state=freshState();dialogue=null;updateHud();
  }
  function startGame(){
    resetState();Audio.init();ui.start.hidden=true;ui.end.hidden=true;ui.shell.hidden=false;state.mode="dialogue";updateHud();
    ui.stage.innerHTML=`<div class="empty-queue" style="height:100%;border:0"><div><div class="radar"></div><b>NERDDESK WIRD GESTARTET…</b></div></div>`;
    showDialogue(Story.opening,()=>{state.time=545;state.activeRun=true;startTimers();enterBoard();});
  }
  function showStart(){resetState();state.mode="start";ui.start.hidden=false;ui.shell.hidden=true;ui.end.hidden=true;Characters.renderAll(ui.start);}

  /* Die Debug-Vorschau ist absichtlich nicht in der UI. Sie ermöglicht automatisierte QA aller Screens. */
  function debugPreview(name){
    resetState();ui.start.hidden=true;ui.end.hidden=true;ui.shell.hidden=false;state.activeRun=false;state.time=name==="board"?720:630;updateHud();
    if(name==="board"){
      state.mode="board";[Story.quests[2],Story.quests[4],Story.quests[5]].forEach(dispatchQuest);renderBoard();return;
    }
    if(name==="ending"){
      state.patience=88;Story.totalQuestIds.forEach(id=>{state.completed[id]={success:true,at:1000};});Story.promotionMoodIds.forEach(id=>{state.moodScores[id]=1;});
      state.kaffematPerfect=true;state.time=1020;state.ending=false;endDay("review");return;
    }
    const quest=allQuests.find(q=>q.minigame===name||q.id===name);if(quest)runMinigame(quest);
  }

  ui.startButton.addEventListener("click",startGame);
  ui.startMute.addEventListener("click",()=>Audio.toggle());
  ui.hudMute.addEventListener("click",()=>Audio.toggle());
  ui.dialogueNext.addEventListener("click",nextDialogue);
  document.addEventListener("keydown",event=>{
    if(event.key!=="Enter")return;
    if(!ui.start.hidden&&event.target.tagName!=="BUTTON")startGame();
    else if(!ui.dialogue.hidden&&event.target.tagName!=="BUTTON")nextDialogue();
  });

  updateMuteButtons();updateHud();Characters.renderAll(document);
  window.ITGameDebug={
    start:startGame,showStart,preview:debugPreview,
    jump(minutes){if(!state.ending)advanceTime(minutes);},
    end(reason="review"){state.ending=false;endDay(reason);},
    getState(){return JSON.parse(JSON.stringify(state));},
    setResources(coffee,patience){state.coffee=coffee;state.patience=patience;updateHud();}
  };
})();
