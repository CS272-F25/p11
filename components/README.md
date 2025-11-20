# Components Folder

This folder contains reusable HTML components that are dynamically loaded into pages using JavaScript.

## Available Components

### `navbar.html`
The site-wide navigation bar with logo, main menu items, and dropdown for app pages.

**Usage:**
```html
<div data-component="navbar" data-page="home"></div>
```

The `data-page` attribute sets which nav item is active:
- `home` - Home page
- `features` - Features page
- `about` - About page
- `directory` - Directory app page
- `finance` - Finance app page
- `chores` - Chores app page
- `notifications` - Notifications app page
- `search` - Search app page
- `profile` - Profile app page

### `footer.html`
The site-wide footer with project information.

**Usage:**
```html
<div data-component="footer"></div>
```

## How It Works

Components are loaded by `js/components.js` which:
1. Finds all elements with `data-component` attribute
2. Fetches the corresponding HTML file from `/components/`
3. Injects the HTML into the placeholder element
4. Sets active states based on `data-page` attribute

## Benefits

✅ **DRY (Don't Repeat Yourself)** - Update navbar/footer once, affects all pages
✅ **Easier maintenance** - Change navigation structure in one place
✅ **Cleaner HTML** - Pages are more readable with simple placeholders
✅ **Consistent UI** - Ensures all pages use identical components

## Adding New Components

1. Create a new `.html` file in this folder
2. Add a placeholder div with `data-component="your-component-name"`
3. Load it via `js/components.js` (it automatically detects components)
