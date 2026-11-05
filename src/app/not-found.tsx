import Link from "next/link";
export default function NotFound() {
  return (
    <main className="setup-message">
      <h1>This page could not be found</h1>
      <Link className="btn primary" href="/">
        Back to SETU
      </Link>
    </main>
  );
}
