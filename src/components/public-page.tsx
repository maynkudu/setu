import type { ReactNode } from "react";
import { PublicFooter } from "./public-footer";
import PublicShell from "./public-site/public-shell";
import "./public-site/public-site.css";
import "./public-site/footer.css";

export function PublicPage({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <PublicShell dark={dark} footer={<PublicFooter immersive={dark} />}>
      {children}
    </PublicShell>
  );
}
