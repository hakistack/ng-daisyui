import { CommandStack, PdfCommand } from './command-stack';

/** A counter edit: `apply` adds `by`, `revert` subtracts it. Records call order. */
function addCommand(target: { value: number; log: string[] }, by: number, label = `+${by}`): PdfCommand {
  return {
    label,
    apply: () => {
      target.value += by;
      target.log.push(`apply ${label}`);
    },
    revert: () => {
      target.value -= by;
      target.log.push(`revert ${label}`);
    },
  };
}

describe('CommandStack', () => {
  let doc: { value: number; log: string[] };
  let stack: CommandStack;

  beforeEach(() => {
    doc = { value: 0, log: [] };
    stack = new CommandStack();
  });

  it('executes, undoes and redoes', async () => {
    await stack.execute(addCommand(doc, 2));
    await stack.execute(addCommand(doc, 3));
    expect(doc.value).toBe(5);
    expect(stack.state.undoLabel).toBe('+3');

    await stack.undo();
    expect(doc.value).toBe(2);
    expect(stack.state).toMatchObject({ canUndo: true, canRedo: true, redoLabel: '+3' });

    await stack.redo();
    expect(doc.value).toBe(5);
    expect(stack.state.canRedo).toBe(false);
  });

  it('returns false when there is nothing to undo or redo', async () => {
    expect(await stack.undo()).toBe(false);
    expect(await stack.redo()).toBe(false);
  });

  it('discards the redo tail on a new command', async () => {
    await stack.execute(addCommand(doc, 1));
    await stack.undo();
    await stack.execute(addCommand(doc, 10));
    expect(stack.state.canRedo).toBe(false);
    expect(doc.value).toBe(10);
  });

  it('tracks dirty against the saved point, across undo/redo', async () => {
    expect(stack.state.dirty).toBe(false);
    await stack.execute(addCommand(doc, 1));
    expect(stack.state.dirty).toBe(true);
    stack.markSaved();
    expect(stack.state.dirty).toBe(false);
    await stack.undo();
    expect(stack.state.dirty).toBe(true);
    await stack.redo();
    expect(stack.state.dirty).toBe(false);
  });

  it('stays dirty once the saved point is discarded', async () => {
    await stack.execute(addCommand(doc, 1));
    stack.markSaved();
    await stack.undo();
    await stack.execute(addCommand(doc, 2)); // saved state is unreachable now
    await stack.undo();
    expect(stack.state.dirty).toBe(true);
  });

  it('groups a transaction into one undo step, reverted in reverse order', async () => {
    stack.beginTransaction('Move');
    await stack.execute(addCommand(doc, 1, 'a'));
    await stack.execute(addCommand(doc, 2, 'b'));
    await stack.commitTransaction();
    expect(stack.state.undoLabel).toBe('Move');

    doc.log.length = 0;
    await stack.undo();
    expect(doc.value).toBe(0);
    expect(doc.log).toEqual(['revert b', 'revert a']);
  });

  it('rolls back an open transaction', async () => {
    stack.beginTransaction('Drag');
    await stack.execute(addCommand(doc, 5));
    await stack.rollbackTransaction();
    expect(doc.value).toBe(0);
    expect(stack.state.canUndo).toBe(false);
  });

  it('merges successive commands when the command allows it', async () => {
    let colour = 'red';
    interface SetColour extends PdfCommand {
      readonly to: string;
    }
    const setColour = (from: string, to: string): SetColour => ({
      label: 'colour',
      to,
      apply: () => void (colour = to),
      revert: () => void (colour = from),
      merge: (next) => ('to' in next ? setColour(from, (next as SetColour).to) : null),
    });
    await stack.execute(setColour('red', 'green'));
    await stack.execute(setColour('green', 'blue'));
    expect(colour).toBe('blue');

    await stack.undo(); // one step back to the original colour
    expect(colour).toBe('red');
    expect(stack.state.canUndo).toBe(false);
  });

  it('does not merge across the saved point', async () => {
    let colour = 'red';
    const setColour = (from: string, to: string): PdfCommand => ({
      label: 'colour',
      apply: () => void (colour = to),
      revert: () => void (colour = from),
      merge: () => null,
    });
    const merging = (from: string, to: string): PdfCommand => ({ ...setColour(from, to), merge: () => setColour(from, to) });
    await stack.execute(merging('red', 'green'));
    stack.markSaved();
    await stack.execute(merging('green', 'blue'));
    await stack.undo();
    expect(colour).toBe('green');
    expect(stack.state.dirty).toBe(false);
  });

  it('drops the oldest entries past the limit', async () => {
    const small = new CommandStack(2);
    for (let i = 1; i <= 3; i++) await small.execute(addCommand(doc, i));
    await small.undo();
    await small.undo();
    expect(await small.undo()).toBe(false);
    expect(doc.value).toBe(1);
  });

  it('serializes async operations', async () => {
    const order: string[] = [];
    const slow: PdfCommand = {
      label: 'slow',
      apply: () => new Promise((r) => setTimeout(() => (order.push('slow'), r()), 10)),
      revert: () => undefined,
    };
    const fast: PdfCommand = { label: 'fast', apply: () => void order.push('fast'), revert: () => undefined };
    await Promise.all([stack.execute(slow), stack.execute(fast)]);
    expect(order).toEqual(['slow', 'fast']);
  });

  it('notifies subscribers', async () => {
    const seen: boolean[] = [];
    const off = stack.subscribe((s) => seen.push(s.canUndo));
    await stack.execute(addCommand(doc, 1));
    await stack.undo();
    off();
    await stack.redo();
    expect(seen).toEqual([true, false]);
  });
});
