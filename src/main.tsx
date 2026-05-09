import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AccessTracker } from "@/components/platform/access-tracker";
import App from "./App";
import "./index.css";
import { applyStoredTheme } from "@/lib/theme";

const queryClient = new QueryClient();

applyStoredTheme();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AccessTracker />
      <App />
      <Toaster />
    </BrowserRouter>
  </QueryClientProvider>
);
