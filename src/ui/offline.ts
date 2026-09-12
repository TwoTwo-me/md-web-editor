import type { Workspace } from "../core/workspace";
import { appendNotice, button, element } from "./dom";
export function enableOffline(app: Workspace): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const status = element("span", "", "오프라인 사용을 준비하고 있습니다…");
  status.setAttribute("role", "status");
  const hint = element("span");
  app.shell.welcome.querySelector(".welcome-help")?.append(status, hint);
  const ready = () => {
    status.textContent = "오프라인 사용 준비 완료";
    hint.textContent = "인터넷 없이 로컬 폴더를 열고 편집할 수 있습니다.";
  };
  const failed = () => {
    status.textContent = "오프라인 준비 실패 · 온라인에서 다시 열어 주세요.";
    hint.textContent = "현재 편집과 로컬 저장은 계속 사용할 수 있습니다.";
  };
  const offer = (registration: ServiceWorkerRegistration) => {
    const worker = registration.waiting;
    if (!navigator.serviceWorker.controller || !worker || document.querySelector(".update-banner"))
      return;
    const banner = element("div", "notice update-banner");
    banner.append(
      element("span", "", "새 버전이 준비되었습니다. "),
      button("저장하고 업데이트", () =>
        app.run(async () => {
          if (!(await app.canLeave())) return;
          navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), {
            once: true,
          });
          worker.postMessage("activate");
        }),
      ),
    );
    banner.setAttribute("role", "status");
    appendNotice(banner);
  };
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then((registration) => {
      offer(registration);
      const observe = (worker: ServiceWorker | null) => {
        if (!worker) return;
        const changed = () => {
          offer(registration);
          switch (worker.state) {
            case "installed":
            case "activating":
            case "activated":
              ready();
              break;
            case "redundant":
              if (registration.active) ready();
              else failed();
              break;
            case "parsed":
            case "installing":
              break;
            default:
              throw new TypeError(`Unknown worker state: ${worker.state satisfies never}`);
          }
        };
        worker.addEventListener("statechange", changed);
        changed();
      };
      observe(registration.active);
      observe(registration.waiting);
      observe(registration.installing);
      registration.addEventListener("updatefound", () => observe(registration.installing));
    })
    .catch((cause: unknown) => {
      if (cause instanceof Error) {
        failed();
        app.notice(
          "오프라인 실행용 캐시를 저장하지 못했습니다. 현재 편집과 로컬 저장은 계속 사용할 수 있습니다.",
        );
      } else throw cause;
    });
}
