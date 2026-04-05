
// Game configuration
let gameConfig = {
buffFrequency: 3,
ballBaseSpeed: 5,
ballMinSpeed: 2,
ballMaxSpeed: 12,
ballSpeedRatio: 1.1,
paddleMinLength: 60,
paddleMaxLength: 120,
paddleSizeRatio: 1.2
};
const WINNING_SCORE = 11;
// Game elements
const gameContainer = document.getElementById('game-container');
const ball = document.getElementById('ball');
const player1Paddle = document.getElementById('player1-paddle');
const player2Paddle = document.getElementById('player2-paddle');
const scoreDisplay = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-button');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const saveSettingsBtn = document.getElementById('save-settings');
const cancelSettingsBtn = document.getElementById('cancel-settings');
const leftHumanBtn = document.getElementById('left-human');
const leftPCBtn = document.getElementById('left-pc');
const rightHumanBtn = document.getElementById('right-human');
const rightPCBtn = document.getElementById('right-pc');
const controlsText = document.getElementById('controls');
const player1BuffsDisplay = document.getElementById('player1-buffs');
const player2BuffsDisplay = document.getElementById('player2-buffs');
// Buff elements
const buffBlocks = {
slow1: document.getElementById('buff-slow1'),
split1: document.getElementById('buff-split1'),
color1: document.getElementById('buff-color1'),
enlarge1: document.getElementById('buff-enlarge1'),
shrink1: document.getElementById('buff-shrink1'),
slow2: document.getElementById('buff-slow2'),
split2: document.getElementById('buff-split2'),
color2: document.getElementById('buff-color2'),
enlarge2: document.getElementById('buff-enlarge2'),
shrink2: document.getElementById('buff-shrink2')
};
// Settings elements
const buffFrequencySlider = document.getElementById('buff-frequency');
const buffFrequencyValue = document.getElementById('buff-frequency-value');
const ballBaseSpeedInput = document.getElementById('ball-base-speed');
const ballMinSpeedInput = document.getElementById('ball-min-speed');
const ballMaxSpeedInput = document.getElementById('ball-max-speed');
const ballSpeedRatioInput = document.getElementById('ball-speed-ratio');
const paddleMinLengthInput = document.getElementById('paddle-min-length');
const paddleMaxLengthInput = document.getElementById('paddle-max-length');
const paddleSizeRatioInput = document.getElementById('paddle-size-ratio');
// Game variables
const gameWidth = gameContainer.offsetWidth;
const gameHeight = gameContainer.offsetHeight;
const paddleWidth = player1Paddle.offsetWidth;
const ballSize = ball.offsetWidth;
const paddleLeftX = 60;
const paddleRightX = gameWidth - 60 - paddleWidth;
let ballX = gameWidth / 2;
let ballY = gameHeight / 2;
let ballSpeedX = gameConfig.ballBaseSpeed;
let ballSpeedY = gameConfig.ballBaseSpeed;
let originalBallSpeedX = gameConfig.ballBaseSpeed;
let originalBallSpeedY = gameConfig.ballBaseSpeed;
let player1Score = 0;
let player2Score = 0;
let player1PaddleY = (gameHeight - 100) / 2;
let player2PaddleY = (gameHeight - 100) / 2;
let isGameRunning = false;
let isGamePaused = false;
let animationId;
let roundsCompleted = 0;
let ballCrossings = 0;
let lastBuffCheckRound = 0;
let buffGenerationCounter = 0;
let leftPlayerMode = 'human';
let rightPlayerMode = 'human';
let wPressed = false;
let sPressed = false;
let upPressed = false;
let downPressed = false;
let activeBuffs = { player1: {}, player2: {} };
let ballClones = [];

