const SIZE = 9;
const SUBGRID = 3;

let hp = 0;
let maxhp = 0;
let winCount = 0;
let bestWins = 0;

let gameOver = false;
let boardActive = false;
let noteMode = false;

let selectedIndex = null;
let currentSolution = null;
let currentPuzzle = null;

const hpEl = document.getElementById("hp");
const winEl = document.getElementById("wins");
const bestEl = document.getElementById("best");
const boardEl = document.querySelector(".sudoku");

const cells = document.querySelectorAll(".cell");
const difficultyButtons = [
    document.getElementById("easy"),
    document.getElementById("medium"),
    document.getElementById("hard")
];

const notes = Array.from({ length: 81 }, () => new Set());

let pointhelp = 0;
let maxhelp = 0;
let history = [];

const pointHelpEl = document.getElementById("pointhelp");
const helpBtn = document.getElementById("help");

/* ======================= BOARD GENERATION ======================= */

function createEmptyBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function isValid(board, row, col, num) {
    for (let i = 0; i < SIZE; i++) {
        if (board[row][i] === num || board[i][col] === num) return false;
    }

    const startRow = row - row % SUBGRID;
    const startCol = col - col % SUBGRID;

    for (let r = 0; r < SUBGRID; r++) {
        for (let c = 0; c < SUBGRID; c++) {
            if (board[startRow + r][startCol + c] === num) return false;
        }
    }
    return true;
}

function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

function fillBoard(board) {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] === 0) {
                for (let n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
                    if (isValid(board, r, c, n)) {
                        board[r][c] = n;
                        if (fillBoard(board)) return true;
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function generateSolvedSudoku() {
    const board = createEmptyBoard();
    fillBoard(board);
    return board;
}

function copyBoard(board) {
    return board.map(row => [...row]);
}

function generatePuzzle(solution, difficulty) {
    const puzzle = copyBoard(solution);
    let keep = 0.5;

    if (difficulty === "easy") keep = 0.4;
    else if (difficulty === "medium") keep = 0.3;
    else if (difficulty === "hard") keep = 0.2;

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (Math.random() > keep) puzzle[r][c] = 0;
        }
    }

    return puzzle;
}

/* ======================= RENDER ======================= */

function renderBoard(board) {
    currentPuzzle = board;

    cells.forEach((cell, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;
        const valueEl = cell.querySelector(".cell-value");

        notes[i].clear();
        clearNotesUI(i);

        if (board[r][c] === 0) {
            valueEl.textContent = "";
            cell.classList.remove("filled", "fixed");
            cell.dataset.fixed = "false";
        } else {
            valueEl.textContent = board[r][c];
            cell.classList.add("filled", "fixed");
            cell.dataset.fixed = "true";
        }

        cell.classList.remove("correct", "wrong");
    });
}

/* ======================= AUTO NOTES ======================= */

function getPossibleNumbers(board, row, col) {
    const used = new Set();

    for (let i = 0; i < 9; i++) {
        if (board[row][i]) used.add(board[row][i]);
        if (board[i][col]) used.add(board[i][col]);
    }

    const sr = row - row % 3;
    const sc = col - col % 3;

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const v = board[sr + r][sc + c];
            if (v) used.add(v);
        }
    }

    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !used.has(n));
}

function autoNotes() {
    const board = getCurrentBoard();

    cells.forEach((cell, i) => {
        if (cell.dataset.fixed === "true") return;
        if (cell.classList.contains("filled")) return;

        const r = Math.floor(i / 9);
        const c = i % 9;

        const possible = getPossibleNumbers(board, r, c);

        notes[i] = new Set(possible);
        renderNotes(i);

        if (possible.length === 1) {
            setCellValue(i, possible[0]);
        }
    });
}


/* ======================= NOTES UI ======================= */

