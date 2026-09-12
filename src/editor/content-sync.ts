export type ContentChange = { readonly from: number; readonly to: number; readonly insert: string };

export function minimalContentChange(current: string, next: string): ContentChange | undefined {
  if (current === next) return undefined;
  let start = 0;
  const sharedLength = Math.min(current.length, next.length);
  while (start < sharedLength && current[start] === next[start]) start += 1;
  let end = 0;
  const remaining = sharedLength - start;
  while (end < remaining && current[current.length - end - 1] === next[next.length - end - 1])
    end += 1;
  return { from: start, to: current.length - end, insert: next.slice(start, next.length - end) };
}