function initUI() {
buffFrequencySlider.value = gameConfig.buffFrequency;
buffFrequencyValue.textContent = gameConfig.buffFrequency;
ballBaseSpeedInput.value = gameConfig.ballBaseSpeed;
ballMinSpeedInput.value = gameConfig.ballMinSpeed;
ballMaxSpeedInput.value = gameConfig.ballMaxSpeed;
ballSpeedRatioInput.value = gameConfig.ballSpeedRatio;
paddleMinLengthInput.value = gameConfig.paddleMinLength;
paddleMaxLengthInput.value = gameConfig.paddleMaxLength;
paddleSizeRatioInput.value = gameConfig.paddleSizeRatio;
player1Paddle.style.height = '100px';
player2Paddle.style.height = '100px';
}

function initGame() {
ballX = gameWidth / 2;
ballY = gameHeight / 2;
ballSpeedX = gameConfig.ballBaseSpeed;
ballSpeedY = gameConfig.ballBaseSpeed;
originalBallSpeedX = gameConfig.ballBaseSpeed;
originalBallSpeedY = gameConfig.ballBaseSpeed;
player1PaddleY = (gameHeight - 100) / 2;
player2PaddleY = (gameHeight - 100) / 2;
player1Paddle.style.height = '100px';
player2Paddle.style.height = '100px';
ball.style.backgroundColor = '#fff';
clearBallClones();
roundsCompleted = 0;
ballCrossings = 0;
lastBuffCheckRound = 0;
buffGenerationCounter = 0;
updateGameElements();
Object.values(buffBlocks).forEach(block => { block.style.display = 'none'; });
player1BuffsDisplay.innerHTML = '';
player2BuffsDisplay.innerHTML = '';
}

function updateGameElements() {
ball.style.left = ballX - ballSize / 2 + 'px';
ball.style.top = ballY - ballSize / 2 + 'px';
player1Paddle.style.top = player1PaddleY + 'px';
player2Paddle.style.top = player2PaddleY + 'px';
scoreDisplay.textContent = `${player1Score} : ${player2Score}`;
}

function checkWin() {
if (player1Score >= WINNING_SCORE || player2Score >= WINNING_SCORE) {
isGameRunning = false;
const winner = player1Score >= WINNING_SCORE ? 'Left Player' : 'Right Player';
alert(`${winner} Wins! (${player1Score} - ${player2Score})`);
pauseBtn.disabled = true;
restartBtn.disabled = false;
return true;
}
return false;
}

function moveComputerPaddle(paddleY, targetY, speed) {
const paddleHeight = parseInt(player1Paddle.style.height) || 100;
const paddleCenter = paddleY + paddleHeight / 2;
const ballCenter = targetY;
if (paddleCenter < ballCenter - 10) { paddleY += speed; }
else if (paddleCenter > ballCenter + 10) { paddleY -= speed; }
if (paddleY < 0) paddleY = 0;
const maxHeight = gameHeight - paddleHeight;
if (paddleY > maxHeight) paddleY = maxHeight;
return paddleY;
}

function shouldGenerateBuff() {
if (gameConfig.buffFrequency === 0) return false;
if (roundsCompleted - lastBuffCheckRound >= 10) {
lastBuffCheckRound = roundsCompleted;
buffGenerationCounter = 0;
return true;
}
return false;
}

function generateBuffBlocks() {
if (gameConfig.buffFrequency === 0) return;
Object.values(buffBlocks).forEach(block => { block.style.display = 'none'; });
const buffsToGenerate = gameConfig.buffFrequency;
const buffTypes = ['slow', 'split', 'color', 'enlarge', 'shrink'];
for (let i = 0; i < buffsToGenerate; i++) {
const randomType = buffTypes[Math.floor(Math.random() * buffTypes.length)];
const blockId = `${randomType}1`;
const block = buffBlocks[blockId];
if (block) {
block.style.display = 'block';
block.style.left = '60px';
block.style.top = Math.random() * (gameHeight - 20) + 'px';
}
}
for (let i = 0; i < buffsToGenerate; i++) {
const randomType = buffTypes[Math.floor(Math.random() * buffTypes.length)];
const blockId = `${randomType}2`;
const block = buffBlocks[blockId];
if (block) {
block.style.display = 'block';
block.style.right = '60px';
block.style.top = Math.random() * (gameHeight - 20) + 'px';
}
}
}

