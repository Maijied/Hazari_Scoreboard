// State
const STATE = {
    games: [],
    currentGameId: null,
};

// UI References
const views = {
    setup: document.getElementById('view-setup'),
    scoreboard: document.getElementById('view-scoreboard')
};

const dom = {
    wrapper: document.getElementById('wrapper'),
    menuToggle: document.getElementById('menu-toggle'),
    sidebar: document.getElementById('sidebar-wrapper'),
    matchList: document.getElementById('match-list'),
    
    scoreHeader: document.getElementById('score-header'),
    scoreBody: document.getElementById('score-body'),
    scoreFooter: document.getElementById('score-footer'),
    
    currentSum: document.getElementById('current-sum'),
    currentSumDisplay: document.getElementById('current-sum-display'),
    
    winnerOverlay: document.getElementById('winner-overlay'),
    winnerName: document.getElementById('winner-name'),
    btnCloseWinner: document.getElementById('btn-close-winner')
};

const forms = {
    setup: document.getElementById('setup-form'),
    round: document.getElementById('round-form')
};

// --- Initialization ---

function init() {
    loadFromStorage();
    renderMatchList();
    
    // Sidebar Toggle Logic
    dom.menuToggle.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('sb-sidenav-toggled');
    });

    // Buttons
    document.getElementById('btn-new-match').addEventListener('click', showSetup);
    document.getElementById('btn-clear-history').addEventListener('click', clearHistory);
    document.getElementById('btn-reset-match').addEventListener('click', resetCurrentMatch);
    dom.btnCloseWinner.addEventListener('click', closeWinnerModal);

    // Load Game or Show Setup
    if (STATE.games.length > 0 && STATE.currentGameId) {
        loadGame(STATE.currentGameId);
    } else {
        showSetup();
    }
}

// --- Logic ---

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
        players: players,
        rounds: [],
        isActive: true
    };
    STATE.games.unshift(newGame);
    STATE.currentGameId = newGame.id;
    saveToStorage();
    renderMatchList();
    loadGame(newGame.id);
    
    // Close sidebar on mobile after creation
    if (window.innerWidth < 768) {
        document.body.classList.remove('sb-sidenav-toggled');
    }
}

function addRound(scores) {
    const game = getGame(STATE.currentGameId);
    if (!game) return;
    
    game.rounds.push(scores);
    saveToStorage();
    renderScoreboard(game);
    checkWinner(game);
}

function resetCurrentMatch() {
    if (!confirm("Are you sure you want to reset the scores for this match? Players will remain.")) return; 
    
    const game = getGame(STATE.currentGameId);
    if (game) {
        game.rounds = []; // Clear rounds
        saveToStorage();
        renderScoreboard(game);
    }
}

function getGame(id) {
    return STATE.games.find(g => g.id === id);
}

// --- UI Rendering ---

function switchView(name) {
    // Hide all
    Object.values(views).forEach(el => el.classList.add('d-none'));
    Object.values(views).forEach(el => el.classList.remove('d-flex'));
    
    // Show target
    if (name === 'setup') {
        views.setup.classList.remove('d-none');
    } else {
        views.scoreboard.classList.remove('d-none');
        // Add flex for layout
        views.scoreboard.classList.add('d-flex'); 
    }
}

function showSetup() {
    STATE.currentGameId = null;
    switchView('setup');
    // Clear inputs
    ['p1-name', 'p2-name', 'p3-name', 'p4-name'].forEach(id => document.getElementById(id).value = '');
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
        document.body.classList.remove('sb-sidenav-toggled');
    }
}

function loadGame(id) {
    const game = getGame(id);
    if (!game) return showSetup();

    STATE.currentGameId = id;
    saveToStorage();
    renderScoreboard(game);
    switchView('scoreboard');
    renderMatchList();
    
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
        document.body.classList.remove('sb-sidenav-toggled');
    }
}

