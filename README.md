# HotelAqsa POS - Restaurant Billing System

A fast, keyboard-first restaurant billing system built with React, TypeScript, and Supabase.

## Features

### Core Billing
- **Table Management** - Visual table grid with status indicators (available/occupied/reserved)
- **Quick Item Search** - Search products by name or code with keyboard navigation
- **Cart Management** - Add, edit, and remove items with quantity controls
- **KOT (Kitchen Order Ticket)** - Print kitchen orders with item notes
- **Bill Generation** - GST-compliant bills with multiple payment methods
- **Bill History** - View, search, filter, and manage past bills with pagination

### Keyboard-First Design
The entire billing flow is usable with keyboard only:

| Shortcut | Action |
|----------|--------|
| `F1` | Print KOT (Kitchen Order Ticket) |
| `F2` | Generate Final Bill |
| `F3` | Focus table search |
| `F4` | Focus item search |
| `↑↓←→` | Navigate table grid |
| `Enter` | Select focused table |
| `Esc` | Clear focus / Return to search |
| `Ctrl+↑↓` | Navigate cart items |
| `Ctrl+←→` | Decrease/Increase item quantity |
| `Ctrl+Del` | Remove cart item (pending only) |
| `Tab/Shift+Tab` | Navigate action buttons |

### KOT Management
- **Incremental Printing** - Only new items or added quantities are printed
- **Immutable Printed Items** - Sent items cannot be edited or deleted
- **Notes on KOT** - Item notes are prominently displayed on kitchen tickets

### Progressive Web App (PWA)
- Install directly from browser to home screen
- Works offline with cached data
- Fast loading with service worker

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: Redux Toolkit (RTK Query), Zustand
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **PWA**: vite-plugin-pwa

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Environment Variables

The app connects to Supabase. Environment variables are managed through Lovable's Supabase integration.

## Project Structure

```
src/
├── components/
│   ├── billing/          # Billing module components
│   │   ├── BillingModule.tsx
│   │   ├── TableGrid.tsx
│   │   ├── Cart.tsx
│   │   ├── ItemSearch.tsx
│   │   ├── BillActions.tsx
│   │   └── ...
│   ├── common/           # Shared components
│   ├── layout/           # Layout components
│   ├── print/            # Print templates (KOT, Bill)
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
├── pages/                # Page components
├── store/                # State management (Redux, Zustand)
├── integrations/         # Supabase client
└── types/                # TypeScript types
```

## Keyboard Navigation Details

### Table Grid
- Arrow keys navigate between table cards in grid order
- `Enter` selects the focused table
- Visual focus ring indicates current selection
- `Esc` returns focus to search input

### Cart Items
- Use `Ctrl+↑/↓` to navigate between cart items
- `Ctrl+←` decreases quantity, `Ctrl+→` increases
- `Ctrl+Delete` removes item (only for unprintedItems)
- Printed items show a lock icon and are read-only

### Action Buttons
- `Tab` navigates between bottom action buttons
- Strong focus indicators show current selection

## PWA Installation

### Desktop (Chrome/Edge)
1. Visit the app URL
2. Click the install icon in the address bar
3. Click "Install"

### Mobile
- **Android**: Tap the "Add to Home Screen" prompt or use browser menu
- **iOS**: Tap Share → "Add to Home Screen"

## Deployment

Deploy via Lovable by clicking Share → Publish, or use any static hosting:

```bash
npm run build
# Deploy the 'dist' folder
```

## License

This project is proprietary software for HotelAqsa.
