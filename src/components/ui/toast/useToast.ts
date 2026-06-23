import { useContext } from "react";
import { ToastContext, ToastOptions } from "./ToastProvider";

export interface UseToastReturn {
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}

export function useToast(): UseToastReturn {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
