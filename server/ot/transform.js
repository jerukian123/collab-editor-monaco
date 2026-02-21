/**
 * Transform operation op1 against operation op2
 * Assuming op2 was applied first, transform op1 so it can be applied after op2
 *
 * @param {Operation[]} op1 - First operation
 * @param {Operation[]} op2 - Second operation (applied first)
 * @param {string} side - 'left' or 'right' for tie-breaking inserts at same position
 * @returns {Operation[]} Transformed op1
 */
function transform(op1, op2, side = 'left') {
  const result = [];
  let i = 0, j = 0;
  let op1Cursor = 0, op2Cursor = 0;

  while (i < op1.length || j < op2.length) {
    // Get current operations
    const o1 = op1[i];
    const o2 = op2[j];

    // Both operations finished
    if (!o1 && !o2) break;

    // op1 finished, op2 has inserts left
    if (!o1 && o2?.type === 'insert') {
      result.push({ type: 'retain', count: o2.text.length });
      j++;
      continue;
    }

    // op2 finished, just copy op1
    if (!o2) {
      result.push(o1);
      i++;
      continue;
    }

    // op1 finished, op2 has retains/deletes left
    if (!o1) {
      // If o2 is retain or delete, we can skip it
      j++;
      continue;
    }

    // Insert vs Insert at same position
    if (o1?.type === 'insert' && o2.type === 'insert') {
      if (side === 'left') {
        // op1 goes after op2
        result.push({ type: 'retain', count: o2.text.length });
        j++;
      } else {
        result.push(o1);
        i++;
      }
      continue;
    }

    // Insert from op1 - stays as insert, skip op2's position changes
    if (o1?.type === 'insert') {
      result.push(o1);
      i++;
      continue;
    }

    // Insert from op2 - need to retain over it in transformed op1
    if (o2.type === 'insert') {
      result.push({ type: 'retain', count: o2.text.length });
      j++;
      continue;
    }

    // Now handle retain/delete combinations
    const o1Count = o1.type === 'retain' ? o1.count : (o1.type === 'delete' ? o1.count : 0);
    const o2Count = o2.type === 'retain' ? o2.count : (o2.type === 'delete' ? o2.count : 0);

    const minCount = Math.min(o1Count - op1Cursor, o2Count - op2Cursor);

    // Delete vs Delete - op2's delete removes characters, so op1's delete has less to delete
    if (o1.type === 'delete' && o2.type === 'delete') {
      op1Cursor += minCount;
      op2Cursor += minCount;
    }
    // Delete vs Retain - op1's delete still applies
    else if (o1.type === 'delete' && o2.type === 'retain') {
      result.push({ type: 'delete', count: minCount });
      op1Cursor += minCount;
      op2Cursor += minCount;
    }
    // Retain vs Delete - op2 deleted, so op1 retains less
    else if (o1.type === 'retain' && o2.type === 'delete') {
      op1Cursor += minCount;
      op2Cursor += minCount;
    }
    // Retain vs Retain - both advance
    else if (o1.type === 'retain' && o2.type === 'retain') {
      result.push({ type: 'retain', count: minCount });
      op1Cursor += minCount;
      op2Cursor += minCount;
    }

    // Move to next operation if current one is consumed
    if (op1Cursor === o1Count) {
      i++;
      op1Cursor = 0;
    }
    if (op2Cursor === o2Count) {
      j++;
      op2Cursor = 0;
    }
  }

  return compactOps(result);
}

/**
 * Compact consecutive operations of the same type
 * @param {Operation[]} ops
 * @returns {Operation[]}
 */
function compactOps(ops) {
  if (ops.length === 0) return ops;

  const result = [];
  let current = ops[0];

  for (let i = 1; i < ops.length; i++) {
    const next = ops[i];

    if (current.type === next.type) {
      if (current.type === 'retain' || current.type === 'delete') {
        current = { type: current.type, count: current.count + next.count };
      } else if (current.type === 'insert') {
        current = { type: 'insert', text: current.text + next.text };
      }
    } else {
      result.push(current);
      current = next;
    }
  }

  result.push(current);
  return result;
}

module.exports = { transform };