function checkBuffCollisions() {
for (let i = 1; i <= 5; i++) {
const buffKeys = ['slow', 'split', 'color', 'enlarge', 'shrink'];
const buffKey = buffKeys[i-1];
const block = buffBlocks[`${buffKey}1`];
if (block && block.style.display !== 'none') {
const blockRect = { x: parseInt(block.style.left), y: parseInt(block.style.top), width: 20, height: 20 };
const paddleHeight = parseInt(player1Paddle.style.height) || 100;
const paddleRect = { x: paddleLeftX, y: player1PaddleY, width: paddleWidth, height: paddleHeight };
if (checkCollision(paddleRect, blockRect)) {
applyBuff(buffKey, 1);
block.style.display = 'none';
}
}
}
for (let i = 1; i <= 5; i++) {
const buffKeys = ['slow', 'split', 'color', 'enlarge', 'shrink'];
const buffKey = buffKeys[i-1];
const block = buffBlocks[`${buffKey}2`];
if (block && block.style.display !== 'none') {
const blockRect = { x: gameWidth - 60 - 20, y: parseInt(block.style.top), width: 20, height: 20 };
const paddleHeight = parseInt(player2Paddle.style.height) || 100;
const paddleRect = { x: paddleRightX, y: player2PaddleY, width: paddleWidth, height: paddleHeight };
if (checkCollision(paddleRect, blockRect)) {
applyBuff(buffKey, 2);
block.style.display = 'none';
}
}
}
}

function checkCollision(rect1, rect2) {
return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
}

function applyBuff(buffType, player) {
const opponent = player === 1 ? 2 : 1;
switch(buffType) {
case 'slow':
ballSpeedX *= 0.8; ballSpeedY *= 0.8;
originalBallSpeedX *= 0.8; originalBallSpeedY *= 0.8;
activeBuffs[`player${player}`].slow = { type: 'slow', duration: 3, originalSpeedX: originalBallSpeedX / 0.8, originalSpeedY: originalBallSpeedY / 0.8 };
updateBuffDisplay();
break;
case 'split':
createBallClones();
activeBuffs[`player${player}`].split = { type: 'split', duration: Infinity };
updateBuffDisplay();
break;
case 'color':
changeBallColor();
activeBuffs[`player${player}`].color = { type: 'color', duration: 5, originalColor: ball.style.backgroundColor };
updateBuffDisplay();
break;
case 'enlarge':
const paddleElement = player === 1 ? player1Paddle : player2Paddle;
const currentHeight = parseInt(paddleElement.style.height) || 100;
const enlargedHeight = Math.min(currentHeight * gameConfig.paddleSizeRatio, gameConfig.paddleMaxLength);
paddleElement.style.height = enlargedHeight + 'px';
activeBuffs[`player${player}`].enlarge = { type: 'enlarge', duration: 3, originalHeight: currentHeight };
updateBuffDisplay();
break;
case 'shrink':
const opponentPaddle = opponent === 1 ? player1Paddle : player2Paddle;
const oppCurrentHeight = parseInt(opponentPaddle.style.height) || 100;
const shrunkHeight = Math.max(oppCurrentHeight / gameConfig.paddleSizeRatio, gameConfig.paddleMinLength);
opponentPaddle.style.height = shrunkHeight + 'px';
activeBuffs[`player${player}`].shrink = { type: 'shrink', target: opponent, duration: 3, originalHeight: oppCurrentHeight };
updateBuffDisplay();
break;
}
}

function createBallClones() {
clearBallClones();
for (let i = 0; i < 2; i++) {
const clone = document.createElement('div');
clone.className = 'ball-clone';
clone.style.backgroundColor = getRandomColor();
gameContainer.appendChild(clone);
const angle = (i === 0) ? -0.5 : 0.5;
ballClones.push({ element: clone, x: ballX, y: ballY, speedX: ballSpeedX * (1 + angle * 0.3), speedY: ballSpeedY + angle * 3 });
}
}

