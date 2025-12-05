# Calendar View Feature 📅

A beautiful, interactive calendar view for visualizing all your household chores by due date.

## What's New

### 📅 `/calendar-view.html` - Visual Calendar Page

A complete calendar interface showing all chores organized by their due dates with:

- **Month View** - Traditional monthly calendar grid
- **Week View** - Focused 7-day week view
- **Color-coded chores:**
  - 🟣 Purple = Pending chores
  - 🟢 Green = Completed chores
  - 🔴 Red = Overdue chores
  - 🟡 Yellow = Today's date

### Interactive Features

✨ **Click any chore** to see full details in a modal popup  
✨ **Mark as done** directly from the calendar  
✨ **Navigate easily** with Previous/Next/Today buttons  
✨ **Switch views** between Month and Week instantly  
✨ **Responsive design** works beautifully on mobile  

### Navigation

- Added **"📅 Calendar"** link to navbar
- Added **"📅 Calendar View"** button on chores page
- Seamless navigation between list and calendar views

## How It Works

```
User Flow:
1. User navigates to /calendar-view.html
2. Calendar loads current month with today highlighted
3. All chores appear on their due dates
4. Click a chore → See details modal
5. Mark as done → Calendar updates instantly
6. Toggle between month/week views
7. Navigate through time with arrow buttons
```

## Technical Implementation

### Files Created:
- `calendar-view.html` - Calendar page with embedded styles
- `js/pages/calendar-view.js` - Calendar logic and rendering

### Files Modified:
- `components/navbar.html` - Added calendar link
- `chores.html` - Added calendar view button
- `js/main.js` - Added calendar page initializer
- `README.md` - Documented calendar feature

### Key Functions:

**`renderMonthView()`** - Generates monthly calendar grid
- Calculates first/last days of month
- Adds empty cells for proper alignment
- Populates chores on corresponding dates

**`renderWeekView()`** - Generates weekly calendar view
- Calculates start/end of current week
- Shows 7 full days with all chores

**`getChoresForDate(date)`** - Filters chores by due date

**`showChoreDetail(chore)`** - Modal popup with full chore info

## Visual Design

### Calendar Grid
- 7-column responsive grid
- Purple gradient headers
- White day cells with subtle borders
- Yellow highlight for today

### Chore Pills
- Compact, clickable colored badges
- Gradient backgrounds
- Hover effects for interactivity
- Truncated text with tooltips

### Legend
- Visual key for color meanings
- Bottom of calendar
- Clear icons and labels

## Browser Compatibility

✅ Chrome, Firefox, Safari, Edge (modern versions)  
✅ Mobile browsers (iOS Safari, Chrome Mobile)  
✅ Responsive breakpoints at 768px  

## Future Enhancements

- 🎯 Filter by assignee
- 🎯 Day view with time slots
- 🎯 Drag-and-drop to reschedule
- 🎯 Export to iCal format
- 🎯 Print-friendly view

## Quick Start

1. Open http://localhost:8000/calendar-view.html
2. Or click "📅 Calendar" in the navbar
3. Or click "📅 Calendar View" from Chores page
4. Enjoy your visual chore calendar!

---

**Perfect for:** Visualizing weekly/monthly chore schedules, planning ahead, and getting a bird's-eye view of household responsibilities.
