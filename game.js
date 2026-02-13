// ===== TETRIS - Game Boy Color Edition =====

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;
const NEXT_BLOCK_SIZE = 16;

// Game Boy Color palette - authentic GBC Tetris colors
const PIECE_COLORS = {
    I: { main: '#00d9ff', light: '#7fffff', dark: '#0099b3', shadow: '#006680' },
    O: { main: '#ffdd00', light: '#ffee77', dark: '#b39900', shadow: '#806d00' },
    T: { main: '#cc66ff', light: '#e6b3ff', dark: '#9933cc', shadow: '#662299' },
    S: { main: '#66ff66', light: '#b3ffb3', dark: '#33cc33', shadow: '#228822' },
    Z: { main: '#ff6666', light: '#ffb3b3', dark: '#cc3333', shadow: '#992222' },
    J: { main: '#6666ff', light: '#b3b3ff', dark: '#3333cc', shadow: '#222299' },
    L: { main: '#ff9933', light: '#ffcc99', dark: '#cc6600', shadow: '#994d00' }
};

const COLORS = {
    empty: '#1a1a2e',
    grid: '#2a2a4e',
    ghost: 'rgba(255, 255, 255, 0.2)'
};

// Tetromino shapes
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

const SHAPE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Game state
let board = [];
let boardColors = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameRunning = false;
let gamePaused = false;
let dropInterval = 1000;
let lastDrop = 0;
let animationId = null;

// Leaderboard
const LEADERBOARD_KEY = 'tetris_leaderboard';
const MAX_LEADERBOARD_ENTRIES = 10;
const SAVE_GAME_KEY = 'tetris_save';

// DOM elements
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const leaderboardList = document.getElementById('leaderboardList');
const nameInput = document.getElementById('playerName');
const saveScoreBtn = document.getElementById('saveScoreBtn');
const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const startLeaderboardBtn = document.getElementById('startLeaderboardBtn');

// ===== LEADERBOARD SYSTEM =====

function getLeaderboard() {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
}

function saveLeaderboard(leaderboard) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

function addScore(name, score, level, lines) {
    const leaderboard = getLeaderboard();
    const entry = {
        name: name.substring(0, 10).toUpperCase(),
        score: score,
        level: level,
        lines: lines,
        date: new Date().toLocaleDateString('fr-FR')
    };
    
    leaderboard.push(entry);
    leaderboard.sort((a, b) => b.score - a.score);
    
    if (leaderboard.length > MAX_LEADERBOARD_ENTRIES) {
        leaderboard.pop();
    }
    
    saveLeaderboard(leaderboard);
    return leaderboard.findIndex(e => e === entry) + 1;
}

function isHighScore(score) {
    const leaderboard = getLeaderboard();
    if (leaderboard.length < MAX_LEADERBOARD_ENTRIES) return true;
    return score > leaderboard[leaderboard.length - 1].score;
}

function renderLeaderboard() {
    const leaderboard = getLeaderboard();
    const leaderboardListFull = document.getElementById('leaderboardListFull');
    
    if (leaderboard.length === 0) {
        const emptyHtml = '<div class="leaderboard-empty">Aucun score enregistré</div>';
        leaderboardList.innerHTML = emptyHtml;
        if (leaderboardListFull) leaderboardListFull.innerHTML = emptyHtml;
        return;
    }
    
    let html = '';
    leaderboard.forEach((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        html += `
            <div class="leaderboard-entry ${index < 3 ? 'top-three' : ''}">
                <span class="rank">${medal}</span>
                <span class="name">${entry.name}</span>
                <span class="entry-score">${entry.score.toString().padStart(6, '0')}</span>
            </div>
        `;
    });
    
    leaderboardList.innerHTML = html;
    if (leaderboardListFull) leaderboardListFull.innerHTML = html;
}

function showLeaderboard() {
    renderLeaderboard();
    leaderboardScreen.classList.remove('hidden');
}

function hideLeaderboard() {
    leaderboardScreen.classList.add('hidden');
}

function handleSaveScore() {
    const name = nameInput.value.trim() || 'AAA';
    addScore(name, score, level, lines);
    
    document.getElementById('scoreInputSection').classList.add('hidden');
    document.getElementById('scoreSavedMessage').classList.remove('hidden');
    renderLeaderboard();
}

// ===== SAVE/LOAD GAME =====

function saveGame() {
    if (!gameRunning || isClearing || !currentPiece) return;
    
    const saveData = {
        board: board,
        boardColors: boardColors,
        currentPiece: currentPiece,
        nextPiece: nextPiece,
        score: score,
        level: level,
        lines: lines,
        dropInterval: dropInterval,
        difficulty: selectedDifficulty,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(saveData));
        console.log('Game saved! Score:', score, 'Level:', level);
    } catch (e) {
        console.error('Failed to save game:', e);
    }
}

function loadGame() {
    const data = localStorage.getItem(SAVE_GAME_KEY);
    if (!data) return null;
    
    try {
        const saveData = JSON.parse(data);
        // Check if save is less than 24 hours old
        if (Date.now() - saveData.timestamp > 24 * 60 * 60 * 1000) {
            clearSavedGame();
            return null;
        }
        return saveData;
    } catch (e) {
        clearSavedGame();
        return null;
    }
}

function hasSavedGame() {
    return loadGame() !== null;
}

function clearSavedGame() {
    localStorage.removeItem(SAVE_GAME_KEY);
}

