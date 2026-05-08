import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MentoringLandingPage } from "@/components/marketing/mentoring-landing-page";

export default function HomePage() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setCheckingSession(false);
    });
  }, [navigate]);

  if (checkingSession) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return <MentoringLandingPage />;
}
