export type LabelBounds = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly priority: number;
};

function overlaps(left: LabelBounds, right: LabelBounds): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function visibleLabelIds(
  bounds: readonly LabelBounds[],
  obstacles: readonly LabelBounds[] = [],
): ReadonlySet<string> {
  const selected: LabelBounds[] = [...obstacles];
  const visible = new Set<string>();
  for (const candidate of [...bounds].sort((left, right) => right.priority - left.priority)) {
    const blocked = selected.some(
      (accepted) =>
        candidate.id !== accepted.id &&
        overlaps(candidate, accepted) &&
        !(candidate.priority >= 3 && accepted.priority >= 4),
    );
    if (blocked) continue;
    selected.push(candidate);
    visible.add(candidate.id);
  }
  return visible;
}
