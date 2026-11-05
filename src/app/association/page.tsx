import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/ui";
import { PublicFooter } from "@/components/public-footer";
export const metadata: Metadata = {
  title: "About and association",
  description:
    "Who builds SETU and how students, alumni mentors and IIC participate.",
};
export default function AssociationPage() {
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
      <main id="main" className="association-main">
        <span className="program-line">About SETU</span>
        <h1>Students, alumni and a shared place for guidance.</h1>
        <p className="association-intro">
          SETU is a mentorship platform built by IIT Madras BS students. It
          connects eligible students with alumni who volunteer their experience,
          with IIC coordinating eligibility and assignments.
        </p>
        <div className="association-grid">
          <section>
            <span className="step-number">01</span>
            <h2>Students</h2>
            <p>
              Share your goal and the guidance you need. After IIC approval,
              submit a request and work with your assigned mentor.
            </p>
            <Link className="btn ghost" href="/entry/student">
              Student sign in
            </Link>
          </section>
          <section>
            <span className="step-number">02</span>
            <h2>Alumni mentors</h2>
            <p>
              Apply with your alumni account, complete your profile and receive
              IIC approval. Mentor one student at a time around your
              availability.
            </p>
            <Link className="btn ghost" href="/entry/mentor">
              Mentor sign in
            </Link>
          </section>
          <section>
            <span className="step-number">03</span>
            <h2>IIC coordination</h2>
            <p>
              Review eligibility, assign mentors, monitor programme progress and
              handle feedback or conduct follow-ups. Private conversations
              remain with the pair.
            </p>
            <Link className="btn ghost" href="/entry/admin">
              IIC staff sign in
            </Link>
          </section>
        </div>
        <section className="association-disclosure">
          <h2>Institutional association</h2>
          <p>
            SETU is a student project. References to IIT Madras identify the
            student and alumni community the project serves. This site does not
            claim official institutional endorsement, accreditation or ownership
            by IIT Madras.
          </p>
          <a className="plain-link" href="https://www.iitm.ac.in/">
            Visit the IIT Madras website
          </a>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
