/**
 * Constants used throughout the extension
 */

export const EXTENSION_NAME = 'Senior Code Reviewer';
export const DIAGNOSTIC_SOURCE = 'Senior Code Reviewer';

export const SEVERITY_MAP = {
  critical: 'error',
  architecture: 'warning',
  'over-engineering': 'info',
  readability: 'info',
  maintainability: 'warning',
  security: 'error',
  scalability: 'warning',
  pragmatism: 'info',
} as const;

export const SEVERITY_ICONS = {
  critical: '🔴',
  architecture: '⚠️',
  'over-engineering': '💡',
  readability: '📖',
  maintainability: '🔧',
  security: '🔒',
  scalability: '📈',
  pragmatism: '🎯',
} as const;

export const COMMAND_IDS = {
  REVIEW_FILE: 'seniorCodeReviewer.reviewCurrentFile',
  REVIEW_WORKSPACE: 'seniorCodeReviewer.reviewWorkspace',
  FIX_ALL: 'seniorCodeReviewer.fixAllIssues',
  CLEAR_CACHE: 'seniorCodeReviewer.clearCache',
} as const;

export const CONFIG_SECTION = 'seniorCodeReviewer';

// Performance thresholds
export const DEBOUNCE_DELAY = 1000; // 1 second
export const MAX_FILE_SIZE = 1024 * 1024; // 1MB
export const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour
