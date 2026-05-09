import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { trackSiteAccess } from "@/lib/site-access";

export function AccessTracker() {
  const location = useLocation();

  useEffect(() => {
    void trackSiteAccess(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  return null;
}
