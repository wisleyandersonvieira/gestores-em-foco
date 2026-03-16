import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

import { DiagnosticPlayer } from "@/components/diagnostic/diagnostic-player";
import { supabase } from "@/integrations/supabase/client";

export default function DiagnosticPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user && token) {
        navigate(`/entrar?callbackUrl=/diagnostico/${token}`);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user && token) {
        navigate(`/entrar?callbackUrl=/diagnostico/${token}`);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, token]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!token || !user) {
    return null;
  }

  return <DiagnosticPlayer token={token} userId={user.id} onFinish={(sessionId) => navigate(`/minha-conta/diagnostico/${sessionId}/resultado`)} />;
}
