import { useState } from "react";
import { useNavigate, useRouteError } from "react-router-dom";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Copy, Home, LogIn, RefreshCw, RotateCcw, Undo2 } from "lucide-react";
import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import AppBackground from "../../components/layouts/AppBackground";
import Surface from "../../components/layouts/Surface";
import { classifyClientError, type RecoveryActionDescriptor } from "../../errors/classifyClientError";

export default function GlobalErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copied, setCopied] = useState(false);
  const descriptor = classifyClientError(error);
  const isDev = import.meta.env.DEV;

  if (isDev) {
    console.error(error);
  }

  const diagnosticText = formatDiagnostics(descriptor);

  const handleCopyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error("Failed to copy diagnostics", copyError);
    }
  };

  const runRecoveryAction = (action: RecoveryActionDescriptor) => {
    if (action.kind === "reload" || action.kind === "retry") {
      window.location.reload();
      return;
    }

    if (action.kind === "login") {
      navigate("/login");
      return;
    }

    if (action.kind === "back") {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  return (
    <AppBackground>
      <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
        <Surface className="w-full max-w-2xl p-6 md:p-8">
        <div className="flex flex-col gap-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-error/30 bg-error/10 text-error">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-error">
              {descriptor.category.replace("-", " ")}
            </div>
            <H1 className="text-2xl md:text-3xl">{descriptor.title}</H1>
          </div>

          <div className="rounded-lg border border-border-low bg-surface-high/60 px-4 py-4 text-left">
            <div className="text-sm leading-relaxed text-text-body-high">{descriptor.message}</div>
          </div>

          {isDev && (
            <div className="rounded-lg border border-border-low bg-surface-main text-left">
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-text-body-high transition-colors hover:bg-surface-high"
                type="button"
              >
                <span>Diagnostic information</span>
                {showDiagnostics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showDiagnostics && (
                <div className="flex flex-col gap-3 border-t border-border-low p-4">
                  <pre className="max-h-48 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border-low bg-background p-3 font-mono text-xs leading-relaxed text-text-body-high">
                    {diagnosticText}
                  </pre>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleCopyDiagnostics}
                      color={copied ? "success" : "secondary"}
                      variant="outline"
                      leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
                    >
                      {copied ? "Copied" : "Copy diagnostics"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {descriptor.recoveryActions.map((action) => (
              <Button
                key={action.kind}
                onClick={() => runRecoveryAction(action)}
                color={action.kind === "home" ? "primary" : "secondary"}
                variant={action.kind === "home" ? "filled" : "outline"}
                leftIcon={getRecoveryIcon(action.kind)}
                className="w-full sm:w-auto"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
        </Surface>
      </div>
    </AppBackground>
  );
}

function formatDiagnostics(descriptor: ReturnType<typeof classifyClientError>): string {
  const diagnostics = descriptor.diagnostics;
  return [
    `Category: ${diagnostics.category}`,
    diagnostics.status !== undefined ? `Status: ${diagnostics.status}` : undefined,
    diagnostics.statusText ? `Status Text: ${diagnostics.statusText}` : undefined,
    diagnostics.name ? `Name: ${diagnostics.name}` : undefined,
    diagnostics.message ? `Message: ${diagnostics.message}` : undefined,
    `Value Type: ${diagnostics.valueType}`,
    "",
    diagnostics.stack ? `Stack:\n${diagnostics.stack}` : "Stack: No stack trace available.",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

function getRecoveryIcon(kind: RecoveryActionDescriptor["kind"]) {
  if (kind === "reload") return <RefreshCw size={14} />;
  if (kind === "retry") return <RotateCcw size={14} />;
  if (kind === "login") return <LogIn size={14} />;
  if (kind === "back") return <Undo2 size={14} />;
  return <Home size={14} />;
}
