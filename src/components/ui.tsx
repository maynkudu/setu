import Link from "next/link";
import { rune } from "./rune-data";
import type { ReactNode } from "react";
export type IconName = keyof typeof rune;
export function Icon({ name }: { name: IconName }) {
  return (
    <span
      className="rune"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: rune[name] }}
    />
  );
}
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="SETU home">
      <span className="brand-mark">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 17V9m18 8V9M3 13c5-8 13-8 18 0M7 17v-7m5 7V7m5 10v-7M3 17h18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      setu
    </Link>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar initials" aria-hidden="true">
      {name
        .split(" ")
        .map((v) => v[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "S"}
    </span>
  );
}
export function Tag({
  children,
  color = "",
}: {
  children: ReactNode;
  color?: string;
}) {
  return <span className={`tag ${color}`}>{children}</span>;
}
export function Empty({
  title,
  children,
  icon = "book",
}: {
  title: string;
  children?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} />
      </div>
      <h2>{title}</h2>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}
