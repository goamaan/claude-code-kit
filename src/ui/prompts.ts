/**
 * Wrapped @clack/prompts utilities
 * Provides a consistent interface for interactive CLI prompts
 */

import * as p from '@clack/prompts';

// Re-export all clack prompts utilities
export {
  intro,
  outro,
  text,
  password,
  confirm,
  select,
  multiselect,
  selectKey,
  spinner,
  note,
  cancel,
  isCancel,
  log,
  group,
  groupMultiselect,
  tasks,
} from '@clack/prompts';

// Type re-exports
export type {
  TextOptions,
  PasswordOptions,
  ConfirmOptions,
  SelectOptions,
  MultiSelectOptions,
} from '@clack/prompts';

/**
 * Prompt for a profile name
 */
export async function promptProfileName(initial?: string): Promise<string | symbol> {
  return p.text({
    message: 'Profile name:',
    placeholder: 'my-profile',
    initialValue: initial,
    validate: (value) => {
      if (!value) return 'Profile name is required';
      if (!/^[a-z][a-z0-9-]*$/.test(value)) {
        return 'Profile name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens';
      }
      return undefined;
    },
  });
}

/**
 * Prompt for a setup name
 */
export async function promptSetupName(initial?: string): Promise<string | symbol> {
  return p.text({
    message: 'Setup name:',
    placeholder: 'my-setup',
    initialValue: initial,
    validate: (value) => {
      if (!value) return 'Setup name is required';
      if (!/^[a-z][a-z0-9-]*$/.test(value)) {
        return 'Setup name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens';
      }
      return undefined;
    },
  });
}

/**
 * Prompt for an addon name
 */
export async function promptAddonName(initial?: string): Promise<string | symbol> {
  return p.text({
    message: 'Addon name:',
    placeholder: 'my-addon',
    initialValue: initial,
    validate: (value) => {
      if (!value) return 'Addon name is required';
      if (!/^[a-z][a-z0-9-]*$/.test(value)) {
        return 'Addon name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens';
      }
      return undefined;
    },
  });
}

/**
 * Prompt for confirmation with custom message
 */
export async function promptConfirm(message: string, initial = false): Promise<boolean | symbol> {
  return p.confirm({
    message,
    initialValue: initial,
  });
}

/**
 * Prompt to select from a list of options
 */
export async function promptSelect<T extends string>(
  message: string,
  options: Array<{ value: T; label: string; hint?: string }>
): Promise<T | symbol> {
  return p.select({
    message,
    // @ts-expect-error - clack types are overly strict
    options,
  }) as Promise<T | symbol>;
}

/**
 * Prompt to select multiple options
 */
export async function promptMultiSelect<T extends string>(
  message: string,
  options: Array<{ value: T; label: string; hint?: string }>,
  required = false
): Promise<T[] | symbol> {
  return p.multiselect({
    message,
    // @ts-expect-error - clack types are overly strict
    options,
    required,
  }) as Promise<T[] | symbol>;
}

/**
 * Prompt for a file path
 */
export async function promptPath(
  message: string,
  options?: {
    placeholder?: string;
    initial?: string;
  }
): Promise<string | symbol> {
  return p.text({
    message,
    placeholder: options?.placeholder ?? '/path/to/file',
    initialValue: options?.initial,
    validate: (value) => {
      if (!value) return 'Path is required';
      return undefined;
    },
  });
}

/**
 * Prompt for a URL
 */
export async function promptUrl(
  message: string,
  options?: {
    placeholder?: string;
    initial?: string;
  }
): Promise<string | symbol> {
  return p.text({
    message,
    placeholder: options?.placeholder ?? 'https://...',
    initialValue: options?.initial,
    validate: (value) => {
      if (!value) return 'URL is required';
      try {
        new URL(value);
        return undefined;
      } catch {
        return 'Invalid URL format';
      }
    },
  });
}

/**
 * Handle cancel (Ctrl+C)
 */
export function handleCancel(value: unknown): void {
  if (p.isCancel(value)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }
}

/**
 * Run a series of tasks with a spinner
 */
export async function runTasks<T>(
  tasks: Array<{
    title: string;
    task: () => Promise<T>;
    enabled?: boolean;
  }>
): Promise<T[]> {
  const results: T[] = [];
  const s = p.spinner();

  for (const task of tasks) {
    if (task.enabled === false) continue;

    s.start(task.title);
    try {
      const result = await task.task();
      results.push(result);
      s.stop(`${task.title} - done`);
    } catch (error) {
      s.stop(`${task.title} - failed`);
      throw error;
    }
  }

  return results;
}

/**
 * Show a spinner while running a task
 */
export async function withSpinner<T>(
  message: string,
  task: () => Promise<T>,
  options?: {
    successMessage?: string;
    failureMessage?: string;
  }
): Promise<T> {
  const s = p.spinner();
  s.start(message);

  try {
    const result = await task();
    s.stop(options?.successMessage ?? `${message} - done`);
    return result;
  } catch (error) {
    s.stop(options?.failureMessage ?? `${message} - failed`);
    throw error;
  }
}
