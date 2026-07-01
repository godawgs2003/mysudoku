// game.js
import { puzzleLibrary } from './puzzles.js';

const boardContainer = document.getElementById('board');
const numpadContainer = document.getElementById('numpad');
const victoryScreen = document.getElementById('victoryScreen');
const introScreen = document.getElementById('introScreen');
const timerDisplay = document.getElementById('timerDisplay');
const bestTimeDisplay = document.getElementById('bestTimeDisplay');
const difficultyTag = document.getElementById('difficultyTag');
const victoryTimeMsg = document.getElementById('victoryTimeMsg');

// New UI Elements for Play/Pause and Overlay features
const pauseBtn = document.getElementById('pauseBtn');
const pausedOverlay = document.getElementById('pausedOverlay');
const resumeBtn = document.getElementById('resumeBtn');

let activeNumberTool = null; 
let isNotesModeActive = false;
let timerInterval = null;
let secondsElapsed = 0;
let currentDifficulty = 'easy';
let currentActivePuzzle = "";
let isGamePaused = false; // Tracks paused status state


// 1. Instantiating DOM Shell Grid System
for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    
    const row = Math.floor(i / 9);
    const col = i % 9;
    
    cell.dataset.row = row;
    cell.dataset.col = col;

    if (col === 2 || col === 5) cell.classList.add('border-right');
    if (row === 2 || row === 5) cell.classList.add('border-bottom');

    // Inject structural value and note slots layout elements 
    const valDiv = document.createElement('div');
    valDiv.classList.add('cell-value');
    cell.appendChild(valDiv);

    const notesGrid = document.createElement('div');
    notesGrid.classList.add('notes-grid');
    for (let n = 1; n <= 9; n++) {
        const noteSlot = document.createElement('div');
        noteSlot.classList.add('note-digit');
        noteSlot.dataset.noteNum = n;
        notesGrid.appendChild(noteSlot);
    }
    cell.appendChild(notesGrid);

    cell.addEventListener('click', () => {
        // Block grid placement if game state is actively paused
        if (isGamePaused) return;

        if (cell.classList.contains('starting-number')) {
            if (valDiv.innerText) selectTool(valDiv.innerText);
            return;
        }
        
        if (isNotesModeActive) {
            // Logic rule: Only accept notes when a solid final answer isn't placed yet
            if (!valDiv.innerText && activeNumberTool && activeNumberTool !== 'X') {
                togglePencilNote(cell, activeNumberTool);
            }
        } else {
            if (activeNumberTool === 'X') {
                valDiv.innerText = '';
                clearAllNotes(cell); // Wipe user marks if cell cleared
            } else if (activeNumberTool !== null) {
                valDiv.innerText = activeNumberTool;
                clearAllNotes(cell); // Main answer automatically hides internal notes background
                cascadeClearConflictNotes(row, col, activeNumberTool);
            }
            validateAndHighlight();
        }
    });

    boardContainer.appendChild(cell);
}

// 2. Pencil Marking Execution Handlers
function togglePencilNote(cellDom, numStr) {
    const slot = cellDom.querySelector(`.note-digit[data-note-num="${numStr}"]`);
    if (slot.innerText === numStr) {
        slot.innerText = '';
    } else {
        slot.innerText = numStr;
    }
    // Instantly refresh highlight tracks when shifting internal notes
    validateAndHighlight();
}

function clearAllNotes(cellDom) {
    cellDom.querySelectorAll('.note-digit').forEach(slot => slot.innerText = '');
}

// Smart Quality-of-Life cleanup routine
function cascadeClearConflictNotes(targetRow, targetCol, solvedNumStr) {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const sameBox = (Math.floor(targetRow / 3) === Math.floor(r / 3) && Math.floor(targetCol / 3) === Math.floor(c / 3));
        
        if (r === targetRow || c === targetCol || sameBox) {
            const slot = cell.querySelector(`.note-digit[data-note-num="${solvedNumStr}"]`);
            if (slot) slot.innerText = '';
        }
    });
}

