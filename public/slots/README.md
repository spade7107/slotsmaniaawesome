# Slot engine

The Phaser scene and payout math are shared by slot machines; theme-specific content lives in a separate config module. To add a machine with the same 3×5 rules, create another theme config and pass it to `SlotScene` and the game math instead of copying the reel or payout implementation.

A theme provides:

- `id`, `title`, and palette colors
- `symbols` with unique IDs, display glyphs, labels, and colors
- Five `reelWeights` arrays, one weight per symbol for each reel
- `payouts` keyed by symbol ID and matched count (3, 4, or 5)
- Five-column `paylines` containing row indexes from 0 to 2
- `betPerLineOptions` and `activePaylineOptions`

Keep payout multipliers as whole numbers so demo credits stay integer-valued. The game math and paytable both read from the theme, while the Phaser scene handles only rendering and animation.

From `public/`, run `npm test` for the payout/grid tests and `npm run build` to generate the local Phaser bundle. `npm start` builds the bundle before serving the static pages.