function resumeGame() {
    const saveData = loadGame();
    if (!saveData) {
        startGame();
        return;
    }
    
    // Cancel any existing game loop to prevent duplicates
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Restore game state
    board = saveData.board;
    boardColors = saveData.boardColors;
    currentPiece = saveData.currentPiece;
    nextPiece = saveData.nextPiece;
    score = saveData.score;
    level = saveData.level;
    lines = saveData.lines;
    dropInterval = saveData.dropInterval;
    selectedDifficulty = saveData.difficulty || 'easy';
    
    gameRunning = true;
    gamePaused = false;
    isClearing = false;
    
    updateDisplay();
    drawNext();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
    
    initAudio();
    startMusic();
    
    clearSavedGame(); // Clear save after resuming
    
    lastDrop = performance.now();
    gameLoop();
}

// Auto-save periodically and on page unload
function setupAutoSave() {
    // Save every 2 seconds while playing
    setInterval(() => {
        if (gameRunning && !gamePaused && !isClearing) {
            saveGame();
        }
    }, 2000);
    
    // Save on page unload
    window.addEventListener('beforeunload', () => {
        if (gameRunning && !gamePaused) {
            saveGame();
        }
    });
    
    // Save on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && gameRunning && !gamePaused) {
            saveGame();
        }
    });
}

// ===== MUSIC SYSTEM =====
let audioContext = null;
let musicPlaying = false;
let musicGain = null;
let currentNoteTimeout = null;
let musicSessionId = 0; // Singleton guard: each startMusic() gets a unique session
let userMutedMusic = false; // Tracks if the user explicitly muted music

// Korobeiniki (Tetris Theme) - simplified melody
const TETRIS_MELODY = [
    { note: 659.25, duration: 400 },  // E5
    { note: 493.88, duration: 200 },  // B4
    { note: 523.25, duration: 200 },  // C5
    { note: 587.33, duration: 400 },  // D5
    { note: 523.25, duration: 200 },  // C5
    { note: 493.88, duration: 200 },  // B4
    { note: 440.00, duration: 400 },  // A4
    { note: 440.00, duration: 200 },  // A4
    { note: 523.25, duration: 200 },  // C5
    { note: 659.25, duration: 400 },  // E5
    { note: 587.33, duration: 200 },  // D5
    { note: 523.25, duration: 200 },  // C5
    { note: 493.88, duration: 600 },  // B4
    { note: 523.25, duration: 200 },  // C5
    { note: 587.33, duration: 400 },  // D5
    { note: 659.25, duration: 400 },  // E5
    { note: 523.25, duration: 400 },  // C5
    { note: 440.00, duration: 400 },  // A4
    { note: 440.00, duration: 400 },  // A4
    { note: 0, duration: 200 },       // Rest
    
    { note: 587.33, duration: 400 },  // D5
    { note: 698.46, duration: 200 },  // F5
    { note: 880.00, duration: 400 },  // A5
    { note: 783.99, duration: 200 },  // G5
    { note: 698.46, duration: 200 },  // F5
    { note: 659.25, duration: 600 },  // E5
    { note: 523.25, duration: 200 },  // C5
    { note: 659.25, duration: 400 },  // E5
    { note: 587.33, duration: 200 },  // D5
    { note: 523.25, duration: 200 },  // C5
    { note: 493.88, duration: 400 },  // B4
    { note: 493.88, duration: 200 },  // B4
    { note: 523.25, duration: 200 },  // C5
    { note: 587.33, duration: 400 },  // D5
    { note: 659.25, duration: 400 },  // E5
    { note: 523.25, duration: 400 },  // C5
    { note: 440.00, duration: 400 },  // A4
    { note: 440.00, duration: 400 },  // A4
    { note: 0, duration: 400 },       // Rest
];

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        musicGain = audioContext.createGain();
        musicGain.gain.value = 0.15;
        musicGain.connect(audioContext.destination);
    }
    // iOS Safari requires resume() from a user gesture; call it every time
    // to ensure the context is running.
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Eagerly unlock AudioContext on first user interaction (needed for iOS Safari)
function unlockAudio() {
    initAudio();
    document.removeEventListener('touchstart', unlockAudio, true);
    document.removeEventListener('touchend', unlockAudio, true);
    document.removeEventListener('click', unlockAudio, true);
}
document.addEventListener('touchstart', unlockAudio, true);
document.addEventListener('touchend', unlockAudio, true);
document.addEventListener('click', unlockAudio, true);

function playNote(frequency, duration, time) {
    if (!audioContext || !musicGain || frequency === 0) return;
    
    const oscillator = audioContext.createOscillator();
    const noteGain = audioContext.createGain();
    
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    
    noteGain.gain.setValueAtTime(0.3, time);
    noteGain.gain.exponentialRampToValueAtTime(0.01, time + duration / 1000 - 0.01);
    
    oscillator.connect(noteGain);
    noteGain.connect(musicGain);
    
    oscillator.start(time);
    oscillator.stop(time + duration / 1000);
}

let melodyIndex = 0;

function playMelody(sessionId) {
    // Singleton guard: bail out if this callback belongs to a stale session
    if (sessionId !== musicSessionId) return;
    if (!musicPlaying || !audioContext) return;
    
    const note = TETRIS_MELODY[melodyIndex];
    const currentTime = audioContext.currentTime;
    
    if (note.note > 0) {
        playNote(note.note, note.duration * 0.9, currentTime);
    }
    
    melodyIndex = (melodyIndex + 1) % TETRIS_MELODY.length;
    currentNoteTimeout = setTimeout(() => playMelody(sessionId), note.duration);
}

