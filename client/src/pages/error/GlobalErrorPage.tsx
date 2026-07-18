import { useState } from "react";
import { useNavigate, useRouteError } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Home,
  LogIn,
  RefreshCw,
  RotateCcw,
  Undo2,
} from "lucide-react";
import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import AppBackground from "../../components/layouts/AppBackground";
import Surface from "../../components/layouts/Surface";

export default function GlobalErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  //const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copied, setCopied] = useState(false);
  const isDev = import.meta.env.DEV;

  if (isDev) {
    console.error(error);
  }

  const handleCopyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText("");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error("Failed to copy diagnostics", copyError);
    }
  };

  return "Error";
}
