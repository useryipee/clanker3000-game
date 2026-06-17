// =========================
// CLANKER 3000 — RELEASE BUILD
// =========================

let trainingText = "";
let markov = {};       // bigram keys: "word1 word2" -> [next words]
let markovMono = {};   // monogram keys: "word" -> [next words] (fallback)
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
        "<", ">", "data:image", "base64", "src=", "alt=",
        "{", "}", ";", "#", ":", "margin", "padding",
        "font", "color", "display"
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

    const div = document.createElement("div");
    div.className = "user-message";
    div.innerHTML = `<span class="name">You:</span> ${text}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function addClankerMessage(text) {
    const chat = document.getElementById("chat-log");
    if (!chat) return;

    if (!text || isCorrupt(text)) {
        text = "clanker encountered corrupted input...";
    }

    const div = document.createElement("div");
    div.className = "clanker-message";
    div.innerHTML = `<span class="name">Clanker:</span> ${text}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

// =========================
// MARKOV ENGINE (ORDER 2)
// =========================

function buildMarkov(text) {
    markov = {};
    markovMono = {};

    const words = text
        .toLowerCase()
        .split(/\s+/)
        .map(w => w.replace(/[^a-z0-9']/g, "").trim())
        .filter(w => w.length > 0 && !isCorrupt(w));

    // Order-2 bigram chain
    for (let i = 0; i < words.length - 2; i++) {
        const key = words[i] + " " + words[i + 1];
        const next = words[i + 2];
        if (!markov[key]) markov[key] = [];
        markov[key].push(next);
    }

    // Order-1 fallback chain
    for (let i = 0; i < words.length - 1; i++) {
        const key = words[i];
        const next = words[i + 1];
        if (!markovMono[key]) markovMono[key] = [];
        markovMono[key].push(next);
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

// Pick a starting bigram that contains the seed word (if possible)
function findSeedKey(seedWord) {
    if (!seedWord) return null;
    const lower = seedWord.toLowerCase().replace(/[^a-z0-9']/g, "");
    if (!lower) return null;

    // Find all bigram keys that start with or contain the seed word
    const matches = Object.keys(markov).filter(k => {
        const parts = k.split(" ");
        return parts[0] === lower || parts[1] === lower;
    });

    if (matches.length === 0) {
        // Fall back to monogram
        return markovMono[lower] ? lower : null;
    }

    return matches[Math.floor(Math.random() * matches.length)];
}

function generateMarkovSentence(seedWord = null, min = 5, max = 15) {
    const keys = Object.keys(markov);
    if (keys.length === 0) return "clanker is booting...";

    const len = Math.floor(Math.random() * (max - min + 1)) + min;

    // Try to start from seed word
    let startKey = null;
    if (seedWord) {
        startKey = findSeedKey(seedWord);
    }

    // Fall back to random bigram key
    if (!startKey || !markov[startKey]) {
        startKey = keys[Math.floor(Math.random() * keys.length)];
    }

    // Build output from bigram chain
    let parts = startKey.split(" ");
    const out = [...parts];
    let current = startKey;

    for (let i = 0; i < len; i++) {
        const nextOptions = markov[current];
        if (!nextOptions || !nextOptions.length) break;

        const nextWord = nextOptions[Math.floor(Math.random() * nextOptions.length)];
        out.push(nextWord);

        // Advance the bigram key
        const keyParts = current.split(" ");
        current = keyParts[1] + " " + nextWord;

        // If new key doesn't exist, stop
        if (!markov[current]) break;
    }

    let sentence = out.join(" ").trim();
    if (sentence.length < 2) return "clanker is thinking...";

    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// =========================
// WIN DETECTION (FUZZY)
// =========================

// Returns 0.0 - 1.0 similarity between two strings (word overlap)
function sentenceSimilarity(a, b) {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    let overlap = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) overlap++;
    }

    return overlap / Math.max(wordsA.size, wordsB.size);
}

function getWinThreshold() {
    const difficulty = document.getElementById("difficulty")?.value || "normal";
    return {
        easy:      0.6,
        normal:    0.8,
        hard:      0.95,
        nightmare: 1.0   // exact match only
    }[difficulty] ?? 0.8;
}

// =========================
// TARGET SYSTEM
// =========================

const subjects = [
    "the refrigerator", "the mailbox", "a wizard", "a penguin",
    "the potato", "the banana", "a robot", "the toaster",
    "the umbrella", "a pigeon", "the calculator", "a sock"
];

const verbs = [
    "joined", "challenged", "stole", "invented",
    "destroyed", "found", "ordered", "befriended",
    "launched", "defeated", "borrowed", "assembled"
];

const objects = [
    "a jazz band", "the moon", "gravity", "a toaster",
    "pineapple socks", "an alien", "a spaceship", "a sandwich",
    "the entire ocean", "a bucket of fog", "an invisible hat", "three paperclips"
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateTarget() {
    targetSentence = `${pick(subjects)} ${pick(verbs)} ${pick(objects)}`;

    const el = document.getElementById("targetSentence");
    if (el) el.textContent = targetSentence;

    // Also feed target words into the chain so they're reachable
    learnText(targetSentence);
}

// =========================
// WIN SYSTEM
// =========================

function winGame(response) {
    saveData.wins++;
    saveData.streak++;

    if (saveData.streak > saveData.bestStreak) {
        saveData.bestStreak = saveData.streak;
    }

    saveGame();
    updateStats();

    const el = document.getElementById("winMessages");
    if (el) el.textContent = saveData.messages;

    const gotEl = document.getElementById("winGotSentence");
    if (gotEl) gotEl.textContent = `"${response}"`;

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

    // Extract seed word: last word the user typed that exists in chain
    const userWords = text.toLowerCase().split(/\s+/);
    const knownSeed = userWords.reverse().find(w => markovMono[w]) || userWords[0];

    const lengths = {
        easy:      [3, 8],
        normal:    [5, 12],
        hard:      [8, 16],
        nightmare: [12, 25]
    };
    const [minLen, maxLen] = lengths[difficulty] ?? [5, 12];

    let response = generateMarkovSentence(knownSeed, minLen, maxLen);

    setTimeout(() => {
        addClankerMessage(response);

        const similarity = sentenceSimilarity(response, targetSentence);
        const threshold = getWinThreshold();

        if (similarity >= threshold) {
            winGame(response);
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

document.getElementById("newGameBtn")?.addEventListener("click", () => {
    saveData.streak = 0;
    saveGame();
    updateStats();
    generateTarget();
    const chat = document.getElementById("chat-log");
    if (chat) chat.innerHTML = "";
    addClankerMessage("New target loaded. Awaiting input.");
});

document.getElementById("resetBtn")?.addEventListener("click", () => {
    if (confirm("Reset all progress?")) {
        localStorage.removeItem("clankerSave");
        location.reload();
    }
});

// =========================
// TRAINING CORPUS
// =========================

// Fallback corpus — enough variety for the bigram chain to work
// Replace training.txt with any plain text (novels, scripts, song lyrics)
// for a more interesting/personality-driven clanker
const FALLBACK_CORPUS = `
the refrigerator joined a jazz band after midnight
the mailbox challenged gravity and lost the argument
a wizard ordered pineapple socks from an alien merchant
the moon stole a sandwich from the toaster's best friend
the toaster invented a spaceship made of spare parts
a penguin found the entire ocean inside a bucket of fog
the banana destroyed gravity with three paperclips and a sock
the calculator befriended a pigeon near the invisible hat
a robot assembled the moon from pineapple socks and fog
the umbrella launched a jazz band into outer space tonight
the potato defeated an alien who borrowed a spaceship yesterday
a sock challenged the refrigerator and found an invisible hat
the wizard joined the penguin who invented a jazz band
the mailbox stole three paperclips from a very confused robot
a pigeon ordered the entire ocean delivered by the calculator
the toaster befriended a penguin who challenged the moon
a banana launched gravity into a spaceship full of socks
the robot found pineapple socks near the invisible jazz band
`.trim();

// =========================
// TRAINING LOAD
// =========================

async function loadTraining() {
    try {
        const res = await fetch("training.txt");
        if (!res.ok) throw new Error("no training.txt");
        const raw = await res.text();
        trainingText = cleanText(raw);
        buildMarkov(trainingText);
    } catch (e) {
        trainingText = FALLBACK_CORPUS;
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
