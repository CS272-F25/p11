# p11 — CoHabit

CoHabit is a multi-page HTML/CSS/JS experience for managing shared households. The production site uses Bootstrap 5, a global stylesheet (`css/styles.css`), and modular Firebase-driven JavaScript to power authentication, Firestore persistence, and Google Calendar chore syncing. Every page loads a shared navbar (`components/navbar.html`) and footer via `js/components.js`, so navigation stays consistent as users move between tools.

## Page Index

| Page | Purpose |
| --- | --- |
| `index.html` | Auth-gated dashboard with live stats, quick actions, and modal shortcuts for chores and expenses |
| `features.html` | Marketing rundown of each major module |
| `about.html` | Mission statement plus accessibility details |
| `household.html` | Full household management (create/join, invite codes, roster, settings) |
| `household-setup.html` | Onboarding flow for new users to create or join households |
| `finance.html` | Expense logging, balance calculations, Chart.js visualizations, and settlement tracking |
| `chores.html` | Chore CRUD, completion history, Google Calendar sync, and weekly summary |
| `calendar-view.html` | Month/week calendar rendering household chores with status coloring |
| `notifications.html` | Combined feed of Firestore roommate requests and local chore/expense reminders |
| `profile.html` | Profile editor and preview backed by Firestore |
| `login.html` | Firebase Auth sign-in/sign-up UI |
| `calendar-setup.html` | Step-by-step guide for configuring Google Calendar credentials |
| `404.html` | Redirector for GitHub Pages deep links |

## Architecture & Data Flow

- **Styling:** Bootstrap 5.3.2 is combined with `css/styles.css`, `css/base.css`, and component scopes (e.g., `css/components/forms.css`).
- **Navigation:** `js/components.js` injects `components/navbar.html`/`components/footer.html` into any page that includes the placeholders, then loads `js/utils/household-selector.js` so users can swap active households from the nav.
- **JavaScript Bootstrapping:** `js/main.js` listens for `DOMContentLoaded` and calls feature-specific initializers registered on `window.Cohabit` (e.g., `initHomePage`, `initFinancePage`, `initChoresPage`, etc.). Each initializer resides in `js/pages/<page>.js` and only runs when its target DOM element exists.
- **Firebase:** `firebase.js` configures Firebase Auth + Firestore. Modules in `js/utils/household.js`, `js/utils/chores.js`, and `js/utils/finance.js` encapsulate queries/mutations. Real-time updates (e.g., expenses) rely on Firestore listeners.
- **External APIs:** `js/utils/calendar.js` integrates with Google Calendar via OAuth 2.0 + the Calendar REST API. Local components use `fetch` for shared HTML snippets, and the project is ready to add other external data sources when needed.
- **Accessibility:** Pages use semantic tags (`<main>`, `<section>`), labelled form controls, ARIA live regions (notifications), and WCAG-compliant color contrast.

## Local Development

```bash
# install deps (none beyond Firebase config)
cp .env.example .env # if needed for local credentials

# run a static server
python3 -m http.server 8000
# visit http://localhost:8000/login.html to sign in, then navigate through the app
```

- Firebase Auth/Firestore require valid credentials in `firebase.js`.
- Google Calendar sync requires updating `js/utils/calendar.js` with your API key + OAuth Client ID (see [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)).

## Deployment

1. **GitHub Pages (static hosting):**
	- Push to `main` in this repo (`CS272-F25/p11`).
	- In **Settings → Pages**, select the `main` branch and `/ (root)` directory.
	- The site publishes to `https://cs272-f25.github.io/p11/` after a short build.
2. **Firebase (backend rules/indexes):**
	- Update Firestore security rules in `firestore.rules` and indexes in `firestore.indexes.json`.
	- Deploy with `firebase deploy --only firestore:rules,firestore:indexes`.
	- Firebase hosting is **not** required; GitHub Pages serves the static assets while Firebase handles auth/database APIs.

## Feature Highlights

- Household roster management with invite codes, member roles, and multi-household switching
- Real-time expense tracking with Chart.js insights, settlement suggestions, and Firestore listeners
- Chore automation with Google Calendar sync, completion history, and a dedicated month/week calendar view
- Notification center combining Firestore roommate requests and local reminders
- Profile editing tied to authenticated users with optimistic UI updates and preview mode

## Accessibility & Responsiveness

- Semantic HTML, descriptive alt text, labelled inputs, and ARIA annotations
- Keyboard-friendly focus states and color-contrast-checked palettes
- Responsive grid/layout patterns tested on phone, tablet, and desktop breakpoints via Bootstrap utilities

For questions or to contribute, open an issue or submit a pull request on this repository.