// 3. State Engine Routing Setup
window.selectDifficulty = function(level) {
    currentDifficulty = level;
    difficultyTag.innerText = level;
    
    displayBestTime();
    
    const bank = puzzleLibrary[level];
    const randomIndex = Math.floor(Math.random() * bank.length);
    currentActivePuzzle = bank[randomIndex];

    loadPuzzleToGrid(currentActivePuzzle);
    
    introScreen.classList.add('hidden');
    
    // Safety baseline resetting for dynamic overlay transitions
    isGamePaused = false;
    pausedOverlay.style.display = 'none';
    pauseBtn.innerText = '⏸';
    
    startTimer();
}

function loadPuzzleToGrid(puzzleStr) {
    const cells = document.querySelectorAll('.cell');
    for (let i = 0; i < 81; i++) {
        const char = puzzleStr[i];
        const valDiv = cells[i].querySelector('.cell-value');
        cells[i].classList.remove('starting-number', 'error', 'highlight-match', 'highlight-pencil-match');
        clearAllNotes(cells[i]);
        
        if (char !== "0") {
            valDiv.innerText = char;
            cells[i].classList.add('starting-number');
        } else {
            valDiv.innerText = '';
        }
    }
    selectTool(null);
    setNotesMode(false);
}

// 4. Timing & Navigation Actions
function startTimer() {
    clearInterval(timerInterval);
    secondsElapsed = 0;
    timerDisplay.innerText = "00:00";
    runTimerInterval();
}

// Abstracted Core Loop to toggle execution cleanly on pause configurations
function runTimerInterval() {
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        const secs = (secondsElapsed % 60).toString().padStart(2, '0');
        timerDisplay.innerText = `${mins}:${secs}`;
    }, 1000);
}

// Play/Pause Action Bindings
function togglePauseGame() {
    if (isGamePaused) {
        // Resume game rules
        isGamePaused = false;
        pausedOverlay.style.display = 'none';
        pauseBtn.innerText = '⏸';
        runTimerInterval();
    } else {
        // Pause game rules
        isGamePaused = true;
        pausedOverlay.style.display = 'flex';
        pauseBtn.innerText = '▶';
        clearInterval(timerInterval);
    }
}

// Wire Event Listeners to Layout Controls
if (pauseBtn) pauseBtn.addEventListener('click', togglePauseGame);
if (resumeBtn) resumeBtn.addEventListener('click', togglePauseGame);

window.confirmAndExit = function() {
    if (confirm("Are you sure you want to quit this game and return to the main menu? Progress will be lost.")) {
        exitToMenu();
    }
}

window.exitToMenu = function() {
    victoryScreen.classList.remove('show');
    introScreen.classList.remove('hidden');
    clearInterval(timerInterval);
    isGamePaused = false;
    if (pausedOverlay) pausedOverlay.style.display = 'none';
}

function displayBestTime() {
    const storageKey = 'sudoku_best_' + currentDifficulty;
    const savedBest = localStorage.getItem(storageKey);
    if (savedBest) {
        const mins = Math.floor(parseInt(savedBest) / 60).toString().padStart(2, '0');
        const secs = (parseInt(savedBest) % 60).toString().padStart(2, '0');
        bestTimeDisplay.innerText = `Best: ${mins}:${secs}`;
    } else {
        bestTimeDisplay.innerText = "Best: --:--";
    }
}

function handleWinRecord() {
    clearInterval(timerInterval);
    const storageKey = 'sudoku_best_' + currentDifficulty;
    const savedBest = localStorage.getItem(storageKey);
    
    if (!savedBest || secondsElapsed < parseInt(savedBest)) {
        localStorage.setItem(storageKey, secondsElapsed.toString());
        displayBestTime();
    }
    
    const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (secondsElapsed % 60).toString().padStart(2, '0');
    victoryTimeMsg.innerText = `Your Time: ${mins}:${secs}`;
    victoryScreen.classList.add('show');
}

