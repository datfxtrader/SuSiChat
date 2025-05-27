import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const root = createRoot(document.getElementById("root")!);

root.render(
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <App />
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>
);
