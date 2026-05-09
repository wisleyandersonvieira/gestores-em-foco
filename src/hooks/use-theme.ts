import { useEffect, useState } from "react";

import { getUserPreferences } from "@/lib/account-settings";
import { applyTheme, getStoredTheme, normalizeTheme, storeTheme, type Theme } from "@/lib/theme";

export function useTheme(userId?: string) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() ?? "light");

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!userId) return;

    let active = true;

    void getUserPreferences(userId)
      .then((preferences) => {
        if (!active) return;

        const savedTheme = normalizeTheme(preferences.theme);
        setThemeState(savedTheme);
        storeTheme(savedTheme);
        applyTheme(savedTheme);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [userId]);

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);
    storeTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return { theme, setTheme };
}
