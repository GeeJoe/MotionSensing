import { AppController } from "./app/appController";
import "./styles.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root element");
}

const app = new AppController(root);
app.start();

window.addEventListener("beforeunload", () => {
  app.dispose();
});
