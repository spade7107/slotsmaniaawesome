import {
  generateSlotGrid,
  SLOT_COLUMNS,
  SLOT_ROWS,
  type SlotTheme,
  type SlotWin,
} from "@/lib/slots";

type SlotSceneHandle = {
  spin: (grid: string[][], wins: SlotWin[], onComplete: () => void) => void;
};

function colorValue(color: string): number {
  return Number.parseInt(color.slice(1), 16);
}

export async function createSlotGame(
  parent: HTMLElement,
  theme: SlotTheme,
  onReady: (scene: SlotSceneHandle) => void,
): Promise<() => void> {
  const Phaser = (await import("phaser")).default;

  class CyberpunkSlotScene extends Phaser.Scene implements SlotSceneHandle {
    private currentGrid = generateSlotGrid(theme);
    private winningCells = new Set<string>();
    private winningLines: SlotWin["cells"][] = [];
    private cellDisplays: Array<Array<{
      background: Phaser.GameObjects.Rectangle;
      glyph: Phaser.GameObjects.Text;
      label: Phaser.GameObjects.Text;
    }>> = [];

    constructor() {
      super({ key: "CyberpunkSlotScene" });
    }

    create() {
      this.drawMachine();
      this.scale.on("resize", this.drawMachine, this);
      onReady(this);
    }

    private drawMachine() {
      this.children.removeAll(true);
      const width = this.scale.width;
      const height = this.scale.height;
      const { colors } = theme;
      this.cameras.main.setBackgroundColor(colors.background);

      const cabinet = this.add.graphics();
      cabinet.fillStyle(colorValue(colors.panel), 1);
      cabinet.fillRoundedRect(8, 8, width - 16, height - 16, 18);
      cabinet.lineStyle(2, colorValue(colors.border), 1);
      cabinet.strokeRoundedRect(8, 8, width - 16, height - 16, 18);

      this.add.text(width / 2, 25, theme.title, {
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
      const cellWidth = (frame.width - inset * 2 - gap * (SLOT_COLUMNS - 1)) / SLOT_COLUMNS;
      const cellHeight = (frame.height - inset * 2 - gap * (SLOT_ROWS - 1)) / SLOT_ROWS;
      const startX = frame.x + inset + cellWidth / 2;
      const startY = frame.y + inset + cellHeight / 2;
      this.cellDisplays = Array.from({ length: SLOT_ROWS }, () => []);
      const cellCenters: Array<Array<{ x: number; y: number }>> =
        Array.from({ length: SLOT_ROWS }, () => []);

      for (let row = 0; row < SLOT_ROWS; row += 1) {
        for (let column = 0; column < SLOT_COLUMNS; column += 1) {
          const x = startX + column * (cellWidth + gap);
          const y = startY + row * (cellHeight + gap);
          const symbol = theme.symbols.find((entry) => entry.id === this.currentGrid[row][column]);
          if (!symbol) throw new Error(`Unknown slot symbol: ${this.currentGrid[row][column]}`);

          const background = this.add.rectangle(
            x,
            y,
            cellWidth,
            cellHeight,
            colorValue(this.winningCells.has(`${row},${column}`) ? colors.cellWin : colors.cell),
          );
          background.setStrokeStyle(
            this.winningCells.has(`${row},${column}`) ? 3 : 1,
            colorValue(this.winningCells.has(`${row},${column}`) ? symbol.color : colors.border),
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
        lineGraphic.moveTo(
          cellCenters[line[0].row][line[0].column].x,
          cellCenters[line[0].row][line[0].column].y,
        );
        for (const cell of line.slice(1)) {
          lineGraphic.lineTo(cellCenters[cell.row][cell.column].x, cellCenters[cell.row][cell.column].y);
        }
        lineGraphic.strokePath();
      }
    }

    spin(grid: string[][], wins: SlotWin[], onComplete: () => void) {
      this.winningCells.clear();
      this.winningLines = [];
      this.drawMachine();
      let stoppedReels = 0;

      for (let column = 0; column < SLOT_COLUMNS; column += 1) {
        const stopAfter = 8 + column * 3;
        let tick = 0;
        this.time.addEvent({
          delay: 75,
          repeat: stopAfter,
          callback: () => {
            const stopped = tick >= stopAfter;
            const animatedGrid = stopped ? grid : generateSlotGrid(theme);
            for (let row = 0; row < SLOT_ROWS; row += 1) {
              const symbolId = animatedGrid[row][column];
              this.currentGrid[row][column] = symbolId;
              this.updateCell(row, column, symbolId);
            }
            tick += 1;

            if (stopped) {
              stoppedReels += 1;
              if (stoppedReels === SLOT_COLUMNS) {
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

    private updateCell(row: number, column: number, symbolId: string) {
      const display = this.cellDisplays[row]?.[column];
      const symbol = theme.symbols.find((entry) => entry.id === symbolId);
      if (!display || !symbol) throw new Error(`Unknown slot symbol: ${symbolId}`);

      display.glyph.setText(symbol.glyph).setColor(symbol.color);
      display.label.setText(symbol.label);
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 480,
    backgroundColor: theme.colors.background,
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

  return () => game.destroy(true);
}

export type { SlotSceneHandle };
