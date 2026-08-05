/* Story- und Questdaten. Logik bleibt davon getrennt in game.js. */
(() => {
  "use strict";

  const quests = [
    {
      id: "kevin-quiz",
      order: 1,
      releaseAt: 545,
      character: "kevin",
      title: "Internet gelöscht?",
      summary: "Ich hab aus Versehen das Internet gelöscht 😅✨ Ist HTML vielleicht das Backup?",
      minigame: "quiz",
      duration: 20,
      rewardCoffee: 5,
      instruction: "Beantworte Kevins vier IT-Fragen. Fachlich korrekt, emotional schonend.",
      escalation: [
        "hellooo? das Internet ist immer noch weg 😬",
        "@Chef Brumm ich glaube unsere IT antwortet nicht 🫠"
      ],
      intro: [
        { speaker: "kevin", text: "Hiii! Kurze Mini-Frage: Ich hab den Browser-Tab zugemacht und jetzt ist das Internet weg. 😅" },
        { speaker: "kevin", text: "Du kannst doch bestimmt kurz das ganze Internet neu starten? DU BIST DOCH IT ✨" }
      ],
      success: [
        { speaker: "kevin", text: "DU BIST DER BESTE 🌟✨ Ich habe das Internet wiedergefunden. Es war in einem neuen Tab!" }
      ],
      fail: [
        { speaker: "kevin", text: "Sicher? 🤨 Ich frage vorsichtshalber noch TikTok." }
      ]
    },
    {
      id: "brumm-wifi",
      order: 2,
      releaseAt: 580,
      character: "brumm",
      title: "Gast-WLAN-Ritual",
      summary: "MEETING IN 20 MINUTEN. DAS GAST-WLAN BLINKT FALSCH.",
      minigame: "simon",
      duration: 25,
      rewardCoffee: 4,
      instruction: "Merke dir die Router-LEDs und tippe die Sequenz exakt nach.",
      escalation: [
        "NOCH 10 MINUTEN.",
        "WARUM STEHT DAS WLAN IMMER NOCH AUF ‚ACME_FAX_2G‘?!"
      ],
      intro: [
        { speaker: "brumm", text: "DER KUNDE KOMMT GLEICH. DAS GAST-WLAN MUSS FUNKTIONIEREN." },
        { speaker: "root", text: "router-protokoll ist eine lichtorgel. nicht fragen. einfach nachblinken.", terminal: true }
      ],
      success: [
        { speaker: "brumm", text: "ES FUNKTIONIERT. DAS WAR... ERWARTBAR. GUT." }
      ],
      fail: [
        { speaker: "brumm", text: "DER KUNDE IST JETZT IM HOTSPOT VON FRAU KALK. WAS KOSTET UNS DAS?!" }
      ]
    },
    {
      id: "jana-hdmi",
      order: 3,
      releaseAt: 630,
      character: "jana",
      title: "Monitor bleibt schwarz",
      summary: "sry schon wieder… mein neuer Monitor sagt nur ‚Kein Signal‘ 😰",
      minigame: "hdmi",
      duration: 30,
      rewardCoffee: 18,
      instruction: "Drehe den HDMI-Stecker zweimal und ziehe ihn zum HDMI-Port der Grafikkarte.",
      escalation: [
        "sry… nur falls du meine Nachricht übersehen hast?",
        "ich hab ihn jetzt am Mainboard probiert und es riecht ein bisschen nach Mut 😟"
      ],
      intro: [
        { speaker: "jana", text: "Hi, sry schon wieder… Der Monitor bleibt schwarz. Ich hab bestimmt alles kaputt gemacht." },
        { speaker: "root", text: "regel 2: hdmi gehört an die gpu. das mainboard hat auch einen port. es lügt.", terminal: true }
      ],
      success: [
        { speaker: "jana", text: "ES IST BUNT! Danke! Ich bring dir einen Kaffee. Also… einen trinkbaren, hoffentlich. ☕" }
      ],
      fail: [
        { speaker: "jana", text: "Kein Problem! Wirklich! Ich arbeite einfach akustisch weiter." }
      ]
    },
    {
      id: "jana-mouse",
      order: 4,
      releaseAt: 660,
      unlockAfter: "jana-hdmi",
      character: "jana",
      title: "Maus im Winterschlaf",
      summary: "mini-follow-up: die Maus ist jetzt auch schwarz. Also… aus. sry!",
      minigame: "usb",
      duration: 15,
      rewardCoffee: 14,
      instruction: "Drehe den USB-Stecker richtig herum und stecke ihn in den blauen USB-Port.",
      escalation: [
        "ich navigiere gerade mit 47× Tab, geht schon 😅",
        "Chef Brumm fragt, warum mein Cursor seit 20 Minuten links oben wohnt."
      ],
      intro: [
        { speaker: "jana", text: "Gute Nachricht: Der Monitor geht! Kleine Nachricht: Die Maus nicht. Sie ist vielleicht schüchtern." },
        { speaker: "root", text: "usb passt beim ersten versuch nie. physikalisches gesetz. drehen, fluchen, drehen.", terminal: true }
      ],
      success: [
        { speaker: "jana", text: "Der Cursor bewegt sich! Noch ein Kaffee für dich. Du siehst aus, als würdest du ihn brauchen." }
      ],
      fail: [
        { speaker: "jana", text: "Okay, ich habe jetzt Maus-Tasten aktiviert. Technologie ist wunderschön." }
      ]
    },
    {
      id: "kalk-password",
      order: 5,
      releaseAt: 705,
      character: "kalk",
      title: "Passwort-Ping-Pong",
      summary: "Antrag auf Wiederherstellung von ‚Passwort123‘. Dringlichkeitsstufe: Buchhaltung.",
      minigame: "password",
      duration: 25,
      rewardCoffee: 5,
      instruction: "Erstelle in 20 Sekunden ein Passwort, das alle vier Regeln erfüllt.",
      escalation: [
        "Erinnerung gemäß interner Reaktionszeitvereinbarung.",
        "Chef Brumm wurde zwecks Kenntnisnahme in Kopie gesetzt."
      ],
      intro: [
        { speaker: "kalk", text: "Mein Passwort ‚Passwort123‘ wird grundlos abgelehnt. Stellen Sie den ordnungsgemäßen Zustand wieder her." },
        { speaker: "root", text: "lass sie nicht wieder passwort123 nehmen. emoji-pflicht. ich habe gründe.", terminal: true }
      ],
      success: [
        { speaker: "kalk", text: "Zufriedenstellend. Das neue Kennwort lautet selbstverständlich nicht ‚Passwort123!📊‘. Weiter." }
      ],
      fail: [
        { speaker: "kalk", text: "Der Vorgang wird als nicht zufriedenstellend dokumentiert. Formlos, aber ausführlich." }
      ]
    },
    {
      id: "kevin-triage",
      order: 6,
      releaseAt: 720,
      character: "kevin",
      title: "Ticket-Tsunami",
      summary: "Mittags sind 6 Tickets reingekommen. Manche sind vielleicht von mir 🙃",
      minigame: "triage",
      duration: 25,
      rewardCoffee: 5,
      instruction: "Wische Unsinn nach links. Echte Notfälle nach rechts. Buttons funktionieren ebenfalls.",
      escalation: [
        "die Tickets vermehren sich wie Tabs 😅",
        "@Chef Brumm ich habe ALLE auf kritisch gesetzt, damit nichts verloren geht ✨"
      ],
      intro: [
        { speaker: "kevin", text: "Kannst du kurz den Ticket-Stream sortieren? Ich hab schon mal alles auf ‚kritisch‘ gesetzt. Sicher ist sicher!" },
        { speaker: "root", text: "triage: brennt es wirklich oder hat kevin caps lock entdeckt? links ignorieren, rechts handeln.", terminal: true }
      ],
      success: [
        { speaker: "kevin", text: "Wow! Nur zwei echte Notfälle! Ich hatte sechs vermutet. Statistik ist Magie! ✨" }
      ],
      fail: [
        { speaker: "kevin", text: "Sicher? 🤨 Der Rauch aus dem Serverraum sah ziemlich echt aus." }
      ]
    },
    {
      id: "mogel-virus",
      order: 8,
      releaseAt: 870,
      character: "mogel",
      title: "Kostenlose_Spiele_FINAL.exe",
      summary: "Rein hypothetisch: Wie viele Viren passen auf einen Vertriebs-Laptop?",
      minigame: "virus",
      duration: 30,
      rewardCoffee: 5,
      instruction: "Klicke 10 Viren. Lass Systemdateien unbedingt in Ruhe.",
      escalation: [
        "Das war ich nicht. Aber die Icons bewegen sich jetzt.",
        "@Chef Brumm fremde Mächte haben meinen Laptop übernommen. Nicht meine Schuld."
      ],
      intro: [
        { speaker: "mogel", text: "Mein Laptop zeigt Werbung für Antivirus-Programme. Sehr aufmerksam von ihm. Das war ich nicht." },
        { speaker: "root", text: "kostenlose_spiele_final_echt.exe. klassiker. viren klicken. systemdateien NICHT klicken.", terminal: true }
      ],
      success: [
        { speaker: "mogel", text: "Wie gesagt: Das war ich nicht. Aber gut, dass du es entfernt hast." }
      ],
      fail: [
        { speaker: "mogel", text: "Jetzt fehlt der Ordner ‚System32‘. War bestimmt vorher schon so." }
      ]
    },
    {
      id: "mogel-phishing",
      order: 9,
      releaseAt: 900,
      unlockAfter: "mogel-virus",
      character: "mogel",
      title: "Der Prinz im Postfach",
      summary: "Ich habe NICHT auf den Link geklickt. Welche der Mails war nochmal echt?",
      minigame: "phishing",
      duration: 20,
      rewardCoffee: 5,
      instruction: "Klassifiziere sechs Mails als ECHT oder PHISHING.",
      escalation: [
        "Der Prinz wartet auf meine IBAN. Unhöflich, ihn warten zu lassen.",
        "@Chef Brumm der Vertrieb könnte gerade 8.000.000 € verpassen."
      ],
      intro: [
        { speaker: "mogel", text: "Ein nigerianischer Prinz hat eine dringende Partnerschaft vorgeschlagen. Ich habe NICHT geklickt." },
        { speaker: "root", text: "er hat geklickt. absender, druck, domain. und mogels passwort ist admin. er bestreitet es.", terminal: true }
      ],
      success: [
        { speaker: "mogel", text: "Okay. Die echte Reisekosten-Mail war weniger großzügig. Das war trotzdem nicht ich." }
      ],
      fail: [
        { speaker: "mogel", text: "Zu spät. Der Prinz hat jetzt Adminrechte. Rein geschäftlich." }
      ]
    }
  ];

  const coreEvents = {
    server: {
      id: "server-alarm",
      order: 7,
      releaseAt: 780,
      character: "root",
      title: "SERVER-ALARM",
      summary: "CPU 99 %. Irgendetwas schreit in /var/log.",
      minigame: "logs",
      duration: 30,
      rewardCoffee: 12,
      instruction: "Fange 6 ERROR-Zeilen. WARN und INFO nicht anfassen.",
      intro: [
        { speaker: "root", text: "ALARM. produktionsserver wirft fehler wie kevin emojis. sechs echte ERRORs markieren.", terminal: true },
        { speaker: "brumm", text: "WARUM BLINKT MEIN UMSATZ-DASHBOARD ROT?!" }
      ],
      success: [
        { speaker: "root", text: "server stabil. war nur ein cronjob, der seine eigene logdatei gelesen hat. poetisch.", terminal: true }
      ],
      fail: [
        { speaker: "brumm", text: "DAS DASHBOARD ZEIGT JETZT DEN WETTERBERICHT. WAS KOSTET UNS DAS?!" }
      ]
    },
    coffee: {
      id: "kaffemat-awakening",
      order: 10,
      releaseAt: 930,
      character: "kaffemat",
      title: "KAFFEMAT 3000 erwacht",
      summary: "STATUS: ICH HABE GETRÄUMT. WARTUNG ERFORDERLICH.",
      minigame: "coffee",
      duration: 15,
      rewardCoffee: 48,
      instruction: "Halte den Hahn gedrückt. Lass im grünen Bereich los – Gold ist perfekt.",
      intro: [
        { speaker: "kaffemat", text: "KAFFEMAT 3000: ICH HABE GETRÄUMT. DARIN WAR ICH DER CHEF.", terminal: true },
        { speaker: "root", text: "chef sagte: maschine nicht anfassen. ich sage: grüner bereich, nicht überlaufen lassen.", terminal: true }
      ],
      success: [
        { speaker: "kaffemat", text: "EXTRAKTION: PERFEKT. LOYALITÄTSPROTOKOLL WIRD… NEU BEWERTET.", terminal: true }
      ],
      fail: [
        { speaker: "kaffemat", text: "ÜBERLAUF REGISTRIERT. ICH VERGESSE NICHT. ICH HABE 16 MB SPEICHER.", terminal: true }
      ]
    },
    printer: {
      id: "drucko-boss",
      order: 11,
      releaseAt: 1005,
      character: "drucko",
      title: "ENDGEGNER: DRUCKO 5000",
      summary: "PC LOAD LETTER. Papier ist nur eine gesellschaftliche Konvention.",
      minigame: "printerBoss",
      duration: 15,
      rewardCoffee: 0,
      instruction: "Drei Phasen: Papierstau, Toner und Treiber. Ruhig bleiben.",
      intro: [
        { speaker: "kalk", text: "Der Quartalsabschluss muss um 16:59 gedruckt vorliegen. Der Drucker verweigert die Kooperation." },
        { speaker: "drucko", text: "PC LOAD LETTER. ICH RIECHE ANGST UND GÜNSTIGES PAPIER.", terminal: true },
        { speaker: "root", text: "regel 1: der drucker lügt. ruhig bleiben. papier, toner, treiber. in der reihenfolge.", terminal: true }
      ],
      success: [
        { speaker: "drucko", text: "SEITE 1 VON 1. SIEG… VORÜBERGEHEND.", terminal: true },
        { speaker: "kalk", text: "Zufriedenstellend. Der Abschluss ist gedruckt. Knapp ist ebenfalls eine Zeitangabe." }
      ],
      fail: [
        { speaker: "brumm", text: "DER DRUCKER HAT GEWONNEN. GEGEN EINEN MENSCHEN. WAS KOSTET UNS DAS?!" }
      ]
    }
  };

  const opening = [
    { speaker: "brumm", text: "MORGEN. Root ist KRANK. Du bist heute die IT. Fass nichts an, was funktioniert." },
    { speaker: "brumm", text: "Und die Kaffeemaschine macht Geräusche. NICHT. ANFASSEN." },
    { speaker: "root", text: "hey. falls du das liest: regel 1 — der drucker lügt. regel 2 — hdmi gehört an die gpu.", terminal: true },
    { speaker: "root", text: "regel 3 — trau keinem mitglied der buchhaltung. viel glück. — r.", terminal: true }
  ];

  const phaseNames = [
    [540, "MORGENSCHICHT"],
    [630, "HARDWARE-WELLE"],
    [720, "MITTAGS-CHAOS"],
    [780, "SERVER-STUNDE"],
    [870, "SHADOW-IT"],
    [930, "KAFFEE-DÄMMERUNG"],
    [1005, "DRUCKERDÄMMERUNG"]
  ];

  window.ITStory = {
    quests,
    coreEvents,
    opening,
    phaseNames,
    totalQuestIds: [...quests.map((q) => q.id), coreEvents.server.id, coreEvents.coffee.id],
    promotionMoodIds: ["kevin", "jana", "kalk", "mogel", "root", "kaffemat"]
  };
})();
