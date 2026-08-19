import chalk from 'chalk';
import type { Task } from '@dum-e/core';

const STATUS_COLORS: Record<string, (s: string) => string> = {
  todo: chalk.gray,
  in_progress: chalk.blue,
  ai_testing: chalk.cyan,
  manual_testing: chalk.yellow,
  deployment: chalk.magenta,
  completed: chalk.green,
};

const PRIORITY_COLORS: Record<string, (s: string) => string> = {
  low: chalk.gray,
  medium: chalk.white,
  high: chalk.yellow,
  urgent: chalk.red.bold,
};

export function colorStatus(status: string): string {
  return (STATUS_COLORS[status] ?? chalk.white)(status);
}

export function colorPriority(priority: string): string {
  return (PRIORITY_COLORS[priority] ?? chalk.white)(priority);
}

export function taskLine(t: Task): string {
  const flag = t.rejectionFlag ? chalk.red(' ⟲') : '';
  return [
    chalk.dim(t.id),
    colorStatus(t.status.padEnd(14)),
    colorPriority(t.priority.padEnd(6)),
    chalk.dim(t.type.padEnd(13)),
    t.title + flag,
  ].join('  ');
}

/** Simple column table for lists. */
export function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => stripAnsi(r[i] ?? '').length)),
  );
  const fmt = (cells: string[]) =>
    cells.map((c, i) => c + ' '.repeat(Math.max(0, widths[i]! - stripAnsi(c).length))).join('  ');
  return [chalk.bold(fmt(headers)), ...rows.map(fmt)].join('\n');
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\[[0-9;]*m/g, '');
}

let jsonMode = false;

/** Toggle machine-readable output; set once from the global --json flag. */
export function setJson(on: boolean): void {
  jsonMode = on;
}

export function isJson(): boolean {
  return jsonMode;
}

/**
 * Emit a result. In --json mode prints `data` as pretty JSON (scriptable, pipeable);
 * otherwise runs the human-facing renderer. Keeps every command dual-mode with one call.
 */
export function emit(data: unknown, human: () => void): void {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  human();
}

export function ok(msg: string): void {
  if (jsonMode) return;
  console.log(chalk.green('✓'), msg);
}

export function info(msg: string): void {
  console.log(chalk.blue('ℹ'), msg);
}

export function fail(msg: string): void {
  console.error(chalk.red('✗'), msg);
}
