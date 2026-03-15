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

function checkNotes() {
    cells.forEach((cell, i) => {
        if (cell.dataset.fixed === "true" || cell.classList.contains("filled")) return;

        if (notes[i].size === 1) {
            const singleValue = Array.from(notes[i])[0];

            setCellValue(i, singleValue, false);

            removeNumberFromPeers(i, singleValue);
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
    spans.forEach(s => {
        s.classList.remove("active");
        s.classList.remove("hint-note");
    });
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

    document.querySelectorAll(".cell-notes span").forEach(s => {
        s.classList.remove("same-note");
    });

    if (value) {
        cells.forEach(c => {
            const v = c.querySelector(".cell-value").textContent;

            if (v === value) {
                c.classList.add("same-number");
            }

            const notesSpans = c.querySelectorAll(".cell-notes span");

            notesSpans.forEach(span => {
                if (span.dataset.note === value && span.classList.contains("active")) {
                    span.classList.add("same-note");
                }
            });
        });
    }

    history.push({
        index: index,
        value: value,
        notes: new Set(notes[index])
    });

}

function setCellValue(index, value, shouldHighlight = true) {
    saveHistory(index);

    const cell = cells[index];
    const valueEl = cell.querySelector(".cell-value");

    valueEl.textContent = value;
    cell.classList.add("filled");

    notes[index].clear();
    clearNotesUI(index);

    validateCell(index);

    if (shouldHighlight) {
        highlightNumber(value);
    }

    updateNumberButtons();
    checkWin();
}

/* ======================= CLICK HANDLING ======================= */

cells.forEach((cell, index) => {
    cell.addEventListener("click", () => {
        if (gameOver) return;

        clearSelectionVisuals();
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
        selectedIndex = index;

        resetNumberButtonsVisuals();

        if (value) {
            highlightNumber(Number(value));
        } else {
            if (notes[index].size > 0) {
                notes[index].forEach(num => {
                    highlightNumber(num, false);
                });

                document.querySelectorAll(".numbers button[data-number]").forEach(btn => {
                    const btnNum = Number(btn.dataset.number);
                    if (!notes[index].has(btnNum)) {
                        btn.style.opacity = "0.5";
                    }
                });
            }
        }
    });
});

document.querySelectorAll(".numbers button[data-number]").forEach(btn => {
    btn.addEventListener("click", () => {
        const num = Number(btn.dataset.number);

        highlightNumber(num);

        if (selectedIndex === null || gameOver) return;

        const cell = cells[selectedIndex];
        if (cell.dataset.fixed === "true") return;

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

        removeNumberFromPeers(index, value);
    } else {
        cell.classList.add("wrong");
        cell.classList.remove("correct");
        loseHP();
    }
}

function removeNumberFromPeers(index, number) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const box = Number(cells[index].dataset.box);

    cells.forEach((cell, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;
        const b = Number(cell.dataset.box);

        if (r === row || c === col || b === box) {
            if (notes[i].has(number)) {
                notes[i].delete(number);
                renderNotes(i);
            }
        }
    });
}

/*  GAME STATE  */

function clearSelectionVisuals() {
    cells.forEach(c => {
        c.classList.remove("selected", "highlight", "same-number", "dimmed");
        c.querySelectorAll(".cell-notes span").forEach(s => {
            s.classList.remove("hint-note", "same-note");
        });
    });
    resetNumberButtonsVisuals();
}

document.getElementById("stop").onclick = () => {
    clearSelectionVisuals();
    selectedIndex = null;
};

function updateNumberButtons() {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 0, 8: 0, 9: 0 }; // reset licznika
    for (let i = 1; i <= 9; i++) counts[i] = 0;

    cells.forEach((cell, i) => {
        const val = cell.querySelector(".cell-value").textContent;
        const r = Math.floor(i / 9);
        const c = i % 9;

        if (val && Number(val) === currentSolution[r][c]) {
            counts[val]++;
        }
    });

    document.querySelectorAll(".numbers button[data-number]").forEach(btn => {
        const num = btn.dataset.number;
        if (counts[num] >= 9) {
            btn.disabled = true;
            btn.style.opacity = "0.2";
            btn.style.cursor = "not-allowed";
        } else {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
        }
    });
}

function loseHP() {
    if (gameOver) return;

    hp--;
    hpEl.textContent = hp + "/" + maxhp;

    if (hp <= 0) {
        gameOver = true;
        alert("Przegrana!");
        clearDifficultyActive();
        unlockDifficulty();
    }
}

function startGame(diff, hpAmount) {
    currentSolution = generateSolvedSudoku();
    const puzzle = generatePuzzle(currentSolution, diff);

    clearSelectionVisuals();

    renderBoard(puzzle);
    autoNotes();

    hp = hpAmount;
    maxhp = hpAmount;
    hpEl.textContent = hp + "/" + maxhp;

    if (diff === "easy") pointhelp = 5;
    else if (diff === "medium") pointhelp = 4;
    else if (diff === "hard") pointhelp = 3;
    else pointhelp = 8;

    maxhelp = pointhelp;
    pointHelpEl.textContent = pointhelp + "/" + maxhelp;

    gameOver = false;
    boardActive = true;

    lockDifficulty();
    updateNumberButtons();
}

/* ======================= DIFFICULTY ======================= */

document.getElementById("easy").onclick = function () {
    setDifficultyActive(this);
    startGame("easy", 6);
};

document.getElementById("medium").onclick = function () {
    setDifficultyActive(this);
    startGame("medium", 5);
};

document.getElementById("hard").onclick = function () {
    setDifficultyActive(this);
    startGame("hard", 4);
};

function lockDifficulty() {
    difficultyButtons.forEach(btn => btn.disabled = true);
}

function unlockDifficulty() {
    difficultyButtons.forEach(btn => btn.disabled = false);
}

function setDifficultyActive(btn) {
    difficultyButtons.forEach(b => {
        b.classList.remove("difficulty-active");
    });

    btn.classList.add("difficulty-active");
}

function clearDifficultyActive() {
    difficultyButtons.forEach(btn => {
        btn.classList.remove("difficulty-active");
    });
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

        if (value !== 0) {
            if (value !== Number(currentSolution[r][c])) {
                allCorrect = false;
                cell.classList.add("wrong");
            } else {
                cell.classList.add("correct");
                removeNumberFromPeers(i, value);
            }
        } else {
            allCorrect = false;
        }
    });

    checkNotes();

    if (!allCorrect) {
        if (hp <= 0) {
            if (hp <= 0) {
                gameOver = true;

                winCount = 0;
                winEl.textContent = winCount;

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
    clearSelectionVisuals();
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

function searchBox(boxIndex) {
    const boxCells = Array.from(cells).filter(c => Number(c.dataset.box) === boxIndex);
    return findHiddenSingle(boxCells);
}

function searchRow(rowIndex) {
    const rowCells = Array.from(cells).filter(c => Math.floor(Array.from(cells).indexOf(c) / 9) === rowIndex);
    return findHiddenSingle(rowCells);
}

function searchCol(colIndex) {
    const colCells = Array.from(cells).filter(c => (Array.from(cells).indexOf(c) % 9) === colIndex);
    return findHiddenSingle(colCells);
}

function findHiddenSingle(group) {
    const emptyCells = group.filter(c => !c.querySelector(".cell-value").textContent);

    for (let num = 1; num <= 9; num++) {
        let count = 0;
        let lastFoundCell = null;

        emptyCells.forEach(cell => {
            const idx = Array.from(cells).indexOf(cell);
            if (notes[idx].has(num)) {
                count++;
                lastFoundCell = cell;
            }
        });

        if (count === 1) {
            return { cell: lastFoundCell, number: num, group: group };
        }
    }
    return null;
}

function highlightHelpGroup(groupCells) {
    clearSelectionVisuals();
    groupCells.forEach(c => c.classList.add("highlight"));
}

function markHintNote(cell, num) {
    const span = cell.querySelector(`.cell-notes span[data-note="${num}"]`);
    if (span) {
        span.classList.add("hint-note");
    }
}

helpBtn.onclick = () => {
    if (!boardActive || gameOver || pointhelp <= 0) return;

    clearSelectionVisuals();
    let possibleHints = [];

    for (let i = 0; i < 9; i++) {
        const hint = searchBox(i);
        if (hint) possibleHints.push(hint);
    }

    if (possibleHints.length === 0) {
        for (let i = 0; i < 9; i++) {
            const rowHint = searchRow(i);
            if (rowHint) possibleHints.push(rowHint);

            const colHint = searchCol(i);
            if (colHint) possibleHints.push(colHint);
        }
    }

    if (possibleHints.length > 0) {
        const finalHint = possibleHints[Math.floor(Math.random() * possibleHints.length)];

        highlightHelpGroup(finalHint.group);
        markHintNote(finalHint.cell, finalHint.number);

        selectedIndex = Array.from(cells).indexOf(finalHint.cell);
    } else {
        let emptyIndices = [];
        cells.forEach((cell, i) => {
            if (!cell.querySelector(".cell-value").textContent && cell.dataset.fixed !== "true") {
                emptyIndices.push(i);
            }
        });

        if (emptyIndices.length > 0) {
            const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            const r = Math.floor(randomIndex / 9);
            const c = randomIndex % 9;
            const correctNum = currentSolution[r][c];

            highlightHelpGroup([cells[randomIndex]]);
            setCellValue(randomIndex, correctNum);
            cells[randomIndex].classList.add("correct");
            selectedIndex = randomIndex;
        }
    }

    pointhelp--;
    pointHelpEl.textContent = pointhelp + "/" + maxhelp;
    checkWin();
};


/* cofanie */

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

    updateNumberButtons();
};

/* reset */

document.getElementById("reset").onclick = () => {
    const empty = createEmptyBoard();

    renderBoard(empty);

    currentSolution = null;
    currentPuzzle = null;

    winCount = 0;
    winEl.textContent = winCount;

    history = [];

    selectedIndex = null;

    boardActive = false;
    gameOver = false;

    hp = 0;
    hpEl.textContent = "0";

    pointhelp = 0;
    pointHelpEl.textContent = "0";

    clearSelectionVisuals();
    clearDifficultyActive();
    unlockDifficulty();
};

function resetNumberButtonsVisuals() {
    updateNumberButtons();
}

function highlightNumber(num, clearOthers = true) {
    if (clearOthers) {
        cells.forEach(cell => {
            cell.classList.remove("same-number", "dimmed");
            cell.querySelectorAll(".cell-notes span").forEach(span => span.classList.remove("same-note"));
        });
    }

    if (selectedIndex === null) return;

    const selectedCell = selectedIndex !== null ? cells[selectedIndex] : null;
    const hasValue = selectedCell ? selectedCell.querySelector(".cell-value").textContent !== "" : false;

    cells.forEach(cell => {
        const value = cell.querySelector(".cell-value").textContent;
        const spans = cell.querySelectorAll(".cell-notes span");

        if (hasValue) {
            if (value == num) {
                cell.classList.add("same-number");
            } else {
                cell.classList.add("dimmed")
            }
            spans.forEach(span => {
                if (span.dataset.note == num && span.classList.contains("active")) {
                    span.classList.add("same-note");
                }
            });
        } else {
            spans.forEach(span => {
                if (span.dataset.note == num && span.classList.contains("active")) {
                    span.classList.add("same-note");
                }
            });
        }
    });
}

/* update buttons */

function updateNumberButtons() {
    const board = getCurrentBoard();
    const counts = {};

    for (let i = 1; i <= 9; i++) counts[i] = 0;

    cells.forEach((cell, i) => {
        const val = cell.querySelector(".cell-value").textContent;
        const r = Math.floor(i / 9);
        const c = i % 9;
        if (val && Number(val) === currentSolution[r][c]) {
            counts[val]++;
        }
    });

    document.querySelectorAll(".numbers button[data-number]").forEach(btn => {
        const num = btn.dataset.number;
        if (counts[num] >= 9) {
            btn.disabled = true;
            btn.style.opacity = "0.3";
            btn.style.cursor = "not-allowed";
        } else {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
        }
    });
}

/* auto win */

function checkWin() {
    const board = getCurrentBoard();
    let isComplete = true;

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] === 0 || board[r][c] !== currentSolution[r][c]) {
                isComplete = false;
                break;
            }
        }
        if (!isComplete) break;
    }

    if (isComplete) {
        handleWin();
    }
}

function handleWin() {
    if (!boardActive) return;

    alert("Sudoku poprawne!");

    winCount++;
    winEl.textContent = winCount;

    if (winCount > bestWins) {
        bestWins = winCount;
        bestEl.textContent = bestWins;
    }

    boardActive = false;
    clearSelectionVisuals();
    clearDifficultyActive();
    unlockDifficulty();
    updateNumberButtons();
}
