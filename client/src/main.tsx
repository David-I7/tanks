import { createRoot } from "react-dom/client";
import React from "react";
import "./style.css";
import "@fontsource/inter/400.css";
import "@fontsource/poppins/400.css";
import App from "./App";
import AuthProvider from "./context/AuthContext";

const root = createRoot(document.querySelector<HTMLDivElement>("#app")!);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
