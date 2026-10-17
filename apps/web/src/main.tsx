import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import { App } from "./App";
import "./styles/global.css";
import "./styles/auth.css";
import "./styles/application.css";

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info("BAC-2027 is ready for offline use.");
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
