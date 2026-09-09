import { openDialog } from "./dialog";
import { button, element, iconButton, labeledInput } from "./dom";
export function showPrimitives(root: HTMLElement) {
  const page = element("main", "showcase");
  page.style.cssText = "padding:32px;max-width:900px;margin:auto;display:grid;gap:24px";
  page.append(element("h1", "", "md-web-editor · 구성 요소"));
  const actions = element("div", "inline-actions");
  actions.append(
    button("폴더 열기", () => undefined, "button primary"),
    button("예제 둘러보기", () => undefined),
    iconButton("검색", "⌕", () => undefined),
  );
  const selected = button("선택된 노트", () => undefined, "file-row active");
  selected.style.maxWidth = "240px";
  const disabled = button("저장 중", () => undefined);
  disabled.disabled = true;
  actions.append(disabled);
  page.append(actions, selected);
  const { wrap } = labeledInput("노트 검색", "", "긴 한글 파일 이름으로도 검색할 수 있습니다");
  page.append(wrap);
  const range = element("input");
  range.type = "range";
  range.setAttribute("aria-label", "노드 크기");
  page.append(range);
  const label = element("label");
  const check = element("input");
  check.type = "checkbox";
  check.checked = true;
  label.append(check, document.createTextNode(" 미연결 노트 표시"));
  page.append(label);
  page.append(
    button("대화상자 열기", () => {
      const { body } = openDialog("파일 변경 감지");
      body.append(
        element("p", "", "다른 프로그램에서 노트가 변경되었습니다. 작성 중인 내용은 유지됩니다."),
        button("내 내용 내려받기", () => undefined),
      );
    }),
  );
  const note = element(
    "p",
    "muted",
    "키보드 Tab 이동 · 명확한 포커스 · 한글과 긴 이름 · Esc로 닫기",
  );
  page.append(note, element("kbd", "", "Esc → P"));
  page.append(
    button("라이트 / 다크", () => {
      document.documentElement.dataset["theme"] =
        document.documentElement.dataset["theme"] === "light" ? "dark" : "light";
    }),
  );
  root.append(page);
}
