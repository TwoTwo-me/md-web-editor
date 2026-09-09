import { openDialog } from "../ui/dialog";
import { button, download, element } from "../ui/dom";
import type { Session } from "./sessions";

type SaveDialogActions = {
  readonly reload: (path: string) => Promise<unknown>;
  readonly acceptLocal: (session: Session) => Promise<boolean>;
};

export function showSaveDialog(session: Session | undefined, actions: SaveDialogActions): void {
  if (!session) return;
  const { dialog, body } = openDialog(
    session.status.kind === "conflict" ? "파일 변경이 감지되었습니다" : "저장 상태",
  );
  body.append(element("p", "", session.status.message ?? "변경 내용은 자동으로 저장됩니다."));
  if (session.status.kind === "conflict")
    body.append(
      element(
        "p",
        "muted",
        "다른 프로그램의 변경 내용을 덮어쓰지 않았습니다. 내 내용을 내려받거나, 디스크 버전을 불러오거나, 현재 편집 내용으로 교체할 수 있습니다.",
      ),
    );
  const error = element("p", "error-text");
  error.setAttribute("role", "alert");
  const run = (action: () => Promise<unknown>) => {
    void action()
      .then(() => dialog.close())
      .catch((cause: unknown) => {
        error.textContent = cause instanceof Error ? cause.message : "작업을 완료하지 못했습니다.";
      });
  };
  const controls = element("div", "dialog-actions");
  controls.append(
    button("내 내용 내려받기", () =>
      download(session.path.split("/").at(-1) ?? "note.md", session.editor.getContent()),
    ),
  );
  if (session.status.kind === "conflict") {
    if (session.status.current)
      controls.append(
        button("디스크 내용 내려받기", () =>
          download("disk-copy.md", session.status.current?.content ?? ""),
        ),
      );
    controls.append(button("디스크 버전 불러오기", () => run(() => actions.reload(session.path))));
    controls.append(
      button("내 내용으로 교체", () => {
        dialog.close();
        const confirm = openDialog("디스크 파일을 교체할까요?");
        confirm.body.append(
          element(
            "p",
            "",
            "다른 프로그램에서 변경한 내용이 현재 편집 내용으로 교체됩니다. 필요한 경우 먼저 양쪽 내용을 내려받으세요.",
          ),
          button(
            "교체하기",
            () => {
              void actions
                .acceptLocal(session)
                .then((saved) => {
                  if (saved) confirm.dialog.close();
                  else confirm.body.append(element("p", "error-text", "교체하지 못했습니다."));
                })
                .catch((cause: unknown) => {
                  confirm.body.append(
                    element(
                      "p",
                      "error-text",
                      cause instanceof Error ? cause.message : "교체하지 못했습니다.",
                    ),
                  );
                });
            },
            "button primary",
          ),
        );
      }),
    );
  } else
    controls.append(
      button("다시 저장", () =>
        run(async () => {
          if (!(await session.save?.flush()))
            throw new Error("저장되지 않았습니다. 오류를 확인하세요.");
        }),
      ),
    );
  body.append(error, controls);
}
