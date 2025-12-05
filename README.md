# p11 — CoHabit (draft website)

This repository contains a draft website for the CoHabit project (HTML/CSS/JS). It includes three pages, a global stylesheet, and interactive JavaScript demos.

Pages:
- `/index.html` — Home with expense splitter demo and roommate search filter
- `/features.html` — Features and module descriptions
- `/about.html` — Project mission and accessibility notes
- `/directory.html` — Add/remove roommates with local storage
- `/finance.html` — Log expenses and calculate per-person splits & balances
- `/chores.html` — Assign chores, set frequency & due date, mark completion **+ Google Calendar sync**
- `/calendar-view.html` — **NEW:** Visual calendar view of all chore due dates with month/week toggle
- `/notifications.html` — Synthesized reminders from chores & expenses
- `/search.html` — Filter roommate prospects by tags & availability
- `/profile.html` — Edit and preview personal preferences

## 🆕 Google Calendar Integration

CoHabit now integrates with Google Calendar to automatically sync your chores! See [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md) for detailed setup instructions.

## 📅 Calendar View Features

- **Month & Week Views:** Toggle between month and week calendar layouts
- **Visual Due Dates:** See all chores organized by due date
- **Color Coding:** Pending (purple), completed (green), overdue (red)
- **Interactive:** Click any chore to see details and mark as done
- **Today Highlight:** Current day is highlighted in yellow

How to view locally:
1. From the repository root, run a simple static server (Python 3):

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Publishing to GitHub Pages:
1. Create a GitHub repository for your group (e.g. `CS272-F25/p0` or your assigned repo).
2. Push this code to the repository on the `main` branch.
3. In the repository Settings -> Pages, select the `main` branch and the `/ (root)` folder, then Save.
4. After a minute or two, your site should be available at `https://cs272-f25.github.io/<repo-name>`.

Notes for the assignment:
- Global stylesheet: `css/styles.css` is included on all pages.
- Design library: Bootstrap CDN is used for layout and components.
- Meaningful CSS: custom layout helpers, badge styling, contrast tweaks, focus states in `css/styles.css`.
- Meaningful JS: `js/app.js` powers directory, finance calculations, chores tracking, notifications synthesis, search filtering, profile editing, and expense splitting.
- **External API Integration**: Google Calendar API syncs chores to users' calendars with OAuth 2.0 authentication
- Accessibility: inputs have labels, images have `alt`, and headings are hierarchical.

To finalize for submission: make a copy of the course reflection document, fill it out with your team, download as PDF, and submit to the assignment.
