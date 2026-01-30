/**
 * Global constants for claudeops
 */

/** Global configuration directory (~/.claudeops) */
export const GLOBAL_CONFIG_DIR = '.claudeops';

/** Claude configuration directory (~/.claude) */
export const CLAUDE_DIR = '.claude';

/** Main configuration file name */
export const CONFIG_FILE = 'config.toml';

/** Active profile indicator file */
export const PROFILE_FILE = 'active-profile';

/** Profiles subdirectory */
export const PROFILES_DIR = 'profiles';

/** Addons subdirectory */
export const ADDONS_DIR = 'addons';

/** Setups subdirectory */
export const SETUPS_DIR = 'setups';

/** Claude settings file */
export const CLAUDE_SETTINGS_FILE = 'claude_desktop_config.json';

/** MCP servers configuration file */
export const MCP_SERVERS_FILE = 'mcp-servers.json';

/** Default profile name */
export const DEFAULT_PROFILE_NAME = 'default';

/** Supported config file extensions */
export const CONFIG_EXTENSIONS = ['.toml'] as const;

/** Maximum inheritance depth to prevent circular references */
export const MAX_INHERITANCE_DEPTH = 10;
