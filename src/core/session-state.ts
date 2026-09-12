import type { Session } from "./session-model";

export function revisionsOf(items: ReadonlyMap<string, Session>): ReadonlyMap<string, number> {
  return new Map([...items].map(([path, session]) => [path, session.revision]));
}

export function changedSince(
  items: ReadonlyMap<string, Session>,
  revisions: ReadonlyMap<string, number>,
): boolean {
  return [...items].some(([path, session]) => revisions.get(path) !== session.revision);
}

export function hasPending(items: ReadonlyMap<string, Session>): boolean {
  return [...items.values()].some((session) => session.status.kind !== "saved");
}

export async function flushSessions(items: ReadonlyMap<string, Session>): Promise<boolean> {
  let saved = true;
  for (const session of items.values()) {
    if (session.save) {
      if (!(await session.save.flush())) saved = false;
    } else if (session.status.kind !== "saved") saved = false;
  }
  return saved;
}
