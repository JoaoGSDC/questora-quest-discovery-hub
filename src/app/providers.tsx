"use client";

import { AppProvider } from "@/store/app-store";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
      <Toaster theme="dark" position="bottom-right" />
    </AppProvider>
  );
}
