const { transform } = require('../transform');
const { applyOperation } = require('../operations');

describe('OT Transform', () => {
  test('transform insert vs insert at same position', () => {
    const op1 = [{ type: 'insert', text: 'A' }];
    const op2 = [{ type: 'insert', text: 'B' }];

    const op1Prime = transform(op1, op2, 'left');
    const op2Prime = transform(op2, op1, 'right');

    // Apply both operation pairs to empty string
    const doc = '';
    const result1 = applyOperation(applyOperation(doc, op1), op2Prime);
    const result2 = applyOperation(applyOperation(doc, op2), op1Prime);

    expect(result1).toBe(result2); // Convergence
    expect(result1).toBe('BA'); // With left-bias, op1 is transformed to go after op2
  });

  test('transform insert vs insert at different positions', () => {
    const op1 = [{ type: 'retain', count: 5 }, { type: 'insert', text: 'X' }];
    const op2 = [{ type: 'retain', count: 2 }, { type: 'insert', text: 'Y' }];

    const op1Prime = transform(op1, op2, 'left');
    const op2Prime = transform(op2, op1, 'right');

    const doc = 'Hello';
    const result1 = applyOperation(applyOperation(doc, op1), op2Prime);
    const result2 = applyOperation(applyOperation(doc, op2), op1Prime);

    expect(result1).toBe(result2);
    expect(result1).toBe('HeYlloX');
  });

  test('transform insert vs delete', () => {
    const op1 = [{ type: 'retain', count: 2 }, { type: 'insert', text: 'X' }];
    const op2 = [{ type: 'delete', count: 5 }];

    const op1Prime = transform(op1, op2, 'left');
    const op2Prime = transform(op2, op1, 'right');

    const doc = 'Hello';
    const result1 = applyOperation(applyOperation(doc, op1), op2Prime);
    const result2 = applyOperation(applyOperation(doc, op2), op1Prime);

    expect(result1).toBe(result2);
    expect(result1).toBe('X');
  });

  test('transform delete vs delete overlapping', () => {
    const op1 = [{ type: 'delete', count: 3 }];
    const op2 = [{ type: 'retain', count: 2 }, { type: 'delete', count: 3 }];

    const op1Prime = transform(op1, op2, 'left');
    const op2Prime = transform(op2, op1, 'right');

    const doc = 'Hello';
    const result1 = applyOperation(applyOperation(doc, op1), op2Prime);
    const result2 = applyOperation(applyOperation(doc, op2), op1Prime);

    expect(result1).toBe(result2);
    expect(result1).toBe('');
  });

  test('transform complex operations', () => {
    const op1 = [
      { type: 'retain', count: 5 },
      { type: 'insert', text: ' World' },
    ];
    const op2 = [
      { type: 'delete', count: 2 },
      { type: 'retain', count: 3 },
    ];

    const op1Prime = transform(op1, op2, 'left');
    const op2Prime = transform(op2, op1, 'right');

    const doc = 'Hello';
    const result1 = applyOperation(applyOperation(doc, op1), op2Prime);
    const result2 = applyOperation(applyOperation(doc, op2), op1Prime);

    expect(result1).toBe(result2);
    expect(result1).toBe('llo World');
  });

  test('transform retain vs retain', () => {
    const op1 = [{ type: 'retain', count: 5 }];
    const op2 = [{ type: 'retain', count: 5 }];

    const op1Prime = transform(op1, op2, 'left');
    const op2Prime = transform(op2, op1, 'right');

    expect(op1Prime).toEqual([{ type: 'retain', count: 5 }]);
    expect(op2Prime).toEqual([{ type: 'retain', count: 5 }]);
  });
});