function startMusic() {
    // Don't start music if the user explicitly muted it
    if (userMutedMusic) return;
    
    // Kill any previous session completely
    stopMusicInternal();
    
    initAudio();
    
    // Create a fresh gain node so new notes go through a clean path.
    musicGain = audioContext.createGain();
    musicGain.gain.value = 0.15;
    musicGain.connect(audioContext.destination);
    
    musicPlaying = true;
    melodyIndex = 0;
    
    const mySession = musicSessionId;
    
    // Wait for AudioContext to be running before playing any notes.
    // Playing on a suspended context queues oscillators that all fire at once on resume.
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            if (musicSessionId === mySession && musicPlaying) {
                playMelody(mySession);
            }
        });
    } else {
        playMelody(mySession);
    }
    
    document.getElementById('musicBtn').textContent = '🔊 Musique';
    document.getElementById('musicBtn').classList.remove('muted');
}

// Internal stop that silences everything without updating UI
function stopMusicInternal() {
    musicPlaying = false;
    musicSessionId++;
    if (currentNoteTimeout) {
        clearTimeout(currentNoteTimeout);
        currentNoteTimeout = null;
    }
    // Disconnect gain node to immediately silence any in-flight oscillators
    if (musicGain && audioContext) {
        musicGain.disconnect();
        musicGain = null;
    }
}

function stopMusic() {
    stopMusicInternal();
    document.getElementById('musicBtn').textContent = '🔇 Musique';
    document.getElementById('musicBtn').classList.add('muted');
}

function toggleMusic() {
    // Only allow toggling music when a game is active
    if (!gameRunning) return;
    
    if (musicPlaying) {
        userMutedMusic = true;
        stopMusic();
    } else {
        userMutedMusic = false;
        startMusic();
    }
}

// Sound effects
function playSound(type) {
    if (!audioContext) return;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    
    switch(type) {
        case 'move':
            osc.type = 'square';
            osc.frequency.value = 150;
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        case 'rotate':
            osc.type = 'square';
            osc.frequency.value = 300;
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
            break;
        case 'drop':
            osc.type = 'square';
            osc.frequency.value = 100;
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'clear':
            osc.type = 'square';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            osc.frequency.setValueAtTime(784, now + 0.2);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'tetris':
            osc.type = 'square';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            osc.frequency.setValueAtTime(784, now + 0.2);
            osc.frequency.setValueAtTime(1047, now + 0.3);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        case 'gameover':
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
    }
}

function playLevelUpSound() {
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    // Ascending arpeggio for level up
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    
    notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        const noteStart = now + i * 0.08;
        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.15);
        
        osc.start(noteStart);
        osc.stop(noteStart + 0.15);
    });
}

// Level up visual effect
let levelUpAnimation = null;
let levelUpFrame = 0;

function showLevelUpEffect() {
    levelUpFrame = 0;
    if (levelUpAnimation) clearTimeout(levelUpAnimation);
    animateLevelUp();
}

function animateLevelUp() {
    const totalFrames = 30;
    
    if (levelUpFrame < totalFrames) {
        levelUpFrame++;
        levelUpAnimation = setTimeout(animateLevelUp, 50);
    } else {
        levelUpAnimation = null;
    }
}

