// State Management
const STATE = {
    games: [],
    currentGameId: null,
};

// DOM Elements
const views = {
    setup: document.getElementById('view-setup'),
    scoreboard: document.getElementById('view-scoreboard')
};

const forms = {
    setup: document.getElementById('setup-form'),
    round: document.getElementById('round-form')
};

const display = {
    header: document.getElementById('score-header'),
    body: document.getElementById('score-body'),
    footer: document.getElementById('score-footer'),
    matchList: document.getElementById('match-list'),
    currentSum: document.getElementById('current-sum')
};

const overlay = {
    el: document.getElementById('winner-overlay'),
    name: document.getElementById('winner-name'),
    closeBtn: document.getElementById('btn-close-winner')
};

// Sidebar Toggle
const sidebar = document.getElementById('sidebar');
document.getElementById('toggle-sidebar').addEventListener('click', () => sidebar.classList.add('open'));
document.getElementById('close-sidebar').addEventListener('click', () => sidebar.classList.remove('open'));
document.getElementById('btn-new-match').addEventListener('click', showSetup);
document.getElementById('btn-clear-history').addEventListener('click', clearHistory);

// Initialize
init();

function init() {
    loadFromStorage();
    renderMatchList();
    
    if (STATE.games.length > 0 && STATE.currentGameId) {
        loadGame(STATE.currentGameId);
    } else {
        showSetup();
    }
}

// --- Data Logic ---

function loadFromStorage() {
    const data = localStorage.getItem('hazari_games');
    const current = localStorage.getItem('hazari_current_id');
    if (data) STATE.games = JSON.parse(data);
    if (current) STATE.currentGameId = parseInt(current);
}

function saveToStorage() {
    localStorage.setItem('hazari_games', JSON.stringify(STATE.games));
    if (STATE.currentGameId) {
        localStorage.setItem('hazari_current_id', STATE.currentGameId.toString());
    }
}

function createGame(players) {
    const newGame = {
        id: Date.now(),
        players: players, // Array of 4 names
        rounds: [], // Array of [s1, s2, s3, s4]
        isActive: true,
        winner: null
    };
    STATE.games.unshift(newGame); // Add to top
    STATE.currentGameId = newGame.id;
    saveToStorage();
    loadGame(newGame.id);
    renderMatchList();
    
    // Close sidebar on mobile if open
    sidebar.classList.remove('open');
}

function addRoundToCurrent(scores) {
    const game = STATE.games.find(g => g.id === STATE.currentGameId);
    if (!game) return;

    game.rounds.push(scores);
    saveToStorage();
    renderScoreboard(game);
    checkWinner(game);
}

// --- UI Logic ---

function switchView(viewName) {
    Object.values(views).forEach(el => el.classList.remove('active'));
    views[viewName].classList.add('active');
}

function showSetup() {
    STATE.currentGameId = null;
    switchView('setup');
    // Clear inputs
    ['p1-name', 'p2-name', 'p3-name', 'p4-name'].forEach(id => document.getElementById(id).value = '');
}

function loadGame(id) {
    STATE.currentGameId = id;
    const game = STATE.games.find(g => g.id === id);
    if (!game) return showSetup();

    renderScoreboard(game);
    switchView('scoreboard');
    renderMatchList(); // To update active state
}

function renderScoreboard(game) {
    // 1. Header
    display.header.innerHTML = game.players.map(p => `<div>${p}</div>`).join('');

    // 2. Body
    display.body.innerHTML = game.rounds.map((round, index) => {
        return `<div class="score-row">
            ${round.map(score => `<div>${score}</div>`).join('')}
        </div>`;
    }).join('');
    
    // Scroll to bottom
    display.body.scrollTop = display.body.scrollHeight;

    // 3. Totals
    const totals = [0, 0, 0, 0];
    game.rounds.forEach(round => {
        round.forEach((score, i) => totals[i] += score);
    });

    display.footer.innerHTML = totals.map(t => {
        const isWinning = t >= 1000;
        return `<div class="${isWinning ? 'winner-score' : ''}">${t}</div>`;
    }).join('');
}

function renderMatchList() {
    display.matchList.innerHTML = STATE.games.map(game => {
        const date = new Date(game.id).toLocaleDateString();
        const activeClass = game.id === STATE.currentGameId ? 'active' : '';
        const names = game.players.join(', ');
        return `
            <div class="history-item ${activeClass}" onclick="loadGame(${game.id})">
                <div class="names">${names}</div>
                <div class="date">${date} • ${game.rounds.length} Rounds</div>
            </div>
        `;
    }).join('');
}

function checkWinner(game) {
    const totals = [0, 0, 0, 0];
    game.rounds.forEach(round => {
        round.forEach((score, i) => totals[i] += score);
    });

    // Find highest score >= 1000
    let maxScore = -1;
    let winnerIndex = -1;

    totals.forEach((score, index) => {
        if (score >= 1000) {
            if (score > maxScore) {
                maxScore = score;
                winnerIndex = index;
            }
        }
    });

    if (winnerIndex !== -1) {
        triggerWinner(game.players[winnerIndex]);
    }
}

function triggerWinner(name) {
    overlay.name.textContent = name;
    overlay.el.classList.add('active');
    launchConfetti();
}

function clearHistory() {
    if(confirm('Delete all game history? This cannot be undone.')) {
        STATE.games = [];
        STATE.currentGameId = null;
        saveToStorage();
        renderMatchList();
        showSetup();
    }
}

// --- Event Handlers ---

forms.setup.addEventListener('submit', (e) => {
    e.preventDefault();
    const players = [
        document.getElementById('p1-name').value,
        document.getElementById('p2-name').value,
        document.getElementById('p3-name').value,
        document.getElementById('p4-name').value,
    ];
    createGame(players);
});

forms.round.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputs = [
        document.getElementById('s1'),
        document.getElementById('s2'),
        document.getElementById('s3'),
        document.getElementById('s4')
    ];
    
    const scores = inputs.map(input => parseInt(input.value) || 0);
    const sum = scores.reduce((a, b) => a + b, 0);

    if (sum !== 1000) {
        alert(`Total score must equal 1000. Current sum: ${sum}`);
        return;
    }

    addRoundToCurrent(scores);
    
    // Clear inputs
    inputs.forEach(input => input.value = '');
    updateSumDisplay();
    // Focus first input
    inputs[0].focus();
});

// Sum Calculator Logic
const scoreInputs = document.querySelectorAll('.round-inputs input');
scoreInputs.forEach(input => {
    input.addEventListener('input', updateSumDisplay);
});

function updateSumDisplay() {
    let sum = 0;
    scoreInputs.forEach(input => {
        sum += parseInt(input.value) || 0;
    });
    
    display.currentSum.textContent = `Sum: ${sum}`;
    if (sum === 1000) {
        display.currentSum.className = 'sum-indicator valid';
    } else {
        display.currentSum.className = 'sum-indicator invalid';
    }
}

overlay.closeBtn.addEventListener('click', () => {
    overlay.el.classList.remove('active');
});

// --- Confetti Animation ---
function launchConfetti() {
    var duration = 3000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1001 };

    function randomInOut(min, max) {
        return Math.random() * (max - min) + min;
    }

    var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        var particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInOut(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInOut(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
}