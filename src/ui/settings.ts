import { openDialog } from "./dialog";
import { button, download, element } from "./dom";
import type { Preferences, ThemeDefinition } from "./theme";
import {
  applyCustomTheme,
  getCurrentTheme,
  getCustomTheme,
  getPreferences,
  initializeTheme,
  previewTheme,
  readThemeFile,
  resetCustomTheme,
  updatePreferencesWithStatus,
} from "./theme";

function appearanceValue(value: string): Preferences["appearance"] | undefined {
  switch (value) {
    case "system":
    case "dark":
    case "light":
      return value;
    default:
      return undefined;
  }
}

function rangeField(
  label: string,
  value: number,
  min: number,
  max: number,
  unit: string,
): {
  readonly wrap: HTMLLabelElement;
  readonly input: HTMLInputElement;
  readonly output: HTMLOutputElement;
} {
  const wrap = element("label", "field");
  const caption = element("span", "field-label", label);
  const input = element("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = "1";
  input.value = String(value);
  const output = element("output", "muted", `${value}${unit}`);
  input.addEventListener("input", () => {
    output.value = `${input.value}${unit}`;
    output.textContent = output.value;
  });
  wrap.append(caption, input, output);
  return { wrap, input, output };
}

function checkField(
  label: string,
  checked: boolean,
): { readonly wrap: HTMLLabelElement; readonly input: HTMLInputElement } {
  const wrap = element("label", "field checkbox-field");
  const input = element("input");
  input.type = "checkbox";
  input.checked = checked;
  wrap.append(input, element("span", "field-label", label));
  return { wrap, input };
}

function versionText(): string {
  const version = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "development";
  const build = typeof __BUILD_SHA__ === "string" ? __BUILD_SHA__ : "development";
  return `버전 ${version} · 빌드 ${build}`;
}

export function showSettings(): void {
  const preferences = getPreferences();
  const { dialog, body } = openDialog("설정");
  const appearanceField = element("label", "field");
  appearanceField.append(element("span", "field-label", "화면 테마"));
  const appearance = element("select");
  const appearanceOptions = [
    ["system", "시스템 설정 따르기"],
    ["dark", "어두운 테마"],
    ["light", "밝은 테마"],
  ] as const;
  for (const [value, label] of appearanceOptions) {
    const option = element("option");
    option.value = value;
    option.textContent = label;
    appearance.append(option);
  }
  appearance.value = preferences.appearance;
  appearanceField.append(appearance);

  const font = rangeField("편집기 글자 크기", preferences.fontSize, 14, 24, "px");
  const width = rangeField("편집기 너비", preferences.lineWidth, 520, 1100, "px");
  const escapePrefix = checkField("Esc를 명령 접두어로 사용", preferences.prefixEscape);
  const controlSpace = checkField(
    "Ctrl+Space를 명령 접두어로 사용",
    preferences.prefixControlSpace,
  );
  const constraint = element(
    "p",
    "muted",
    "접두어를 하나 이상 켜 두면 키보드 명령을 계속 사용할 수 있습니다.",
  );
  constraint.setAttribute("role", "status");
  const enforcePrefix = (changed: HTMLInputElement): void => {
    if (!escapePrefix.input.checked && !controlSpace.input.checked) {
      changed.checked = true;
      constraint.textContent = "접두어를 하나 이상 켜 두어야 키보드 명령을 사용할 수 있습니다.";
    } else {
      constraint.textContent = "접두어를 하나 이상 켜 두면 키보드 명령을 계속 사용할 수 있습니다.";
    }
  };
  escapePrefix.input.addEventListener("change", () => enforcePrefix(escapePrefix.input));
  controlSpace.input.addEventListener("change", () => enforcePrefix(controlSpace.input));

  const themeHeading = element("h3", "settings-heading", "사용자 테마");
  const themeHelp = element(
    "p",
    "muted",
    "JSON 파일은 정해진 색상 토큰만 읽으며 CSS와 URL은 실행하지 않습니다.",
  );
  const file = element("input");
  file.type = "file";
  file.accept = "application/json,.json";
  const themeStatus = element(
    "p",
    "muted",
    getCustomTheme()?.name ? `현재 적용: ${getCustomTheme()?.name}` : "기본 테마 사용 중",
  );
  themeStatus.setAttribute("role", "status");
  let importedTheme: ThemeDefinition | undefined;
  file.addEventListener("change", () => {
    const selected = file.files?.[0];
    if (!selected) return;
    void readThemeFile(selected)
      .then((theme) => {
        if (!theme) {
          themeStatus.textContent =
            "테마 파일을 읽지 못했습니다. 버전 1과 6자리 색상을 확인하세요.";
          return;
        }
        importedTheme = theme;
        previewTheme(theme);
        themeStatus.textContent = `미리보기: ${theme.name} · 적용을 눌러 저장하세요.`;
      })
      .catch((cause: unknown) => {
        themeStatus.textContent =
          cause instanceof Error ? cause.message : "테마 파일을 읽지 못했습니다.";
      });
  });
  const apply = button(
    "적용",
    () => {
      if (!importedTheme) return;
      if (!applyCustomTheme(importedTheme)) {
        themeStatus.textContent = "테마를 저장하지 못했습니다. 브라우저 저장소 권한을 확인하세요.";
        return;
      }
      themeStatus.textContent = `현재 적용: ${importedTheme.name}`;
      importedTheme = undefined;
    },
    "button",
  );
  const reset = button(
    "기본 테마로 되돌리기",
    () => {
      importedTheme = undefined;
      resetCustomTheme();
      themeStatus.textContent = "기본 테마 사용 중";
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
  const themeActions = element("div", "dialog-actions");
  themeActions.append(file, apply, exportButton, reset);

  const info = element(
    "p",
    "muted",
    `${versionText()} · Chrome/Edge에서는 선택한 폴더에 저장할 수 있고, 다른 브라우저에서는 읽기 전용으로 열립니다.`,
  );
  const privacy = element(
    "p",
    "muted",
    "노트와 검색 내용은 브라우저 밖으로 전송하지 않습니다. 설정은 이 브라우저에만 저장됩니다.",
  );
  const save = button(
    "저장",
    () => {
      const nextAppearance = appearanceValue(appearance.value);
      if (!nextAppearance) return;
      const result = updatePreferencesWithStatus({
        appearance: nextAppearance,
        fontSize: Number(font.input.value),
        lineWidth: Number(width.input.value),
        prefixEscape: escapePrefix.input.checked,
        prefixControlSpace: controlSpace.input.checked,
      });
      if (!result.saved) {
        info.textContent = "설정을 저장하지 못했습니다. 브라우저 저장소 권한을 확인하세요.";
        return;
      }
      dialog.close();
    },
    "button primary",
  );
  body.append(
    appearanceField,
    font.wrap,
    width.wrap,
    escapePrefix.wrap,
    controlSpace.wrap,
    constraint,
    themeHeading,
    themeHelp,
    themeStatus,
    themeActions,
    info,
    privacy,
    save,
  );
  appearance.focus();
  dialog.addEventListener("close", () => {
    if (importedTheme) initializeTheme();
  });
}
