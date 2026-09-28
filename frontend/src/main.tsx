import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/app/App";
import { Provider } from "@/app/provider";
import { installTelegramMock } from "@/dev/telegramMock";
import "@/styles/globals.css";

// The Telegram WebApp mock is opt-in via VITE_MOCK_TELEGRAM=true so that
// `npm run dev` behaves like production (real Telegram) by default.
if (import.meta.env.VITE_MOCK_TELEGRAM === "true") {
  installTelegramMock();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider>
        <App />
      </Provider>
    </BrowserRouter>
  </React.StrictMode>,
);
