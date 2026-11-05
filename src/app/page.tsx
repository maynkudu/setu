import { MentorshipFigure } from "@/components/figures/mentorship/figure";
import Link from "next/link";
import { Brand, Icon } from "@/components/ui";
import { PublicFooter } from "@/components/public-footer";
export default function Home() {
  return (
    <div className="public-page">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <nav className="public-nav" aria-label="Main navigation">
        <Brand />
        <div className="row links">
          <a className="plain-link" href="#how">
            How it works
          </a>
          <a className="plain-link" href="#alumni">
            For alumni
          </a>
          <Link className="btn primary" href="/entry/student">
            Student sign in
          </Link>
        </div>
      </nav>
      <main id="main">
        <section className="public-hero">
          <div>
            <div className="program-line">IIT Madras BS alumni mentorship</div>
            <h1>
              <span className="line-mask">
                <span>Your next step.</span>
              </span>
              <span className="line-mask">
                <span>Someone to help</span>
              </span>
              <span className="line-mask">
                <span>you take it.</span>
              </span>
            </h1>
            <p>
              Career questions are easier to work through with someone who has
              been there. Connect with an IIT Madras BS alumnus, with IIC
              helping you find the right mentor.
            </p>
            <div className="row wrap">
              <Link className="btn primary" href="/entry/student?mode=signup">
                Find your mentor <Icon name="users" />
              </Link>
              <Link className="btn secondary" href="/entry/mentor?mode=signup">
                Become a mentor
              </Link>
            </div>
            <div className="hero-note">
              <Icon name="shield" /> For degree-level BS students. Voluntary and
              free.
            </div>
          </div>
          <MentorshipFigure />
        </section>
        <section id="how" className="public-process">
          <div className="section-heading">
            <h2>A little structure. Room for your questions.</h2>
            <span className="tag">How SETU works</span>
          </div>
          <div className="process-grid">
            {[
              {
                title: "Tell us where you are",
                body: "Complete your profile and share your career goal, the questions you have, and the guidance you need.",
              },
              {
                title: "Meet a relevant alumnus",
                body: "IIC reviews your eligibility and request, then assigns an available mentor whose experience fits your needs.",
              },
              {
                title: "Work through your next step",
                body: "Schedule conversations, share documents privately, and turn your questions into a plan you can act on.",
              },
            ].map((step, i) => (
              <div className="process-item" key={step.title}>
                <div className="step-number">0{i + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="alumni" className="public-bottom">
          <div>
            <h2>Your experience could help someone move forward.</h2>
            <p>
              Mentor one student at a time, with sessions that fit your
              schedule.
            </p>
          </div>
          <Link className="btn light" href="/entry/mentor?mode=signup">
            Join as an alumni mentor
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
