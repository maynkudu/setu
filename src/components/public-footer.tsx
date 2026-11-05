import Link from "next/link";
import { Brand } from "./ui";

export const policyLinks = [
  { href: "/policies/privacy", label: "Privacy" },
  { href: "/policies/terms", label: "Terms of use" },
  { href: "/policies/conduct", label: "Mentorship conduct" },
  { href: "/policies/cookies", label: "Cookies" },
  { href: "/policies/accessibility", label: "Accessibility" },
] as const;

export function PublicFooter() {
  const contact = process.env.PROGRAMME_CONTACT_EMAIL;
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-about">
          <Brand />
          <p>
            Career guidance through alumni mentorship.
            <br />
            Built by IIT Madras BS students.
          </p>
        </div>
        <nav aria-label="Programme links">
          <h2>SETU</h2>
          <Link href="/association">About and association</Link>
          <Link href="/entry/mentor">Become a mentor</Link>
          <Link href="/entry/admin">IIC staff sign in</Link>
          {contact && <a href={`mailto:${contact}`}>Contact the programme</a>}
        </nav>
        <nav aria-label="Policies">
          <h2>Policies</h2>
          {policyLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="footer-base">
        <span>© {new Date().getFullYear()} SETU</span>
        <span>Student project. No institutional endorsement claimed.</span>
        <a href="https://www.iitm.ac.in/">IIT Madras</a>
      </div>
    </footer>
  );
}
