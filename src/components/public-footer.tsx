import Link from "next/link";
import { Brand } from "./ui";
import { AnimatedFooter } from "./blank/animated-footer";

export const policyLinks = [
  { href: "/policies/privacy", label: "Privacy policy" },
  { href: "/policies/terms", label: "Terms of use" },
  { href: "/policies/conduct", label: "Mentorship conduct" },
  { href: "/policies/cookies", label: "Cookie policy" },
  { href: "/policies/accessibility", label: "Accessibility" },
] as const;

export function PublicFooter({ immersive = false }: { immersive?: boolean }) {
  const contact = process.env.PROGRAMME_CONTACT_EMAIL;
  if (immersive)
    return (
      <AnimatedFooter
        contact={contact}
        year={new Date().getFullYear()}
        policies={policyLinks}
      />
    );
  return (
    <footer className="footer section">
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
          <Link href="/association">About and association</Link>
          <Link href="/entry/mentor">Become a mentor</Link>
          <Link href="/entry/admin">IIC staff sign in</Link>
          {contact && <a href={`mailto:${contact}`}>Contact the programme</a>}
        </nav>
        <nav aria-label="Policies">
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
