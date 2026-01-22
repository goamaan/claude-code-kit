/**
 * Formatted output utilities
 * Provides consistent CLI output formatting
 */

import pc from 'picocolors';

// =============================================================================
// Status Messages
// =============================================================================

/**
 * Print a success message
 */
export function success(msg: string): void {
  console.log(`${pc.green('+')} ${msg}`);
}

/**
 * Print an error message
 */
export function error(msg: string): void {
  console.error(`${pc.red('x')} ${msg}`);
}

/**
 * Print a warning message
 */
export function warn(msg: string): void {
  console.log(`${pc.yellow('!')} ${msg}`);
}

/**
 * Print an info message
 */
export function info(msg: string): void {
  console.log(`${pc.blue('i')} ${msg}`);
}

/**
 * Print a dim/secondary message
 */
export function dim(msg: string): void {
  console.log(pc.dim(msg));
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format a key-value pair
 */
export function kv(key: string, value: unknown, indent = 0): void {
  const prefix = ' '.repeat(indent);
  const formattedValue = typeof value === 'string' ? value : JSON.stringify(value);
  console.log(`${prefix}${pc.dim(key + ':')} ${formattedValue}`);
}

/**
 * Print a section header
 */
export function header(title: string): void {
  console.log();
  console.log(pc.bold(pc.underline(title)));
  console.log();
}

/**
 * Print a labeled value
 */
export function label(text: string, value: string): void {
  console.log(`${pc.dim(text)} ${pc.bold(value)}`);
}

// =============================================================================
// Tables
// =============================================================================

interface TableColumn {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: unknown) => string;
}

/**
 * Print data as a formatted table
 */
export function table(
  data: Record<string, unknown>[],
  columns?: TableColumn[]
): void {
  if (data.length === 0) {
    dim('No data to display');
    return;
  }

  // Auto-detect columns if not provided
  const cols: TableColumn[] = columns ?? Object.keys(data[0]!).map(key => ({
    key,
    header: key.charAt(0).toUpperCase() + key.slice(1),
  }));

  // Calculate column widths
  const widths = cols.map(col => {
    const headerWidth = col.header.length;
    const maxDataWidth = Math.max(
      ...data.map(row => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : String(value ?? '');
        return formatted.length;
      })
    );
    return col.width ?? Math.max(headerWidth, maxDataWidth);
  });

  // Print header
  const headerRow = cols.map((col, i) =>
    padString(col.header, widths[i]!, col.align ?? 'left')
  ).join('  ');
  console.log(pc.bold(headerRow));

  // Print separator
  const separator = widths.map(w => '-'.repeat(w)).join('  ');
  console.log(pc.dim(separator));

  // Print data rows
  for (const row of data) {
    const dataRow = cols.map((col, i) => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value) : String(value ?? '');
      return padString(formatted, widths[i]!, col.align ?? 'left');
    }).join('  ');
    console.log(dataRow);
  }
}

/**
 * Print data as a simple list
 */
export function list(items: string[], bullet = '-'): void {
  for (const item of items) {
    console.log(`  ${pc.dim(bullet)} ${item}`);
  }
}

/**
 * Print data as a numbered list
 */
export function numberedList(items: string[]): void {
  const maxWidth = String(items.length).length;
  items.forEach((item, i) => {
    const num = String(i + 1).padStart(maxWidth);
    console.log(`  ${pc.dim(num + '.')} ${item}`);
  });
}

// =============================================================================
// JSON Output
// =============================================================================

/**
 * Print data as formatted JSON
 */
export function json(data: unknown, indent = 2): void {
  console.log(JSON.stringify(data, null, indent));
}

/**
 * Print data as compact JSON (no formatting)
 */
export function jsonCompact(data: unknown): void {
  console.log(JSON.stringify(data));
}

// =============================================================================
// Tree Output
// =============================================================================

interface TreeNode {
  label: string;
  children?: TreeNode[];
}

/**
 * Print data as a tree structure
 */
export function tree(root: TreeNode, prefix = ''): void {
  console.log(root.label);

  if (!root.children || root.children.length === 0) return;

  const lastIndex = root.children.length - 1;
  root.children.forEach((child, index) => {
    const isLast = index === lastIndex;
    const connector = isLast ? '`-- ' : '|-- ';
    const childPrefix = isLast ? '    ' : '|   ';

    process.stdout.write(pc.dim(prefix + connector));
    tree(child, prefix + childPrefix);
  });
}

// =============================================================================
// Progress Indicators
// =============================================================================

/**
 * Print a progress bar
 */
export function progressBar(current: number, total: number, width = 40): void {
  const percent = total > 0 ? current / total : 0;
  const filled = Math.round(width * percent);
  const empty = width - filled;

  const bar = pc.green('='.repeat(filled)) + pc.dim('-'.repeat(empty));
  const percentage = `${Math.round(percent * 100)}%`.padStart(4);

  process.stdout.write(`\r[${bar}] ${percentage} (${current}/${total})`);

  if (current >= total) {
    console.log();
  }
}

// =============================================================================
// Status Indicators
// =============================================================================

/**
 * Print a checkmark
 */
export function check(msg: string): void {
  console.log(`${pc.green('+')} ${msg}`);
}

/**
 * Print an X mark
 */
export function cross(msg: string): void {
  console.log(`${pc.red('x')} ${msg}`);
}

/**
 * Print a status with colored indicator
 */
export function status(
  msg: string,
  state: 'success' | 'error' | 'warning' | 'info' | 'pending'
): void {
  const indicators = {
    success: pc.green('+'),
    error: pc.red('x'),
    warning: pc.yellow('!'),
    info: pc.blue('i'),
    pending: pc.dim('o'),
  };
  console.log(`${indicators[state]} ${msg}`);
}

// =============================================================================
// Box/Border Output
// =============================================================================

/**
 * Print content in a simple box
 */
export function box(content: string | string[], title?: string): void {
  const lines = Array.isArray(content) ? content : content.split('\n');
  const maxWidth = Math.max(...lines.map(l => l.length), title?.length ?? 0);
  const width = maxWidth + 4;

  const top = title
    ? pc.dim(`+-- ${title} ` + '-'.repeat(width - title.length - 5) + '+')
    : pc.dim('+' + '-'.repeat(width - 2) + '+');
  const bottom = pc.dim('+' + '-'.repeat(width - 2) + '+');

  console.log(top);
  for (const line of lines) {
    console.log(pc.dim('|') + ' ' + line.padEnd(maxWidth) + ' ' + pc.dim('|'));
  }
  console.log(bottom);
}

// =============================================================================
// Diff Output
// =============================================================================

/**
 * Print a diff-style comparison
 */
export function diff(removed: string[], added: string[]): void {
  for (const line of removed) {
    console.log(pc.red('- ' + line));
  }
  for (const line of added) {
    console.log(pc.green('+ ' + line));
  }
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Pad a string to a specified width
 */
function padString(str: string, width: number, align: 'left' | 'right' | 'center'): string {
  const stripped = stripAnsi(str);
  const pad = width - stripped.length;

  if (pad <= 0) return str.slice(0, width);

  switch (align) {
    case 'right':
      return ' '.repeat(pad) + str;
    case 'center': {
      const leftPad = Math.floor(pad / 2);
      const rightPad = pad - leftPad;
      return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
    }
    default:
      return str + ' '.repeat(pad);
  }
}

/**
 * Strip ANSI codes from a string
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[mK]/g, '');
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Format bytes as human-readable string
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let value = bytes;

  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }

  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format a duration in milliseconds as human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

/**
 * Format a date as relative time
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}
