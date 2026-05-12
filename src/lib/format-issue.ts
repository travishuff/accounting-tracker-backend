import type { ZodIssue } from 'zod';

function resolvePath(value: unknown, path: readonly (string | number | symbol)[]): unknown {
  let current: unknown = value;
  for (const segment of path) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment as string];
  }
  return current;
}

function formatIssue(issue: ZodIssue, body: unknown): string {
  if (issue.code === 'invalid_type' && issue.message.startsWith('Invalid input:')) {
    const field = issue.path.join('.') || 'body';
    const value = resolvePath(body, issue.path);
    if (value === undefined) {
      return `"${field}" is required`;
    }
    return `"${field}" must be a ${issue.expected}`;
  }
  return issue.message;
}

export { formatIssue };
