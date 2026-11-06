import Link from "next/link";
import Image from "next/image";
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
      <Image
        className="brand-logo"
        src="/setu-logo.png"
        width={1438}
        height={655}
        sizes="92px"
        alt="SETU"
      />
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
