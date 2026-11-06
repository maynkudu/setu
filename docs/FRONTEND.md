# Frontend

SETU uses the Next.js App Router and React with strict TypeScript. Server pages check identity; workspace data loads through the protected API. Interactive forms and motion run in client components. The interface uses authored CSS, semantic HTML controls, and shared Rune icons.

## Routes and composition

| Route                       | Source                                                         | Responsibility                                        |
| --------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| `/`                         | [page.tsx](../src/app/page.tsx)                                | Public introduction, guidance and SVG ribbon artwork. |
| `/entry/[role]`             | [entry page](../src/app/entry/[role]/page.tsx)                 | Student, mentor, and admin Google entry.              |
| `/auth/complete`            | [auth completion](../src/app/auth/complete/page.tsx)           | Check the signed-in role and enter the workspace.     |
| `/workspace/[[...section]]` | [workspace page](../src/app/workspace/[[...section]]/page.tsx) | Authenticated shell, skeleton and selected section.   |
| `/policies/[slug]`          | [policy page](../src/app/policies/[slug]/page.tsx)             | Statically generated policy pages.                    |
| `/association`              | [association page](../src/app/association/page.tsx)            | Programme context and attribution.                    |

[layout.tsx](../src/app/layout.tsx) loads local fonts, styles, metadata, and `SiteMotion`. Public pages compose [PublicPage](../src/components/public-page.tsx), which passes server-rendered content and `PublicFooter` into the client shell. The shell owns background inertness while its menu is open. The workspace does not use the public shell.

[workspace.tsx](../src/components/workspace.tsx) owns navigation, workspace state, mutations, refresh, error banners, and save notices. [profile.tsx](../src/components/profile.tsx) owns eligibility and profile forms. [mentorship.tsx](../src/components/mentorship.tsx) owns the shared programme screens. [admin.tsx](../src/components/admin.tsx) owns IIC screens and account grants.

## Data and interaction

[workspace-boot.tsx](../src/components/workspace-boot.tsx) renders a skeleton while fetching the initial protected snapshot. `loading.tsx` also covers server identity checks. The client validates responses using `workspaceSchema`. Forms call a typed `Save` function and wait for the mutation before refreshing. They display server validation failures and disable submit controls while saving.

Workspace links switch the URL and view immediately using native history integrated with Next.js `usePathname`. Same-origin ordinary clicks inside the shell are intercepted, including links inside screen content. Modified clicks, downloads and external links keep their normal behavior. Back/forward and deep links remain available. Current data stays visible while the next refresh runs. Superseded requests are aborted and cannot overwrite newer data. Refresh failures show a retry action.

The app also refreshes every 30 seconds while visible and on window focus. Messages are persisted, but there is no WebSocket or Supabase Realtime subscription. Polling updates the existing workspace without reloading the page.

Document uploads use the same save feedback as other mutations. The client divides a file into 1 MiB chunks and sends them sequentially to `/api/uploads`. It checks the final completion response before showing success.

## Visual system

Primary tokens live in [globals.css](../src/app/globals.css). Public layouts live in [public-site.css](../src/components/public-site/public-site.css), scoped under `.setu-public` so their class names and palette do not affect workspaces. The old `public-pages.css` is no longer imported.

Role tokens and layouts live in [workspace.css](../src/app/workspace.css), scoped by `.role-theme` and `data-role`.

| Role    | Primary   | Background | Composition                                                          |
| ------- | --------- | ---------- | -------------------------------------------------------------------- |
| Student | `#681c36` | `#ecebe7`  | Large goal heading, burgundy session panel and connected sidebar.    |
| Mentor  | `#245747` | `#e9ece5`  | Serif welcome heading, availability band and white session panel.    |
| IIC     | `#283e67` | `#e8ebef`  | Compact office heading, queue layout and denser bordered statistics. |

DM Sans supplies body text and headings, with Georgia for selected mentor headings. Manrope remains bundled for legacy illustration components. Public tokens are `--wine: #681c36`, `--paper: #ecebe7`, `--ink: #272328` and `--line: #c9c7c2`. `next/font/local` serves checked-in fonts without Google Fonts requests. Their OFL notices live under `public/fonts/licenses/`.

[ui.tsx](../src/components/ui.tsx) provides `Brand`, `Icon`, `Avatar`, `Tag`, and `Empty`. `IconName` comes from the keys of the checked-in Rune SVG map. `scripts/generate-icons.ts` generates that map from `runeicons`. Only trusted checked-in SVG strings reach `dangerouslySetInnerHTML`; user content is rendered as text. The supplied transparent `public/setu-logo.png` replaces the drawn bridge mark. `next/image` serves it with preserved proportions. [branding.css](../src/app/branding.css) supplies dark wordmarks on light surfaces and keeps the original white image on the entry story.