function renderNotes(index) {
    const cell = cells[index];
    const spans = cell.querySelectorAll(".cell-notes span");

    spans.forEach(span => {
        const num = Number(span.dataset.note);
        span.classList.toggle("active", notes[index].has(num));
    });
}

function clearNotesUI(index) {
    const spans = cells[index].querySelectorAll(".cell-notes span");
    spans.forEach(s => s.classList.remove("active"));
}

function getCurrentBoard() {
    const board = createEmptyBoard();

    cells.forEach((cell, i) => {
        const text = cell.querySelector(".cell-value").textContent;

        const value = text ? Number(text) : 0;

        const r = Math.floor(i / 9);
        const c = i % 9;

        board[r][c] = value;
    });

    return board;
}

/* ======================= VALUE SET ======================= */

function saveHistory(index) {

    const cell = cells[index];
    const value = cell.querySelector(".cell-value").textContent;

    history.push({
        index: index,
        value: value,
        notes: new Set(notes[index])
    });

}

function setCellValue(index, value) {
    saveHistory(index);

    const cell = cells[index];
    const valueEl = cell.querySelector(".cell-value");

    valueEl.textContent = value;
    cell.classList.add("filled");

    notes[index].clear();
    clearNotesUI(index);

    validateCell(index);
}

/* ======================= CLICK HANDLING ======================= */

cells.forEach((cell, index) => {
    cell.addEventListener("click", () => {

        if (gameOver || cell.dataset.fixed === "true") return;

        cells.forEach(c => {
            c.classList.remove("selected");
            c.classList.remove("highlight");
            c.classList.remove("same-number");
        });

        cell.classList.add("selected");

        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        const box = Number(cell.dataset.box);

        cells.forEach(c => {

            if (
                Number(c.dataset.row) === row ||
                Number(c.dataset.col) === col ||
                Number(c.dataset.box) === box
            ) {
                c.classList.add("highlight");
            }

        });

        const value = cell.querySelector(".cell-value").textContent;

        if (value) {
            cells.forEach(c => {
                const v = c.querySelector(".cell-value").textContent;
                if (v === value) {
                    c.classList.add("same-number");
                }
            });
        }

        selectedIndex = index;
    });
});

document.querySelectorAll(".numbers button[data-number]").forEach(btn => {
    btn.addEventListener("click", () => {
        if (selectedIndex === null || gameOver) return;

        const cell = cells[selectedIndex];
        if (cell.dataset.fixed === "true") return;

        const num = Number(btn.dataset.number);

        if (noteMode) {
            if (cell.classList.contains("filled")) return;

            saveHistory(selectedIndex);

            if (notes[selectedIndex].has(num)) {
                notes[selectedIndex].delete(num);
            } else {
                notes[selectedIndex].add(num);
            }

            renderNotes(selectedIndex);

        } else {
            setCellValue(selectedIndex, num);
        }
    });
});

/* ======================= VALIDATION ======================= */

function validateCell(index) {
    const cell = cells[index];
    const value = Number(cell.querySelector(".cell-value").textContent);

    const r = Math.floor(index / 9);
    const c = index % 9;

    if (!value) return;

    if (value === currentSolution[r][c]) {
        cell.classList.add("correct");
        cell.classList.remove("wrong");
    } else {
        cell.classList.add("wrong");
        cell.classList.remove("correct");
        loseHP();
    }
}

/* ======================= GAME STATE ======================= */

function loseHP() {
    if (gameOver) return;

    hp--;
    hpEl.textContent = hp + "/" + maxhp;

    if (hp <= 0) {
        gameOver = true;
        alert("Przegrana!");
        unlockDifficulty();
    }
}

function startGame(diff, hpAmount) {
    currentSolution = generateSolvedSudoku();
    const puzzle = generatePuzzle(currentSolution, diff);

    renderBoard(puzzle);
    autoNotes();

    hp = hpAmount;
    maxhp = hpAmount;
    hpEl.textContent = hp + "/" + maxhp;

    if (diff === "easy") pointhelp = 6;
    else if (diff === "medium") pointhelp = 4;
    else if (diff === "hard") pointhelp = 3;
    else pointhelp = 8;

    maxhelp = pointhelp;
    pointHelpEl.textContent = pointhelp + "/" + maxhelp;

    gameOver = false;
    boardActive = true;

    lockDifficulty();
}

