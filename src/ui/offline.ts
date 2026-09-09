import type { Workspace } from "../core/workspace";
import { button, element } from "./dom";
export function enableOffline(app: Workspace): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
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
    document.body.append(banner);
  };
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then((registration) => {
      offer(registration);
      registration.addEventListener("updatefound", () =>
        registration.installing?.addEventListener("statechange", () => offer(registration)),
      );
    })
    .catch((cause: unknown) => {
      if (cause instanceof Error)
        app.notice(
          "오프라인 실행용 캐시를 저장하지 못했습니다. 현재 편집과 로컬 저장은 계속 사용할 수 있습니다.",
        );
      else throw cause;
    });
}