// 5. Verification Matrix Actions
function validateAndHighlight() {
    const cells = document.querySelectorAll('.cell');
    let errorCount = 0;
    let filledCount = 0;
    const numberCounts = { '1':0, '2':0, '3':0, '4':0, '5':0, '6':0, '7':0, '8':0, '9':0 };

    cells.forEach(cell => {
        cell.classList.remove('error', 'highlight-match', 'highlight-pencil-match');
        const val = cell.querySelector('.cell-value').innerText;
        if (val) {
            filledCount++;
            numberCounts[val]++;
        }
    });

    // Highlighting Logic Rules for active final solutions and matching active pencil marks
    if (activeNumberTool && activeNumberTool !== 'X') {
        cells.forEach(cell => {
            const valDiv = cell.querySelector('.cell-value');
            
            if (valDiv && valDiv.innerText === activeNumberTool) {
                // Primary Highlight: Cell contains the matching solid number
                cell.classList.add('highlight-match');
            } else if (valDiv && !valDiv.innerText) {
                // Secondary Highlight: Cell does NOT have a full answer, check matching inner notes
                const noteSlot = cell.querySelector(`.note-digit[data-note-num="${activeNumberTool}"]`);
                if (noteSlot && noteSlot.innerText === activeNumberTool) {
                    cell.classList.add('highlight-pencil-match');
                }
            }
        });
    }

    cells.forEach(currentCell => {
        const val = currentCell.querySelector('.cell-value').innerText;
        if (!val) return;
        const row = parseInt(currentCell.dataset.row);
        const col = parseInt(currentCell.dataset.col);

        cells.forEach(otherCell => {
            if (currentCell === otherCell) return;
            if (val !== otherCell.querySelector('.cell-value').innerText) return;
            const sameRow = (row === parseInt(otherCell.dataset.row));
            const sameCol = (col === parseInt(otherCell.dataset.col));
            const sameBox = (Math.floor(row / 3) === Math.floor(parseInt(otherCell.dataset.row) / 3) && 
                             Math.floor(col / 3) === Math.floor(parseInt(otherCell.dataset.col) / 3));

            if (sameRow || sameCol || sameBox) {
                currentCell.classList.add('error');
                errorCount++;
            }
        });
    });

    document.querySelectorAll('.num-btn').forEach(btn => {
        const num = btn.dataset.tool;
        if (num && num !== 'X' && num !== 'pencil') {
            if (numberCounts[num] === 9) btn.classList.add('completed-number');
            else btn.classList.remove('completed-number');
        }
    });

    if (filledCount === 81 && errorCount === 0) {
        handleWinRecord();
    }
}

function selectTool(targetTool) {
    if (isGamePaused) return; // Ignore input tools while paused
    if (targetTool === 'pencil') return;
    activeNumberTool = targetTool;
    document.querySelectorAll('.num-btn').forEach(btn => {
        if (btn.dataset.tool === targetTool) btn.classList.add('active-tool');
        else btn.classList.remove('active-tool');
    });
    validateAndHighlight();
}

function setNotesMode(turnOn) {
    if (isGamePaused) return; // Ignore updates while paused
    isNotesModeActive = turnOn;
    const pencilBtn = document.getElementById('pencilBtn');
    if (isNotesModeActive) {
        pencilBtn.classList.add('notes-on');
    } else {
        pencilBtn.classList.remove('notes-on');
    }
}

// 6. Generating Pad Layout Nodes
for (let num = 1; num <= 9; num++) {
    const btn = document.createElement('button');
    btn.classList.add('num-btn');
    btn.innerText = num;
    btn.dataset.tool = num.toString();
    btn.addEventListener('click', () => selectTool(num.toString()));
    numpadContainer.appendChild(btn);
}

// Add Eraser Action Button
const clearBtn = document.createElement('button');
clearBtn.classList.add('num-btn', 'clear-btn');
clearBtn.innerText = '⌫';
clearBtn.dataset.tool = 'X';
clearBtn.addEventListener('click', () => selectTool('X'));
numpadContainer.appendChild(clearBtn);

// Add Pencil Notes Action Button
const pencilBtn = document.createElement('button');
pencilBtn.id = 'pencilBtn';
pencilBtn.classList.add('num-btn', 'pencil-btn');
pencilBtn.innerText = '✏️';
pencilBtn.dataset.tool = 'pencil';
pencilBtn.addEventListener('click', () => setNotesMode(!isNotesModeActive));
numpadContainer.appendChild(pencilBtn);