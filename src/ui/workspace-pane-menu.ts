import type { WorkspacePanes } from "../core/workspace-panes";
import { showChoices } from "./commands";
import { type PaneMenuContext, type PaneMenuItem, showPaneMenu } from "./pane-menu";

export function workspacePaneMenu(panes: WorkspacePanes, context: PaneMenuContext) {
  const group = panes.layout.group(context.group);
  const tab = context.tab ?? group?.active;
  const items: PaneMenuItem[] = [];
  if (tab) {
    for (const [position, label] of [
      ["right", "오른쪽"],
      ["bottom", "아래쪽"],
    ] as const) {
      items.push(
        {
          label: `${label}으로 이동`,
          disabled: group?.tabs.length === 1,
          run: () => panes.move(tab, { group: context.group, position }),
        },
        {
          label: `${label} 분할 · 탭 복제`,
          run: () => panes.app.run(() => panes.duplicate(tab, position)),
        },
      );
    }
    items.push({
      label: "다른 패널로 이동…",
      disabled: panes.layout.groups().length < 2,
      run: () =>
        showChoices(
          "패널로 이동",
          panes.layout.groups().flatMap((item, index) =>
            item.id === context.group
              ? []
              : [
                  {
                    label: `패널 ${index + 1}`,
                    detail: item.tabs.map((id) => panes.label(id)).join(" · "),
                    run: () => panes.move(tab, { group: item.id, position: "center" }),
                  },
                ],
          ),
        ),
    });
    items.push({ label: "탭 닫기", run: () => panes.app.run(() => panes.close(tab)) });
  }
  items.push(
    { label: "오른쪽에 그래프 열기", run: () => panes.graphRight(context.group) },
    {
      label: "패널 닫기",
      disabled: !group?.tabs.length,
      run: () => panes.app.run(() => panes.closeGroup(context.group)),
    },
    {
      label: "모든 패널 합치기",
      disabled: panes.layout.groups().length < 2,
      run: () => panes.merge(context.group),
    },
  );
  showPaneMenu(context, items);
}
