CREATE TABLE IF NOT EXISTS profiles (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '', roll_number text NOT NULL DEFAULT '', bio text NOT NULL DEFAULT '',
  interests text[] NOT NULL DEFAULT '{}', skills text NOT NULL DEFAULT '', path text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '', social text NOT NULL DEFAULT '', graduation_year integer,
  organization text NOT NULL DEFAULT '', experience integer NOT NULL DEFAULT 0, consent boolean NOT NULL DEFAULT false,
  verification text NOT NULL DEFAULT 'draft' CHECK (verification IN ('draft','pending','approved','discrepancy','not_yet_eligible','not_eligible')),
  review_reason text NOT NULL DEFAULT '', available boolean NOT NULL DEFAULT true, submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id text NOT NULL REFERENCES profiles(user_id),
  goal text NOT NULL, uncertainty text NOT NULL, areas text[] NOT NULL, timeline text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','matched','closed')),
  close_reason text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_request ON requests(student_id) WHERE status <> 'closed';
CREATE TABLE IF NOT EXISTS mentorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL UNIQUE REFERENCES requests(id),
  student_id text NOT NULL REFERENCES profiles(user_id), mentor_id text NOT NULL REFERENCES profiles(user_id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')), created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz, end_reason text NOT NULL DEFAULT '', end_category text NOT NULL DEFAULT '', ended_by text,
  CHECK (student_id <> mentor_id), CHECK ((status='active' AND ended_at IS NULL) OR (status='ended' AND ended_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_student ON mentorships(student_id) WHERE status='active';
CREATE UNIQUE INDEX IF NOT EXISTS one_active_mentor ON mentorships(mentor_id) WHERE status='active';
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mentorship_id uuid NOT NULL REFERENCES mentorships(id),
  title text NOT NULL, starts_at timestamptz NOT NULL, duration integer NOT NULL CHECK (duration IN (30,45,60,90)),
  meeting_url text NOT NULL, status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','held','cancelled','missed')),
  reminder_sent boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_mentorship ON sessions(mentorship_id);
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mentorship_id uuid NOT NULL REFERENCES mentorships(id),
  sender_id text NOT NULL REFERENCES "user"(id), body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_mentorship ON messages(mentorship_id,created_at);
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mentorship_id uuid NOT NULL REFERENCES mentorships(id),
  uploader_id text NOT NULL REFERENCES "user"(id), name text NOT NULL, mime text NOT NULL,
  size integer NOT NULL CHECK (size BETWEEN 1 AND 5242880), bytes bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS feedback (
  mentorship_id uuid NOT NULL REFERENCES mentorships(id), user_id text NOT NULL REFERENCES "user"(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5), goal_status text NOT NULL CHECK (goal_status IN ('yes','partly','in_progress')),
  comment text NOT NULL, support_needed boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mentorship_id,user_id)
);
CREATE TABLE IF NOT EXISTS checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mentorship_id uuid NOT NULL REFERENCES mentorships(id), user_id text NOT NULL REFERENCES "user"(id),
  round integer NOT NULL CHECK (round IN (1,2)), due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered','no_response')),
  goal_status text NOT NULL DEFAULT '', comment text NOT NULL DEFAULT '', UNIQUE (mentorship_id,round)
);
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES "user"(id), body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), read boolean NOT NULL DEFAULT false,
  emailed_at timestamptz, attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id,created_at);
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES "user"(id), reviewer_id text NOT NULL REFERENCES "user"(id),
  decision text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mentorship_id uuid NOT NULL REFERENCES mentorships(id),
  kind text NOT NULL, note text NOT NULL DEFAULT '', resolved boolean NOT NULL DEFAULT false, UNIQUE (mentorship_id,kind)
);
CREATE TABLE IF NOT EXISTS access_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id text, action text NOT NULL, status integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY, mentorship_id uuid NOT NULL REFERENCES mentorships(id), user_id text NOT NULL REFERENCES "user"(id),
  name text NOT NULL, size integer NOT NULL CHECK (size BETWEEN 1 AND 5242880), parts integer NOT NULL CHECK (parts BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS upload_parts (
  upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE, part integer NOT NULL CHECK (part BETWEEN 0 AND 4), bytes bytea NOT NULL,
  PRIMARY KEY (upload_id,part), CHECK (octet_length(bytes) BETWEEN 1 AND 1048576)
);
CREATE TABLE IF NOT EXISTS access_grants (
  email text PRIMARY KEY CHECK (email=lower(email)), role text NOT NULL CHECK (role IN ('student','mentor')),
  reason text NOT NULL, granted_by text NOT NULL REFERENCES "user"(id), created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS requests_status_created ON requests(status,created_at DESC);
CREATE INDEX IF NOT EXISTS mentorships_student_created ON mentorships(student_id,created_at DESC);
CREATE INDEX IF NOT EXISTS mentorships_mentor_created ON mentorships(mentor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS documents_mentorship ON documents(mentorship_id);
CREATE INDEX IF NOT EXISTS notifications_email_queue ON notifications(next_attempt_at) WHERE emailed_at IS NULL AND attempts<10;
CREATE INDEX IF NOT EXISTS profiles_verification_submitted ON profiles(verification,submitted_at DESC);
CREATE INDEX IF NOT EXISTS uploads_created ON uploads(created_at);
