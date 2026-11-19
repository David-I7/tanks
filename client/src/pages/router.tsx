import { createBrowserRouter } from "react-router-dom";
import GlobalErrorPage from "./error/GlobalErrorPage";
import HomePage from "./home/HomePage";
import AppLayout from "../components/layouts/AppLayout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <GlobalErrorPage />,
    children: [{ index: true, element: <HomePage /> }],
  },
]);

export default router;