/* ======================= DIFFICULTY ======================= */

document.getElementById("easy").onclick = () => startGame("easy", 7);
document.getElementById("medium").onclick = () => startGame("medium", 5);
document.getElementById("hard").onclick = () => startGame("hard", 5);

function lockDifficulty() {
    difficultyButtons.forEach(btn => btn.disabled = true);
}

function unlockDifficulty() {
    difficultyButtons.forEach(btn => btn.disabled = false);
}

/* ======================= NOTE MODE ======================= */

const notesBtn = document.getElementById("notes-toggle");

notesBtn.onclick = () => {
    noteMode = !noteMode;

    if (noteMode) {
        notesBtn.classList.add("active-notes");
    } else {
        notesBtn.classList.remove("active-notes");
    }
};

/* sprawdz */

document.getElementById("check").onclick = () => {
    if (!boardActive || gameOver) return;

    let allCorrect = true;
    let board = getCurrentBoard();

    cells.forEach((cell, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;

        const value = Number(board[r][c]);

        cell.classList.remove("correct", "wrong");

        if (cell.dataset.fixed === "true") return;

        if (value !== Number(currentSolution[r][c])) {
            allCorrect = false;

            if (value) {
                cell.classList.add("wrong");
            }
        } else {
            cell.classList.add("correct");
        }
    });

    autoNotes();

    if (!allCorrect) {
        loseHP();

        if (hp <= 0) {
            if (hp <= 0) {
                gameOver = true;

                winCount = 0;
                winEl.textContent = winCount;

                /*alert("Przegrana!");*/
                unlockDifficulty();
            }

        }

        return;
    }

    alert("Sudoku poprawne!");

    winCount++;
    winEl.textContent = winCount;

    if (winCount > bestWins) {
        bestWins = winCount;
        bestEl.textContent = bestWins;
    }

    boardActive = false;
    unlockDifficulty();

};

/* usuwanie */

document.getElementById("erase").onclick = () => {
    if (selectedIndex !== null) {
        clearCell(selectedIndex);
    }
};

function clearCell(index) {
    const cell = cells[index];

    if (cell.dataset.fixed === "true") return;

    saveHistory(index);

    const valueEl = cell.querySelector(".cell-value");

    valueEl.textContent = "";

    cell.classList.remove("filled", "correct", "wrong");

    notes[index].clear();
    clearNotesUI(index);
}

/* pomoc */

helpBtn.onclick = () => {

    if (!boardActive || gameOver) return;

    if (pointhelp <= 0) return;

    let emptyCells = [];

    cells.forEach((cell, i) => {

        const value = cell.querySelector(".cell-value").textContent;

        if (!value && cell.dataset.fixed !== "true") {
            emptyCells.push(i);
        }

    });

    if (emptyCells.length === 0) return;

    const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    const r = Math.floor(randomIndex / 9);
    const c = randomIndex % 9;

    const correctNumber = currentSolution[r][c];

    setCellValue(randomIndex, correctNumber);

    cells[randomIndex].classList.add("correct");

    pointhelp--;

    pointHelpEl.textContent = pointhelp + "/" + maxhelp;

};

document.getElementById("back").onclick = () => {

    if (history.length === 0) return;

    const last = history.pop();

    const cell = cells[last.index];
    const valueEl = cell.querySelector(".cell-value");

    valueEl.textContent = last.value;

    if (last.value) {
        cell.classList.add("filled");
    } else {
        cell.classList.remove("filled");
    }

    notes[last.index] = new Set(last.notes);

    renderNotes(last.index);
};
