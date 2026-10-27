import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { STATIC_PREVIEW } from "./utils/hosting";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/app.css";
import App from "./App";
import { SessionProvider } from "./hooks/Session";
const Router = STATIC_PREVIEW ? HashRouter : BrowserRouter;
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <SessionProvider>
        <App />
      </SessionProvider>
    </Router>
  </React.StrictMode>,
);
