export const policies = {
  privacy: {
    title: "Privacy policy",
    intro:
      "This page explains what SETU stores, who can access it and how long private mentorship content stays available.",
    sections: [
      {
        title: "Account and profile data",
        paragraphs: [
          "Google supplies your name, email address and verified account identity. Student access uses configured email domains or an IIC account grant. Alumni mentors need an active IIC whitelist grant, and staff accounts must be on the administrator list. SETU does not receive your Google password.",
          "Your profile contains the details you submit, including your roll number, interests, career background and optional contact information. IIC reviews student and mentor eligibility before they can use mentorship features.",
        ],
      },
      {
        title: "Who can see your information",
        paragraphs: [
          "IIC can review eligibility, requests, assignments, programme progress, individual feedback and support follow-ups. Your assigned mentor or student can see the relevant profile and mentoring request.",
          "Session titles, times, meeting links, private messages and shared documents are available only to the assigned pair through the application. IIC dashboard accounts cannot open them. Authorised infrastructure operators may need access for maintenance, security or a lawful request.",
          "Individual feedback is visible to its author and IIC. A student cannot read the mentor's assessment, and a mentor cannot read the student's feedback.",
        ],
      },
      {
        title: "Storage and service providers",
        paragraphs: [
          "SETU stores accounts and programme data in hosted Supabase PostgreSQL. Better Auth manages sign-in sessions, and Google provides authentication. The deployed application runs on Vercel.",
          "If programme email delivery is enabled, the email provider receives the recipient address and notification text. Notification emails do not include private messages, documents or meeting links. These providers operate under their own service and privacy terms.",
        ],
      },
      {
        title: "Retention",
        paragraphs: [
          "After a mentorship ends, the shared space becomes read-only. Messages and documents remain accessible to the pair for 30 days. SETU removes them on the next scheduled maintenance run after that period. Incomplete uploads are removed after an hour or when the mentorship ends.",
          "Profiles, requests, assignments, reviews and feedback remain in the programme record. SETU does not currently apply an automatic deletion period to these records. Security access logs are removed after 90 days. Provider backups may retain deleted data according to the provider's retention settings.",
        ],
      },
      {
        title: "Your choices and requests",
        paragraphs: [
          "Provide only information needed for mentorship. Do not upload passwords, account credentials, financial records or other unnecessary sensitive information. You can remove your own documents while the mentorship is active.",
          "For profile corrections, account deletion or a concern about your information, contact the programme team through the established IIC support channel. Some identity fields are locked after submission to preserve the eligibility review. The team must handle deletion requests because self-service account deletion is not currently available.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    intro:
      "SETU is a voluntary, free mentorship platform for eligible IIT Madras BS students and alumni.",
    sections: [
      {
        title: "Eligibility and accounts",
        paragraphs: [
          "Use your own eligible Google account. Students and alumni mentors must complete a profile and receive IIC approval. An eligible email address alone does not establish programme eligibility.",
          "Give accurate information and keep access to your Google account secure. Staff access is limited to explicitly authorised IIC email addresses. Do not share accounts or impersonate another person.",
        ],
      },
      {
        title: "How mentorship works",
        paragraphs: [
          "Students submit a request describing their goal, uncertainty, guidance needs and timeline. IIC reviews the request and assigns an approved, available alumni mentor. Each student and mentor can have one active mentorship at a time.",
          "A mentorship allows up to ten scheduled or held sessions. Cancelled and missed sessions do not count toward that limit. Conversations are arranged by the pair and use a meeting link they provide. SETU does not host video calls.",
        ],
      },
      {
        title: "Guidance and responsibility",
        paragraphs: [
          "Mentors share experience and suggestions. Students make their own career, education and employment decisions. Participation does not guarantee an internship, job, admission, referral or any particular outcome.",
          "Keep your commitments, respect each other's time and follow the mentorship conduct policy. Do not use SETU for paid solicitation, spam or unrelated recruitment.",
        ],
      },
      {
        title: "Your content",
        paragraphs: [
          "You retain responsibility for the material you share. Upload only content you own or have permission to use. SETU uses that content to provide the private mentorship space and operate the programme.",
          "Shared documents are limited to 5 MB each and 20 documents per mentorship. Messages are limited to 2,000 characters. A file passing format checks does not guarantee that it is safe to open.",
        ],
      },
      {
        title: "Ending a mentorship",
        paragraphs: [
          "Either participant or IIC can end a mentorship with a reason. Future sessions are cancelled, the request closes and the shared space becomes read-only. Each participant has five days to submit individual feedback.",
          "The programme team can restrict participation when eligibility, conduct or security concerns require it. SETU is a student project, and programme availability and terms may change. Published updates take effect when posted.",
        ],
      },
    ],
  },
  conduct: {
    title: "Mentorship conduct",
    intro:
      "A useful mentorship depends on clear expectations, respectful conversation and care with personal information.",
    sections: [
      {
        title: "Respect the person and their time",
        paragraphs: [
          "Agree on an agenda, prepare for sessions and communicate schedule changes early. Keep discussions relevant to the student's goals. Harassment, discrimination, threats and pressure to share personal information are unacceptable.",
        ],
      },
      {
        title: "Keep guidance honest",
        paragraphs: [
          "Describe your experience accurately. Separate personal advice from facts you can verify. Mentors should not promise employment, ask for payment or pressure students into a service, investment or personal relationship.",
          "Students should not ask mentors to complete assessed coursework, misrepresent qualifications or bypass an institution's academic or recruitment rules.",
        ],
      },
      {
        title: "Protect private conversations",
        paragraphs: [
          "Do not distribute messages, documents, meeting recordings or contact details without permission. Ask before recording a session. Share only information needed for the discussion and respect a request to stop or change a topic.",
        ],
      },
      {
        title: "Raise a concern",
        paragraphs: [
          "Either participant can end a mentorship and select a conduct concern as the reason. SETU creates an IIC follow-up for that concern. You can also contact IIC through its established support channel.",
          "The IIC dashboard does not expose private chats or documents. If a concern needs supporting material, the programme team should ask you to provide it voluntarily through an appropriate channel. SETU does not provide emergency support.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie policy",
    intro:
      "SETU uses essential cookies to sign you in and keep your account session secure.",
    sections: [
      {
        title: "Essential authentication cookies",
        paragraphs: [
          "Better Auth creates session cookies and temporary cookies needed to complete Google sign-in. They identify your authenticated session and protect the sign-in flow. Production authentication cookies use secure transport and restrict script access where appropriate.",
          "Your session cookie lasts seven days and refreshes during active use. Google sign-in uses an encrypted temporary cookie that expires after ten minutes and is removed when the callback is processed.",
          "These cookies are required for account features. Public introduction and policy pages can be read without signing in.",
        ],
      },
      {
        title: "Google and other services",
        paragraphs: [
          "Google may use its own cookies when you visit its sign-in page. A meeting link opens the service chosen by the mentorship pair, which may also use its own cookies. Those services have separate policies.",
        ],
      },
      {
        title: "Analytics and advertising",
        paragraphs: [
          "This version of SETU does not add advertising cookies or a third-party analytics tracker. If optional tracking is introduced, this page and the relevant consent controls must be updated before it is enabled.",
        ],
      },
      {
        title: "Manage your session",
        paragraphs: [
          "Sign out through your workspace to end the current session. You can also clear site cookies in your browser. Blocking essential cookies prevents sign-in and protected workspace access.",
        ],
      },
    ],
  },
  accessibility: {
    title: "Accessibility",
    intro:
      "SETU aims to make the public pages and mentorship tools usable with a keyboard, assistive technology and reduced motion.",
    sections: [
      {
        title: "Navigation and controls",
        paragraphs: [
          "Use Tab to move between controls and Enter or Space to activate buttons. Public pages include a skip-to-content link. Dialogs support Escape, and form fields have visible labels.",
          "Use arrow keys to switch the landing page's guidance examples. Programme steps and FAQs open with Enter or Space. The process graph also supports arrow keys to move a raised peak and Escape to restore its shape.",
        ],
      },
      {
        title: "Motion preferences",
        paragraphs: [
          "SETU respects your device's reduced-motion setting. It removes decorative travel, the logo ripple and page-transition animation, and opens programme steps and FAQs immediately. The information and controls remain available without animation.",
        ],
      },
      {
        title: "Reporting a problem",
        paragraphs: [
          "If a page or control prevents you from using SETU, contact the programme team through the established IIC support channel. Include the page, action you were attempting and browser or assistive technology you use. This page describes the current implementation and does not claim formal accessibility certification.",
        ],
      },
    ],
  },
} as const;
