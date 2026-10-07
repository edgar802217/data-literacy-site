import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import App from "./App";
import { DemoProvider } from "./demo/store";
import { ContentProvider } from "./lib/content";
import "./styles/global.css";

// 預覽用的單檔版（VITE_MEMORY_ROUTER=1）不能改網址，改用記憶體路由
const Router = import.meta.env.VITE_MEMORY_ROUTER === "1" ? MemoryRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <ContentProvider>
        <DemoProvider>
          <App />
        </DemoProvider>
      </ContentProvider>
    </Router>
  </StrictMode>,
);
