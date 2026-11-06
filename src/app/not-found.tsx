import Link from "next/link";
import { PublicPage } from "@/components/public-page";
export default function NotFound() {
  return (
    <PublicPage>
      <div className="about section">
        <span className="document-label">Page not found</span>
        <h1>This page could not be found.</h1>
        <div className="actions">
          <Link className="action action-wine" href="/">
            Back to SETU
          </Link>
        </div>
      </div>
    </PublicPage>
  );
}
