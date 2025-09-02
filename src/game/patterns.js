/**
 * A collection of predefined patterns that can be stamped on the board.
 * Each pattern is an array of [x, y] coordinates relative to the
 * top‑left corner of the stamp.
 *
 * Having patterns in their own module keeps the engine clean and allows
 * newcomers to easily see how new patterns can be added.
 */

export const PATTERNS = {
  // The famous "glider" — a small pattern that moves diagonally.
  glider: [
    [1, 0], [2, 1], [0, 2], [1, 2], [2, 2]
  ],

  // Lightweight spaceship — moves horizontally.
  lwss: [
    [1,0],[2,0],[3,0],[4,0],
    [0,1],[4,1],[4,2],
    [0,3],[3,3]
  ],

  // Large pulsar oscillator. The definition might look scary but it is
  // merely a list of points that get mirrored around the center.
  pulsar: (() => {
    const pts = [];
    const add = (x, y) => pts.push([x, y]);
    const base = [
      [2,0],[3,0],[4,0],[8,0],[9,0],[10,0],
      [0,2],[5,2],[7,2],[12,2],
      [0,3],[5,3],[7,3],[12,3],
      [0,4],[5,4],[7,4],[12,4],
      [2,5],[3,5],[4,5],[8,5],[9,5],[10,5]
    ];
    base.forEach(([x, y]) => {
      add(x, y);        // top left
      add(x, y + 5);    // bottom left
      add(y + 5, x);    // top right
      add(y + 5, x + 5);// bottom right
    });
    return pts;
  })(),

  // Gosper glider gun — continuously emits gliders.
  gosper: (() => {
    return [
      [0,4],[1,4],[0,5],[1,5],
      [10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],[14,5],[15,3],[15,7],[16,4],[16,5],[16,6],[17,5],
      [20,2],[20,3],[20,4],[21,2],[21,3],[21,4],[22,1],[22,5],[24,0],[24,1],[24,5],[24,6],
      [34,2],[34,3],[35,2],[35,3]
    ];
  })()
};
