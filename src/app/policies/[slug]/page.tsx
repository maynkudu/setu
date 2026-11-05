import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/ui";
import { PublicFooter, policyLinks } from "@/components/public-footer";
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
    <div className="public-page">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <nav className="public-nav" aria-label="Main navigation">
        <Brand />
        <Link className="plain-link" href="/">
          Back to SETU
        </Link>
      </nav>
      <main id="main" className="policy-layout">
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
        <article className="policy-article">
          <header>
            <span className="policy-date">Updated 5 November 2026</span>
            <h1>{policy.title}</h1>
            <p>{policy.intro}</p>
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
      </main>
      <PublicFooter />
    </div>
  );
}
