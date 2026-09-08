"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Occhietto per rivelare la password: si nasconde da solo dopo qualche
// secondo, cosi' resta comoda da controllare ma non rimane in chiaro sullo
// schermo a lungo (es. se il telefono resta acceso in mano ad altri).
const AUTO_HIDE_MS = 5000;

export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    React.useEffect(() => {
      if (!visible) return;
      const timer = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
      return () => clearTimeout(timer);
    }, [visible]);

    return (
      <div className="relative">
        <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-10", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Nascondi password" : "Mostra password"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
