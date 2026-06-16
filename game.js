// =========================
// CLANKER 3000 CORE (FIXED)
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
// LOAD / SAVE
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
    document.getElementById("wins").textContent = saveData.wins;
    document.getElementById("messages").textContent = saveData.messages;
    document.getElementById("streak").textContent = saveData.streak;
    document.getElementById("bestStreak").textContent = saveData.bestStreak;
    document.getElementById("learnedMessages").textContent = saveData.learnedMessages;
    document.getElementById("knownWords").textContent = Object.keys(markov).length;
}

// =========================
// CHAT
// =========================

function addUserMessage(text) {
    const chat = document.getElementById("chat-log");
    chat.innerHTML += `
        <div class="user-message">
            <span class="name">You:</span>
            ${text}
        </div>
    `;
    chat.scrollTop = chat.scrollHeight;
}

function addClankerMessage(text) {
    if (!text || text.trim().length === 0) {
        text = "clanker is silent...";
    }

    const chat = document.getElementById("chat-log");
    chat.innerHTML += `
        <div class="clanker-message">
            <span class="name">Clanker:</span>
            ${text}
        </div>
    `;
    chat.scrollTop = chat.scrollHeight;
}

// =========================
// CODE FILTER
// =========================

function looksLikeCode(text) {
    return (
        text.includes("{") ||
        text.includes("}") ||
        text.includes(";") ||
        text.includes("#") ||
        text.includes(":") ||
        text.includes("margin") ||
        text.includes("font") ||
        text.includes("padding") ||
        text.includes("color") ||
        text.includes("display")
    );
}

// =========================
// MARKOV
// =========================

function buildMarkov(text) {
    markov = {};

    const words = text
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 1);

    for (let i = 0; i < words.length - 1; i++) {
        const current = words[i];
        const next = words[i + 1];

        if (!markov[current]) {
            markov[current] = [];
        }

        markov[current].push(next);
    }

    updateStats();
}

function learnText(text) {
    if (looksLikeCode(text)) return;

    const clean = text
        .replace(/[{}#;:=]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (clean.length < 2) return;

    trainingText += "\n" + clean;

    buildMarkov(trainingText);

    saveData.learnedMessages++;
    updateStats();
    saveGame();
}

// =========================
// GENERATE SENTENCE
// =========================

function generateMarkovSentence(minLength = 5, maxLength = 15) {
    const words = Object.keys(markov);

    if (words.length === 0) {
        return "clanker is still booting...";
    }

    const length =
        Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;

    let current = words[Math.floor(Math.random() * words.length)];
    const result = [current];

    for (let i = 0; i < length; i++) {
        if (!markov[current]) break;

        const nextWords = markov[current];
        current = nextWords[Math.floor(Math.random() * nextWords.length)];

        result.push(current);
    }

    let sentence = result.join(" ").trim();

    if (sentence.length < 2) {
        return "clanker is thinking...";
    }

    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// =========================
// TARGETS
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

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateTarget() {
    targetSentence =
        random(subjects) +
        " " +
        random(verbs) +
        " " +
        random(objects);

    document.getElementById("targetSentence").textContent = targetSentence;
}

// =========================
// WIN
// =========================

function winGame() {
    saveData.wins++;
    saveData.streak++;

    if (saveData.streak > saveData.bestStreak) {
        saveData.bestStreak = saveData.streak;
    }

    saveGame();
    updateStats();

    document.getElementById("winMessages").textContent = saveData.messages;
    document.getElementById("winModal").classList.remove("hidden");
}

// =========================
// SEND MESSAGE
// =========================

function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();

    if (!text) return;

    addUserMessage(text);
    learnText(text);

    saveData.messages++;
    updateStats();

    const difficulty = document.getElementById("difficulty").value;

    let response;

    if (difficulty === "easy") {
        response = generateMarkovSentence(3, 8);
    } else if (difficulty === "hard") {
        response = generateMarkovSentence(8, 16);
    } else if (difficulty === "nightmare") {
        response = generateMarkovSentence(12, 25);
    } else {
        response = generateMarkovSentence(5, 12);
    }

    setTimeout(() => {
        addClankerMessage(response);

        if (
            response.toLowerCase().trim() ===
            targetSentence.toLowerCase().trim()
        ) {
            winGame();
        }
    }, 500);

    input.value = "";
    saveGame();
}

// =========================
// BUTTONS
// =========================

document.getElementById("sendButton").addEventListener("click", sendMessage);

document.getElementById("messageInput").addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
});

document.getElementById("nextGameBtn").addEventListener("click", () => {
    document.getElementById("winModal").classList.add("hidden");
    generateTarget();
});

document.getElementById("saveBtn").addEventListener("click", saveGame);
document.getElementById("newGameBtn").addEventListener("click", generateTarget);

document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Reset progress?")) {
        localStorage.removeItem("clankerSave");
        location.reload();
    }
});

// =========================
// LOAD TRAINING
// =========================

async function loadTraining() {
    try {
        const response = await fetch("training.txt");
        trainingText = await response.text();

        trainingText = trainingText
            .replace(/[{}#;:=]/g, "")
            .replace(/\s+/g, " ")
            .trim();

        buildMarkov(trainingText);

    } catch (err) {
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
    addClankerMessage("Awaiting human input.");
}

startGame();
