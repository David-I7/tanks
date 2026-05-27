import { useRouteError, isRouteErrorResponse } from "react-router-dom";

export default function GlobalErrorPage() {
  const error = useRouteError();

  if (import.meta.env.DEV) console.error(error);

  if (isRouteErrorResponse(error)) {
    return (
      <div id="error-page">
        <h1>Oops! {error.status}</h1>
        <p>{error.statusText || "Something went wrong"}</p>
        {error.data?.message && (
          <p>
            <i>{error.data.message}</i>
          </p>
        )}
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div id="error-page">
        <h1>Unexpected Application Error</h1>
        <pre>{error.message}</pre>
      </div>
    );
  }

  return <div>An unknown error occurred.</div>;
}
