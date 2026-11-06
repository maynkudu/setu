"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import OverlayMenu from "./overlay-menu";

export default function PublicShell({
  children,
  footer,
  dark,
}: {
  children: ReactNode;
  footer: ReactNode;
  dark: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const previous = document.documentElement.style.scrollPaddingTop;
    document.documentElement.style.scrollPaddingTop = "110px";
    return () => {
      document.documentElement.style.scrollPaddingTop = previous;
    };
  }, []);
  return (
    <div className="setu-public">
      <a className="skip" href="#main" inert={menu}>
        Skip to content
      </a>
      <OverlayMenu key={pathname} dark={dark} onToggle={setMenu} />
      <div className="page-content" inert={menu}>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        {footer}
      </div>
    </div>
  );
}
