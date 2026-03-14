const SIZE = 9;
const SUBGRID = 3;

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
                const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                for (let n of nums) {
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

function countSolutions(board, limit = 2) {
    let solutions = 0;

    function solve(b) {
        if (solutions >= limit) return;

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (b[r][c] === 0) {
                    for (let n = 1; n <= 9; n++) {
                        if (isValid(b, r, c, n)) {
                            b[r][c] = n;
                            solve(b);
                            b[r][c] = 0;
                        }
                    }
                    return;
                }
            }
        }
        solutions++;
    }

    solve(board);
    return solutions;
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
    let puzzle = copyBoard(solution);

    let keep;
    if (difficulty === "easy") keep = 40;
    else if (difficulty === "medium") keep = 30;
    else if (difficulty === "hard") keep = 25;
    else if (difficulty === "test") keep = 60;

    let attempts = shuffle([...Array(81).keys()]);
    let currentGivens = 81;

    for (let index of attempts) {
        if (currentGivens <= keep) break;

        const r = Math.floor(index / 9);
        const c = index % 9;

        const backup = puzzle[r][c];
        puzzle[r][c] = 0;

        if (countSolutions(copyBoard(puzzle)) !== 1) {
            puzzle[r][c] = backup;
        } else {
            currentGivens--;
        }
    }

    return puzzle;
}
