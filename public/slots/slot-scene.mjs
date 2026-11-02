import Phaser from "phaser";
import { COLUMNS, generateGrid, pickSymbol, ROWS } from "./game-math.mjs";

function colorValue(color) {
  return Number.parseInt(color.slice(1), 16);
}

export class SlotScene extends Phaser.Scene {
  constructor(theme) {
    super({ key: "SlotScene" });
    this.theme = theme;
    this.currentGrid = generateGrid(theme);
    this.winningCells = new Set();
    this.winningLines = [];
    this.cellDisplays = [];
    this.isReady = false;
  }

  create() {
    this.drawMachine();
    this.scale.on("resize", this.drawMachine, this);
    this.isReady = true;
    this.game.events.emit("slot-scene-ready", this);
  }

  drawMachine() {
    if (!this.add) return;
    this.children.removeAll(true);

    const width = this.scale.width;
    const height = this.scale.height;
    const { colors } = this.theme;
    this.cameras.main.setBackgroundColor(colors.background);

    const cabinet = this.add.graphics();
    cabinet.fillStyle(colorValue(colors.panel), 1);
    cabinet.fillRoundedRect(8, 8, width - 16, height - 16, 18);
    cabinet.lineStyle(2, colorValue(colors.border), 1);
    cabinet.strokeRoundedRect(8, 8, width - 16, height - 16, 18);

    this.add.text(width / 2, 25, this.theme.title, {
      color: colors.accent,
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
      letterSpacing: 3,
    }).setOrigin(0.5);

    const frame = {
      x: 18,
      y: 44,
      width: width - 36,
      height: height - 56,
    };
    const frameGraphic = this.add.graphics();
    frameGraphic.fillStyle(colorValue(colors.frame), 1);
    frameGraphic.fillRoundedRect(frame.x, frame.y, frame.width, frame.height, 12);
    frameGraphic.lineStyle(1, colorValue(colors.secondary), 0.75);
    frameGraphic.strokeRoundedRect(frame.x, frame.y, frame.width, frame.height, 12);

    const gap = Math.min(8, Math.max(4, width * 0.01));
    const inset = Math.min(12, Math.max(7, width * 0.014));
    const cellWidth = (frame.width - inset * 2 - gap * (COLUMNS - 1)) / COLUMNS;
    const cellHeight = (frame.height - inset * 2 - gap * (ROWS - 1)) / ROWS;
    const startX = frame.x + inset + cellWidth / 2;
    const startY = frame.y + inset + cellHeight / 2;
    this.cellDisplays = Array.from({ length: ROWS }, () => Array(COLUMNS));
    const cellCenters = Array.from({ length: ROWS }, () => Array(COLUMNS));

    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const x = startX + column * (cellWidth + gap);
        const y = startY + row * (cellHeight + gap);
        const symbol = this.getSymbol(this.currentGrid[row][column]);
        const isWinningCell = this.winningCells.has(`${row},${column}`);
        const background = this.add.rectangle(
          x,
          y,
          cellWidth,
          cellHeight,
          colorValue(isWinningCell ? colors.cellWin : colors.cell),
        );
        background.setStrokeStyle(
          isWinningCell ? 3 : 1,
          colorValue(isWinningCell ? symbol.color : colors.border),
          1,
        );

        const glyph = this.add.text(x, y - cellHeight * 0.08, symbol.glyph, {
          color: symbol.color,
          fontFamily: "Arial, sans-serif",
          fontSize: `${Math.max(22, Math.min(58, cellWidth * 0.48, cellHeight * 0.54))}px`,
          fontStyle: "bold",
        }).setOrigin(0.5);
        const label = this.add.text(x, y + cellHeight * 0.34, symbol.label, {
          color: colors.muted,
          fontFamily: "Arial, sans-serif",
          fontSize: `${Math.max(8, Math.min(12, cellWidth * 0.18))}px`,
          fontStyle: "bold",
          letterSpacing: 1,
        }).setOrigin(0.5);

        this.cellDisplays[row][column] = { background, glyph, label };
        cellCenters[row][column] = { x, y };
      }
    }

    const lineGraphic = this.add.graphics();
    for (const line of this.winningLines) {
      if (line.length < 2) continue;
      lineGraphic.lineStyle(2, colorValue(colors.accent), 0.45);
      lineGraphic.beginPath();
      lineGraphic.moveTo(cellCenters[line[0].row][line[0].column].x, cellCenters[line[0].row][line[0].column].y);
      for (const cell of line.slice(1)) {
        lineGraphic.lineTo(cellCenters[cell.row][cell.column].x, cellCenters[cell.row][cell.column].y);
      }
      lineGraphic.strokePath();
    }
  }

  spin(finalGrid, wins, onComplete) {
    this.winningCells.clear();
    this.winningLines = [];
    this.drawMachine();
    let stoppedReels = 0;

    for (let column = 0; column < COLUMNS; column += 1) {
      const stopAfter = 10 + column * 3;
      let tick = 0;
      this.time.addEvent({
        delay: 75,
        repeat: stopAfter,
        callback: () => {
          const stopped = tick >= stopAfter;
          for (let row = 0; row < ROWS; row += 1) {
            const symbol = stopped
              ? finalGrid[row][column]
              : pickSymbol(this.theme, column);
            this.currentGrid[row][column] = symbol;
            this.updateCell(row, column, symbol);
          }
          tick += 1;

          if (stopped) {
            stoppedReels += 1;
            if (stoppedReels === COLUMNS) {
              this.winningCells = new Set(
                wins.flatMap((win) => win.cells.map(({ row, column: winningColumn }) =>
                  `${row},${winningColumn}`,
                )),
              );
              this.winningLines = wins.map((win) => win.cells);
              this.drawMachine();
              onComplete();
            }
          }
        },
      });
    }
  }

  updateCell(row, column, symbolId) {
    const display = this.cellDisplays[row]?.[column];
    if (!display) return;

    const symbol = this.getSymbol(symbolId);
    display.glyph.setText(symbol.glyph).setColor(symbol.color);
    display.label.setText(symbol.label);
  }

  getSymbol(symbolId) {
    const symbol = this.theme.symbols.find((entry) => entry.id === symbolId);
    if (!symbol) throw new RangeError(`Unknown slot symbol: ${symbolId}.`);
    return symbol;
  }
}
