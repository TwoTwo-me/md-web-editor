import { openDialog } from "./dialog";
import { button, element } from "./dom";
import { createThemeSettings } from "./settings-theme";
import type { Preferences } from "./theme";
import { getPreferences, initializeTheme, updatePreferencesWithStatus } from "./theme";

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
  const constraint = element("p", "muted", "키보드 명령에 쓸 접두어를 하나 이상 켜 두세요.");
  constraint.setAttribute("role", "status");
  const enforcePrefix = (changed: HTMLInputElement): void => {
    if (!escapePrefix.input.checked && !controlSpace.input.checked) {
      changed.checked = true;
      constraint.textContent = "접두어를 모두 끌 수는 없습니다. 하나 이상 켜 두세요.";
    } else {
      constraint.textContent = "키보드 명령에 쓸 접두어를 하나 이상 켜 두세요.";
    }
  };
  escapePrefix.input.addEventListener("change", () => enforcePrefix(escapePrefix.input));
  controlSpace.input.addEventListener("change", () => enforcePrefix(controlSpace.input));

  const themeSettings = createThemeSettings();

  const info = element(
    "p",
    "muted",
    `${versionText()} · Chrome/Edge는 폴더 편집과 저장을 지원합니다. 다른 브라우저는 읽기 전용입니다.`,
  );
  const privacy = element(
    "p",
    "muted",
    "노트와 검색 내용은 외부로 전송하지 않습니다. 설정도 브라우저 안에 보관합니다.",
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
    ...themeSettings.nodes,
    info,
    privacy,
    save,
  );
  appearance.focus();
  dialog.addEventListener("close", () => {
    if (themeSettings.hasPreview()) initializeTheme();
  });
}
