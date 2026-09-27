import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/app/App";
import { Provider } from "@/app/provider";
import { installTelegramMock } from "@/dev/telegramMock";
import "@/styles/globals.css";

if (import.meta.env.DEV) {
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
