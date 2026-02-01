import { TestRunner } from './test-runner.js';

/**
 * Mock JSDoc data for testing
 */
export const MOCK_JSDOC_DATA = `
/**
 * @module Shape
 */
/**
 * Draws a rectangle
 * @method rect
 * @param {Number} x x-coordinate
 * @param {Number} y y-coordinate  
 * @param {Number} width width
 * @param {Number} height height
 * @example
 * rect(10, 10, 50, 50);
 */
function rect(x, y, width, height) {}

/**
 * Draws a circle
 * @method circle
 * @param {Number} x x-coordinate
 * @param {Number} y y-coordinate
 * @param {Number} radius radius
 * @example
 * circle(50, 50, 25);
 */
function circle(x, y, radius) {}

/**
 * @module Color
 */
/**
 * Sets the fill color
 * @method fill
 * @param {Number|String} value color value
 * @example
 * fill(255, 0, 0);
 * fill("red");
 */
function fill(value) {}

/**
 * Extracts red component from color
 * @method red
 * @param {Object} color color object
 * @return {Number} red component (0-255)
 * @example
 * let c = color(255, 0, 0);
 * let r = red(c);
 */
function red(color) {}

/**
 * @module Constants
 */
/**
 * Mathematical constant PI
 * @property {Number} PI
 * @example
 * console.log(PI);
 */
const PI = 3.14159;

/**
 * @deprecated This function is deprecated
 * @method oldFunction
 * @deprecated Use newFunction() instead
 * @example
 * oldFunction();
 */
function oldFunction() {}
`;

// Simple test harness
if (process.argv.includes('--run-mock-tests')) {
  const runner = new TestRunner();
  runner.runAll();
}