function clearBallClones() {
ballClones.forEach(clone => { if (clone.element && clone.element.parentNode) { clone.element.parentNode.removeChild(clone.element); } });
ballClones = [];
}

function getRandomColor() {
const colors = ['#ff5252', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#00bcd4'];
return colors[Math.floor(Math.random() * colors.length)];
}

function changeBallColor() { ball.style.backgroundColor = getRandomColor(); }
function resetBallColor() { ball.style.backgroundColor = '#fff'; }

function updateBuffDisplay() {
player1BuffsDisplay.innerHTML = '';
player2BuffsDisplay.innerHTML = '';
for (const [key, buff] of Object.entries(activeBuffs.player1)) {
const buffElement = document.createElement('div');
buffElement.textContent = `${getBuffName(key)} (${buff.duration === Infinity ? '∞' : buff.duration})`;
player1BuffsDisplay.appendChild(buffElement);
}
for (const [key, buff] of Object.entries(activeBuffs.player2)) {
const buffElement = document.createElement('div');
buffElement.textContent = `${getBuffName(key)} (${buff.duration === Infinity ? '∞' : buff.duration})`;
player2BuffsDisplay.appendChild(buffElement);
}
}

function getBuffName(buffKey) {
const names = { 'slow': 'Slow', 'split': 'Split', 'color': 'Color', 'enlarge': 'Big Paddle', 'shrink': 'Small Opponent' };
return names[buffKey] || buffKey;
}

function updateBuffs() {
let needsUpdate = false;
const prevSide = ballCrossings % 2;
const currentSide = ballX < gameWidth / 2 ? 0 : 1;
if (prevSide !== currentSide) {
ballCrossings++;
if (ballCrossings % 2 === 0) {
roundsCompleted++;
if (shouldGenerateBuff()) { generateBuffBlocks(); }
for (const player of ['player1', 'player2']) {
for (const [key, buff] of Object.entries(activeBuffs[player])) {
if (buff.duration !== Infinity) {
buff.duration--;
if (buff.duration <= 0) {
removeBuff(player, key, buff);
delete activeBuffs[player][key];
needsUpdate = true;
}
}
}
}
}
}
if (needsUpdate) { updateBuffDisplay(); }
}

function removeBuff(player, buffKey, buff) {
switch(buffKey) {
case 'slow':
if (buff.originalSpeedX) {
originalBallSpeedX = buff.originalSpeedX; originalBallSpeedY = buff.originalSpeedY;
let hasOtherSlow = false;
for (const p of ['player1', 'player2']) { if (activeBuffs[p].slow && activeBuffs[p].slow !== buff) { hasOtherSlow = true; break; } }
if (!hasOtherSlow) { ballSpeedX = Math.sign(ballSpeedX) * originalBallSpeedX; ballSpeedY = Math.sign(ballSpeedY) * originalBallSpeedY; }
}
break;
case 'color': resetBallColor(); break;
case 'enlarge':
const paddle = player === 'player1' ? player1Paddle : player2Paddle;
paddle.style.height = buff.originalHeight + 'px';
break;
case 'shrink':
const opponent = buff.target;
const opponentPaddle = opponent === 1 ? player1Paddle : player2Paddle;
opponentPaddle.style.height = buff.originalHeight + 'px';
break;
}
}

function updateBallClones() {
for (let i = 0; i < ballClones.length; i++) {
const clone = ballClones[i];
clone.x += clone.speedX; clone.y += clone.speedY;
if (clone.y <= ballSize / 2 || clone.y >= gameHeight - ballSize / 2) { clone.speedY = -clone.speedY; clone.y = clone.y <= ballSize / 2 ? ballSize / 2 : gameHeight - ballSize / 2; }
if (clone.x < -50 || clone.x > gameWidth + 50) { if (clone.element && clone.element.parentNode) { clone.element.parentNode.removeChild(clone.element); } ballClones.splice(i, 1); i--; continue; }
if (clone.x < 0) { player2Score++; if (clone.element && clone.element.parentNode) { clone.element.parentNode.removeChild(clone.element); } ballClones.splice(i, 1); i--; continue; }
else if (clone.x > gameWidth) { player1Score++; if (clone.element && clone.element.parentNode) { clone.element.parentNode.removeChild(clone.element); } ballClones.splice(i, 1); i--; continue; }
const player1PaddleHeight = parseInt(player1Paddle.style.height) || 100;
if (clone.x - ballSize / 2 <= paddleLeftX + paddleWidth && clone.x - ballSize / 2 >= paddleLeftX && clone.y + ballSize / 2 >= player1PaddleY && clone.y - ballSize / 2 <= player1PaddleY + player1PaddleHeight) { clone.speedX = Math.abs(clone.speedX); }
const player2PaddleHeight = parseInt(player2Paddle.style.height) || 100;
if (clone.x + ballSize / 2 >= paddleRightX && clone.x + ballSize / 2 <= paddleRightX + paddleWidth && clone.y + ballSize / 2 >= player2PaddleY && clone.y - ballSize / 2 <= player2PaddleY + player2PaddleHeight) { clone.speedX = -Math.abs(clone.speedX); }
if (clone.element) { clone.element.style.left = clone.x - ballSize / 2 + 'px'; clone.element.style.top = clone.y - ballSize / 2 + 'px'; }
}
}

function resetBall() {
ballX = gameWidth / 2; ballY = gameHeight / 2;
ballSpeedX = Math.sign(ballSpeedX) * gameConfig.ballBaseSpeed;
ballSpeedY = (Math.random() * 6 - 3);
if (Math.abs(ballSpeedX) < gameConfig.ballMinSpeed) { ballSpeedX = Math.sign(ballSpeedX) * gameConfig.ballMinSpeed; }
if (Math.abs(ballSpeedX) > gameConfig.ballMaxSpeed) { ballSpeedX = Math.sign(ballSpeedX) * gameConfig.ballMaxSpeed; }
if (Math.abs(ballSpeedY) < gameConfig.ballMinSpeed) { ballSpeedY = Math.sign(ballSpeedY) * gameConfig.ballMinSpeed; }
if (Math.abs(ballSpeedY) > gameConfig.ballMaxSpeed) { ballSpeedY = Math.sign(ballSpeedY) * gameConfig.ballMaxSpeed; }
originalBallSpeedX = Math.abs(ballSpeedX); originalBallSpeedY = Math.abs(ballSpeedY);
}

function gameLoop() {
if (!isGameRunning || isGamePaused) {
if (isGameRunning && isGamePaused) { animationId = requestAnimationFrame(gameLoop); }
return;
}
ballX += ballSpeedX; ballY += ballSpeedY;
if (ballY <= ballSize / 2 || ballY >= gameHeight - ballSize / 2) { ballSpeedY = -ballSpeedY; ballY = ballY <= ballSize / 2 ? ballSize / 2 : gameHeight - ballSize / 2; }
const player1PaddleHeight = parseInt(player1Paddle.style.height) || 100;
if (leftPlayerMode === 'human') {
if (wPressed && player1PaddleY > 0) { player1PaddleY -= 7; }
if (sPressed && player1PaddleY < gameHeight - player1PaddleHeight) { player1PaddleY += 7; }
} else {
const computerSpeed = Math.abs(ballSpeedX) * 0.6;
player1PaddleY = moveComputerPaddle(player1PaddleY, ballY, computerSpeed);
}
const player2PaddleHeight = parseInt(player2Paddle.style.height) || 100;
if (rightPlayerMode === 'human') {
if (upPressed && player2PaddleY > 0) { player2PaddleY -= 7; }
if (downPressed && player2PaddleY < gameHeight - player2PaddleHeight) { player2PaddleY += 7; }
} else {
const computerSpeed = Math.abs(ballSpeedX) * 0.6;
player2PaddleY = moveComputerPaddle(player2PaddleY, ballY, computerSpeed);
}
if (ballX - ballSize / 2 <= paddleLeftX + paddleWidth && ballX - ballSize / 2 >= paddleLeftX && ballY + ballSize / 2 >= player1PaddleY && ballY - ballSize / 2 <= player1PaddleY + player1PaddleHeight && ballSpeedX < 0) {
ballSpeedX = Math.abs(ballSpeedX);
const hitPosition = (ballY - player1PaddleY) / player1PaddleHeight;
ballSpeedY = 10 * (hitPosition - 0.5);
ballSpeedX *= gameConfig.ballSpeedRatio; ballSpeedY *= gameConfig.ballSpeedRatio;
if (Math.abs(ballSpeedX) > gameConfig.ballMaxSpeed) { ballSpeedX = Math.sign(ballSpeedX) * gameConfig.ballMaxSpeed; }
if (Math.abs(ballSpeedY) > gameConfig.ballMaxSpeed) { ballSpeedY = Math.sign(ballSpeedY) * gameConfig.ballMaxSpeed; }
originalBallSpeedX = Math.abs(ballSpeedX); originalBallSpeedY = Math.abs(ballSpeedY);
}
if (ballX + ballSize / 2 >= paddleRightX && ballX + ballSize / 2 <= paddleRightX + paddleWidth && ballY + ballSize / 2 >= player2PaddleY && ballY - ballSize / 2 <= player2PaddleY + player2PaddleHeight && ballSpeedX > 0) {
ballSpeedX = -Math.abs(ballSpeedX);
const hitPosition = (ballY - player2PaddleY) / player2PaddleHeight;
ballSpeedY = 10 * (hitPosition - 0.5);
ballSpeedX *= gameConfig.ballSpeedRatio; ballSpeedY *= gameConfig.ballSpeedRatio;
if (Math.abs(ballSpeedX) > gameConfig.ballMaxSpeed) { ballSpeedX = Math.sign(ballSpeedX) * gameConfig.ballMaxSpeed; }
if (Math.abs(ballSpeedY) > gameConfig.ballMaxSpeed) { ballSpeedY = Math.sign(ballSpeedY) * gameConfig.ballMaxSpeed; }
originalBallSpeedX = Math.abs(ballSpeedX); originalBallSpeedY = Math.abs(ballSpeedY);
}
if (ballX < 0) {
player2Score++;
if (ballClones.length === 0) { resetBall(); }
checkWin();
} else if (ballX > gameWidth) {
player1Score++;
if (ballClones.length === 0) { resetBall(); }
checkWin();
}
checkBuffCollisions();
updateBuffs();
updateBallClones();
updateGameElements();
animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
isGameRunning = true;
isGamePaused = false;
startScreen.style.display = 'none';
startBtn.disabled = true;
pauseBtn.disabled = false;
restartBtn.disabled = false;
if (gameConfig.buffFrequency > 0) {
setTimeout(() => { if (isGameRunning && !isGamePaused) { generateBuffBlocks(); } }, 1000);
}
if (!animationId) { animationId = requestAnimationFrame(gameLoop); }
}

function pauseGame() {
isGamePaused = !isGamePaused;
pauseBtn.textContent = isGamePaused ? "Resume" : "Pause";
}

function restartGame() {
player1Score = 0; player2Score = 0;
isGamePaused = false;
pauseBtn.textContent = "Pause";
pauseBtn.disabled = false;
initGame();
activeBuffs = { player1: {}, player2: {} };
updateBuffDisplay();
if (!isGameRunning) { startGame(); }
}

function openSettings() {
if (isGameRunning && !isGamePaused) { isGamePaused = true; pauseBtn.textContent = "Resume"; }
buffFrequencySlider.value = gameConfig.buffFrequency;
buffFrequencyValue.textContent = gameConfig.buffFrequency;
ballBaseSpeedInput.value = gameConfig.ballBaseSpeed;
ballMinSpeedInput.value = gameConfig.ballMinSpeed;
ballMaxSpeedInput.value = gameConfig.ballMaxSpeed;
ballSpeedRatioInput.value = gameConfig.ballSpeedRatio;
paddleMinLengthInput.value = gameConfig.paddleMinLength;
paddleMaxLengthInput.value = gameConfig.paddleMaxLength;
paddleSizeRatioInput.value = gameConfig.paddleSizeRatio;
settingsPanel.style.display = 'flex';
}

function saveSettings() {
gameConfig.buffFrequency = parseInt(buffFrequencySlider.value);
gameConfig.ballBaseSpeed = Math.max(1, Math.min(15, parseFloat(ballBaseSpeedInput.value)));
gameConfig.ballMinSpeed = Math.max(1, Math.min(10, parseFloat(ballMinSpeedInput.value)));
gameConfig.ballMaxSpeed = Math.max(5, Math.min(20, parseFloat(ballMaxSpeedInput.value)));
gameConfig.ballSpeedRatio = Math.max(1.1, Math.min(1.5, parseFloat(ballSpeedRatioInput.value)));
gameConfig.paddleMinLength = Math.max(30, Math.min(100, parseInt(paddleMinLengthInput.value)));
gameConfig.paddleMaxLength = Math.max(100, Math.min(200, parseInt(paddleMaxLengthInput.value)));
gameConfig.paddleSizeRatio = Math.max(1.1, Math.min(1.5, parseFloat(paddleSizeRatioInput.value)));
if (gameConfig.ballMinSpeed > gameConfig.ballMaxSpeed) {
gameConfig.ballMinSpeed = gameConfig.ballMaxSpeed - 2;
if (gameConfig.ballMinSpeed < 1) gameConfig.ballMinSpeed = 1;
ballMinSpeedInput.value = gameConfig.ballMinSpeed;
}
if (gameConfig.paddleMinLength > gameConfig.paddleMaxLength) {
gameConfig.paddleMinLength = gameConfig.paddleMaxLength - 30;
if (gameConfig.paddleMinLength < 30) gameConfig.paddleMinLength = 30;
paddleMinLengthInput.value = gameConfig.paddleMinLength;
}
settingsPanel.style.display = 'none';
if (isGameRunning) { initGame(); }
}

function cancelSettings() { settingsPanel.style.display = 'none'; }

startButton.addEventListener('click', startGame);
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
restartBtn.addEventListener('click', restartGame);
settingsBtn.addEventListener('click', openSettings);
saveSettingsBtn.addEventListener('click', saveSettings);
cancelSettingsBtn.addEventListener('click', cancelSettings);
buffFrequencySlider.addEventListener('input', function() { buffFrequencyValue.textContent = this.value; });
leftHumanBtn.addEventListener('click', function() { leftPlayerMode = 'human'; leftHumanBtn.classList.add('active'); leftPCBtn.classList.remove('active'); });
leftPCBtn.addEventListener('click', function() { leftPlayerMode = 'pc'; leftPCBtn.classList.add('active'); leftHumanBtn.classList.remove('active'); });
rightHumanBtn.addEventListener('click', function() { rightPlayerMode = 'human'; rightHumanBtn.classList.add('active'); rightPCBtn.classList.remove('active'); });
rightPCBtn.addEventListener('click', function() { rightPlayerMode = 'pc'; rightPCBtn.classList.add('active'); rightHumanBtn.classList.remove('active'); });
document.addEventListener('keydown', function(e) {
switch(e.key) {
case 'w': case 'W': wPressed = true; break;
case 's': case 'S': sPressed = true; break;
case 'ArrowUp': upPressed = true; break;
case 'ArrowDown': downPressed = true; break;
case ' ': if (isGameRunning) { pauseGame(); } break;
case 'Escape': if (settingsPanel.style.display === 'flex') { cancelSettings(); } break;
}
});
document.addEventListener('keyup', function(e) {
switch(e.key) {
case 'w': case 'W': wPressed = false; break;
case 's': case 'S': sPressed = false; break;
case 'ArrowUp': upPressed = false; break;
case 'ArrowDown': downPressed = false; break;
}
});
initUI();
initGame();