Favicons and the Apple touch icon use the sparkle cropped from the supplied logo on burgundy. Metadata references the checked-in assets.

[entry.tsx](../src/components/entry.tsx) gives each role separate copy, eligibility instructions and a session-resume action. [entry-artwork.tsx](../src/components/entry-artwork.tsx) draws layered student paths, mentor ellipses and an IIC grid with GSAP. All login pages link to each other.

Use Rune for interface icons. Do not introduce northeast arrows or an unrelated icon system. Change shared tokens before adding local overrides when a design change affects multiple screens.

## Motion

All routes use native scrolling. Lenis and the bridge preloader have been removed.

[overlay-menu.tsx](../src/components/public-site/overlay-menu.tsx) adapts BLANK Overlay Menu. The complete opened menu, including its header and content, uses a fixed layer at `z-index: 50`. Separate transition panels sit at `40`, above the normal navbar at `30`. GSAP measures the normal bar's geometry and moves a separate menu header from that position before the four panels open. The normal bar stays underneath and becomes inert. Closing reverses the timeline. The floating menu header stays cream throughout opening and closing; the top header retains its page's palette. The floating bar enters above 260px and animates back to the top presentation below 160px. Explicit opening, open, closing and closed states keep menu controls usable during reversal. Closing restores focus and scroll position; the background is inert and Tab stays within menu controls. Stable scrollbar gutters preserve horizontal positions during scroll locking.

[connection-art.tsx](../src/components/public-site/connection-art.tsx) draws two original SVG paths with GSAP using the path-length mechanism from BLANK Ribbon Stroke Scroll. Separate wrappers own pointer movement and scroll rotation. It adds no scroll container, pin or global ticker override. [landing.tsx](../src/components/public-site/landing.tsx) owns masked hero lines, guidance selection and masked alumni words. Spaces between alumni words stay outside their clipping spans. The SVG drop-shadow filter and compact navbar backdrop blur have been removed.

[animated-disclosure.tsx](../src/components/public-site/animated-disclosure.tsx) animates programme and FAQ height, content position and opacity with GSAP. A new input retargets the current appearance. FAQs keep native `details` open until closing finishes, then remove the open state. Collapsed content is inert, and size changes refresh scroll geometry. Reduced motion applies the final state immediately.

[process-graph.tsx](../src/components/public-site/process-graph.tsx) draws a curve that stays flat through 50% of the scroll timeline, unfolds into a filled isometric height surface by 64%, then holds that shape. ScrollTrigger tracks the diagram rather than the whole section, with a 0.12-second scrub delay, so the unfold completes onscreen at mobile widths. The descending path follows the negative gradient of its own decorative height field. A pointer or arrow-key input raises a local maximum. Leave, blur or Escape restores the rest surface. Changing to reduced motion pauses active pointer tweens before applying the static shape. Canvas backing sizes cap the device ratio at 1.5. Offscreen and hidden-tab drawing pauses. This artwork does not calculate programme outcomes or mentor rankings.

[animated-footer.tsx](../src/components/blank/animated-footer.tsx) adapts BLANK Animated Footer. Two locally stored hand photographs are sampled into ASCII glyphs, revealed through scroll and highlighted in connected hover clusters. The WebP assets total about 34 KB. Backing canvases follow rendered dimensions, and pointer mapping accounts for contained-image letterboxing. The footer's logo uses [Fluid Refraction](../src/components/blank/fluid-refraction/index.tsx), with BLANK's velocity, pressure and density simulation. Its transparent background and premultiplied-alpha rendering keep the hands visible around and through the logo, including during ripples. It preserves the whole logo, loads near the viewport, allows native vertical touch scrolling, stops after settling and falls back to the transparent static image under reduced motion or unsupported WebGL. Programme actions and policies remain conventional links. The earlier iris component remains available but is not rendered.

[SiteMotion](../src/components/site-motion.tsx) uses React 19.3 `ViewTransition` and [page-transitions.css](../src/app/page-transitions.css), adapting BLANK Clip Mask Transition Page. Public route commits use a vertical mask, return links reverse direction and entry-role links use shorter lateral motion. The public navbar is a separate stationary participant. Workspace sections share one boundary key, preserving their immediate local switching. Unsupported browsers keep ordinary navigation, and reduced motion removes transition durations.

