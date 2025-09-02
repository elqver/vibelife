import { clamp } from '../utils.js';
import { PATTERNS } from './patterns.js';

/**
 * Core logic for Conway's Game of Life.
 *
 * The engine knows nothing about the DOM or React – it simply stores the
 * state of the board and provides functions to evolve it.
 * This separation keeps the logic testable and easy to understand.
 */
export function createGame(initialCols, initialRows, initialSmoke = 3) {
  // --- Internal mutable state ------------------------------------------------
  let cols = clamp(Math.floor(initialCols), 10, 400);
  let rows = clamp(Math.floor(initialRows), 10, 300);
  let grid = new Uint8Array(cols * rows);
  let next = new Uint8Array(cols * rows);
  let fade = new Uint8Array(cols * rows);
  let fadeNext = new Uint8Array(cols * rows);
  let generation = 0;
  let smokeSteps = clamp(initialSmoke, 0, 50);

  // --- Helpers ---------------------------------------------------------------
  const idx = (x, y) => y * cols + x; // convert 2D coordinates to array index

  function neighbors(x, y, wrap) {
    // Count alive neighbours around cell (x, y)
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        let nx = x + dx, ny = y + dy;
        if (wrap) {
          // Wrap around edges to create a toroidal surface
          if (nx < 0) nx = cols - 1; else if (nx >= cols) nx = 0;
          if (ny < 0) ny = rows - 1; else if (ny >= rows) ny = 0;
          n += grid[idx(nx, ny)];
        } else if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
          n += grid[idx(nx, ny)];
        }
      }
    }
    return n;
  }

  // --- Public API ------------------------------------------------------------
  function step(wrap) {
    // Advance the simulation by one generation
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = idx(x, y);
        const a = grid[i];
        const nb = neighbors(x, y, wrap);
        const alive = (a ? (nb === 2 || nb === 3) : (nb === 3)) ? 1 : 0;
        next[i] = alive;
        if (alive) {
          fadeNext[i] = 0;             // cell is alive → no smoke
        } else if (a) {
          fadeNext[i] = smokeSteps;    // just died → start smoke
        } else {
          const f = Math.min(fade[i], smokeSteps);
          fadeNext[i] = f > 0 ? f - 1 : 0; // fade existing smoke
        }
      }
    }
    // swap buffers
    [grid, next] = [next, grid];
    [fade, fadeNext] = [fadeNext, fade];
    generation++;
  }

  function randomize(prob = 0.25) {
    // Fill the board with random alive cells
    for (let i = 0; i < grid.length; i++) {
      grid[i] = (Math.random() < prob) ? 1 : 0;
      fade[i] = 0;
    }
    generation = 0;
  }

  function clear() {
    grid.fill(0);
    fade.fill(0);
    generation = 0;
  }

  function countAlive() {
    let s = 0;
    for (let i = 0; i < grid.length; i++) s += grid[i];
    return s;
  }

  function setSize(newCols, newRows, preserve = false) {
    // Resize the board, optionally preserving existing cells
    newCols = clamp(Math.floor(newCols), 10, 400);
    newRows = clamp(Math.floor(newRows), 10, 300);
    if (newCols === cols && newRows === rows) return;

    let newGrid = new Uint8Array(newCols * newRows);
    let newNext = new Uint8Array(newCols * newRows);
    let newFade = new Uint8Array(newCols * newRows);
    let newFadeNext = new Uint8Array(newCols * newRows);

    if (preserve) {
      const minCols = Math.min(cols, newCols);
      const minRows = Math.min(rows, newRows);
      for (let y = 0; y < minRows; y++) {
        for (let x = 0; x < minCols; x++) {
          newGrid[y * newCols + x] = grid[y * cols + x];
          newFade[y * newCols + x] = Math.min(fade[y * cols + x], smokeSteps);
        }
      }
    }

    cols = newCols; rows = newRows;
    grid = newGrid; next = newNext;
    fade = newFade; fadeNext = newFadeNext;
    generation = 0;
  }

  function setSmokeSteps(steps) {
    smokeSteps = clamp(Math.floor(steps), 0, 50);
    for (let i = 0; i < fade.length; i++) {
      fade[i] = Math.min(fade[i], smokeSteps);
      fadeNext[i] = Math.min(fadeNext[i], smokeSteps);
    }
  }

  function stampPattern(name, cx, cy) {
    const pts = PATTERNS[name];
    if (!pts) return;
    for (const [dx, dy] of pts) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        const i = idx(x, y);
        grid[i] = 1;
        fade[i] = 0;
      }
    }
  }

  // expose state via getters so that external code always sees
  // the most up‑to‑date arrays after resizing
  return {
    get cols() { return cols; },
    get rows() { return rows; },
    get grid() { return grid; },
    get fade() { return fade; },
    get generation() { return generation; },
    get smokeSteps() { return smokeSteps; },
    step,
    randomize,
    clear,
    countAlive,
    setSize,
    setSmokeSteps,
    stampPattern
  };
}
