// =========================
// CLANKER 3000 — RELEASE BUILD
// =========================

let trainingText = "";
let markov = {};
let targetSentence = "";

let saveData = {
    wins: 0,
    messages: 0,
    streak: 0,
    bestStreak: 0,
    learnedMessages: 0
};

// =========================
// SAVE SYSTEM
// =========================

function loadSave() {
    const save = localStorage.getItem("clankerSave");
    if (save) saveData = JSON.parse(save);
    updateStats();
}

function saveGame() {
    localStorage.setItem("clankerSave", JSON.stringify(saveData));
}

// =========================
// STATS
// =========================

function updateStats() {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set("wins", saveData.wins);
    set("messages", saveData.messages);
    set("streak", saveData.streak);
    set("bestStreak", saveData.bestStreak);
    set("learnedMessages", saveData.learnedMessages);
    set("knownWords", Object.keys(markov).length);
}

// =========================
// SAFE TEXT FILTERING
// =========================

function isCorrupt(text) {
    if (!text || typeof text !== "string") return true;

    const badPatterns = [
        "<",
        ">",
        "data:image",
        "base64",
        "src=",
        "alt=",
        "{",
        "}",
        ";",
        "#",
        ":",
        "margin",
        "padding",
        "font",
        "color",
        "display"
    ];

    return badPatterns.some(p => text.includes(p));
}

function cleanText(text) {
    return text
        .replace(/<[^>]*>/g, "")
        .replace(/data:image[^ ]*/g, "")
        .replace(/[{}#;:=]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// =========================
// CHAT
// =========================

function addUserMessage(text) {
    const chat = document.getElementById("chat-log");
    if (!chat) return;

    chat.innerHTML += `
        <div class="user-message">
            <span class="name">You:</span>
            ${text}
        </div>
    `;

    chat.scrollTop = chat.scrollHeight;
}

function addClankerMessage(text) {
    const chat = document.getElementById("chat-log");
    if (!chat) return;

    if (!text || isCorrupt(text)) {
        text = "clanker encountered corrupted input...";
    }

    chat.innerHTML += `
        <div class="clanker-message">
            <span class="name">Clanker:</span>
            ${text}
        </div>
    `;

    chat.scrollTop = chat.scrollHeight;
}

// =========================
// MARKOV ENGINE
// =========================

function buildMarkov(text) {
    markov = {};

    const words = text
        .toLowerCase()
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 1 && !isCorrupt(w));

    for (let i = 0; i < words.length - 1; i++) {
        const cur = words[i];
        const next = words[i + 1];

        if (!markov[cur]) markov[cur] = [];
        markov[cur].push(next);
    }

    updateStats();
}

function learnText(text) {
    if (isCorrupt(text)) return;

    const clean = cleanText(text);
    if (clean.length < 2) return;

    trainingText += "\n" + clean;

    buildMarkov(trainingText);

    saveData.learnedMessages++;
    updateStats();
    saveGame();
}

function generateMarkovSentence(min = 5, max = 15) {
    const keys = Object.keys(markov);
    if (keys.length === 0) return "clanker is booting...";

    const len = Math.floor(Math.random() * (max - min + 1)) + min;

    let current = keys[Math.floor(Math.random() * keys.length)];
    const out = [current];

    for (let i = 0; i < len; i++) {
        const next = markov[current];
        if (!next || !next.length) break;

        current = next[Math.floor(Math.random() * next.length)];
        out.push(current);
    }

    let sentence = out.join(" ").trim();
    if (sentence.length < 2) return "clanker is thinking...";

    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// =========================
// TARGET SYSTEM
// =========================

const subjects = [
    "the refrigerator",
    "the mailbox",
    "a wizard",
    "a penguin",
    "the potato",
    "the banana",
    "a robot",
    "the toaster"
];

const verbs = [
    "joined",
    "challenged",
    "stole",
    "invented",
    "destroyed",
    "found",
    "ordered",
    "befriended"
];

const objects = [
    "a jazz band",
    "the moon",
    "gravity",
    "a toaster",
    "pineapple socks",
    "an alien",
    "a spaceship",
    "a sandwich"
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateTarget() {
    targetSentence = `${pick(subjects)} ${pick(verbs)} ${pick(objects)}`;

    const el = document.getElementById("targetSentence");
    if (el) el.textContent = targetSentence;
}

// =========================
// WIN SYSTEM
// =========================

function winGame() {
    saveData.wins++;
    saveData.streak++;

    if (saveData.streak > saveData.bestStreak) {
        saveData.bestStreak = saveData.streak;
    }

    saveGame();
    updateStats();

    const el = document.getElementById("winMessages");
    if (el) el.textContent = saveData.messages;

    const modal = document.getElementById("winModal");
    if (modal) modal.classList.remove("hidden");
}

// =========================
// INPUT SYSTEM
// =========================

function sendMessage() {
    const input = document.getElementById("messageInput");
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    addUserMessage(text);
    learnText(text);

    saveData.messages++;
    updateStats();

    const difficulty = document.getElementById("difficulty")?.value || "normal";

    let response = generateMarkovSentence(
        difficulty === "easy" ? 3 :
        difficulty === "hard" ? 8 :
        difficulty === "nightmare" ? 12 : 5,
        difficulty === "easy" ? 8 :
        difficulty === "hard" ? 16 :
        difficulty === "nightmare" ? 25 : 12
    );

    setTimeout(() => {
        addClankerMessage(response);

        if (
            response.toLowerCase().trim() ===
            targetSentence.toLowerCase().trim()
        ) {
            winGame();
        }
    }, 400);

    input.value = "";
    saveGame();
}

// =========================
// BUTTONS
// =========================

document.getElementById("sendButton")?.addEventListener("click", sendMessage);

document.getElementById("messageInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
});

document.getElementById("nextGameBtn")?.addEventListener("click", () => {
    document.getElementById("winModal")?.classList.add("hidden");
    generateTarget();
});

document.getElementById("saveBtn")?.addEventListener("click", saveGame);

document.getElementById("newGameBtn")?.addEventListener("click", generateTarget);

document.getElementById("resetBtn")?.addEventListener("click", () => {
    if (confirm("Reset all progress?")) {
        localStorage.removeItem("clankerSave");
        location.reload();
    }
});

// =========================
// TRAINING LOAD
// =========================

async function loadTraining() {
    try {
        const res = await fetch("training.txt");
        trainingText = await res.text();

        trainingText = cleanText(trainingText);

        buildMarkov(trainingText);
    } catch (e) {
        trainingText = `
the refrigerator joined a jazz band
the mailbox challenged gravity
a wizard ordered pineapple socks
the moon stole a sandwich
the toaster invented a spaceship
        `;

        buildMarkov(trainingText);
    }
}

// =========================
// START
// =========================

async function startGame() {
    loadSave();
    await loadTraining();
    generateTarget();

    addClankerMessage("Boot sequence complete.");
    addClankerMessage("Awaiting input.");
}

startGame();
