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

type ReelCellDisplay = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  glyph: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
};

type ReelState = {
  container: Phaser.GameObjects.Container;
  cells: ReelCellDisplay[];
  offset: number;
  startAt: number;
  stopAt: number;
  deceleration?: {
    elapsed: number;
    duration: number;
    distance: number;
  };
  stopped: boolean;
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
    private reels: ReelState[] = [];
    private reelMaskSource: Phaser.GameObjects.Graphics | null = null;
    private reelMask: Phaser.Display.Masks.GeometryMask | null = null;
    private spinElapsed = 0;
    private spinning = false;
    private resultGrid: string[][] | null = null;
    private resultWins: SlotWin[] = [];
    private onSpinComplete: (() => void) | null = null;

    constructor() {
      super({ key: "CyberpunkSlotScene" });
    }

    create() {
      this.drawMachine();
      this.scale.on("resize", () => {
        if (!this.spinning) this.drawMachine();
      });
      onReady(this);
    }

    update(_time: number, delta: number) {
      if (!this.spinning || !this.resultGrid) return;

      this.spinElapsed += Math.min(delta, 50);
      for (let column = 0; column < this.reels.length; column += 1) {
        const reel = this.reels[column];
        if (reel.stopped || this.spinElapsed < reel.startAt) continue;

        if (!reel.deceleration && this.spinElapsed >= reel.stopAt) {
          this.beginDeceleration(reel);
        }

        if (reel.deceleration) {
          this.advanceDeceleration(reel, column, delta);
        } else {
          this.advanceReel(reel, column, 1.15 * Math.min(delta, 50));
        }
      }

      if (this.reels.every((reel) => reel.stopped)) {
        this.currentGrid = this.resultGrid;
        this.winningCells = new Set(
          this.resultWins.flatMap((win) =>
            win.cells.map(({ row, column }) => `${row},${column}`),
          ),
        );
        this.winningLines = this.resultWins.map((win) => win.cells);
        this.spinning = false;
        this.resultGrid = null;
        this.time.delayedCall(150, () => {
          this.drawMachine();
          this.onSpinComplete?.();
          this.onSpinComplete = null;
        });
      }
    }

    private drawMachine() {
      this.reelMask?.destroy();
      this.reelMask = null;
      this.reelMaskSource?.destroy();
      this.reelMaskSource = null;
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
      const step = cellHeight + gap;
      const startX = frame.x + inset + cellWidth / 2;
      const startY = frame.y + inset + cellHeight / 2;
      this.reelMaskSource = this.make.graphics({ x: 0, y: 0 }, false);
      this.reelMaskSource.fillRect(
        frame.x + inset,
        frame.y + inset,
        frame.width - inset * 2,
        frame.height - inset * 2,
      );
      this.reelMask = this.reelMaskSource.createGeometryMask();
      this.reels = [];
      const cellCenters: Array<Array<{ x: number; y: number }>> =
        Array.from({ length: SLOT_ROWS }, () => []);

      for (let column = 0; column < SLOT_COLUMNS; column += 1) {
        const container = this.add.container(startX + column * (cellWidth + gap), startY);
        container.setMask(this.reelMask);
        const cells: ReelCellDisplay[] = [];

        for (let index = 0; index < SLOT_ROWS + 2; index += 1) {
          const row = index - 1;
          const symbolId = row >= 0 && row < SLOT_ROWS
            ? this.currentGrid[row][column]
            : generateSlotGrid(theme)[0][column];
          const symbol = theme.symbols.find((entry) => entry.id === symbolId);
          if (!symbol) throw new Error(`Unknown slot symbol: ${symbolId}`);

          const highlighted = row >= 0
            && row < SLOT_ROWS
            && this.winningCells.has(`${row},${column}`);
          const background = this.add.rectangle(
            0,
            0,
            cellWidth,
            cellHeight,
            colorValue(highlighted ? colors.cellWin : colors.cell),
          );
          background.setStrokeStyle(
            highlighted ? 3 : 1,
            colorValue(highlighted ? symbol.color : colors.border),
            1,
          );
          const glyph = this.add.text(0, -cellHeight * 0.08, symbol.glyph, {
            color: symbol.color,
            fontFamily: "Arial, sans-serif",
            fontSize: `${Math.max(22, Math.min(58, cellWidth * 0.48, cellHeight * 0.54))}px`,
            fontStyle: "bold",
          }).setOrigin(0.5);
          const label = this.add.text(0, cellHeight * 0.34, symbol.label, {
            color: colors.muted,
            fontFamily: "Arial, sans-serif",
            fontSize: `${Math.max(8, Math.min(12, cellWidth * 0.18))}px`,
            fontStyle: "bold",
            letterSpacing: 1,
          }).setOrigin(0.5);
          const cellContainer = this.add.container(0, row * step, [background, glyph, label]);
          container.add(cellContainer);
          cells.push({ container: cellContainer, background, glyph, label });

          if (row >= 0 && row < SLOT_ROWS) {
            cellCenters[row][column] = {
              x: startX + column * (cellWidth + gap),
              y: startY + row * step,
            };
          }
        }

        this.reels.push({
          container,
          cells,
          offset: 0,
          startAt: column * 70,
          stopAt: column * 70 + 1_300 + column * 450,
          stopped: true,
        });
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
      if (this.spinning) throw new Error("The slot reels are already spinning.");
      if (
        grid.length !== SLOT_ROWS
        || grid.some((row) => row.length !== SLOT_COLUMNS)
      ) {
        throw new Error("The slot result has an invalid grid.");
      }

      this.winningCells.clear();
      this.winningLines = [];
      this.drawMachine();
      this.spinElapsed = 0;
      this.resultGrid = grid;
      this.resultWins = wins;
      this.onSpinComplete = onComplete;
      this.spinning = true;
      this.reels.forEach((reel, column) => {
        reel.offset = 0;
        reel.startAt = column * 70;
        reel.stopAt = reel.startAt + 1_300 + column * 450;
        reel.deceleration = undefined;
        reel.stopped = false;
      });
    }

    private beginDeceleration(reel: ReelState) {
      const step = reel.cells[0].background.height + Math.min(8, Math.max(4, this.scale.width * 0.01));
      const speed = 1.15;
      const turns = Math.max(1, Math.round(speed * 650 / (2 * step)));
      const distance = turns * step + reel.offset;
      reel.deceleration = {
        elapsed: 0,
        duration: (2 * distance) / speed,
        distance,
      };
    }

    private advanceDeceleration(reel: ReelState, column: number, delta: number) {
      const deceleration = reel.deceleration;
      if (!deceleration) return;

      deceleration.elapsed += Math.min(delta, 50);
      const progress = Math.min(1, deceleration.elapsed / deceleration.duration);
      const easedProgress = 1 - (1 - progress) ** 2;
      const traveled = deceleration.distance * easedProgress;
      const previousProgress = 1 - (1 - Math.max(0, progress - Math.min(delta, 50) / deceleration.duration)) ** 2;
      this.advanceReel(reel, column, traveled - deceleration.distance * previousProgress);
      if (progress === 1) this.landReel(reel, column);
    }

    private advanceReel(reel: ReelState, column: number, distance: number) {
      const step = reel.cells[0].background.height + Math.min(8, Math.max(4, this.scale.width * 0.01));
      reel.offset -= distance;
      while (reel.offset <= -step) {
        reel.offset += step;
        const recycledCell = reel.cells.shift();
        if (!recycledCell) throw new Error("Slot reel has no cells to recycle.");
        const nextSymbol = generateSlotGrid(theme)[0][column];
        this.setCellSymbol(recycledCell, nextSymbol);
        reel.cells.push(recycledCell);
        reel.cells.forEach((cell, index) => {
          cell.container.y = (index - 1) * step;
        });
      }
      reel.container.y = this.getReelStartY() + reel.offset;
    }

    private landReel(reel: ReelState, column: number) {
      const resultGrid = this.resultGrid;
      if (!resultGrid) throw new Error("Slot reel stopped without a result.");

      for (let index = 0; index < SLOT_ROWS; index += 1) {
        const cell = reel.cells[index + 1];
        if (!cell) throw new Error("Slot reel is missing a visible cell.");
        this.setCellSymbol(cell, resultGrid[index][column]);
      }

      reel.offset = 0;
      reel.container.y = this.getReelStartY();
      reel.stopped = true;
      this.tweens.add({
        targets: reel.container,
        y: this.getReelStartY() + 7,
        duration: 70,
        yoyo: true,
        ease: "Sine.easeOut",
      });
    }

    private setCellSymbol(cell: ReelCellDisplay, symbolId: string) {
      const symbol = theme.symbols.find((entry) => entry.id === symbolId);
      if (!symbol) throw new Error(`Unknown slot symbol: ${symbolId}`);

      cell.glyph.setText(symbol.glyph).setColor(symbol.color);
      cell.label.setText(symbol.label);
    }

    private getReelStartY() {
      const frame = { y: 44, height: this.scale.height - 56 };
      const inset = Math.min(12, Math.max(7, this.scale.width * 0.014));
      const gap = Math.min(8, Math.max(4, this.scale.width * 0.01));
      const cellHeight = (frame.height - inset * 2 - gap * (SLOT_ROWS - 1)) / SLOT_ROWS;
      return frame.y + inset + cellHeight / 2;
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
