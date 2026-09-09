import { discardSpecificDraft } from "../storage/journal";
import { openDialog } from "../ui/dialog";
import { button, download, element } from "../ui/dom";
import type { Session } from "./sessions";

export type RecoveryChoice = "recover" | "disk" | "dismiss";

export async function discardSavedRecovery(session: Session): Promise<void> {
  const recovery = session.recovery;
  if (!recovery) return;
  await discardSpecificDraft(recovery);
  if (session.recovery === recovery) session.recovery = undefined;
}

export function offerRecovery(
  path: string,
  content: string,
  disk: string,
  changed: boolean,
): Promise<RecoveryChoice> {
  return new Promise((resolve) => {
    const { dialog, body } = openDialog("저장하지 못한 내용 복구");
    let choice: RecoveryChoice = "dismiss";
    const message = changed
      ? "디스크 파일도 변경되었습니다. 복구본을 열면 저장 전에 두 버전을 검토합니다."
      : "복구본을 열면 현재 디스크 내용을 기준으로 다시 저장합니다.";
    body.append(
      element("p", "", `${path}의 로컬 복구본이 있습니다.`),
      element("p", "muted", message),
    );
    const actions = element("div", "dialog-actions");
    actions.append(
      button("복구본 내려받기", () => download("recovery.md", content)),
      button("디스크 내용 내려받기", () => download("disk-copy.md", disk)),
      button("디스크 내용 사용", () => {
        choice = "disk";
        dialog.close();
      }),
      button(
        "복구본 열기",
        () => {
          choice = "recover";
          dialog.close();
        },
        "button primary",
      ),
    );
    body.append(actions);
    dialog.addEventListener("close", () => resolve(choice), { once: true });
  });
}
