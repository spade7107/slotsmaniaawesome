import Phaser from "phaser";
import { cyberpunkTheme } from "./cyberpunk-theme.mjs";
import { evaluateSpin, generateGrid, getTotalBet } from "./game-math.mjs";
import { SlotScene } from "./slot-scene.mjs";

const balanceElement = document.getElementById("balance");
const betOptionsElement = document.getElementById("bet-options");
const lineOptionsElement = document.getElementById("line-options");
const totalBetElement = document.getElementById("total-bet");
const spinButton = document.getElementById("spin-button");
const statusElement = document.getElementById("game-status");
const paytableBody = document.getElementById("paytable-body");
const stageElement = document.getElementById("slot-stage");

let balance = 1000;
let betPerLine = cyberpunkTheme.betPerLineOptions[0];
let activePaylineCount = cyberpunkTheme.activePaylineOptions[1];
let isSpinning = false;
let gameScene = null;

function formatCredits(amount) {
  return amount.toLocaleString("en-US");
}

function setStatus(message, state = "info") {
  statusElement.textContent = message;
  statusElement.dataset.state = state;
}

function currentTotalBet() {
  return getTotalBet(betPerLine, activePaylineCount);
}

function updateControls() {
  const totalBet = currentTotalBet();
  balanceElement.textContent = formatCredits(balance);
  totalBetElement.textContent = formatCredits(totalBet);
  spinButton.disabled = !gameScene || isSpinning || balance < totalBet;

  for (const button of [...betOptionsElement.children, ...lineOptionsElement.children]) {
    button.disabled = isSpinning;
  }
}

function renderChoiceButtons(container, values, selectedValue, label, onSelect) {
  container.replaceChildren(...values.map((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.textContent = String(value);
    button.setAttribute("aria-label", label(value));
    button.setAttribute("aria-pressed", String(value === selectedValue));
    button.addEventListener("click", () => {
      onSelect(value);
      for (const choice of container.children) {
        choice.setAttribute("aria-pressed", String(choice === button));
      }
      updateControls();
      if (balance < currentTotalBet()) {
        setStatus(`Not enough credits for this bet. You need ${formatCredits(currentTotalBet())}.`, "error");
      } else {
        setStatus(`Ready to spin for ${formatCredits(currentTotalBet())} credits.`, "info");
      }
    });
    return button;
  }));
}

function renderPaytable() {
  const rows = cyberpunkTheme.symbols.map((symbol) => {
    const row = document.createElement("tr");
    const symbolCell = document.createElement("td");
    const glyph = document.createElement("span");
    glyph.className = "paytable-symbol";
    glyph.textContent = symbol.glyph;
    glyph.style.color = symbol.color;
    glyph.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = symbol.label;
    symbolCell.append(glyph, label);
    row.append(symbolCell);

    for (const count of [3, 4, 5]) {
      const value = document.createElement("td");
      value.textContent = `${cyberpunkTheme.payouts[symbol.id][count]}×`;
      if (symbol.id === "seven") value.className = "jackpot-value";
      row.append(value);
    }
    return row;
  });

  paytableBody.replaceChildren(...rows);
}

function listWinningLines(wins) {
  const lineNumbers = wins.map((win) => win.payline);
  const visibleLines = lineNumbers.slice(0, 6).join(", ");
  const remaining = lineNumbers.length > 6 ? ` and ${lineNumbers.length - 6} more` : "";
  return `Paylines ${visibleLines}${remaining}`;
}

async function settleSpin(result) {
  if (result.totalWin > 0) {
    try {
      balance = await window.adjustBalance(result.totalWin);
      setStatus(
        `WIN! ${formatCredits(result.totalWin)} credits · ${listWinningLines(result.wins)}.`,
        "win",
      );
    } catch (error) {
      if (typeof error?.balance === "number") balance = error.balance;
      const details = error instanceof Error ? error.message : "Unknown balance error.";
      setStatus(
        `The reels paid ${formatCredits(result.totalWin)} credits, but the balance could not be saved: ${details}`,
        "error",
      );
    }
  } else {
    setStatus("No line wins this time. Try another combination.", "info");
  }

  isSpinning = false;
  updateControls();
}

