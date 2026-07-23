import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import useClipboard from "../../hooks/useClipboard";
import PageNotFound from "../../errors/PageNotFoundError";
import UiErrorPage from "./UiErrorPage";
import UiError from "../../errors/UiError";

export default function GlobalErrorPage() {
  const error = useRouteError();
  const { copied, copyText } = useClipboard();
  const isDev = import.meta.env.DEV;

  if (
    (isRouteErrorResponse(error) && error.status === 404) ||
    error instanceof PageNotFound
  ) {
    const path =
      error instanceof PageNotFound ? error.path : error.data?.path || "";
    return (
      <UiErrorPage
        error={
          new UiError({
            description: `Could not find the requested page: ${path}`,
            heading: "Page Not Found",
          })
        }
      />
    );
  } else if (error instanceof UiError) {
    return <UiErrorPage error={error} />;
  }

  return (
    <>
      {
        <UiErrorPage
          error={
            new UiError({
              description: "An unexpected error occurred.",
              heading: "Something went wrong",
            })
          }
        />
      }
      {isDev && (
        <div>
          <p>Error: {error instanceof Error ? error.message : String(error)}</p>
          <button onClick={() => copyText(String(error))}>
            {copied ? "Copied!" : "Copy error to clipboard"}
          </button>
        </div>
      )}
    </>
  );
}
