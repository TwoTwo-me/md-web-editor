import { button, download, element } from "./dom";
import type { ThemeDefinition } from "./theme";
import {
  applyCustomTheme,
  getBundledThemes,
  getCurrentTheme,
  getCustomTheme,
  getSelectedThemeId,
  previewTheme,
  readThemeFile,
  resetCustomTheme,
  selectBundledTheme,
  selectCustomTheme,
} from "./theme";

function bundledThemeId(value: string): string | undefined {
  if (value === "custom" || !value) return undefined;
  return getBundledThemes().some((entry) => entry.id === value) ? value : undefined;
}

export type ThemeSettingsView = Readonly<{
  nodes: readonly Node[];
  hasPreview: () => boolean;
}>;

export function createThemeSettings(): ThemeSettingsView {
  const heading = element("h3", "settings-heading", "사용자 테마");
  const choiceField = element("label", "field");
  choiceField.append(element("span", "field-label", "테마 색상"));
  const choice = element("select");
  for (const entry of getBundledThemes()) {
    const option = element("option");
    option.value = entry.id;
    option.textContent = entry.theme.name;
    choice.append(option);
  }
  const savedCustom = getCustomTheme();
  let customOption: HTMLOptionElement | undefined;
  if (savedCustom) {
    customOption = element("option");
    customOption.value = "custom";
    customOption.textContent = `사용자 테마: ${savedCustom.name}`;
    choice.append(customOption);
  }
  choice.value = getSelectedThemeId();
  choiceField.append(choice);
  const help = element(
    "p",
    "muted",
    "JSON 파일은 정해진 색상 토큰만 읽으며 CSS와 URL은 실행하지 않습니다.",
  );
  const file = element("input");
  file.type = "file";
  file.accept = "application/json,.json";
  const status = element("p", "muted", `현재 적용: ${getCurrentTheme().name}`);
  status.setAttribute("role", "status");
  let importedTheme: ThemeDefinition | undefined;
  choice.addEventListener("change", () => {
    const selected = bundledThemeId(choice.value);
    const applied = selected ? selectBundledTheme(selected) : selectCustomTheme();
    if (!applied) {
      choice.value = getSelectedThemeId();
      status.textContent = "테마 선택을 저장하지 못했습니다. 브라우저 저장소 권한을 확인하세요.";
      return;
    }
    status.textContent = `현재 적용: ${getCurrentTheme().name}`;
  });
  file.addEventListener("change", () => {
    const selected = file.files?.[0];
    if (!selected) return;
    void readThemeFile(selected)
      .then((theme) => {
        if (!theme) {
          status.textContent = "테마 파일을 읽지 못했습니다. 버전 1과 6자리 색상을 확인하세요.";
          return;
        }
        importedTheme = theme;
        previewTheme(theme);
        status.textContent = `미리보기: ${theme.name} · 적용을 눌러 저장하세요.`;
      })
      .catch((cause: unknown) => {
        status.textContent =
          cause instanceof Error ? cause.message : "테마 파일을 읽지 못했습니다.";
      });
  });
  const apply = button(
    "적용",
    () => {
      if (!importedTheme) return;
      if (!applyCustomTheme(importedTheme)) {
        status.textContent = "테마를 저장하지 못했습니다. 브라우저 저장소 권한을 확인하세요.";
        return;
      }
      if (!customOption) {
        customOption = element("option");
        customOption.value = "custom";
        choice.append(customOption);
      }
      customOption.textContent = `사용자 테마: ${importedTheme.name}`;
      choice.value = "custom";
      status.textContent = `현재 적용: ${importedTheme.name}`;
      importedTheme = undefined;
    },
    "button",
  );
  const reset = button(
    "기본 테마로 되돌리기",
    () => {
      importedTheme = undefined;
      resetCustomTheme();
      customOption?.remove();
      customOption = undefined;
      choice.value = "builtin";
      status.textContent = "기본 테마 사용 중";
    },
    "button",
  );
  const exportButton = button(
    "내보내기",
    () => {
      const theme = getCurrentTheme();
      download(
        `${theme.name.replace(/[^\p{L}\p{N}_-]+/gu, "-") || "theme"}.json`,
        `${JSON.stringify(theme, null, 2)}\n`,
        "application/json",
      );
    },
    "button",
  );
  const actions = element("div", "dialog-actions");
  actions.append(file, apply, exportButton, reset);
  return {
    nodes: [heading, help, choiceField, status, actions],
    hasPreview: () => importedTheme !== undefined,
  };
}