async function handleSpin() {
  if (!gameScene || isSpinning) return;

  const totalBet = currentTotalBet();
  if (balance < totalBet) {
    setStatus(`Not enough credits for this bet. You need ${formatCredits(totalBet)}.`, "error");
    return;
  }

  let grid;
  let result;
  try {
    grid = generateGrid(cyberpunkTheme);
    const activePaylineIndexes = Array.from({ length: activePaylineCount }, (_, index) => index);
    result = evaluateSpin(grid, activePaylineIndexes, betPerLine, cyberpunkTheme);
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown game error.";
    setStatus(`Could not prepare this spin: ${details}`, "error");
    return;
  }

  isSpinning = true;
  updateControls();
  setStatus("Placing your bet…", "info");

  try {
    balance = await window.adjustBalance(-totalBet);
  } catch (error) {
    isSpinning = false;
    if (typeof error?.balance === "number") balance = error.balance;
    const details = error instanceof Error ? error.message : "Unknown balance error.";
    setStatus(`Could not place this bet: ${details}`, "error");
    updateControls();
    return;
  }

  setStatus("Reels in motion…", "info");

  try {
    gameScene.spin(grid, result.wins, () => {
      void settleSpin(result);
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown animation error.";
    try {
      balance = await window.adjustBalance(totalBet);
      setStatus(`The spin could not start; your ${formatCredits(totalBet)}-credit bet was returned.`, "error");
    } catch (refundError) {
      if (typeof refundError?.balance === "number") balance = refundError.balance;
      const refundDetails = refundError instanceof Error ? refundError.message : "Unknown balance error.";
      setStatus(`Spin failed: ${details}. The bet refund also failed: ${refundDetails}`, "error");
    }
    isSpinning = false;
    updateControls();
  }
}

class CyberpunkSlotScene extends SlotScene {
  constructor() {
    super(cyberpunkTheme);
  }
}

async function startGame() {
  renderChoiceButtons(
    betOptionsElement,
    cyberpunkTheme.betPerLineOptions,
    betPerLine,
    (value) => `${value} credits per line`,
    (value) => { betPerLine = value; },
  );
  renderChoiceButtons(
    lineOptionsElement,
    cyberpunkTheme.activePaylineOptions,
    activePaylineCount,
    (value) => `${value} active paylines`,
    (value) => { activePaylineCount = value; },
  );
  renderPaytable();
  spinButton.addEventListener("click", () => void handleSpin());

  try {
    if (typeof window.initBalanceDisplay !== "function" || typeof window.adjustBalance !== "function") {
      throw new Error("The shared credit service is unavailable.");
    }
    balance = await window.initBalanceDisplay("balance", 1000);
    updateControls();
    setStatus("Choose your bet and active paylines to begin.", "info");

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: stageElement,
      width: 960,
      height: 480,
      backgroundColor: cyberpunkTheme.colors.background,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        roundPixels: true,
      },
      scene: [CyberpunkSlotScene],
    });

    const setGameScene = (scene) => {
      if (gameScene) return;
      gameScene = scene;
      updateControls();
    };
    game.events.once("slot-scene-ready", setGameScene);
    const activeScene = game.scene.getScene("SlotScene");
    if (activeScene?.isReady) setGameScene(activeScene);
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown startup error.";
    setStatus(`The slots game could not start: ${details}`, "error");
    spinButton.disabled = true;
  }
}

window.addEventListener("storage", async (event) => {
  if (event.key !== "casinoBalance" && event.key !== null) return;

  try {
    balance = await window.initBalanceDisplay("balance", 1000);
    updateControls();
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown balance error.";
    setStatus(`Could not refresh the shared balance: ${details}`, "error");
  }
});

void startGame();
