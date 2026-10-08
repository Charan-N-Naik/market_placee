/**
 * temperature.js
 * Utility helpers for converting and formatting temperatures across the app.
 */

/**
 * Converts a Celsius temperature value to Fahrenheit.
 * Formula: (C * 9/5) + 32 rounded to the nearest integer.
 *
 * @param {number} c - Temperature in Celsius
 * @returns {number} Temperature in Fahrenheit
 */
export const cToF = (c) => Math.round((Number(c) * 9) / 5 + 32);

/**
 * Formats a Celsius temperature into a dual-unit display string ("30°C / 86°F").
 *
 * @param {number} c - Temperature in Celsius
 * @returns {string} Formatted string with both Celsius and Fahrenheit
 */
export const formatTemp = (c) => `${Math.round(Number(c))}°C / ${cToF(c)}°F`;