The connected sidebar adapts the fillets from [BLANK Switch On Hover Tabs](https://ui.aryank.space/components/switch-on-hover-tabs), installed in [switch-on-hover-tabs.tsx](../src/components/blank/switch-on-hover-tabs.tsx). GSAP moves the same selection marker between clicked destinations. Resize and modal opening position it immediately. Workspace content uses a short GSAP entrance; selection never waits for it.

[motion.css](../src/app/motion.css) retains control feedback. Public entrances do not hide readable text while waiting for JavaScript or a paused animation clock. GSAP 3.15.1 is pinned in the dependency lockfile.

### Mentorship illustration

The previous Anatomy desk figure remains available as an isolated export and reusable source. It is not rendered on the landing page. It uses SVG rather than WebGL. Its modules are:

- [model.ts](../src/components/figures/mentorship/model.ts) defines the stages and selected content.
- [geometry.ts](../src/components/figures/mentorship/geometry.ts) builds the desk, figures, laptops, books, and moving folder.
- [figure.tsx](../src/components/figures/mentorship/figure.tsx) composes the static artwork and client controller.
- [live.tsx](../src/components/figures/mentorship/live.tsx) handles selection, idle timing, visibility, and pointer interaction.
- [figure.css](../src/components/figures/mentorship/figure.css) defines the figure's appearance and motion.

The idle tour advances every four seconds. The request folder follows the selected stage with an exponential follower using a `0.24` second time constant. Hover pauses the tour, raises a page by seven SVG pixels, and changes the laptop screen animation. The tour pauses offscreen. Stage controls support Left, Right, Home, and End keys.

`scripts/export-figure.tsx` exports an isolated animated HTML artifact for inspection. The vendored Anatomy kit lives in `src/components/iso/`; its MIT notice is included in [third-party notices](THIRD_PARTY.md).

## Accessibility and responsive behavior

The app uses visible focus outlines, skip links, labeled inputs, fieldsets, live error and status regions, named icon buttons, and native dialogs. Workspace navigation uses `aria-current`. Mobile workspace navigation opens a modal dialog and closes after selection or Escape.

`prefers-reduced-motion` disables ribbon travel, curtain transitions, idle tours and decorative transitions. The public artwork and menu render their completed states. Preference changes also stop active motion. Public content remains readable without entrance animations.

The implemented landing was inspected at 1920, 1440, 768, 390 and 360px widths without horizontal overflow. Checks covered returning navigation, rapid menu reversal, Escape, Tab wrapping, focus and scroll restoration, section anchors, all five policies, guidance keyboard selection, programme steps, FAQs and not-found routes. Reduced motion was checked at startup and while mounted. Ribbon pointer response and reset were exercised in a fine-pointer browser; scroll rotation and iris reversal were also exercised.

Focused axe checks reported zero violations for the landing, open menu, About and privacy states. Contrast checks on overlapping decorative layers and the step minus sign remain incomplete. These results do not replace assistive-technology testing or certify the creative treatment. The supplied logo was inspected on entry and isolated local IIC workspace screens at desktop and mobile widths. Workspace checks used signed local fixtures and did not use the hosted database.

The expanded app pass checks role dashboards and entries, delayed and failed refreshes, session resume, deep links, back/forward, mobile navigation and reduced motion. Student domain normalization removes duplicate React keys. The local suite verifies seven-day cookies, renewal, expiry, logout and grant revocation. Trace evidence is a local Chromium lab observation, not field performance or a device-wide frame-rate guarantee.

The current landing fixes were checked at 1440×1000 and 390×844, with menu resizing at 768×1024. Frame samples covered top and floating menu opening, closing, rapid reversal and scroll exit without transparent background frames. The graph completes its 3D unfold while visible on mobile. Pointer, keyboard, leave and Escape checks restored its resting pixels, and the footer restored its original logo after the ripple settled. Programme and FAQ captures included intermediate heights and interrupted expansion. Forward, return and role-switch transitions ran their named animations. Changing reduced motion during a pointer tween stopped the peak and restored the static graph. A focused programme-section axe check returned zero violations and one incomplete contrast check for the decorative minus sign. Evidence is in the ignored `.plannotator/landing-fixes/` task directory.

The footer, navbar and graph corrections were checked at 1780×1000 and 390×844. Frame samples kept the normal bar stationary beneath menu and transition layers ordered at 50, 40 and 30. Floating headers stayed cream. Checks covered rapid reversal, resize, keyboard containment, focus restoration and reduced motion. The graph was flat at 49%, almost fully unfolded at 60% and complete at 64%; reverse scrolling restored the flat curve. Pointer and keyboard resets restored its original pixels. The transparent footer logo's captured crop also returned to its original pixels after rippling. A focused menu axe check returned zero violations and one incomplete contrast check. The verified 20-second Webreel recording and evidence are in `.plannotator/footer-nav-refinement/`.

## Development checks

Use the [README setup](../README.md) to run the app. `bun run format:check`, `bun run lint`, `bun run build`, and `bun run typecheck` check authored source. Run focused browser checks for changed behavior. A successful build verifies compilation, not layout or animation quality.

Keep component behavior and relevant policy copy in sync when adding fields, controls, or retention behavior. Update this document and the README in the same change.
