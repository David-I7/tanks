import { createRoot } from "react-dom/client";
import "./style.css";
import "@fontsource/inter/400.css";
import "@fontsource/poppins/400.css";
import router from "./pages/router";
import { RouterProvider } from "react-router-dom";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query/queryClient";
import InitializeAuth from "./components/auth/IntializeAuth";

const root = createRoot(document.querySelector<HTMLDivElement>("#app")!);
root.render(
  //<React.StrictMode>
  <QueryClientProvider client={queryClient}>
    <InitializeAuth/>
    <RouterProvider router={router} />
  </QueryClientProvider>,

  //</React.StrictMode>,
);
