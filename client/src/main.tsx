import { createRoot } from "react-dom/client";
import "./style.css";
import "@fontsource/inter/400.css";
import "@fontsource/poppins/400.css";
import AuthProvider from "./components/auth/AuthProvider";
import router from "./pages/router";
import { RouterProvider } from "react-router-dom";

const root = createRoot(document.querySelector<HTMLDivElement>("#app")!);
root.render(
  //<React.StrictMode>
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>,

  //</React.StrictMode>,
);
