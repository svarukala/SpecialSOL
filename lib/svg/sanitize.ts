export function sanitizeSvg(svg: string): string {
  return svg
    // Remove script tags
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Remove event handler attributes (quoted, unquoted, or empty)
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Remove javascript: and data: URIs from href/xlink:href/src attributes
    .replace(/(\s+(?:href|xlink:href|src|action)\s*=\s*["']?\s*)(?:javascript|data|vbscript):[^"'\s>]*/gi, '$1#')
    // Remove <use> elements which can load external resources
    .replace(/<use[\s\S]*?\/>/gi, '')
    .replace(/<use[\s\S]*?<\/use>/gi, '')
    // Remove <foreignObject> which can embed HTML
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
}
