import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const TURNSTILE_ERROR_MESSAGE = "Não foi possível validar a verificação de segurança. Tente novamente.";

type TurnstileTheme = "light" | "dark";

type TurnstileRenderOptions = {
  sitekey: string;
  theme?: TurnstileTheme;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  "error-callback"?: () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __turnstileScriptPromise?: Promise<void>;
  }
}

export type TurnstileCaptchaHandle = {
  reset: () => void;
};

type TurnstileCaptchaProps = {
  className?: string;
  onTokenChange: (token: string | null) => void;
  onError?: (message: string) => void;
};

function loadTurnstileScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (window.__turnstileScriptPromise) return window.__turnstileScriptPromise;

  window.__turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Turnstile script failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile script failed to load")), { once: true });
    document.head.appendChild(script);
  });

  return window.__turnstileScriptPromise;
}

function getCurrentTheme(): TurnstileTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" || document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export const TurnstileCaptcha = forwardRef<TurnstileCaptchaHandle, TurnstileCaptchaProps>(
  ({ className, onTokenChange, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onTokenChangeRef = useRef(onTokenChange);
    const onErrorRef = useRef(onError);
    const [theme, setTheme] = useState<TurnstileTheme>(() => getCurrentTheme());
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

    useEffect(() => {
      onTokenChangeRef.current = onTokenChange;
      onErrorRef.current = onError;
    }, [onError, onTokenChange]);

    useImperativeHandle(ref, () => ({
      reset() {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
        onTokenChangeRef.current(null);
      },
    }));

    useEffect(() => {
      const root = document.documentElement;
      const observer = new MutationObserver(() => {
        setTheme(getCurrentTheme());
      });

      observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      let isMounted = true;
      onTokenChangeRef.current(null);

      if (!siteKey) {
        onErrorRef.current?.(TURNSTILE_ERROR_MESSAGE);
        return;
      }

      void loadTurnstileScript()
        .then(() => {
          if (!isMounted || !containerRef.current || !window.turnstile) return;

          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          }

          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme,
            callback(token) {
              onTokenChangeRef.current(token);
            },
            "expired-callback"() {
              onTokenChangeRef.current(null);
            },
            "timeout-callback"() {
              onTokenChangeRef.current(null);
            },
            "error-callback"() {
              onTokenChangeRef.current(null);
              onErrorRef.current?.(TURNSTILE_ERROR_MESSAGE);
            },
          });
        })
        .catch(() => {
          if (!isMounted) return;
          onTokenChangeRef.current(null);
          onErrorRef.current?.(TURNSTILE_ERROR_MESSAGE);
        });

      return () => {
        isMounted = false;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, theme]);

    return (
      <div className={cn("min-h-[65px] w-full overflow-hidden", className)}>
        <div ref={containerRef} className="max-w-full" />
      </div>
    );
  },
);

TurnstileCaptcha.displayName = "TurnstileCaptcha";