function renderScoreboard(game) {
    // Header
    dom.scoreHeader.innerHTML = game.players.map(p => `<div>${p}</div>`).join('') + '<div style="flex: 0 0 40px;"></div>';
    
    // Body
    dom.scoreBody.innerHTML = game.rounds.map((round, idx) => {
        return `<div class="score-row">
            ${round.map(s => `<div>${s}</div>`).join('')}
            <div style="flex: 0 0 40px;" class="text-danger cursor-pointer" onclick="deleteRound(${idx})">
                <i class="fa-solid fa-times"></i>
            </div>
        </div>`;
    }).join('');
    
    // Scroll to bottom
    dom.scoreBody.scrollTop = dom.scoreBody.scrollHeight;

    // Footer (Totals)
    const totals = [0, 0, 0, 0];
    game.rounds.forEach(r => r.forEach((s, i) => totals[i] += s));
    
    dom.scoreFooter.innerHTML = totals.map(t => {
        const isWinner = t >= 1000;
        return `<div class="${isWinner ? 'winner-highlight' : ''}">${t}</div>`;
    }).join('') + '<div style="flex: 0 0 40px;"></div>';
}

function deleteRound(index) {
    if (!confirm("Delete this round?")) return;
    const game = getGame(STATE.currentGameId);
    if (game) {
        game.rounds.splice(index, 1);
        saveToStorage();
        renderScoreboard(game);
    }
}

function renderMatchList() {
    dom.matchList.innerHTML = STATE.games.map(g => {
        const active = g.id === STATE.currentGameId ? 'active' : '';
        const date = new Date(g.id).toLocaleDateString();
        return `
            <div class="list-group-item bg-transparent border-0 text-dark p-2 match-item ${active}" onclick="loadGame(${g.id})">
                <div class="fw-bold text-truncate">${g.players.join(', ')}</div>
                <small class="text-muted" style="font-size: 0.75rem;">${date} • ${g.rounds.length} Rounds</small>
            </div>
        `;
    }).join('');
}

function checkWinner(game) {
    const totals = [0, 0, 0, 0];
    game.rounds.forEach(r => r.forEach((s, i) => totals[i] += s));
    
    // Find winners >= 1000
    // If multiple, highest wins.
    let maxScore = -1;
    let winnerIndex = -1;

    totals.forEach((score, idx) => {
        if (score >= 1000 && score > maxScore) {
            maxScore = score;
            winnerIndex = idx;
        }
    });

    if (winnerIndex !== -1) {
        showWinner(game.players[winnerIndex]);
    }
}

function showWinner(name) {
    dom.winnerName.textContent = name;
    dom.winnerOverlay.classList.add('active');
    launchConfetti();
}

function closeWinnerModal() {
    dom.winnerOverlay.classList.remove('active');
}

function clearHistory() {
    if (confirm('Delete all history?')) {
        STATE.games = [];
        STATE.currentGameId = null;
        saveToStorage();
        renderMatchList();
        showSetup();
    }
}

// --- Validation & Events ---

forms.setup.addEventListener('submit', (e) => {
    e.preventDefault();
    const players = [1,2,3,4].map(i => document.getElementById(`p${i}-name`).value.trim());
    if (players.some(p => !p)) return alert("Please fill all names");
    createGame(players);
});

forms.round.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputs = [1,2,3,4].map(i => document.getElementById(`s${i}`));
    const scores = inputs.map(el => parseInt(el.value) || 0);
    
    // NEW LOGIC: SUM MUST BE 360
    const sum = scores.reduce((a,b) => a+b, 0);
    if (sum !== 360) {
        alert(`Invalid Score! Total must be 360.\nCurrent Sum: ${sum}`);
        return;
    }

    addRound(scores);
    inputs.forEach(el => el.value = '');
    updateSumDisplay();
    inputs[0].focus();
});

// Sum Calculator
const scoreInputs = document.querySelectorAll('#round-form input');
scoreInputs.forEach(input => {
    input.addEventListener('input', updateSumDisplay);
});

function updateSumDisplay() {
    let sum = 0;
    scoreInputs.forEach(input => sum += (parseInt(input.value) || 0));
    dom.currentSum.textContent = sum;
    
    if (sum === 360) {
        dom.currentSumDisplay.className = 'sum-display text-success fw-bold';
    } else if (sum > 360) {
        dom.currentSumDisplay.className = 'sum-display text-danger fw-bold';
    } else {
        dom.currentSumDisplay.className = 'sum-display text-muted';
    }
}

// Confetti
function launchConfetti() {
    var duration = 3000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 3000 };

    function randomInOut(min, max) { return Math.random() * (max - min) + min; }

    var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        var particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInOut(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInOut(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
}

// Start
init();
