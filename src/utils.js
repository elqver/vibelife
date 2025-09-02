/**
 * Common utility helpers used across the project.
 * Keeping them in a separate module makes it easy to
 * reuse them in both the engine and the React components.
 */

/**
 * Clamp number `v` to the inclusive range [`min`, `max`].
 * @param {number} v   - value to clamp
 * @param {number} min - minimum allowed value
 * @param {number} max - maximum allowed value
 * @returns {number}
 */
export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
