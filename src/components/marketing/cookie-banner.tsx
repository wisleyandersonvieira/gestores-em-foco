import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "cookieConsent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    setHiding(true);
    localStorage.setItem(CONSENT_KEY, "true");
    setTimeout(() => setVisible(false), 350);
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#1a1a2e] px-6 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] transition-transform duration-300 ${hiding ? "translate-y-full" : "translate-y-0"}`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-white/80">
          Utilizamos cookies para melhorar sua experiência em nosso site. Ao continuar navegando, você concorda com a nossa{" "}
          <Link
            to="/politica-de-privacidade"
            className="underline underline-offset-2 transition hover:text-white"
          >
            Política de Privacidade
          </Link>{" "}
          e com o uso de cookies.
        </p>
        <Button
          size="sm"
          className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={handleAccept}
        >
          Aceitar
        </Button>
      </div>
    </div>
  );
}
