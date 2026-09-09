import { enableOffline } from "./ui/offline";
import "./styles/tokens.css";
import "./styles/shell.css";
import "./styles/editor.css";
import "./styles/graph.css";
import { Workspace } from "./core/workspace";
import { bindAppActions } from "./ui/app-actions";
import { createShell } from "./ui/shell";
import { showPrimitives } from "./ui/showcase";
import { initializeTheme } from "./ui/theme";

initializeTheme();
const root = document.getElementById("app");
if (root) {
  if (new URLSearchParams(location.search).has("showcase")) showPrimitives(root);
  else {
    const app = new Workspace(createShell(root));
    bindAppActions(app);
    app.render();
    enableOffline(app);
  }
}
