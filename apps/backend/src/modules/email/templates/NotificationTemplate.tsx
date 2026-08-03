import type { ReactNode } from "react";

export function NotificationTemplate({ children }: { children: ReactNode }) {
  return <main style={{ fontFamily: "Arial, sans-serif" }}>{children}</main>;
}
