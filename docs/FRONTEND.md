# Frontend

SETU uses the Next.js App Router and React with strict TypeScript. Server pages load identity and workspace data. Interactive forms and motion run in client components. The interface uses authored CSS, semantic HTML controls, and shared Rune icons.

## Routes and composition

| Route                       | Source                                                         | Responsibility                                      |
| --------------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `/`                         | [page.tsx](../src/app/page.tsx)                                | Public introduction and mentorship figure.          |
| `/entry/[role]`             | [entry page](../src/app/entry/[role]/page.tsx)                 | Student, mentor, and admin Google entry.            |
| `/auth/complete`            | [auth completion](../src/app/auth/complete/page.tsx)           | Check the signed-in role and enter the workspace.   |
| `/workspace/[[...section]]` | [workspace page](../src/app/workspace/[[...section]]/page.tsx) | Authenticated server snapshot and selected section. |
| `/policies/[slug]`          | [policy page](../src/app/policies/[slug]/page.tsx)             | Statically generated policy pages.                  |
| `/association`              | [association page](../src/app/association/page.tsx)            | Programme context and attribution.                  |

[layout.tsx](../src/app/layout.tsx) loads local fonts, styles, metadata, and `SiteMotion`. Public pages compose `PublicFooter`; the workspace does not render it.

[workspace.tsx](../src/components/workspace.tsx) owns navigation, workspace state, mutations, refresh, error banners, and save notices. [profile.tsx](../src/components/profile.tsx) owns eligibility and profile forms. [mentorship.tsx](../src/components/mentorship.tsx) owns the shared programme screens. [admin.tsx](../src/components/admin.tsx) owns IIC screens and test access.

## Data and interaction

The server passes an initial `Workspace` snapshot. The client validates refreshed responses using `workspaceSchema`. Forms call a typed `Save` function and wait for the mutation before refreshing. They display server validation failures and disable submit controls while saving.

The app refreshes every 30 seconds while visible and on window focus. Messages are persisted, but there is no WebSocket or Supabase Realtime subscription. Polling updates the existing workspace without reloading the page.

Document uploads use the same save feedback as other mutations. The client divides a file into 1 MiB chunks and sends them sequentially to `/api/uploads`. It checks the final completion response before showing success.

## Visual system

Primary tokens live in [globals.css](../src/app/globals.css). Public information layouts live in [public-pages.css](../src/app/public-pages.css).

| Token          | Value     | Use                                   |
| -------------- | --------- | ------------------------------------- |
| `--primary`    | `#c00404` | Primary controls and active states.   |
| `--brand-dark` | `#651d26` | Burgundy programme sections.          |
| `--brand-deep` | `#33110e` | Deep public backgrounds.              |
| `--background` | `#f4f0eb` | Cream workspace background.           |
| `--foreground` | `#321e20` | Body text.                            |
| `--gold`       | `#e4b76d` | Warm illustration and accent details. |
| `--radius`     | `16px`    | Shared rounded controls and panels.   |

DM Sans supplies body text. Manrope supplies headings. `next/font/local` serves the checked-in font files without a browser request to Google Fonts. Their OFL notices live under `public/fonts/licenses/`.

[ui.tsx](../src/components/ui.tsx) provides `Brand`, `Icon`, `Avatar`, `Tag`, and `Empty`. `IconName` comes from the keys of the checked-in Rune SVG map. `scripts/generate-icons.ts` generates that map from `runeicons`. Only trusted checked-in SVG strings reach `dangerouslySetInnerHTML`; user content is rendered as text. The bridge logo is SETU's own mark.

Use Rune for interface icons. Do not introduce northeast arrows or an unrelated icon system. Change shared tokens before adding local overrides when a design change affects multiple screens.

## Motion

[site-motion.tsx](../src/components/site-motion.tsx) initializes Lenis with `autoRaf`, anchor support, and a lerp of `0.095`. Dialogs, sidebars, and `[data-lenis-prevent]` keep native scrolling. CSS does not add a second native smooth-scroll driver.

The preloader animates the bridge mark and waits for local fonts and its short introduction. It exits through a 480 ms clip-path curtain. A 1500 ms fallback prevents a failed font wait from leaving it visible indefinitely. It displays no simulated percentage. A `noscript` rule hides it if JavaScript is unavailable.

[motion.css](../src/app/motion.css) defines heading entrances, figure entrance, hover feedback, navigation transitions, message appearance, and save notices. `IntersectionObserver` triggers public section entrances once. Event listeners, observers, animation handles, and Lenis are cleaned up on unmount.

### Mentorship illustration

The Anatomy figure uses SVG rather than WebGL. Its modules are:

- [model.ts](../src/components/figures/mentorship/model.ts) defines the stages and selected content.
- [geometry.ts](../src/components/figures/mentorship/geometry.ts) builds the desk, figures, laptops, books, and moving folder.
- [figure.tsx](../src/components/figures/mentorship/figure.tsx) composes the static artwork and client controller.
- [live.tsx](../src/components/figures/mentorship/live.tsx) handles selection, idle timing, visibility, and pointer interaction.
- [figure.css](../src/components/figures/mentorship/figure.css) defines the figure's appearance and motion.

The idle tour advances every four seconds. The request folder follows the selected stage with an exponential follower using a `0.24` second time constant. Hover pauses the tour, raises a page by seven SVG pixels, and changes the laptop screen animation. The tour pauses offscreen. Stage controls support Left, Right, Home, and End keys.

`scripts/export-figure.tsx` exports an isolated animated HTML artifact for inspection. The vendored Anatomy kit lives in `src/components/iso/`; its MIT notice is included in [third-party notices](THIRD_PARTY.md).

## Accessibility and responsive behavior

The app uses visible focus outlines, skip links, labeled inputs, fieldsets, live error and status regions, named icon buttons, and native dialogs. Workspace navigation uses `aria-current`. Mobile workspace navigation opens a modal dialog and closes after selection or Escape.

`prefers-reduced-motion` disables Lenis interpolation, the preloader, idle tours, and decorative transitions. Preference changes also stop active motion. Public content remains readable without entrance animations.

Focused public checks at 1440 px and 390 px found no horizontal overflow. Landing and privacy pages had zero axe WCAG 2 A/AA violations in the checked states. These results do not replace full assistive-technology testing. Inspect changed screens at desktop and mobile sizes, operate their controls with a keyboard, and check browser errors before claiming a visible change works.

## Development checks

Use the [README setup](../README.md) to run the app. `bun run format:check`, `bun run lint`, `bun run build`, and `bun run typecheck` check authored source. Run focused browser checks for changed behavior. A successful build verifies compilation, not layout or animation quality.

Keep component behavior and relevant policy copy in sync when adding fields, controls, or retention behavior. Update this document and the README in the same change.
