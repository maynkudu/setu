"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
import ConnectionArt from "./connection-art";
import ProcessGraph from "./process-graph";
import { AnimatedCollapse, FAQDisclosure } from "./animated-disclosure";
const entry = "/entry/";
const steps = [
  {
    title: "Start with your question.",
    body: "Tell us your career goal, where you feel unsure, and the guidance you need.",
    detail:
      "Complete your student profile. IIC checks degree-level eligibility before you submit a mentoring request.",
  },
  {
    title: "Meet someone who can help.",
    body: "IIC connects you with an available alumnus whose experience fits your request.",
    detail:
      "Your mentor is assigned by IIC. Each student and mentor has one active mentorship at a time.",
  },
  {
    title: "Make a plan together.",
    body: "Schedule conversations, share your work privately, and decide what to do next.",
    detail:
      "Arrange up to ten sessions. Messages and documents stay between you and your mentor.",
  },
];
const questions = [
  {
    title: "Where do I start?",
    body: "Discuss career options with an alumnus who understands the BS programme and can help you decide what to explore.",
  },
  {
    title: "What should I build?",
    body: "Talk through a project idea, get feedback on your work, and identify the skills to practise next.",
  },
  {
    title: "How do I prepare?",
    body: "Work through your resume, interview preparation, or plans for further study with someone who has relevant experience.",
  },
];
const faq = [
  [
    "Who can join SETU?",
    "Degree-level IIT Madras BS students can apply. Alumni mentors sign in with an account whitelisted by IIC. Both complete a profile and receive IIC approval before mentorship begins.",
  ],
  [
    "Does mentorship cost anything?",
    "No. SETU is voluntary and free. Alumni contribute their time, and students take responsibility for their own decisions.",
  ],
  [
    "How is my mentor selected?",
    "IIC reviews your request and assigns an approved, available alumnus whose experience fits your guidance needs.",
  ],
  [
    "What stays private?",
    "Messages, shared documents, meeting links, and detailed session records are available only to the assigned pair through the application. IIC reviews programme progress and feedback.",
  ],
];
export default function Landing() {
  const [question, setQuestion] = useState(0);
  const [step, setStep] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro
          .from(
            ".hero-line > span",
            { yPercent: 115, rotation: 3, duration: 1.1, stagger: 0.1 },
            0.1,
          )
          .from(".hero-description", { y: 25, opacity: 0, duration: 0.8 }, 0.5)
          .from(
            ".connection-label",
            { opacity: 0, y: 12, duration: 0.7, stagger: 0.15 },
            0.8,
          );
        gsap.to(".hero-copy h1", {
          y: -55,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: 0.4,
          },
        });
        gsap.from(".question-list button", {
          x: -35,
          opacity: 0,
          duration: 0.75,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".question-grid",
            start: "top 88%",
            once: true,
          },
        });
        gsap.from(".alumni-word", {
          yPercent: 110,
          rotation: 4,
          duration: 0.85,
          stagger: 0.025,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".alumni h2",
            start: "top 88%",
            once: true,
          },
        });
      },
      root,
    );
    return () => media.revert();
  }, []);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.fromTo(
          ".question-answer p",
          { y: 12, opacity: 0.3 },
          { y: 0, opacity: 1, duration: 0.28, ease: "power3.out" },
        );
      },
      root,
    );
    return () => media.revert();
  }, [question]);
  return (
    <div ref={root}>
      <section className="hero">
        <div className="hero-meta">
          <span>A student project for the BS community</span>
          <Link href="#alumni">Become an alumni mentor</Link>
        </div>
        <div className="hero-composition">
          <div className="hero-copy">
            <h1>
              <span className="hero-line">
                <span>Your next step</span>
              </span>
              <span className="hero-line">
                <span>starts with a</span>
              </span>
              <span className="hero-line hero-emphasis">
                <span>conversation.</span>
              </span>
            </h1>
            <div className="hero-description">
              <p>
                Connect with an IIT Madras BS alumnus. Work through your career
                questions with someone who has been there.
              </p>
              <div className="actions">
                <Link
                  className="action action-white"
                  href={`${entry}student?mode=signup`}
                >
                  Find your mentor
                </Link>
                <Link className="text-link" href="#how">
                  Explore the programme
                </Link>
              </div>
            </div>
          </div>
          <ConnectionArt />
        </div>
        <div className="hero-base">
          <span>For degree-level BS students</span>
          <span>Voluntary and free</span>
          <Link href="#questions">Keep reading</Link>
        </div>
      </section>
      <section id="questions" className="questions section">
        <div className="section-intro">
          <span>Bring the question you have.</span>
          <p>You do not need a complete career plan to ask for guidance.</p>
        </div>
        <div className="question-grid">
          <div
            className="question-list"
            role="tablist"
            aria-label="Guidance examples"
            onKeyDown={(event) => {
              const direction =
                event.key === "ArrowRight" || event.key === "ArrowDown"
                  ? 1
                  : event.key === "ArrowLeft" || event.key === "ArrowUp"
                    ? -1
                    : 0;
              if (direction) {
                event.preventDefault();
                const next =
                  (question + direction + questions.length) % questions.length;
                event.currentTarget
                  .querySelector<HTMLButtonElement>(`#question-${next}`)
                  ?.focus();
              }
            }}
          >
            {questions.map((q, i) => (
              <button
                key={q.title}
                role="tab"
                tabIndex={question === i ? 0 : -1}
                aria-selected={question === i}
                aria-controls="question-answer"
                id={`question-${i}`}
                onClick={() => setQuestion(i)}
                onFocus={() => setQuestion(i)}
                onMouseEnter={() => setQuestion(i)}
                className={question === i ? "selected" : ""}
              >
                {q.title}
                <span aria-hidden="true">+</span>
              </button>
            ))}
          </div>
          <div
            id="question-answer"
            role="tabpanel"
            aria-labelledby={`question-${question}`}
            className="question-answer"
          >
            <span className="answer-line" />
            <p key={question}>{questions[question].body}</p>
            <Link className="text-link" href={`${entry}student?mode=signup`}>
              Start a mentoring request
            </Link>
          </div>
        </div>
      </section>
      <section className="process section" id="how">
        <div className="process-title">
          <span>How SETU works</span>
          <h2>
            A clear process.
            <br />A personal conversation.
          </h2>
          <ProcessGraph />
        </div>
        <div className="process-body">
          <div className="step-list">
            {steps.map((s, i) => (
              <div
                className={`process-step ${step === i ? "active" : ""}`}
                key={s.title}
              >
                <button
                  aria-expanded={step === i}
                  aria-controls={`step-${i}`}
                  onClick={() => setStep(i)}
                  className={step === i ? "active" : ""}
                >
                  <span className="step-index">0{i + 1}</span>
                  <span>
                    <strong>{s.title}</strong>
                  </span>
                  <span className="step-toggle" aria-hidden="true">
                    {step === i ? "−" : "+"}
                  </span>
                </button>
                <AnimatedCollapse
                  open={step === i}
                  id={`step-${i}`}
                  className="step-detail"
                >
                  <p>{s.body}</p>
                </AnimatedCollapse>
              </div>
            ))}
          </div>
          <p className="process-note" aria-live="polite">
            {steps[step].detail}
          </p>
        </div>
      </section>
      <section id="alumni" className="alumni section">
        <div className="alumni-aside">
          <span>For alumni</span>
          <p>
            One student at a time.
            <br />
            Around your availability.
          </p>
        </div>
        <div>
          <h2>
            {"Your experience could help someone decide what comes next."
              .split(" ")
              .map((word, i) => (
                <Fragment key={i}>
                  <span className="alumni-mask">
                    <span className="alumni-word">{word}</span>
                  </span>{" "}
                </Fragment>
              ))}
          </h2>
          <p>
            You remember the questions. Share what you learned with a student
            working through theirs.
          </p>
          <Link
            className="action action-wine"
            href={`${entry}mentor?mode=signup`}
          >
            Become an alumni mentor
          </Link>
        </div>
      </section>
      <section className="faq section">
        <div>
          <span>Before you begin</span>
          <h2>
            A few things
            <br />
            to know.
          </h2>
        </div>
        <div>
          {faq.map(([q, a]) => (
            <FAQDisclosure key={q} question={q} answer={a} />
          ))}
          <Link className="text-link policy-link" href="/policies/privacy">
            Read our policies
          </Link>
        </div>
      </section>
    </div>
  );
}
