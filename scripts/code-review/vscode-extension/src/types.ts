/**
 * Type definitions for Senior Code Reviewer VS Code Extension
 */

export interface Issue {
  file: string;
  line: number;
  column?: number;
  severity: 'critical' | 'architecture' | 'over-engineering' | 'readability' | 'maintainability' | 'security' | 'scalability' | 'pragmatism';
  category: string;
  message: string;
  impact?: string;
  fix?: string;
  code?: string;
  teachingMoment?: string;
  documentation?: string;
}

export interface AnalyzerResult {
  critical: Issue[];
  architecture: Issue[];
  overEngineering: Issue[];
  quality: Issue[];
  goodPatterns: GoodPattern[];
  summary: {
    totalIssues: number;
    criticalCount: number;
    filesAnalyzed: number;
  };
}

export interface GoodPattern {
  file: string;
  line?: number;
  category: string;
  message: string;
  reason?: string;
}

export interface ReviewConfig {
  enabled: boolean;
  validateOnSave: boolean;
  validateOnType: boolean;
  severity: string[];
  excludePatterns: string[];
  maxComplexity: number;
  maxFunctionLines: number;
  showGoodPatterns: boolean;
  debugMode: boolean;
}

export interface CacheEntry {
  hash: string;
  result: Issue[];
  timestamp: number;
}
