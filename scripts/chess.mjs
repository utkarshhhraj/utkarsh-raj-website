// Build-time only. Turns data/chess-game.json (a PGN plus labels) into data/chess.json:
// one FEN board string per ply, the SAN of each move and its from/to squares.
//   node scripts/chess.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('./package.json', import.meta.url));
const { Chess } = require('chess.js');
const src = JSON.parse(readFileSync('data/chess-game.json', 'utf8'));
const game = new Chess();
game.loadPgn(src.pgn);
const moves = game.history({ verbose: true });
const replay = new Chess();
const plies = [{ fen: replay.fen().split(' ')[0], san: '', from: '', to: '', n: '' }];
moves.forEach((m, i) => {
  replay.move(m.san);
  const num = Math.floor(i / 2) + 1;
  plies.push({ fen: replay.fen().split(' ')[0], san: m.san, from: m.from, to: m.to, n: i % 2 === 0 ? `${num}.` : `${num}…` });
});
const start = Math.max(0, (src.startPly ?? 0));
writeFileSync('data/chess.json', JSON.stringify({ ...src, pgn: undefined, startPly: start, plies }) + '\n');
console.log(`${moves.length} moves, replay from ply ${start}, result ${src.result}`);
