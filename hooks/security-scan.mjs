#!/usr/bin/env node
/**
 * Hook: security-scan
 * Event: PreToolUse
 * Description: Scans for secrets before git commits
 * Matcher: Bash
 * Enabled: false
 *
 * security-scan - PreToolUse Hook
 *
 * Scans for secrets and sensitive data before git commits.
 * Detects API keys, tokens, passwords, and other sensitive patterns.
 *
 * Hook type: PreToolUse
 * Triggers: Before Bash tool executes git commit commands
 */

import { readFileSync } from 'fs';

/**
 * Patterns that indicate potential secrets
 */
const SECRET_PATTERNS = [
  // API Keys
  /['"]?[a-z0-9_-]*api[_-]?key['"]?\s*[:=]\s*['"][a-z0-9_-]{20,}['"]/gi,
  /['"]?[a-z0-9_-]*token['"]?\s*[:=]\s*['"][a-z0-9_-]{20,}['"]/gi,
  /['"]?[a-z0-9_-]*secret['"]?\s*[:=]\s*['"][a-z0-9_-]{20,}['"]/gi,

  // AWS Keys
  /AKIA[0-9A-Z]{16}/g,
  /aws[_-]?secret[_-]?access[_-]?key/gi,

  // GitHub tokens
  /gh[pousr]_[A-Za-z0-9_]{36,255}/g,

  // Generic high-entropy strings (potential keys)
  /['"][a-zA-Z0-9+/]{40,}={0,2}['"]/g,

  // Passwords
  /password\s*[:=]\s*['"][^'"]{8,}['"]/gi,
  /passwd\s*[:=]\s*['"][^'"]{8,}['"]/gi,

  // Private keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,

  // Connection strings
  /(?:mysql|postgres|mongodb):\/\/[^\s]+/gi,
];

/**
 * Files that commonly contain secrets
 */
const SENSITIVE_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  'credentials.json',
  'secrets.json',
  'private-key.pem',
  'id_rsa',
  '.npmrc',
  '.pypirc',
];

/**
 * Check if command is a git commit
 */
function isGitCommit(command) {
  return command?.includes('git commit') || command?.includes('git add');
}

/**
 * Extract file paths from git command
 */
function extractFiles(command) {
  // Simple extraction - look for file patterns
  const matches = command.match(/[\w\-./]+\.(js|ts|json|yml|yaml|env|py|go|rs)/g);
  return matches || [];
}

/**
 * Scan file content for secrets
 */
function scanForSecrets(content) {
  const findings = [];

  for (const pattern of SECRET_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      findings.push({
        pattern: pattern.source.slice(0, 50),
        match: match[0].slice(0, 50) + '...',
      });
    }
  }

  return findings;
}

/**
 * Check if filename is sensitive
 */
function isSensitiveFile(filename) {
  return SENSITIVE_FILES.some(sf => filename.includes(sf));
}

/**
 * Main hook function
 */
async function main() {
  // Read hook input from stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);

    // Only check Bash tool with git commands
    if (data.tool !== 'Bash') {
      process.exit(0);
      return;
    }

    const command = data.parameters?.command || '';

    if (!isGitCommit(command)) {
      process.exit(0);
      return;
    }

    // Extract files being committed
    const files = extractFiles(command);
    const warnings = [];

    for (const file of files) {
      // Check if sensitive filename
      if (isSensitiveFile(file)) {
        warnings.push(`⚠️  Sensitive file detected: ${file}`);
        continue;
      }

      // Try to scan content (if accessible)
      try {
        const content = readFileSync(file, 'utf8');
        const secrets = scanForSecrets(content);

        if (secrets.length > 0) {
          warnings.push(`🚨 Potential secrets in ${file}:`);
          secrets.slice(0, 3).forEach(s => {
            warnings.push(`   - ${s.pattern}: ${s.match}`);
          });
        }
      } catch {
        // File not readable, skip
      }
    }

    if (warnings.length > 0) {
      const warningMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 SECURITY SCAN WARNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${warnings.join('\n')}

Before committing:
  1. Review flagged files for actual secrets
  2. Remove or move secrets to environment variables
  3. Add sensitive files to .gitignore
  4. Consider using git-secrets or gitleaks

To bypass this check: export SKIP_SECRET_SCAN=1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

      // Check if user wants to skip
      if (process.env.SKIP_SECRET_SCAN !== '1') {
        console.log(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            additionalContext: warningMessage,
          },
        }));
      }
    }

    process.exit(0);
  } catch {
    // On error, just continue without blocking
    process.exit(0);
  }
}

main();
