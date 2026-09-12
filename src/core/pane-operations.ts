import type { WorkspacePanes } from "./workspace-panes";

export async function openPane(panes: WorkspacePanes, path: string, group: string) {
  const sessions = panes.app.sessions;
  if (!sessions || !panes.layout.group(group)) return false;
  const token = Symbol();
  panes.requests.set(group, token);
  if (!(await panes.app.canLeave())) return false;
  if (panes.requests.get(group) !== token) return false;
  const existing = panes.layout.group(group)?.tabs.find((id) => {
    const tab = panes.layout.tabs.get(id);
    return tab?.kind === "note" && tab.path === path;
  });
  const id = existing ?? crypto.randomUUID();
  try {
    await sessions.ensureView(path, id);
  } catch (cause: unknown) {
    if (sessions !== panes.app.sessions) return false;
    throw cause;
  }
  if (
    sessions !== panes.app.sessions ||
    panes.requests.get(group) !== token ||
    !panes.layout.group(group)
  ) {
    if (!existing && sessions === panes.app.sessions) await sessions.closeView(id);
    return false;
  }
  if (!existing) panes.layout.add({ id, kind: "note", path }, group);
  panes.select(id);
  if (innerWidth <= 760) panes.app.shell.shell.classList.add("hide-explorer");
  return true;
}

export async function closePane(panes: WorkspacePanes, id: string) {
  const tab = panes.layout.tabs.get(id);
  if (!tab) return true;
  if (tab.kind === "note" && !(await panes.app.sessions?.closeView(id))) {
    panes.app.sessions?.saveDialog();
    return false;
  }
  panes.graphs.get(id)?.view.destroy();
  panes.graphs.delete(id);
  panes.layout.close(id);
  const next = panes.layout.group()?.active;
  if (next) panes.select(next);
  else panes.changed();
  return true;
}

export async function duplicatePane(
  panes: WorkspacePanes,
  id: string,
  position: "right" | "bottom",
) {
  const tab = panes.layout.tabs.get(id);
  const group = panes.layout.groups().find((item) => item.tabs.includes(id));
  if (!tab || !group) return;
  const next = crypto.randomUUID();
  if (tab.kind === "note") {
    const sessions = panes.app.sessions;
    if (!sessions) return;
    const mode = sessions.views.get(id)?.mode ?? "live";
    const view = await sessions.ensureView(tab.path, next);
    if (sessions !== panes.app.sessions) return;
    if (!panes.layout.group(group.id)) {
      await sessions.closeView(next);
      return;
    }
    view.mode = mode;
    view.editor.setMode(mode);
  }
  panes.layout.add({ ...tab, id: next }, group.id);
  panes.move(next, { group: group.id, position });
}

export async function restorePanes(panes: WorkspacePanes) {
  const vault = panes.app.vault;
  const sessions = panes.app.sessions;
  if (!vault || !sessions) return false;
  panes.restoring = true;
  try {
    let snapshot: unknown;
    try {
      snapshot = await panes.persistence.load(vault.id);
    } catch (cause: unknown) {
      panes.app.report(cause);
      return false;
    }
    if (vault !== panes.app.vault || sessions !== panes.app.sessions) return false;
    if (!panes.layout.restore(snapshot, [...panes.app.notes.keys()])) return false;
    for (const tab of [...panes.layout.tabs.values()]) {
      if (tab.kind === "note") {
        try {
          await sessions.ensureView(tab.path, tab.id);
        } catch (cause: unknown) {
          if (sessions !== panes.app.sessions) return false;
          panes.layout.close(tab.id);
          panes.app.report(cause);
        }
      }
      if (vault !== panes.app.vault || sessions !== panes.app.sessions) return false;
    }
    const active = panes.layout.group()?.active;
    if (active) {
      const note = [...panes.layout.tabs.values()].find((tab) => tab.kind === "note");
      if (note) sessions.activateView(note.id);
      panes.select(active, false);
    }
    return panes.layout.tabs.size > 0;
  } finally {
    if (sessions === panes.app.sessions) {
      panes.restoring = false;
      panes.changed();
    }
  }
}
