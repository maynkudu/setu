"use client";
import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function SiteMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Workspace tabs keep their immediate local navigation and background refresh.
  const page = pathname.startsWith("/workspace") ? "/workspace" : pathname;
  return (
    <ViewTransition
      key={page}
      name="setu-page"
      default="none"
      share={{
        "nav-back": "setu-page-back",
        "role-switch": "setu-role-switch",
        default: "setu-page-change",
      }}
      enter="setu-page-change"
      exit="setu-page-change"
    >
      <div data-site-ready="true" data-page={page}>
        {children}
      </div>
    </ViewTransition>
  );
}
