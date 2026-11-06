"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { workspaceSchema, type Workspace } from "@/lib/domain";
import { Brand } from "./ui";
import { WorkspaceApp } from "./workspace";

export function WorkspaceSkeleton() {
  return (
    <div
      className="workspace-loading"
      role="status"
      aria-label="Loading your workspace"
    >
      <aside>
        <Brand />
        <div className="skeleton sk-line" />
        <div className="sk-nav">
          {Array.from({ length: 7 }, (_, i) => (
            <div className="skeleton sk-line" key={i} />
          ))}
        </div>
      </aside>
      <main>
        <div className="sk-heading">
          <div className="skeleton sk-title" />
          <div className="skeleton sk-line" />
        </div>
        <div className="sk-columns">
          <div className="skeleton sk-panel" />
          <div className="skeleton sk-panel" />
        </div>
        <div className="skeleton sk-table" />
        <span className="sr-only">Loading your workspace</span>
      </main>
    </div>
  );
}

type BootState =
  | { kind: "loading" }
  | { kind: "ready"; data: Workspace }
  | { kind: "error"; message: string };
export function WorkspaceBoot({
  section,
  supportEmail,
}: {
  section: string;
  supportEmail?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<BootState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/workspace", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401) {
          router.replace("/entry/student");
          return;
        }
        if (!response.ok)
          throw new Error(
            response.status === 403
              ? "Your account no longer has programme access. Contact IIC."
              : "Your workspace could not load. Please try again.",
          );
        const data = workspaceSchema.parse(await response.json());
        if (!controller.signal.aborted) setState({ kind: "ready", data });
      } catch (failure) {
        if (!controller.signal.aborted)
          setState({
            kind: "error",
            message:
              failure instanceof Error
                ? failure.message
                : "Your workspace could not load.",
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, router]);
  if (state.kind === "loading") return <WorkspaceSkeleton />;
  if (state.kind === "error")
    return (
      <main className="setup-message role-theme">
        <Brand />
        <h1>Could not open your workspace</h1>
        <p role="alert">{state.message}</p>
        <button
          className="btn primary"
          onClick={() => {
            setState({ kind: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
        <Link className="btn secondary" href="/">
          Back to SETU
        </Link>
      </main>
    );
  return (
    <WorkspaceApp
      initial={state.data}
      section={section}
      supportEmail={supportEmail}
    />
  );
}
