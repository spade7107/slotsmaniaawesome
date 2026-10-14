const symbols = ['🍒', '🍋', '🔔', '⭐', '7️⃣'];
const SPIN_COST = 10;
let balance = 1000;

document.addEventListener('DOMContentLoaded', () => {
  initBalanceDisplay('balance', 1000).then((value) => {
    balance = value;
  });
});

async function spin() {
    const balanceEl = document.getElementById('balance');
    const messageEl = document.getElementById('message');
    const spinBtn = document.getElementById('spinBtn');

    if (balance < SPIN_COST) {
        messageEl.style.color = '#ff4d4d';
        messageEl.textContent = 'Game Over! Out of cash.';
        return;
    }

    spinBtn.disabled = true;
    messageEl.textContent = 'Spinning... 🎰';
    messageEl.style.color = '#fff';

    try {
        balance = await adjustBalance(-SPIN_COST);
        balanceEl.textContent = balance;
    } catch (err) {
        if (typeof err.balance === 'number') balance = err.balance;
        balanceEl.textContent = balance;
        messageEl.style.color = '#ff4d4d';
        messageEl.textContent = err.message === 'Insufficient funds'
            ? 'Game Over! Out of cash.'
            : 'Could not place bet. Is the server running?';
        spinBtn.disabled = false;
        return;
    }

    // Generate a 3x3 matrix for the final result
    let finalGrid = [
        [randSym(), randSym(), randSym()],
        [randSym(), randSym(), randSym()],
        [randSym(), randSym(), randSym()]
    ];

    let counter = 0;
    const interval = setInterval(() => {
        // Flash random symbols across all 9 slots
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                document.getElementById(`r${r}c${c}`).textContent = randSym();
            }
        }
        counter++;

        // Stop after ~1.8 seconds (30 ticks * 60ms)
        if (counter > 30) {
            clearInterval(interval);

            // Display final grid results
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    document.getElementById(`r${r}c${c}`).textContent = finalGrid[r][c];
                }
            }

            evaluateWins(finalGrid).finally(() => {
                spinBtn.disabled = false;
            });
        }
    }, 60);
}

function randSym() {
    return symbols[Math.floor(Math.random() * symbols.length)];
}

async function evaluateWins(grid) {
    const balanceEl = document.getElementById('balance');
    const messageEl = document.getElementById('message');
    let totalWinnings = 0;
    let winningLinesCount = 0;

    // Helper function for rows and columns (pays more for 7s)
    function checkLine(a, b, c, reward7s, rewardNormal) {
        if (a === b && b === c) {
            winningLinesCount++;
            if (a === '7️⃣') {
                totalWinnings += reward7s;
            } else {
                totalWinnings += rewardNormal;
            }
        }
    }

    // 1. Check Rows (3 horizontal lines)
    for (let r = 0; r < 3; r++) {
        checkLine(grid[r][0], grid[r][1], grid[r][2], 100, 30);
    }

    // 2. Check Columns (3 vertical lines)
    for (let c = 0; c < 3; c++) {
        checkLine(grid[0][c], grid[1][c], grid[2][c], 100, 30);
    }

    // 3. Check Diagonals (2 diagonal lines) (Flat $15)
    function checkDiagonal(a, b, c) {
        if (a === b && b === c) {
            winningLinesCount++;
            totalWinnings += 15;
        }
    }
    checkDiagonal(grid[0][0], grid[1][1], grid[2][2]);
    checkDiagonal(grid[0][2], grid[1][1], grid[2][0]);

    if (winningLinesCount > 0) {
        messageEl.textContent = `WIN! ${winningLinesCount} winning line(s)! (+$${totalWinnings})`;
        messageEl.style.color = '#4cd137';
    } else {
        messageEl.textContent = 'Try again!';
        messageEl.style.color = '#ff4d4d';
    }

    if (totalWinnings > 0) {
        try {
            balance = await adjustBalance(totalWinnings);
        } catch {
            messageEl.textContent = 'You won, but balance could not be saved.';
            messageEl.style.color = '#ff4d4d';
        }
    }
    balanceEl.textContent = balance;
}
