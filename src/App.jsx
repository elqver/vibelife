import { useEffect } from 'react';
import { createGame } from './game/engine.js';
import { clamp } from './utils.js';

/**
 * Main React component. It is purposely very small and only deals with
 * wiring the engine to the DOM. The heavy lifting lives in separate
 * modules which keeps the code approachable for beginners.
 */
export default function App() {
  useEffect(() => {
    // Wrap everything in an IIFE so that local helper functions do not
    // leak into the React component scope.
    (function init() {
      // ------------------------------------------------------------------
      // DOM lookups
      // ------------------------------------------------------------------
      const canvas = document.getElementById('board');
      const ctx = canvas.getContext('2d', { alpha: false });

      // Control elements
      const playBtn = document.getElementById('playBtn');
      const stepBtn = document.getElementById('stepBtn');
      const clearBtn = document.getElementById('clearBtn');
      const randomBtn = document.getElementById('randomBtn');
      const density = document.getElementById('density');
      const densityLabel = document.getElementById('densityLabel');
      const colsInput = document.getElementById('colsInput');
      const rowsInput = document.getElementById('rowsInput');
      const speed = document.getElementById('speed');
      const speedLabel = document.getElementById('speedLabel');
      const wrapCb = document.getElementById('wrap');
      const showGridCb = document.getElementById('showGrid');
      const patternSel = document.getElementById('pattern');
      const smoke = document.getElementById('smoke');
      const smokeLabel = document.getElementById('smokeLabel');

      const genEl = document.getElementById('gen');
      const aliveEl = document.getElementById('alive');
      const fpsEl = document.getElementById('fps');

      // ------------------------------------------------------------------
      // Create game engine using initial values from inputs
      // ------------------------------------------------------------------
      const initialCols = clamp(parseInt(colsInput.value) || 80, 10, 400);
      const initialRows = clamp(parseInt(rowsInput.value) || 50, 10, 300);
      const initialSmoke = clamp(parseInt(smoke.value) || 3, 0, 50);
      const game = createGame(initialCols, initialRows, initialSmoke);

      // Simulation state
      let running = false;
      let lastTs = 0, acc = 0, frames = 0, lastFpsTs = 0, fps = 0;
      let msPerGen = 1000 / (parseInt(speed.value) || 12);

      // Rendering helpers
      const dpr = () => (window.devicePixelRatio || 1);
      let cellPx = 10; // size of a single cell in pixels (computed below)

      // ------------------------------------------------------------------
      // Canvas sizing and drawing
      // ------------------------------------------------------------------
      function resizeCanvasToBoard() {
        // Choose a cell size that allows the whole board to fit nicely
        const wrap = canvas.parentElement; // .board-wrap
        const maxWidth = Math.min(1068, wrap.clientWidth - 24);
        cellPx = Math.max(2, Math.floor(maxWidth / game.cols));
        const pxW = cellPx * game.cols;
        const pxH = cellPx * game.rows;

        // Match the canvas CSS size and the backing store size to avoid
        // blurriness. The device pixel ratio (for HiDPI/retina displays)
        // is taken into account.
        canvas.style.width = pxW + 'px';
        canvas.style.height = pxH + 'px';

        const ratio = dpr();
        canvas.width = Math.floor(pxW * ratio);
        canvas.height = Math.floor(pxH * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        draw();
      }

      function draw() {
        const w = game.cols * cellPx;
        const h = game.rows * cellPx;
        ctx.clearRect(0, 0, w, h);

        // Draw cells and optional fading "smoke"
        for (let y = 0; y < game.rows; y++) {
          for (let x = 0; x < game.cols; x++) {
            const i = y * game.cols + x;
            if (game.grid[i]) {
              ctx.fillStyle = '#9ee493';
              ctx.fillRect(x * cellPx + 1, y * cellPx + 1, cellPx - 2, cellPx - 2);
            } else if (game.smokeSteps > 0 && game.fade[i]) {
              const alpha = Math.min(game.fade[i], game.smokeSteps) / (game.smokeSteps + 1);
              ctx.fillStyle = `rgba(200,200,200,${alpha})`;
              ctx.fillRect(x * cellPx + 1, y * cellPx + 1, cellPx - 2, cellPx - 2);
            }
          }
        }

        // Optional grid overlay
        if (showGridCb.checked && cellPx >= 6) {
          ctx.strokeStyle = 'rgba(143,161,211,0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 0.5; x <= w + 0.5; x += cellPx) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
          for (let y = 0.5; y <= h + 0.5; y += cellPx) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
          ctx.stroke();
        }

        genEl.textContent = String(game.generation);
        aliveEl.textContent = String(game.countAlive());
        fpsEl.textContent = String(fps);
      }

      // ------------------------------------------------------------------
      // Pointer interaction (mouse / touch) to draw on the board
      // ------------------------------------------------------------------
      let drawing = false; // is the user currently drawing?
      let drawValue = 1;   // 1 for alive, 0 for dead when dragging

      function posToCell(evt) {
        // Translate pointer position to board coordinates
        const rect = canvas.getBoundingClientRect();
        const cx = Math.floor((evt.clientX - rect.left) / (canvas.clientWidth / game.cols));
        const cy = Math.floor((evt.clientY - rect.top) / (canvas.clientHeight / game.rows));
        return [clamp(cx, 0, game.cols - 1), clamp(cy, 0, game.rows - 1)];
      }

      function handlePointerDown(evt) {
        evt.preventDefault();
        const [x, y] = posToCell(evt);
        const pattern = patternSel.value;
        if (pattern !== 'none') {
          game.stampPattern(pattern, x, y);
          draw();
          return;
        }
        const i = y * game.cols + x;
        // Left click toggles to 1; right click erases
        if (evt.button === 2) {
          if (game.grid[i]) game.fade[i] = game.smokeSteps;
          game.grid[i] = 0; drawValue = 0;
        } else {
          if (game.grid[i]) {
            game.grid[i] = 0; game.fade[i] = game.smokeSteps;
            drawValue = 0;
          } else {
            game.grid[i] = 1; game.fade[i] = 0;
            drawValue = 1;
          }
        }
        drawing = true;
        draw();
      }

      function handlePointerMove(evt) {
        if (!drawing) return;
        const [x, y] = posToCell(evt);
        const i = y * game.cols + x;
        game.grid[i] = drawValue;
        game.fade[i] = drawValue ? 0 : game.smokeSteps;
        draw();
      }

      function handlePointerUp() { drawing = false; }

      canvas.addEventListener('mousedown', handlePointerDown);
      canvas.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      // Touch events
      canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length) handlePointerDown(e.touches[0]);
      }, { passive: false });
      canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length) handlePointerMove(e.touches[0]);
      }, { passive: false });
      canvas.addEventListener('touchend', handlePointerUp);

      // ------------------------------------------------------------------
      // Control panel and hotkeys
      // ------------------------------------------------------------------
      playBtn.addEventListener('click', () => {
        running = !running; playBtn.textContent = running ? '⏸ Пауза' : '▶ Старт';
      });
      stepBtn.addEventListener('click', () => { if (!running) { game.step(wrapCb.checked); draw(); } });
      clearBtn.addEventListener('click', () => { game.clear(); draw(); });
      randomBtn.addEventListener('click', () => {
        const p = clamp(parseInt(density.value) / 100, 0.01, 0.95);
        game.randomize(p);
        draw();
      });

      density.addEventListener('input', () => { densityLabel.textContent = density.value + '%'; });
      speed.addEventListener('input', () => {
        const v = clamp(parseInt(speed.value), 1, 60); speedLabel.textContent = v + ' Г/с'; msPerGen = 1000 / v;
      });
      smoke.addEventListener('input', () => {
        const steps = clamp(parseInt(smoke.value), 0, 50);
        smokeLabel.textContent = steps ? steps + ' хода' : 'выкл';
        game.setSmokeSteps(steps);
        draw();
      });

      function applySizeInputs(preserve = false) {
        const c = parseInt(colsInput.value); const r = parseInt(rowsInput.value);
        game.setSize(c, r, preserve);
        resizeCanvasToBoard();
        draw();
      }
      colsInput.addEventListener('change', () => applySizeInputs(true));
      rowsInput.addEventListener('change', () => applySizeInputs(true));

      window.addEventListener('resize', resizeCanvasToBoard);

      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
        else if (e.key.toLowerCase() === 's') { e.preventDefault(); stepBtn.click(); }
        else if (e.key.toLowerCase() === 'r') { e.preventDefault(); randomBtn.click(); }
        else if (e.key.toLowerCase() === 'c') { e.preventDefault(); clearBtn.click(); }
      });

      // ------------------------------------------------------------------
      // Main animation loop
      // ------------------------------------------------------------------
      function loop(ts) {
        if (!lastTs) lastTs = ts; const dt = ts - lastTs; lastTs = ts; acc += dt; frames++;
        if (ts - lastFpsTs >= 1000) { fps = frames; frames = 0; lastFpsTs = ts; }
        if (running) {
          while (acc >= msPerGen) { game.step(wrapCb.checked); acc -= msPerGen; }
        } else {
          acc = 0; // don't accumulate while paused
        }
        draw();
        requestAnimationFrame(loop);
      }

      // ------------------------------------------------------------------
      // Initial setup
      // ------------------------------------------------------------------
      resizeCanvasToBoard();
      draw();
      requestAnimationFrame(loop);

      // Seed a tiny glider so the board is not empty on start
      game.stampPattern('glider', 1, 1);
      draw();
    })();
  }, []);

  // JSX layout is intentionally kept unchanged from the original example
  return (
    <div className="app">
      <h1>Игра «Жизнь» (Conway) — JavaScript</h1>
      <div className="panel board-wrap">
        <canvas id="board" aria-label="Игровое поле"></canvas>
      </div>
      <div className="panel controls" role="group" aria-label="Панель управления">
        <div className="row">
          <button id="playBtn" className="primary" title="Старт / Пауза (Space)">▶ Старт</button>
          <button id="stepBtn" title="Сделать один шаг (S)">⏭ Шаг</button>
          <button id="clearBtn" className="ghost" title="Очистить поле (C)">🧹 Очистить</button>
          <button id="randomBtn" title="Заполнить случайно (R)">🎲 Случайно</button>
          <label>Плотность: <input id="density" type="range" min="5" max="60" defaultValue="25" /> <span id="densityLabel">25%</span></label>
        </div>
        <div className="row">
          <label>Ширина (клеток): <input id="colsInput" type="number" min="10" max="400" step="1" defaultValue="80" /></label>
          <label>Высота (клеток): <input id="rowsInput" type="number" min="10" max="300" step="1" defaultValue="50" /></label>
          <label>Скорость: <input id="speed" type="range" min="1" max="60" defaultValue="12" /> <span id="speedLabel">12 Г/с</span></label>
          <label>Дым: <input id="smoke" type="range" min="0" max="50" defaultValue="3" /> <span id="smokeLabel">3 хода</span></label>
          <label><input id="wrap" type="checkbox" defaultChecked /> Тороид (замыкать края)</label>
          <label><input id="showGrid" type="checkbox" defaultChecked /> Сетка</label>
          <label>Штамп:
            <select id="pattern">
              <option value="none">—</option>
              <option value="glider">Глайдер</option>
              <option value="lwss">LWSS</option>
              <option value="pulsar">Пульсар</option>
              <option value="gosper">Пушка Госпера</option>
            </select>
          </label>
        </div>
      </div>
      <div className="info">
        <span className="pill">Поколение: <strong id="gen">0</strong></span>
        <span className="pill">Живых: <strong id="alive">0</strong></span>
        <span className="pill">FPS: <strong id="fps">0</strong></span>
        <span className="pill">Подсказки: кликай по полю, перетаскивай, ПКМ — стирать, колесо — прокрутка</span>
      </div>
      <p className="hint">Горячие клавиши: <span className="kbd">Space</span> — старт/пауза, <span className="kbd">S</span> — шаг, <span className="kbd">R</span> — случайно, <span className="kbd">C</span> — очистить.</p>
    </div>
  );
}
