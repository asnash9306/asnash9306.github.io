/* Pixel-Portraits: eingebettete 16×16-Pixelmaps, keinerlei Bilddateien. */
(() => {
  "use strict";

  const SIZE = 16;
  const PX = 4;

  const characters = {
    brumm: {
      name: "CHEF BRUMM",
      short: "BRUMM",
      role: "Geschäftsführer",
      map: [
        "00000OOOOOO00000",
        "0000OHHHHHHO0000",
        "000OHHHHHHHHO000",
        "000OHSSSSSSHO000",
        "000OSSEEEESSO000",
        "000OSSSSSSSSO000",
        "000OSOOMMOOSO000",
        "0000OSMMMMMSO000",
        "00000OSSSSO00000",
        "0000OOCCCCOO0000",
        "000OCCWWWWCCO000",
        "00OCCCCTTCCCCO00",
        "00OCCCCTTCCCCO00",
        "00OCCCCCCCCCCO00",
        "000OCCCCCCCCO000",
        "0000OO0000OO0000"
      ],
      palette: { O:"#17141a", H:"#6b422d", S:"#d79b72", E:"#261b1a", M:"#49281f", C:"#25354e", W:"#e7e3d9", T:"#d6535d" }
    },
    kevin: {
      name: "KEVIN",
      short: "KEVIN",
      role: "Marketing",
      map: [
        "00000OOOOOO00000",
        "0000OAAAAAAO0000",
        "000OAAHAAAAAO000",
        "000OAHHHHAAAO000",
        "000OSSEEEESSO000",
        "000OSSSSSSSSO000",
        "000OSSOOOSSSO000",
        "0000OSSSSSSO0000",
        "00000OSSSSO00000",
        "0000OOCCCCOO0000",
        "000OCCCCCCCCO000",
        "00OCCCAAAACCCO00",
        "00OCCCCCCCCCCO00",
        "00OCCCCCCCCCCO00",
        "000OCCCCCCCCO000",
        "0000OO0000OO0000"
      ],
      palette: { O:"#151923", A:"#f0bd4d", H:"#d5902f", S:"#e2a77d", E:"#283348", C:"#367eb8" }
    },
    jana: {
      name: "JANA",
      short: "JANA",
      role: "Praktikantin",
      map: [
        "0000OO0000000000",
        "000OHHOOOOO00000",
        "00OHHHHHHHHO0000",
        "00OHHSSSSSHHO000",
        "00OHSSSEEESSHO00",
        "000OSSSSSSSSO000",
        "000OSSOOSSSSO000",
        "0000OSSSSSSO0000",
        "00000OSSSSO00000",
        "0000OOCCCCOO0000",
        "000OCCAAAACCO000",
        "00OCCCCCCCCCCO00",
        "00OCCCAACCCCCO00",
        "00OCCCCCCCCCCO00",
        "000OCCCCCCCCO000",
        "0000OO0000OO0000"
      ],
      palette: { O:"#17151c", H:"#8a4734", S:"#e0a17c", E:"#2b2734", C:"#7557a9", A:"#e9a5c5" }
    },
    kalk: {
      name: "FRAU KALK",
      short: "KALK",
      role: "Buchhaltung",
      map: [
        "000000OOOO000000",
        "00000OHHHHO00000",
        "0000OHHHHHHO0000",
        "000OHHSSSSHHOO000",
        "000OHSWEEWSHHO00",
        "000OSSWWWWSSHO00",
        "000OSSSSSSSSO000",
        "0000OSSSSSSO0000",
        "00000OSSSSO00000",
        "0000OOCCCCOO0000",
        "000OCCCTTCCCO000",
        "00OCCCCCCCCCCO00",
        "00OCCCCCCCCCCO00",
        "00OCCCCCCCCCCO00",
        "000OCCCCCCCCO000",
        "0000OO0000OO0000"
      ],
      palette: { O:"#17191b", H:"#8e8c91", S:"#d7a37e", E:"#29313a", W:"#bde6e5", C:"#566e55", T:"#c7b45f" }
    },
    mogel: {
      name: "MOGEL",
      short: "MOGEL",
      role: "Vertrieb / Shadow-IT",
      map: [
        "00000OOOOOO00000",
        "0000OHHHHHHO0000",
        "000OHHHHHHHHO000",
        "000OHHSSSSSHO000",
        "000OSWWWWWWSSO00",
        "000OSOOOOOOSSO00",
        "000OSSSSSSSSO000",
        "0000OSSSSSSO0000",
        "00000OSSSSO00000",
        "0000OOCCCCOO0000",
        "000OCCAAAACCO000",
        "00OCCCCCCCCCCO00",
        "00OCCCAACCCCCO00",
        "00OCCCCCCCCCCO00",
        "000OCCCCCCCCO000",
        "0000OO0000OO0000"
      ],
      palette: { O:"#0f1117", H:"#292a32", S:"#cf926e", W:"#111823", C:"#662f4a", A:"#d5b15a" }
    },
    root: {
      name: "ROOT",
      short: "ROOT",
      role: "Sysadmin (abwesend)",
      map: [
        "00000OOOOOO00000",
        "0000OCCCCCCO0000",
        "000OCCCCCCCCO000",
        "000OCCOOOOCCO000",
        "000OCOSSSSOCO000",
        "000OSSEEEESSO000",
        "000OSSSSSSSSO000",
        "000OSSOOSSSSO000",
        "0000OSSSSSSO0000",
        "00000OSSSSO00000",
        "0000OOCCCCOO0000",
        "000OCCGGGGCCO000",
        "00OCCCGGGGCCCO00",
        "00OCCCCCCCCCCO00",
        "000OCCCCCCCCO000",
        "0000OO0000OO0000"
      ],
      palette: { O:"#070b0c", C:"#172923", S:"#9d745e", E:"#4df29a", G:"#2ebc78" }
    },
    kaffemat: {
      name: "KAFFEMAT 3000",
      short: "K-3000",
      role: "Kaffeemaschine (?)",
      map: [
        "0000OOOOOOOO0000",
        "000OCCCCCCCCO000",
        "000OCOOOOOOCO000",
        "000OCGGGGGGCO000",
        "000OCGOGGOGCO000",
        "000OCGGGGGGCO000",
        "000OCOOOOOOCO000",
        "000OCCCCCCCCO000",
        "000OCCCOOCCCO000",
        "000OCCCOOCCCO000",
        "000OCCCOOCCCO000",
        "000OCCOOOOCCO000",
        "000OCOAAAACO0000",
        "000OCaaaaaCO0000".toUpperCase(),
        "000OCCCCCCCCO000",
        "0000OOOOOOOO0000"
      ],
      palette: { O:"#11161c", C:"#747d86", G:"#4df29a", A:"#7b3d20" }
    },
    drucko: {
      name: "DRUCKO 5000",
      short: "DRUCKO",
      role: "Flurdrucker / Endgegner",
      map: [
        "0000OOOOOOOO0000",
        "000OCCCCCCCCO000",
        "00OCCWWWWWWCCO00",
        "00OCWWWWWWWWCO00",
        "00OCCCCCCCCCCO00",
        "000OCCCCCCCCO000",
        "00OOOOOOOOOOOO00",
        "0OCCCCCCCCCCCCO0",
        "0OCCCRCCCCRCCCO0",
        "0OCCCCCCCCCCCCO0",
        "0OCCOOOOOOOOCCO0",
        "0OCCO000000OCCO0",
        "0OCCORRRRRROCCO0",
        "0OCCCCCCCCCCCCO0",
        "00OCCCCCCCCCCO00",
        "000OOOOOOOOOO000"
      ],
      palette: { O:"#10151d", C:"#9ba5af", W:"#e5e8e9", R:"#ff5d73" }
    }
  };

  const moodEmoji = { happy: "😀", neutral: "😐", angry: "😡" };

  function normalizeRow(row) {
    return String(row).slice(0, SIZE).padEnd(SIZE, "0");
  }

  function draw(canvas, id, mood = "neutral", frame = 0) {
    const model = characters[id] || characters.root;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== SIZE * PX || canvas.height !== SIZE * PX) {
      canvas.width = SIZE * PX;
      canvas.height = SIZE * PX;
    }
    canvas.style.imageRendering = "pixelated";
    canvas.setAttribute("role", "img");
    if (!canvas.getAttribute("aria-label") && !canvas.getAttribute("aria-hidden")) {
      canvas.setAttribute("aria-label", model.name);
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const idleOffset = frame % 2 === 1 ? 1 : 0;
    const blink = frame % 12 === 10;

    model.map.forEach((raw, y) => {
      const row = normalizeRow(raw);
      for (let x = 0; x < SIZE; x += 1) {
        let code = row[x];
        if (code === "0") continue;
        if (blink && code === "E") code = "S";
        const color = model.palette[code] || model.palette.O || "#fff";
        ctx.fillStyle = color;
        ctx.fillRect(x * PX, (y * PX) + idleOffset, PX, PX);
      }
    });

    if (mood === "happy") {
      ctx.fillStyle = "#ffd166";
      [[1,2],[14,3],[2,13]].forEach(([x,y]) => {
        ctx.fillRect(x*PX,y*PX,PX,PX);
        ctx.fillRect((x-1)*PX,(y+1)*PX,PX*3,PX);
      });
    } else if (mood === "angry") {
      ctx.fillStyle = "#ff5d73";
      ctx.fillRect(5*PX,4*PX,3*PX,PX);
      ctx.fillRect(9*PX,4*PX,3*PX,PX);
      ctx.fillStyle = "rgba(255,55,75,.16)";
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
  }

  let frame = 0;
  function renderAll(root = document) {
    root.querySelectorAll("canvas[data-character]").forEach((canvas) => {
      draw(canvas, canvas.dataset.character, canvas.dataset.mood || "neutral", frame);
    });
  }

  function setMood(canvas, mood) {
    if (!canvas) return;
    canvas.dataset.mood = mood;
    draw(canvas, canvas.dataset.character, mood, frame);
  }

  const animator = window.setInterval(() => {
    frame = (frame + 1) % 24;
    renderAll(document);
  }, 620);

  window.ITCharacters = {
    data: characters,
    moodEmoji,
    draw,
    renderAll,
    setMood,
    get frame() { return frame; },
    animator
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => renderAll(document), { once: true });
  } else {
    renderAll(document);
  }
})();
