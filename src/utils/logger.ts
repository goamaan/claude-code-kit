/**
 * Colored console output utilities for claudeops
 */

import pc from 'picocolors';

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

/**
 * Current log level (can be set via environment)
 */
let currentLogLevel: LogLevel = getInitialLogLevel();

function getInitialLogLevel(): LogLevel {
  const envLevel = process.env['CLAUDE_KIT_LOG_LEVEL']?.toLowerCase();
  if (envLevel === 'debug' || envLevel === 'info' || envLevel === 'warn' || envLevel === 'error') {
    return envLevel;
  }
  return 'info';
}

/**
 * Log level priorities (higher = more severe)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  success: 1, // Same as info
  warn: 2,
  error: 3,
};

/**
 * Check if a log level should be displayed
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
}

/**
 * Set the current log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Prefix icons for different log levels
 */
const LOG_ICONS = {
  debug: pc.gray('[D]'),
  info: pc.blue('[i]'),
  success: pc.green('[+]'),
  warn: pc.yellow('[!]'),
  error: pc.red('[x]'),
} as const;

/**
 * Logger object with methods for each log level
 */
export const log = {
  /**
   * Log debug message (only shown when log level is debug)
   */
  debug(msg: string): void {
    if (shouldLog('debug')) {
      console.log(`${LOG_ICONS.debug} ${pc.gray(msg)}`);
    }
  },

  /**
   * Log info message
   */
  info(msg: string): void {
    if (shouldLog('info')) {
      console.log(`${LOG_ICONS.info} ${msg}`);
    }
  },

  /**
   * Log success message
   */
  success(msg: string): void {
    if (shouldLog('success')) {
      console.log(`${LOG_ICONS.success} ${pc.green(msg)}`);
    }
  },

  /**
   * Log warning message
   */
  warn(msg: string): void {
    if (shouldLog('warn')) {
      console.warn(`${LOG_ICONS.warn} ${pc.yellow(msg)}`);
    }
  },

  /**
   * Log error message
   */
  error(msg: string): void {
    if (shouldLog('error')) {
      console.error(`${LOG_ICONS.error} ${pc.red(msg)}`);
    }
  },

  /**
   * Log a plain message without prefix
   */
  plain(msg: string): void {
    console.log(msg);
  },

  /**
   * Log a newline
   */
  newline(): void {
    console.log();
  },

  /**
   * Log a horizontal rule
   */
  hr(char = '-', length = 40): void {
    console.log(pc.dim(char.repeat(length)));
  },
};

/**
 * Format an error for display
 * @param error - Error to format
 * @returns Formatted error string
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    const lines: string[] = [];

    // Error name and message
    lines.push(pc.red(`${error.name}: ${error.message}`));

    // Cause if present
    if (error.cause) {
      const causeMsg = formatError(error.cause);
      lines.push(pc.dim('  Caused by: ') + causeMsg);
    }

    // Stack trace (if debug mode)
    if (currentLogLevel === 'debug' && error.stack) {
      const stackLines = error.stack.split('\n').slice(1);
      lines.push(pc.dim('  Stack trace:'));
      for (const line of stackLines) {
        lines.push(pc.dim(`  ${line.trim()}`));
      }
    }

    return lines.join('\n');
  }

  if (typeof error === 'string') {
    return pc.red(error);
  }

  return pc.red(String(error));
}

/**
 * Format a path for display (dim the directory, highlight filename)
 */
export function formatPath(path: string): string {
  const parts = path.split('/');
  const filename = parts.pop() ?? '';
  const dir = parts.join('/');

  if (dir) {
    return `${pc.dim(dir + '/')}${pc.cyan(filename)}`;
  }
  return pc.cyan(filename);
}

/**
 * Format a key-value pair for display
 */
export function formatKeyValue(key: string, value: string): string {
  return `${pc.dim(key + ':')} ${value}`;
}

/**
 * Format a list of items
 */
export function formatList(items: string[], indent = 2): string {
  const prefix = ' '.repeat(indent) + pc.dim('- ');
  return items.map((item) => prefix + item).join('\n');
}

/**
 * Format a section header
 */
export function formatSection(title: string): string {
  return pc.bold(pc.underline(title));
}

/**
 * Color utility functions (re-exported from picocolors)
 */
export const colors = {
  bold: pc.bold,
  dim: pc.dim,
  italic: pc.italic,
  underline: pc.underline,
  strikethrough: pc.strikethrough,
  red: pc.red,
  green: pc.green,
  yellow: pc.yellow,
  blue: pc.blue,
  magenta: pc.magenta,
  cyan: pc.cyan,
  white: pc.white,
  gray: pc.gray,
  bgRed: pc.bgRed,
  bgGreen: pc.bgGreen,
  bgYellow: pc.bgYellow,
  bgBlue: pc.bgBlue,
  bgMagenta: pc.bgMagenta,
  bgCyan: pc.bgCyan,
  reset: pc.reset,
} as const;

/**
 * Create a spinner-like indicator (for non-TTY environments)
 */
export function createSimpleSpinner(message: string): {
  start: () => void;
  stop: (success: boolean) => void;
  update: (msg: string) => void;
} {
  let currentMessage = message;

  return {
    start(): void {
      log.info(pc.dim('...') + ' ' + currentMessage);
    },
    stop(success: boolean): void {
      if (success) {
        log.success(currentMessage);
      } else {
        log.error(currentMessage);
      }
    },
    update(msg: string): void {
      currentMessage = msg;
    },
  };
}
