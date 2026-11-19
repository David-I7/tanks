import { createRoot } from "react-dom/client";
import "./style.css";
import "@fontsource/inter/400.css";
import "@fontsource/poppins/400.css";
import router from "./pages/router";
import { RouterProvider } from "react-router-dom";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query/queryClient";

const root = createRoot(document.querySelector<HTMLDivElement>("#app")!);
root.render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
