export interface ParsedCollectionSegment {
  collection: string;
  params: Record<string, string>;
}

/*
 * Simplified parser for segments like:
 *   file(projectId='123',env=prod,flag=true)
 * Assumptions / limitations (by design for simplicity):
 *   - Only single quotes are recognized; double quotes are NOT special.
 *   - Values without quotes end at the next comma or closing parenthesis.
 *   - No escaping inside quoted strings.
 *   - Commas inside quoted strings are NOT supported.
 *   - Trailing commas are NOT allowed.
 */
export function parseCollectionSegment(segment: string): ParsedCollectionSegment | null {
  if (!segment) return null;

  const open = segment.indexOf('(');
  if (open === -1) {
    return { collection: segment.trim(), params: {} };
  }
  const close = segment.lastIndexOf(')');
  if (close === -1 || close < open) return null;

  const collection = segment.substring(0, open).trim();
  if (!collection) return null;

  const body = segment.substring(open + 1, close).trim();
  if (!body) return { collection, params: {} };

  const params: Record<string, string> = {};
  const parts = body.split(',');
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) return null; // empty entry (e.g., trailing comma)
    const eq = part.indexOf('=');
    if (eq === -1) return null;
    const key = part.substring(0, eq).trim();
    if (!key) return null;
    let value = part.substring(eq + 1).trim();
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    params[key] = value;
  }

  return { collection, params };
}
