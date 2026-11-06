import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/public-page";
export const metadata: Metadata = {
  title: "About and association",
  description:
    "Who builds SETU and how students, alumni mentors and IIC participate.",
};
export default function AssociationPage() {
  return (
    <PublicPage>
      <div className="about section">
        <span className="document-label">About SETU</span>
        <h1>Good guidance begins with people.</h1>
        <p className="about-intro">
          SETU is built by IIT Madras BS students. We connect eligible students
          with alumni who volunteer their experience, with IIC coordinating
          eligibility and assignments.
        </p>
        <div className="about-roles">
          {[
            {
              title: "Students",
              body: "Share your career goal and the guidance you need. After IIC approval, submit a request and work with your assigned mentor.",
              href: "/entry/student",
              label: "Student sign in",
            },
            {
              title: "Alumni mentors",
              body: "Bring your experience and make time for one student. Complete your profile, receive IIC approval, and mentor around your availability.",
              href: "/entry/mentor",
              label: "Mentor sign in",
            },
            {
              title: "IIC",
              body: "Review eligibility, assign mentors, and follow programme progress. Private conversations remain with the assigned pair.",
              href: "/entry/admin",
              label: "IIC staff sign in",
            },
          ].map((role) => (
            <section key={role.title}>
              <h2>{role.title}</h2>
              <p>{role.body}</p>
              <Link className="text-link" href={role.href}>
                {role.label}
              </Link>
            </section>
          ))}
        </div>
        <section className="disclosure">
          <h2>Institutional association</h2>
          <p>
            SETU is a student project. References to IIT Madras identify the
            student and alumni community the project serves. This site does not
            claim official institutional endorsement, accreditation or ownership
            by IIT Madras.
          </p>
          <a href="https://www.iitm.ac.in/" className="text-link">
            Visit IIT Madras
          </a>
        </section>
      </div>
    </PublicPage>
  );
}
