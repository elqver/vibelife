import { useEffect } from 'react'

export default function App() {
  useEffect(() => {
    (() => {
            const canvas = document.getElementById('board');
            const ctx = canvas.getContext('2d', { alpha: false });

            // UI elements
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

            // State
            let cols = clamp(parseInt(colsInput.value) || 80, 10, 400);
            let rows = clamp(parseInt(rowsInput.value) || 50, 10, 300);
            let grid = new Uint8Array(cols * rows);
            let next = new Uint8Array(cols * rows);
            let fade = new Uint8Array(cols * rows);
            let fadeNext = new Uint8Array(cols * rows);
            let smokeSteps = clamp(parseInt(smoke.value) || 3, 0, 50);
            let generation = 0;
            let running = false;
            let lastTs = 0, acc = 0, frames = 0, lastFpsTs = 0, fps = 0;
            let msPerGen = 1000 / (parseInt(speed.value) || 12);

            // Sizing / rendering helpers
            const dpr = () => (window.devicePixelRatio || 1);
            let cellPx = 10; // computed dynamically

            function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
            function idx(x, y) { return y * cols + x; }

            function resizeCanvasToBoard() {
                // Compute cell size so the board fits the visible width nicely
                const wrap = canvas.parentElement; // .board-wrap
                const maxWidth = Math.min(1068, wrap.clientWidth - 24); // paddings safety
                cellPx = Math.max(2, Math.floor(maxWidth / cols));
                const pxW = cellPx * cols;
                const pxH = cellPx * rows;

                // Set CSS size exact to avoid blurriness, allow horizontal scroll if needed
                canvas.style.width = pxW + 'px';
                canvas.style.height = pxH + 'px';

                // Set backing store size with DPR
                const ratio = dpr();
                canvas.width = Math.floor(pxW * ratio);
                canvas.height = Math.floor(pxH * ratio);
                ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
                draw();
            }

            function countAlive() {
                let s = 0; for (let i = 0; i < grid.length; i++) s += grid[i];
                return s;
            }

            function draw() {
                const w = cols * cellPx;
                const h = rows * cellPx;
                ctx.clearRect(0, 0, w, h);

                // Cells and fading smoke
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        const i = idx(x, y);
                        if (grid[i]) {
                            ctx.fillStyle = '#9ee493';
                            ctx.fillRect(x * cellPx + 1, y * cellPx + 1, cellPx - 2, cellPx - 2);
                        } else if (smokeSteps > 0 && fade[i]) {
                            const alpha = Math.min(fade[i], smokeSteps) / (smokeSteps + 1);
                            ctx.fillStyle = `rgba(200,200,200,${alpha})`;
                            ctx.fillRect(x * cellPx + 1, y * cellPx + 1, cellPx - 2, cellPx - 2);
                        }
                    }
                }

                // Grid
                if (showGridCb.checked && cellPx >= 6) {
                    ctx.strokeStyle = 'rgba(143,161,211,0.25)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    for (let x = 0.5; x <= w + 0.5; x += cellPx) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
                    for (let y = 0.5; y <= h + 0.5; y += cellPx) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
                    ctx.stroke();
                }

                genEl.textContent = String(generation);
                aliveEl.textContent = String(countAlive());
                fpsEl.textContent = String(fps);
            }

            function neighbors(x, y) {
                let n = 0;
                const wrap = wrapCb.checked;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        let nx = x + dx, ny = y + dy;
                        if (wrap) {
                            if (nx < 0) nx = cols - 1; else if (nx >= cols) nx = 0;
                            if (ny < 0) ny = rows - 1; else if (ny >= rows) ny = 0;
                            n += grid[idx(nx, ny)];
                        } else {
                            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) n += grid[idx(nx, ny)];
                        }
                    }
                }
                return n;
            }

            function step() {
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        const i = idx(x, y);
                        const a = grid[i];
                        const nb = neighbors(x, y);
                        const alive = (a ? (nb === 2 || nb === 3) : (nb === 3)) ? 1 : 0;
                        next[i] = alive;
                        if (alive) {
                            fadeNext[i] = 0;
                        } else if (a) {
                            fadeNext[i] = smokeSteps;
                        } else {
                            const f = Math.min(fade[i], smokeSteps);
                            fadeNext[i] = f > 0 ? f - 1 : 0;
                        }
                    }
                }
                // swap
                [grid, next] = [next, grid];
                [fade, fadeNext] = [fadeNext, fade];
                generation++;
            }

            function randomize(pct = 0.25) {
                for (let i = 0; i < grid.length; i++) {
                    grid[i] = (Math.random() < pct) ? 1 : 0;
                    fade[i] = 0;
                }
                generation = 0;
            }

            function clearBoard() { grid.fill(0); fade.fill(0); generation = 0; }

            function setSize(newCols, newRows, preserve = false) {
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
                resizeCanvasToBoard();
            }

            const PATTERNS = {
                glider: [ [1,0],[2,1],[0,2],[1,2],[2,2] ],
                lwss: [ [1,0],[2,0],[3,0],[4,0],[0,1],[4,1],[4,2],[0,3],[3,3] ],
                pulsar: (() => {
                    const pts = [];
                    const add = (x, y) => pts.push([x, y]);
                    const base = [ [2,0],[3,0],[4,0],[8,0],[9,0],[10,0],[0,2],[5,2],[7,2],[12,2],[0,3],[5,3],[7,3],[12,3],[0,4],[5,4],[7,4],[12,4],[2,5],[3,5],[4,5],[8,5],[9,5],[10,5] ];
                    base.forEach(([x,y]) => { add(x,y); add(x, y+5); add(y+5, x); add(y+5, x+5); });
                    return pts;
                })(),
                gosper: (() => {
                    // Gosper glider gun (approx at anchor)
                    const pts = [
                        [0,4],[1,4],[0,5],[1,5],
                        [10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],[14,5],[15,3],[15,7],[16,4],[16,5],[16,6],[17,5],
                        [20,2],[20,3],[20,4],[21,2],[21,3],[21,4],[22,1],[22,5],[24,0],[24,1],[24,5],[24,6],
                        [34,2],[34,3],[35,2],[35,3]
                    ];
                    return pts;
                })()
            };

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

            // Interaction
            let drawing = false; let drawValue = 1; // 1=alive, 0=dead
            function posToCell(evt) {
                const rect = canvas.getBoundingClientRect();
                const cx = Math.floor((evt.clientX - rect.left) / (canvas.clientWidth / cols));
                const cy = Math.floor((evt.clientY - rect.top) / (canvas.clientHeight / rows));
                return [clamp(cx, 0, cols - 1), clamp(cy, 0, rows - 1)];
            }

            function handlePointerDown(evt) {
                evt.preventDefault();
                const [x, y] = posToCell(evt);
                const pattern = patternSel.value;
                if (pattern !== 'none') {
                    stampPattern(pattern, x, y);
                    draw();
                    return;
                }
                const i = idx(x, y);
                // Left click toggles to 1; right click erases
                if (evt.button === 2) {
                    if (grid[i]) fade[i] = smokeSteps;
                    grid[i] = 0; drawValue = 0;
                } else {
                    if (grid[i]) {
                        grid[i] = 0; fade[i] = smokeSteps;
                    } else {
                        grid[i] = 1; fade[i] = 0;
                    }
                    drawValue = grid[i];
                }
                drawing = true; draw();
            }
            function handlePointerMove(evt) {
                if (!drawing) return;
                const [x, y] = posToCell(evt);
                const i = idx(x, y);
                if (grid[i] !== drawValue) {
                    grid[i] = drawValue;
                    fade[i] = drawValue ? 0 : smokeSteps;
                    draw();
                }
            }
            function handlePointerUp() { drawing = false; }

            // Mouse
            canvas.addEventListener('mousedown', handlePointerDown);
            canvas.addEventListener('mousemove', handlePointerMove);
            window.addEventListener('mouseup', handlePointerUp);
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());

            // Touch
            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length) handlePointerDown(e.touches[0]);
            }, { passive: false });
            canvas.addEventListener('touchmove', (e) => {
                if (e.touches.length) handlePointerMove(e.touches[0]);
            }, { passive: false });
            canvas.addEventListener('touchend', handlePointerUp);

            // Controls
            playBtn.addEventListener('click', () => {
                running = !running; playBtn.textContent = running ? '⏸ Пауза' : '▶ Старт';
            });
            stepBtn.addEventListener('click', () => { if (!running) { step(); draw(); } });
            clearBtn.addEventListener('click', () => { clearBoard(); draw(); });
            randomBtn.addEventListener('click', () => { const p = clamp(parseInt(density.value) / 100, 0.01, 0.95); randomize(p); draw(); });

            density.addEventListener('input', () => { densityLabel.textContent = density.value + '%'; });
            speed.addEventListener('input', () => {
                const v = clamp(parseInt(speed.value), 1, 60); speedLabel.textContent = v + ' Г/с'; msPerGen = 1000 / v;
            });
            smoke.addEventListener('input', () => {
                smokeSteps = clamp(parseInt(smoke.value), 0, 50);
                smokeLabel.textContent = smokeSteps ? smokeSteps + ' хода' : 'выкл';
                for (let i = 0; i < fade.length; i++) {
                    fade[i] = Math.min(fade[i], smokeSteps);
                    fadeNext[i] = Math.min(fadeNext[i], smokeSteps);
                }
                draw();
            });

            function applySizeInputs(preserve = false) {
                const c = parseInt(colsInput.value); const r = parseInt(rowsInput.value);
                setSize(c, r, preserve);
            }
            colsInput.addEventListener('change', () => applySizeInputs(true));
            rowsInput.addEventListener('change', () => applySizeInputs(true));

            window.addEventListener('resize', resizeCanvasToBoard);

            // Hotkeys
            window.addEventListener('keydown', (e) => {
                if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
                else if (e.key.toLowerCase() === 's') { e.preventDefault(); stepBtn.click(); }
                else if (e.key.toLowerCase() === 'r') { e.preventDefault(); randomBtn.click(); }
                else if (e.key.toLowerCase() === 'c') { e.preventDefault(); clearBtn.click(); }
            });

            // Animation loop
            function loop(ts) {
                if (!lastTs) lastTs = ts; const dt = ts - lastTs; lastTs = ts; acc += dt; frames++;
                if (ts - lastFpsTs >= 1000) { fps = frames; frames = 0; lastFpsTs = ts; }
                if (running) {
                    while (acc >= msPerGen) { step(); acc -= msPerGen; }
                } else {
                    acc = 0; // don't accumulate while paused
                }
                draw();
                requestAnimationFrame(loop);
            }

            // Init
            resizeCanvasToBoard();
            draw();
            requestAnimationFrame(loop);

            // Seed a tiny glider for fun
            stampPattern('glider', 1, 1);
            draw();
        })();
  }, []);

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
  )
}
