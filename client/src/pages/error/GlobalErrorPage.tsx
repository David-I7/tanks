import { useState } from "react";
import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check, RefreshCw, Home } from "lucide-react";
import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";

export default function GlobalErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copied, setCopied] = useState(false);
  const IS_DEV = import.meta.env.DEV;

  if (IS_DEV) {
    console.error(error);
  }

  // Parse error details
  let statusCode = "500";
  let statusText = "Internal Server Error";
  let errorMessage = "An unexpected error occurred.";
  let errorStack = "";

  if (isRouteErrorResponse(error)) {
    statusCode = error.status.toString();
    statusText = error.statusText || "Something went wrong";
    errorMessage = error.data?.message || "The requested page could not be loaded.";
  } else if (error instanceof Error) {
    statusText = error.name || "Runtime Error";
    errorMessage = error.message;
    errorStack = error.stack || "";
  } else if (typeof error === "string") {
    errorMessage = error;
  } else if (error && typeof error === "object") {
    errorMessage = JSON.stringify(error);
  }

  const handleCopyDiagnostics = async () => {
    const diagnosticText = `Error Status: ${statusCode}\nStatus Text: ${statusText}\nMessage: ${errorMessage}\nStack Trace:\n${errorStack || "No stack trace available."}`;
    try {
      await navigator.clipboard.writeText(diagnosticText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <main className="bg-background font-body text-text-body min-h-screen relative overflow-hidden flex items-center justify-center p-4 md:p-8">
      {/* Cyber Grid Background */}
      <div className="cyber-bg-container">
        <div className="cyber-grid"></div>
        <div className="cyber-grid-overlay"></div>
      </div>

      {/* Cyber Panel Outer Wrapper */}
      <div className="relative z-10 w-full max-w-2xl cyber-panel p-6 md:p-8 flex flex-col gap-6 text-center select-none">

        {/* Warning Indicator Icon & Text */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-lg border border-error bg-error/10 text-error animate-pulse shadow-[0_0_15px_rgba(255,49,49,0.3)]">
            <AlertTriangle className="w-8 h-8" />
            <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-error"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-error"></div>
          </div>

          <div className="font-headings text-xs tracking-[0.2em] text-error font-bold uppercase mt-2 [text-shadow:0_0_8px_rgba(255,49,49,0.6)]">
            Critical Error
          </div>

          <H1 className="text-neon-yellow mt-1 text-2xl md:text-3xl tracking-widest">
            {statusCode === "404" ? "Page Not Found" : "Something Went Wrong"}
          </H1>
        </div>

        {/* Error Code & Description */}
        <div className="border-t border-b border-divider py-4 my-2 flex flex-col gap-2 text-left bg-surface-main/30 px-4 md:px-6 relative">
          <div className="absolute top-0 left-4 w-12 h-[1px] bg-accent"></div>
          <div className="font-headings text-sm text-text-headings flex justify-between items-center">
            <span className="text-accent tracking-wider font-bold">Status Code:</span>
            <span className="font-bold text-error bg-error/10 px-2 py-0.5 border border-error/20">
              {statusCode}
            </span>
          </div>
          <div className="font-headings text-sm text-text-headings flex justify-between items-center">
            <span className="text-accent tracking-wider font-bold">Error Type:</span>
            <span className="font-mono text-xs text-text-body-high">{statusText}</span>
          </div>
          <div className="text-text-body mt-2 text-sm leading-relaxed border-t border-divider pt-3 font-mono">
            {statusCode === "404"
              ? "The page or resource you are looking for does not exist. Please check the URL or return to the main page."
              : errorMessage}
          </div>
        </div>

        {/* Diagnostic Accordion */}
        {
          IS_DEV &&
          <div className="border border-border-low bg-[#0c0d12]/90 text-left">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full px-4 py-3 flex items-center justify-between font-headings text-xs tracking-wider text-text-body-high hover:bg-surface-main/50 transition-colors duration-normal cursor-pointer select-none"
            >
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-error animate-ping rounded-full"></span>
                Diagnostic Information
              </span>
              {showDiagnostics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showDiagnostics && (
              <div className="border-t border-border-low p-4 flex flex-col gap-3">
                <div className="relative">
                  <pre className="font-mono text-[11px] text-error/90 bg-black/60 p-3 rounded-lg overflow-x-auto max-h-48 border border-error/10 whitespace-pre-wrap select-text leading-relaxed">
                    {`>>> Error Details:
                  Status: ${statusCode}
                  Description: ${statusText}
                  Message: ${errorMessage}

                  >>> Stack Trace:
                  ${errorStack || "No trace available (Production Mode)."}`}
                  </pre>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleCopyDiagnostics}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-headings tracking-widest uppercase border border-accent/20 text-accent hover:border-accent hover:bg-accent/10 transition-all duration-normal cursor-pointer select-none active:translate-x-[1px] active:translate-y-[1px]"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="text-success" />
                        <span className="text-success font-bold">Copied to clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Log</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        }

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
          <Button
            onClick={handleGoHome}
            color="primary"
            leftIcon={<Home size={14} />}
            className="w-full sm:w-auto"
          >
            Back to Home
          </Button>
          <Button
            onClick={handleReload}
            color="secondary"
            variant="outline"
            leftIcon={<RefreshCw size={14} />}
            className="w-full sm:w-auto"
          >
            Reload Page
          </Button>
        </div>

      </div>
    </main>
  );
}

