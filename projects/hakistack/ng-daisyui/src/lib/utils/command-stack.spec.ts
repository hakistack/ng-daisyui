import { describe, expect, it } from 'vitest';

import { CommandStack, EditorCommand } from './command-stack';

/**
 * Build a command that pushes/pops a tag onto a shared log, so tests can assert
 * both the do/undo ordering and the resulting document state from one fixture.
 */
function tagCommand(log: string[], tag: string): EditorCommand {
  return {
    label: tag,
    do: () => log.push(tag),
    undo: () => {
      const i = log.lastIndexOf(tag);
      if (i >= 0) log.splice(i, 1);
    },
  };
}

describe('CommandStack', () => {
  it('starts empty — nothing to undo or redo', () => {
    const stack = new CommandStack();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
    expect(stack.depth()).toBe(0);
  });

  it('execute runs do() immediately and makes the command undoable', () => {
    const log: string[] = [];
    const stack = new CommandStack();
    stack.execute(tagCommand(log, 'a'));
    expect(log).toEqual(['a']);
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);
    expect(stack.depth()).toBe(1);
  });

  it('undo reverts the last command and enables redo', () => {
    const log: string[] = [];
    const stack = new CommandStack();
    stack.execute(tagCommand(log, 'a'));
    stack.undo();
    expect(log).toEqual([]);
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(true);
  });

  it('redo re-applies the most recently undone command', () => {
    const log: string[] = [];
    const stack = new CommandStack();
    stack.execute(tagCommand(log, 'a'));
    stack.undo();
    stack.redo();
    expect(log).toEqual(['a']);
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);
  });

  it('undo/redo walk multiple commands in order', () => {
    const log: string[] = [];
    const stack = new CommandStack();
    stack.execute(tagCommand(log, 'a'));
    stack.execute(tagCommand(log, 'b'));
    stack.execute(tagCommand(log, 'c'));
    expect(log).toEqual(['a', 'b', 'c']);

    stack.undo();
    stack.undo();
    expect(log).toEqual(['a']);
    expect(stack.depth()).toBe(1);

    stack.redo();
    expect(log).toEqual(['a', 'b']);
  });

  it('a new execute after undo discards the redo branch', () => {
    const log: string[] = [];
    const stack = new CommandStack();
    stack.execute(tagCommand(log, 'a'));
    stack.execute(tagCommand(log, 'b'));
    stack.undo(); // b undone, redo points at b
    expect(stack.canRedo()).toBe(true);

    stack.execute(tagCommand(log, 'c')); // forks history — b's future is gone
    expect(log).toEqual(['a', 'c']);
    expect(stack.canRedo()).toBe(false);
    expect(stack.depth()).toBe(2);
  });

  it('undo/redo at the boundaries are safe no-ops', () => {
    const log: string[] = [];
    const stack = new CommandStack();
    stack.undo(); // nothing to undo
    stack.redo(); // nothing to redo
    expect(log).toEqual([]);

    stack.execute(tagCommand(log, 'a'));
    stack.redo(); // already at the tip
    expect(log).toEqual(['a']);
    expect(stack.canRedo()).toBe(false);
  });

  it('clear drops all history', () => {
    const log: string[] = [];
    const stack = new CommandStack();
    stack.execute(tagCommand(log, 'a'));
    stack.execute(tagCommand(log, 'b'));
    stack.clear();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
    expect(stack.depth()).toBe(0);
  });
});