function drawLevelUpEffect() {
    if (levelUpFrame === 0 || levelUpFrame > 30) return;
    
    const progress = levelUpFrame / 30;
    const alpha = Math.sin(progress * Math.PI); // Fade in then out
    
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    
    // Flash border
    const borderWidth = 4 + Math.sin(levelUpFrame * 0.5) * 2;
    ctx.strokeStyle = `hsl(${(levelUpFrame * 20) % 360}, 100%, 60%)`;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth/2, borderWidth/2, canvas.width - borderWidth, canvas.height - borderWidth);
    
    // Level up text
    if (levelUpFrame > 5 && levelUpFrame < 25) {
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 20px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Rainbow effect
        const hue = (levelUpFrame * 30) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 80%)`;
        ctx.shadowBlur = 15;
        
        const bounce = Math.sin(levelUpFrame * 0.4) * 5;
        ctx.fillText(`NIVEAU ${level}!`, canvas.width / 2, canvas.height / 2 + bounce);
    }
    
    ctx.restore();
}

// ===== GAME LOGIC =====

function createBoard() {
    board = [];
    boardColors = [];
    for (let row = 0; row < ROWS; row++) {
        board[row] = [];
        boardColors[row] = [];
        for (let col = 0; col < COLS; col++) {
            board[row][col] = 0;
            boardColors[row][col] = null;
        }
    }
}

function createPiece(shapeName) {
    const shape = SHAPES[shapeName];
    return {
        shape: shape.map(row => [...row]),
        x: Math.floor((COLS - shape[0].length) / 2),
        y: 0,
        name: shapeName,
        color: PIECE_COLORS[shapeName]
    };
}

function getRandomPiece() {
    const randomIndex = Math.floor(Math.random() * SHAPE_NAMES.length);
    return createPiece(SHAPE_NAMES[randomIndex]);
}

function rotatePiece(piece) {
    const rotated = [];
    const rows = piece.shape.length;
    const cols = piece.shape[0].length;
    
    for (let col = 0; col < cols; col++) {
        rotated[col] = [];
        for (let row = rows - 1; row >= 0; row--) {
            rotated[col][rows - 1 - row] = piece.shape[row][col];
        }
    }
    
    return rotated;
}

function isValidMove(piece, offsetX = 0, offsetY = 0, newShape = null) {
    const shape = newShape || piece.shape;
    const newX = piece.x + offsetX;
    const newY = piece.y + offsetY;
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const boardX = newX + col;
                const boardY = newY + row;
                
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return false;
                }
                
                if (boardY >= 0 && board[boardY][boardX]) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

function lockPiece() {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const boardY = currentPiece.y + row;
                const boardX = currentPiece.x + col;
                
                if (boardY >= 0) {
                    board[boardY][boardX] = 1;
                    boardColors[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
    
    playSound('drop');
    
    // Clear current piece reference before checking lines
    const lockedPiece = currentPiece;
    currentPiece = null;
    
    checkAndClearLines();
}

// Animation state for line clearing
let clearingRows = [];
let clearAnimationFrame = 0;
let isClearing = false;

function checkAndClearLines() {
    // Find complete rows
    clearingRows = [];
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell === 1)) {
            clearingRows.push(row);
        }
    }
    
    if (clearingRows.length > 0) {
        // Start flash animation
        isClearing = true;
        clearAnimationFrame = 0;
        
        if (clearingRows.length === 4) {
            playSound('tetris');
        } else {
            playSound('clear');
        }
        
        animateClearLines();
    } else {
        spawnNewPiece();
    }
}

function animateClearLines() {
    const isTetris = clearingRows.length === 4;
    const totalFrames = isTetris ? 12 : 8;
    const frameDuration = isTetris ? 40 : 50;
    
    if (clearAnimationFrame < totalFrames) {
        // Screen shake for Tetris
        if (isTetris && clearAnimationFrame < 8) {
            const shakeX = (Math.random() - 0.5) * 8;
            const shakeY = (Math.random() - 0.5) * 8;
            canvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
        } else {
            canvas.style.transform = '';
        }
        
        draw();
        drawClearAnimation();
        clearAnimationFrame++;
        setTimeout(animateClearLines, frameDuration);
    } else {
        // Reset shake
        canvas.style.transform = '';
        // Animation complete, actually clear the lines
        finishClearLines();
    }
}

function drawClearAnimation() {
    const isTetris = clearingRows.length === 4;
    const frame = clearAnimationFrame;
    
    // Different flash patterns based on lines cleared
    const flashColors = isTetris ? [
        '#ff0000', '#ff7700', '#ffff00', '#00ff00', 
        '#00ffff', '#0077ff', '#ff00ff', '#ffffff',
        '#ffff00', '#00ffff', '#ff00ff', '#ffffff'
    ] : [
        '#ffffff', '#ffff00', '#ffffff', '#00ffff',
        '#ffffff', '#ff00ff', '#ffffff', '#00ff00'
    ];
    
    const isFlashOn = frame % 2 === 0;
    
    clearingRows.forEach((row, rowIndex) => {
        const py = row * BLOCK_SIZE;
        
        // Stagger the animation slightly for each row
        const adjustedFrame = Math.max(0, frame - rowIndex * 0.5);
        
        if (isFlashOn || isTetris) {
            // Flash with color
            const colorIndex = Math.floor(frame + rowIndex) % flashColors.length;
            ctx.fillStyle = flashColors[colorIndex];
            ctx.globalAlpha = isTetris ? 1 : 0.9;
            ctx.fillRect(0, py, canvas.width, BLOCK_SIZE);
            
            // Add glow effect
            ctx.shadowColor = flashColors[colorIndex];
            ctx.shadowBlur = isTetris ? 30 : 15;
            ctx.fillRect(0, py, canvas.width, BLOCK_SIZE);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            
            // Draw bright outline
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, py + 1, canvas.width - 2, BLOCK_SIZE - 2);
        }
        
        if (!isFlashOn && !isTetris) {
            // Shrink effect for regular clears
            const shrinkAmount = (frame / 8) * (BLOCK_SIZE / 2);
            for (let col = 0; col < COLS; col++) {
                if (boardColors[row][col]) {
                    const px = col * BLOCK_SIZE;
                    ctx.fillStyle = boardColors[row][col].light;
                    ctx.fillRect(
                        px + shrinkAmount, 
                        py + shrinkAmount, 
                        BLOCK_SIZE - shrinkAmount * 2, 
                        BLOCK_SIZE - shrinkAmount * 2
                    );
                }
            }
        }
    });
    
    // Add "TETRIS!" text for 4 lines
    if (isTetris && frame >= 2 && frame <= 10) {
        ctx.save();
        ctx.font = 'bold 24px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const pulse = 1 + Math.sin(frame * 0.8) * 0.2;
        ctx.scale(pulse, pulse);
        
        // Rainbow text
        const gradient = ctx.createLinearGradient(0, 0, canvas.width / pulse, 0);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.2, '#ff7700');
        gradient.addColorStop(0.4, '#ffff00');
        gradient.addColorStop(0.6, '#00ff00');
        gradient.addColorStop(0.8, '#00ffff');
        gradient.addColorStop(1, '#ff00ff');
        
        ctx.fillStyle = gradient;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.fillText('TETRIS!', (canvas.width / 2) / pulse, (canvas.height / 2) / pulse);
        ctx.restore();
    }
    
    // Add particles effect
    if (frame > 2) {
        drawClearParticles();
    }
}

// Particle system for line clear
let particles = [];

function createClearParticles(rows) {
    particles = [];
    const isTetris = rows.length === 4;
    const particleMultiplier = isTetris ? 3 : 1;
    
    rows.forEach(row => {
        for (let col = 0; col < COLS; col++) {
            if (boardColors[row][col]) {
                // Create more particles for Tetris
                const numParticles = (3 + Math.floor(Math.random() * 3)) * particleMultiplier;
                for (let i = 0; i < numParticles; i++) {
                    const angle = (Math.PI * 2 * i) / numParticles + Math.random() * 0.5;
                    const speed = 3 + Math.random() * (isTetris ? 8 : 5);
                    
                    particles.push({
                        x: col * BLOCK_SIZE + BLOCK_SIZE / 2,
                        y: row * BLOCK_SIZE + BLOCK_SIZE / 2,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 3,
                        color: isTetris ? 
                            ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#00ffff', '#ff00ff'][Math.floor(Math.random() * 6)] :
                            boardColors[row][col].main,
                        size: 2 + Math.random() * (isTetris ? 6 : 4),
                        life: 1,
                        sparkle: isTetris && Math.random() > 0.5
                    });
                }
            }
        }
    });
}

function drawClearParticles() {
    if (clearAnimationFrame === 3) {
        createClearParticles(clearingRows);
    }
    
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // gravity
        p.vx *= 0.98; // friction
        p.life -= 0.08;
        p.size *= 0.96;
        
        if (p.life > 0 && p.size > 0.5) {
            ctx.globalAlpha = p.life;
            
            if (p.sparkle) {
                // Sparkle effect - star shape
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(clearAnimationFrame * 0.5);
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                
                // Draw 4-pointed star
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const angle = (i * Math.PI) / 2;
                    const outerX = Math.cos(angle) * p.size * 1.5;
                    const outerY = Math.sin(angle) * p.size * 1.5;
                    const innerAngle = angle + Math.PI / 4;
                    const innerX = Math.cos(innerAngle) * p.size * 0.5;
                    const innerY = Math.sin(innerAngle) * p.size * 0.5;
                    
                    if (i === 0) ctx.moveTo(outerX, outerY);
                    else ctx.lineTo(outerX, outerY);
                    ctx.lineTo(innerX, innerY);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                // Regular particle
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    });
    
    // Remove dead particles
    particles = particles.filter(p => p.life > 0 && p.size > 0.5);
}

function finishClearLines() {
    // Sort rows in descending order to remove from bottom up
    clearingRows.sort((a, b) => b - a);
    
    // Remove all rows first (indices stay valid because we go from bottom to top)
    clearingRows.forEach(row => {
        board.splice(row, 1);
        boardColors.splice(row, 1);
    });
    
    // Then add empty rows at the top
    for (let i = 0; i < clearingRows.length; i++) {
        board.unshift(new Array(COLS).fill(0));
        boardColors.unshift(new Array(COLS).fill(null));
    }
    
    const linesCleared = clearingRows.length;
    lines += linesCleared;
    
    // New scoring: lines * speed factor * line bonus * difficulty bonus
    // Speed factor = how fast the game is (higher level = more points)
    const speedFactor = 1 + (level * 0.5); // Level 1 = 1.5x, Level 10 = 6x
    const lineBonus = LINE_CLEAR_BONUS[linesCleared] || 1;
    const difficultyBonus = DIFFICULTY_SCORE_MULTIPLIERS[selectedDifficulty] || 1;
    const basePoints = 100 * linesCleared;
    
    const pointsEarned = Math.floor(basePoints * speedFactor * lineBonus * difficultyBonus);
    score += pointsEarned;
    
    console.log(`+${pointsEarned} points (${linesCleared} lines, speed:${speedFactor.toFixed(1)}x, bonus:${lineBonus}x, diff:${difficultyBonus}x)`);
    
    const newLevel = Math.floor(lines / 5) + 1; // Level up every 5 lines instead of 10
    if (newLevel > level) {
        level = newLevel;
        updateSpeed();
        
        // Play level up sound
        playLevelUpSound();
        
        // Show level up animation
        showLevelUpEffect();
    }
    
    updateDisplay();
    
    // Reset animation state
    isClearing = false;
    clearingRows = [];
    particles = [];
    
    spawnNewPiece();
    
    // Resume game loop
    lastDrop = performance.now();
    gameLoop();
}

function spawnNewPiece() {
    currentPiece = nextPiece || getRandomPiece();
    nextPiece = getRandomPiece();
    
    drawNext();
    
    if (!isValidMove(currentPiece)) {
        gameOver();
    }
}

function getGhostPosition() {
    let ghostY = currentPiece.y;
    
    while (isValidMove(currentPiece, 0, ghostY - currentPiece.y + 1)) {
        ghostY++;
    }
    
    return ghostY;
}

function hardDrop() {
    if (!currentPiece) return;
    while (isValidMove(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 2;
    }
    updateDisplay();
    lockPiece();
}

function moveDown() {
    if (!currentPiece) return false;
    if (isValidMove(currentPiece, 0, 1)) {
        currentPiece.y++;
        return true;
    } else {
        lockPiece();
        return false;
    }
}

function moveLeft() {
    if (!currentPiece) return;
    if (isValidMove(currentPiece, -1, 0)) {
        currentPiece.x--;
        playSound('move');
    }
}

function moveRight() {
    if (!currentPiece) return;
    if (isValidMove(currentPiece, 1, 0)) {
        currentPiece.x++;
        playSound('move');
    }
}

function rotate() {
    if (!currentPiece) return;
    const rotated = rotatePiece(currentPiece);
    
    if (isValidMove(currentPiece, 0, 0, rotated)) {
        currentPiece.shape = rotated;
        playSound('rotate');
        return;
    }
    
    const kicks = [-1, 1, -2, 2];
    for (const kick of kicks) {
        if (isValidMove(currentPiece, kick, 0, rotated)) {
            currentPiece.x += kick;
            currentPiece.shape = rotated;
            playSound('rotate');
            return;
        }
    }
}

// ===== RENDERING =====

function draw() {
    // Clear canvas with dark background
    ctx.fillStyle = COLORS.empty;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let row = 0; row <= ROWS; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * BLOCK_SIZE);
        ctx.lineTo(canvas.width, row * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let col = 0; col <= COLS; col++) {
        ctx.beginPath();
        ctx.moveTo(col * BLOCK_SIZE, 0);
        ctx.lineTo(col * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    
    // Draw locked pieces with colors
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row] && board[row][col] && boardColors[row] && boardColors[row][col]) {
                drawColorBlock(ctx, col, row, boardColors[row][col], BLOCK_SIZE);
            }
        }
    }
    
    if (currentPiece) {
        // Draw ghost piece
        const ghostY = getGhostPosition();
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    drawGhostBlock(ctx, currentPiece.x + col, ghostY + row, currentPiece.color, BLOCK_SIZE);
                }
            }
        }
        
        // Draw current piece
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    drawColorBlock(ctx, currentPiece.x + col, currentPiece.y + row, currentPiece.color, BLOCK_SIZE);
                }
            }
        }
    }
    
    // Draw level up effect if active
    drawLevelUpEffect();
}

function drawColorBlock(context, x, y, color, size) {
    const px = x * size;
    const py = y * size;
    const padding = 1;
    
    // Main block
    context.fillStyle = color.main;
    context.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
    
    // Top highlight
    context.fillStyle = color.light;
    context.fillRect(px + padding, py + padding, size - padding * 2, 3);
    context.fillRect(px + padding, py + padding, 3, size - padding * 2);
    
    // Bottom shadow
    context.fillStyle = color.dark;
    context.fillRect(px + size - 4, py + padding + 3, 3, size - padding * 2 - 3);
    context.fillRect(px + padding + 3, py + size - 4, size - padding * 2 - 3, 3);
    
    // Inner shadow
    context.fillStyle = color.shadow;
    context.fillRect(px + size - 3, py + size - 3, 2, 2);
}

function drawGhostBlock(context, x, y, color, size) {
    const px = x * size;
    const py = y * size;
    
    context.strokeStyle = color.main;
    context.lineWidth = 2;
    context.globalAlpha = 0.4;
    context.strokeRect(px + 3, py + 3, size - 6, size - 6);
    context.globalAlpha = 1;
}

function drawNext() {
    // Dark background for next piece preview
    nextCtx.fillStyle = '#1a1a2e';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const offsetX = (nextCanvas.width - nextPiece.shape[0].length * NEXT_BLOCK_SIZE) / 2;
        const offsetY = (nextCanvas.height - nextPiece.shape.length * NEXT_BLOCK_SIZE) / 2;
        
        for (let row = 0; row < nextPiece.shape.length; row++) {
            for (let col = 0; col < nextPiece.shape[row].length; col++) {
                if (nextPiece.shape[row][col]) {
                    const px = offsetX + col * NEXT_BLOCK_SIZE;
                    const py = offsetY + row * NEXT_BLOCK_SIZE;
                    
                    // Draw colored block
                    nextCtx.fillStyle = nextPiece.color.main;
                    nextCtx.fillRect(px + 1, py + 1, NEXT_BLOCK_SIZE - 2, NEXT_BLOCK_SIZE - 2);
                    
                    // Highlight
                    nextCtx.fillStyle = nextPiece.color.light;
                    nextCtx.fillRect(px + 1, py + 1, NEXT_BLOCK_SIZE - 2, 2);
                    nextCtx.fillRect(px + 1, py + 1, 2, NEXT_BLOCK_SIZE - 2);
                    
                    // Shadow
                    nextCtx.fillStyle = nextPiece.color.dark;
                    nextCtx.fillRect(px + NEXT_BLOCK_SIZE - 3, py + 3, 2, NEXT_BLOCK_SIZE - 4);
                    nextCtx.fillRect(px + 3, py + NEXT_BLOCK_SIZE - 3, NEXT_BLOCK_SIZE - 4, 2);
                }
            }
        }
    }
}

// Speed table - dropInterval in ms for each level (Easy mode)
const SPEED_TABLE_EASY = [
    1000,  // Level 1: 1.0s
    800,   // Level 2: 0.8s  
    650,   // Level 3: 0.65s
    500,   // Level 4: 0.5s
    400,   // Level 5: 0.4s
    300,   // Level 6: 0.3s
    250,   // Level 7: 0.25s
    200,   // Level 8: 0.2s
    150,   // Level 9: 0.15s
    100,   // Level 10: 0.1s
    80,    // Level 11: 0.08s
    60,    // Level 12: 0.06s
    50,    // Level 13+: 0.05s
];

// Difficulty multipliers (lower = faster)
const DIFFICULTY_MULTIPLIERS = {
    easy: 1.0,      // Normal speed
    medium: 0.7,    // 30% faster
    violaine: 0.5   // 50% faster (hardcore!)
};

// Score multipliers for difficulty
const DIFFICULTY_SCORE_MULTIPLIERS = {
    easy: 1.0,
    medium: 1.5,
    violaine: 2.5
};

// Bonus multipliers for clearing multiple lines at once
const LINE_CLEAR_BONUS = {
    1: 1.0,    // Single
    2: 2.5,    // Double
    3: 5.0,    // Triple
    4: 10.0    // Tetris!
};

let selectedDifficulty = 'easy';

function updateSpeed() {
    const speedIndex = Math.min(level - 1, SPEED_TABLE_EASY.length - 1);
    const baseSpeed = SPEED_TABLE_EASY[speedIndex];
    const multiplier = DIFFICULTY_MULTIPLIERS[selectedDifficulty] || 1.0;
    dropInterval = Math.max(30, Math.floor(baseSpeed * multiplier));
    console.log(`Level ${level} (${selectedDifficulty}): dropInterval = ${dropInterval}ms`);
}

function updateDisplay() {
    scoreEl.textContent = score.toString().padStart(6, '0');
    levelEl.textContent = level.toString().padStart(2, '0');
    linesEl.textContent = lines.toString().padStart(3, '0');
}

// ===== GAME FLOW =====

function startGame(startingLevel = 1) {
    // Cancel any existing game loop to prevent duplicates
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Reset music mute preference on new game
    userMutedMusic = false;
    
    // Clear any saved game when starting new
    clearSavedGame();
    
    createBoard();
    score = 0;
    level = startingLevel;
    lines = 0;
    updateSpeed(); // Use speed table instead of hardcoded value
    gameRunning = true;
    gamePaused = false;
    isClearing = false;
    
    updateDisplay();
    spawnNewPiece();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
    document.getElementById('resumeSection').classList.add('hidden');
    
    initAudio();
    startMusic();
    
    lastDrop = performance.now();
    gameLoop();
}

function pauseGame() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    
    if (gamePaused) {
        // Cancel animation frame when pausing
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        pauseScreen.classList.remove('hidden');
        stopMusic();
    } else {
        pauseScreen.classList.add('hidden');
        startMusic();
        lastDrop = performance.now();
        gameLoop();
    }
}

function gameOver() {
    gameRunning = false;
    
    // Cancel animation frame
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    stopMusic();
    playSound('gameover');
    
    // Clear saved game - game is over
    clearSavedGame();
    
    finalScoreEl.textContent = score;
    
    // Reset score input for new game
    document.getElementById('scoreInputSection').classList.remove('hidden');
    document.getElementById('scoreSavedMessage').classList.add('hidden');
    nameInput.value = '';
    
    // Check if high score
    if (isHighScore(score)) {
        document.getElementById('highScoreMessage').classList.remove('hidden');
    } else {
        document.getElementById('highScoreMessage').classList.add('hidden');
    }
    
    renderLeaderboard();
    gameOverScreen.classList.remove('hidden');
}

function gameLoop(timestamp = 0) {
    if (!gameRunning || gamePaused || isClearing) return;
    
    if (timestamp - lastDrop > dropInterval) {
        moveDown();
        lastDrop = timestamp;
    }
    
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

// ===== INPUT HANDLING =====

document.addEventListener('keydown', (e) => {
    if (!gameRunning) {
        // Don't handle Enter/Space when difficulty screen or other screens are shown
        // User must click to select difficulty
        if (e.code === 'Enter' || e.code === 'Space') {
            // Only allow keyboard start from game over screen after saving score
            if (!gameOverScreen.classList.contains('hidden') && 
                !document.getElementById('scoreSavedMessage').classList.contains('hidden')) {
                showDifficultyScreen();
            }
        }
        return;
    }
    
    if (gamePaused && e.code !== 'Space') return;
    
    // Block input during line clear animation
    if (isClearing) return;
    
    // No piece to control
    if (!currentPiece) return;
    
    switch (e.code) {
        case 'ArrowLeft':
            moveLeft();
            break;
        case 'ArrowRight':
            moveRight();
            break;
        case 'ArrowUp':
            rotate();
            break;
        case 'ArrowDown':
            if (moveDown()) {
                score += 1;
                updateDisplay();
            }
            lastDrop = performance.now();
            break;
        case 'Space':
            if (startScreen.classList.contains('hidden') && gameOverScreen.classList.contains('hidden')) {
                pauseGame();
            }
            break;
        case 'Enter':
            hardDrop();
            break;
        case 'KeyZ':
        case 'ControlLeft':
            rotate();
            break;
    }
    
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(e.code)) {
        e.preventDefault();
    }
    
    draw();
});

// Touch/click controls for Game Boy buttons
function canControl() {
    return gameRunning && !gamePaused && !isClearing && currentPiece;
}

// --- Pointer-based hold-to-repeat for D-pad ---
function setupRepeatButton(id, action, { repeats = true } = {}) {
    const btn = document.getElementById(id);
    let repeatTimer = null;
    let repeatInterval = null;

    function startRepeat(e) {
        e.preventDefault();
        action();
        if (!repeats) return;
        repeatTimer = setTimeout(() => {
            repeatInterval = setInterval(() => { action(); }, 80);
        }, 200);
    }

    function stopRepeat(e) {
        if (e) e.preventDefault();
        clearTimeout(repeatTimer);
        clearInterval(repeatInterval);
        repeatTimer = null;
        repeatInterval = null;
    }

    btn.addEventListener('pointerdown', startRepeat);
    btn.addEventListener('pointerup', stopRepeat);
    btn.addEventListener('pointerleave', stopRepeat);
    btn.addEventListener('pointercancel', stopRepeat);
    // Prevent context menu on long press
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

setupRepeatButton('btnLeft', () => { if (canControl()) { moveLeft(); draw(); } });
setupRepeatButton('btnRight', () => { if (canControl()) { moveRight(); draw(); } });
setupRepeatButton('btnDown', () => {
    if (canControl()) {
        if (moveDown()) { score += 1; updateDisplay(); }
        lastDrop = performance.now();
        draw();
    }
});
setupRepeatButton('btnUp', () => { if (canControl()) { rotate(); draw(); } }, { repeats: false });
setupRepeatButton('btnA', () => { if (canControl()) { rotate(); draw(); } }, { repeats: false });
setupRepeatButton('btnB', () => { if (canControl()) { hardDrop(); } }, { repeats: false });

document.getElementById('btnStart').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!gameRunning) { startGame(); } else { pauseGame(); }
});
document.getElementById('btnStart').addEventListener('contextmenu', (e) => e.preventDefault());

document.getElementById('btnSelect').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    toggleMusic();
});
document.getElementById('btnSelect').addEventListener('contextmenu', (e) => e.preventDefault());

// --- Swipe / tap gestures on game canvas ---
(function setupCanvasGestures() {
    const canvas = document.getElementById('gameCanvas');
    let touchStartX = null;
    let touchStartY = null;
    let touchStartTime = 0;
    let swipeHandled = false;

    const SWIPE_THRESHOLD = 30;   // min px to count as swipe
    const TAP_THRESHOLD = 15;     // max px movement for a tap
    const SWIPE_DOWN_THRESHOLD = 50; // longer threshold for hard drop

    canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        touchStartX = e.clientX;
        touchStartY = e.clientY;
        touchStartTime = Date.now();
        swipeHandled = false;
    });

    canvas.addEventListener('pointermove', (e) => {
        if (touchStartX === null) return;
        if (!canControl()) return;
        e.preventDefault();

        const dx = e.clientX - touchStartX;
        const dy = e.clientY - touchStartY;

        // Horizontal swipe (repeating: each threshold crossed moves one cell)
        if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) { moveRight(); } else { moveLeft(); }
            draw();
            touchStartX = e.clientX;  // reset origin so continued drag = more moves
            swipeHandled = true;
        }
        // Downward swipe for soft drop
        if (dy > SWIPE_THRESHOLD && dy > Math.abs(dx)) {
            if (moveDown()) { score += 1; updateDisplay(); }
            lastDrop = performance.now();
            draw();
            touchStartY = e.clientY;
            swipeHandled = true;
        }
    });

    canvas.addEventListener('pointerup', (e) => {
        if (touchStartX === null) return;
        e.preventDefault();

        const dx = e.clientX - touchStartX;
        const dy = e.clientY - touchStartY;
        const elapsed = Date.now() - touchStartTime;

        if (!swipeHandled && canControl()) {
            // Quick upward swipe = hard drop
            if (dy < -SWIPE_DOWN_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
                hardDrop();
            }
            // Tap = rotate
            else if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD && elapsed < 300) {
                rotate();
                draw();
            }
        }

        touchStartX = null;
        touchStartY = null;
    });

    canvas.addEventListener('pointercancel', () => {
        touchStartX = null;
        touchStartY = null;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
})();

// Difficulty screen
const difficultyScreen = document.getElementById('difficultyScreen');

function showDifficultyScreen() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
    difficultyScreen.classList.remove('hidden');
}

function hideDifficultyScreen() {
    difficultyScreen.classList.add('hidden');
}

// Difficulty card selection
document.querySelectorAll('.difficulty-card').forEach(card => {
    card.addEventListener('click', () => {
        selectedDifficulty = card.dataset.diff;
        console.log('Starting game with difficulty:', selectedDifficulty);
        hideDifficultyScreen();
        startGame();
    });
});

// Back button
document.getElementById('backToMenuBtn').addEventListener('click', () => {
    hideDifficultyScreen();
    startScreen.classList.remove('hidden');
});

// Button event listeners
document.getElementById('startBtn').addEventListener('click', () => showDifficultyScreen());
document.getElementById('resumeBtn').addEventListener('click', pauseGame);
document.getElementById('restartBtn').addEventListener('click', () => showDifficultyScreen());
document.getElementById('musicBtn').addEventListener('click', toggleMusic);

// Leaderboard event listeners
saveScoreBtn.addEventListener('click', handleSaveScore);
viewLeaderboardBtn.addEventListener('click', showLeaderboard);
closeLeaderboardBtn.addEventListener('click', hideLeaderboard);
startLeaderboardBtn.addEventListener('click', () => {
    hideLeaderboard();
    showLeaderboard();
});

// Handle Enter key in name input
nameInput.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
        e.stopPropagation(); // Prevent Enter from bubbling to document handler
        handleSaveScore();
    }
});

// Prevent scrolling on arrow keys
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

// Initialize empty board for initial draw
createBoard();

// Initial draw
draw();
drawNext();

// Setup auto-save
setupAutoSave();

// Check for saved game on load
function checkSavedGame() {
    const saved = hasSavedGame();
    console.log('Checking for saved game:', saved);
    
    if (saved) {
        const data = loadGame();
        console.log('Found saved game - Score:', data.score, 'Level:', data.level);
        document.getElementById('resumeSection').classList.remove('hidden');
    } else {
        console.log('No saved game found');
        document.getElementById('resumeSection').classList.add('hidden');
    }
}

checkSavedGame();

// Resume button event listener
document.getElementById('resumeGameBtn').addEventListener('click', () => {
    resumeGame();
});
