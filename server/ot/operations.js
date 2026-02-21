/**
 * Operation types for Operational Transform
 * @typedef {Object} RetainOp
 * @property {'retain'} type
 * @property {number} count
 *
 * @typedef {Object} InsertOp
 * @property {'insert'} type
 * @property {string} text
 *
 * @typedef {Object} DeleteOp
 * @property {'delete'} type
 * @property {number} count
 *
 * @typedef {RetainOp|InsertOp|DeleteOp} Operation
 */

/**
 * Apply an operation to a string
 * @param {string} str - The input string
 * @param {Operation[]} ops - The operations to apply
 * @returns {string} The result string
 */
function applyOperation(str, ops) {
  let result = '';
  let cursor = 0;

  for (const op of ops) {
    if (op.type === 'retain') {
      result += str.slice(cursor, cursor + op.count);
      cursor += op.count;
    } else if (op.type === 'insert') {
      result += op.text;
    } else if (op.type === 'delete') {
      cursor += op.count;
    }
  }

  // Append any remaining characters from the original string
  if (cursor < str.length) {
    result += str.slice(cursor);
  }

  return result;
}

/**
 * Get the length change caused by an operation
 * @param {Operation[]} ops
 * @returns {number}
 */
function getOpLength(ops) {
  let length = 0;
  for (const op of ops) {
    if (op.type === 'retain') length += op.count;
    else if (op.type === 'insert') length += op.text.length;
  }
  return length;
}

/**
 * Validate an operation array
 * @param {Operation[]} ops
 * @param {number} docLength - Expected document length
 * @returns {boolean}
 */
function validateOperation(ops, docLength) {
  let length = 0;
  for (const op of ops) {
    if (op.type === 'retain') length += op.count;
    else if (op.type === 'delete') length += op.count;
  }
  return length === docLength;
}

module.exports = {
  applyOperation,
  getOpLength,
  validateOperation
};
