import { button, element, labeledInput } from "./dom";

let active: HTMLDialogElement | undefined;
export function hasDialog(): boolean {
  return (active?.open ?? false) || document.querySelector('[role="menu"][data-open]') !== null;
}
export function openDialog(title: string) {
  active?.close();
  const opener = document.activeElement;
  const dialog = element("dialog", "dialog");
  const header = element("header", "dialog-header");
  const heading = element("h2", "", title);
  heading.id = "dialog-heading";
  dialog.setAttribute("aria-labelledby", heading.id);
  header.append(
    heading,
    button("닫기", () => dialog.close(), "button subtle"),
  );
  const body = element("div", "dialog-body");
  dialog.append(header, body);
  dialog.addEventListener("close", () => {
    dialog.remove();
    if (active === dialog) active = undefined;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  });
  document.body.append(dialog);
  active = dialog;
  dialog.showModal();
  return { dialog, body };
}
export function askText(
  title: string,
  initial: string,
  onSubmit: (value: string) => Promise<void>,
) {
  const { dialog, body } = openDialog(title);
  const { wrap, input } = labeledInput("폴더를 포함한 파일 이름", initial, "notes/새 노트.md");
  const error = element("p", "error-text");
  error.setAttribute("role", "alert");
  const submit = button(
    "만들기",
    () => {
      submit.disabled = true;
      void onSubmit(input.value)
        .then(() => {
          dialog.close();
          document
            .querySelector<HTMLElement>(
              ".pane-group.is-focused .document-host:not([hidden]) .cm-content",
            )
            ?.focus();
        })
        .catch((cause: unknown) => {
          error.textContent =
            cause instanceof Error ? cause.message : "작업을 완료하지 못했습니다.";
          submit.disabled = false;
        });
    },
    "button primary",
  );
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submit.click();
  });
  body.append(wrap, error, submit);
  input.focus();
  input.select();
}
