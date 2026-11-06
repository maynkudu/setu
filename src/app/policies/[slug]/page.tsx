import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicPage } from "@/components/public-page";
import { policyLinks } from "@/components/public-footer";
import { policies } from "@/content/policies";

function policyFor(slug: string) {
  return Object.entries(policies).find(([key]) => key === slug)?.[1];
}
export function generateStaticParams() {
  return Object.keys(policies).map((slug) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const policy = policyFor((await params).slug);
  return {
    title: policy?.title ?? "Page not found",
    description: policy?.intro,
  };
}
export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = policyFor(slug);
  if (!policy) notFound();
  return (
    <PublicPage>
      <div className="policy section">
        <aside>
          <span className="program-line">Programme information</span>
          <nav aria-label="Policy navigation">
            {policyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={
                  link.href.endsWith(`/${slug}`) ? "page" : undefined
                }
              >
                {link.label}
              </Link>
            ))}
            <Link href="/association">About and association</Link>
          </nav>
        </aside>
        <article>
          <header>
            <span className="document-label">Updated 5 November 2026</span>
            <h1>{policy.title}</h1>
            <p className="policy-intro">{policy.intro}</p>
          </header>
          {policy.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </PublicPage>
  );
}
