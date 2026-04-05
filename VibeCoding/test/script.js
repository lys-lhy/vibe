// Game State
let gameRunning = false;
let gamePaused = false;
let leftScore = 0;
let rightScore = 0;

// Game Settings
let settings = {
    buffLevel: 3,
    baseSpeed: 5,
    minSpeed: 3,
    maxSpeed: 15,
    speedRatio: 1.1,
    minPaddle: 50,
    maxPaddle: 150,
    paddleRatio: 1.2
};

// DOM Elements
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const leftScoreEl = document.getElementById('left-score');
const rightScoreEl = document.getElementById('right-score');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Setting Inputs
const buffLevelInput = document.getElementById('buff-level');
const baseSpeedInput = document.getElementById('base-speed');
const minSpeedInput = document.getElementById('min-speed');
const maxSpeedInput = document.getElementById('max-speed');
const speedRatioInput = document.getElementById('speed-ratio');
const minPaddleInput = document.getElementById('min-paddle');
const maxPaddleInput = document.getElementById('max-paddle');
const paddleRatioInput = document.getElementById('paddle-ratio');

// Event Listeners
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
restartBtn.addEventListener('click', restartGame);
settingsBtn.addEventListener('click', openSettings);
saveBtn.addEventListener('click', saveSettings);
cancelBtn.addEventListener('click', closeSettings);

// Keyboard Controls
document.addEventListener('keydown', handleKeyDown);

// Functions
function startGame() {
    gameRunning = true;
    gamePaused = false;
    gameLoop();
}

function pauseGame() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        if (!gamePaused) {
            gameLoop();
        }
    }
}

function restartGame() {
    leftScore = 0;
    rightScore = 0;
    updateScoreDisplay();
    gameRunning = false;
    gamePaused = false;
}

function openSettings() {
    settingsModal.classList.add('active');
    loadCurrentSettings();
}

function closeSettings() {
    settingsModal.classList.remove('active');
}

function saveSettings() {
    settings.buffLevel = parseInt(buffLevelInput.value);
    settings.baseSpeed = parseInt(baseSpeedInput.value);
    settings.minSpeed = parseInt(minSpeedInput.value);
    settings.maxSpeed = parseInt(maxSpeedInput.value);
    settings.speedRatio = parseFloat(speedRatioInput.value);
    settings.minPaddle = parseInt(minPaddleInput.value);
    settings.maxPaddle = parseInt(maxPaddleInput.value);
    settings.paddleRatio = parseFloat(paddleRatioInput.value);
    closeSettings();
}

function loadCurrentSettings() {
    buffLevelInput.value = settings.buffLevel;
    baseSpeedInput.value = settings.baseSpeed;
    minSpeedInput.value = settings.minSpeed;
    maxSpeedInput.value = settings.maxSpeed;
    speedRatioInput.value = settings.speedRatio;
    minPaddleInput.value = settings.minPaddle;
    maxPaddleInput.value = settings.maxPaddle;
    paddleRatioInput.value = settings.paddleRatio;
}

function handleKeyDown(e) {
    if (e.code === 'Space') {
        pauseGame();
    }
}

function updateScoreDisplay() {
    leftScoreEl.textContent = leftScore;
    rightScoreEl.textContent = rightScore;
}

function gameLoop() {
    if (!gameRunning || gamePaused) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Game logic here
    // Draw paddles, ball, power-ups, etc.
    
    requestAnimationFrame(gameLoop);
}

// Initialize canvas size
function initCanvas() {
    canvas.width = 800;
    canvas.height = 500;
}

// Initialize game
initCanvas();
updateScoreDisplay();
loadCurrentSettings();