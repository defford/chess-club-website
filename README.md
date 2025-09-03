# Central NL Scholastic Chess Club Website

A modern, responsive website for the Central NL Scholastic Chess Club built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Responsive Design**: Mobile-first approach that works perfectly on all devices
- **Modern UI Components**: Custom component library with consistent design system
- **Interactive Features**: 
  - Sortable rankings table
  - Event filtering and categorization
  - Collapsible mobile navigation
  - Dynamic registration forms
- **Accessible**: Follows WCAG guidelines with proper ARIA labels and keyboard navigation
- **SEO Optimized**: Meta tags, semantic HTML, and optimized for search engines

## Pages

- **Home**: Hero section, events preview, rankings preview, registration, and about sections
- **Events**: Complete events listing with filtering by category
- **Rankings**: Sortable club ladder with player statistics
- **Register**: Comprehensive registration form with validation
- **About**: Club information, mission, instructors, and programs

## Design System

### Color Palette
- Primary: Royal Blue (#2D5BE3)
- Secondary: Bright Yellow (#FFD93D)
- Accent: Dark Navy (#1C1F33)
- Neutrals: White (#FFFFFF), Light Gray (#F8F9FA)

### Typography
- Headings: Poppins Bold
- Body: Roboto Regular

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 with custom design tokens
- **Icons**: Lucide React & Radix UI Icons
- **Components**: Custom component library with class-variance-authority
- **Forms**: Native HTML5 with custom validation

## Project Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── about/
│   ├── events/
│   ├── rankings/
│   ├── register/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/             # Reusable UI components
│   ├── layout/         # Header, Footer, Navigation
│   └── sections/       # Page sections
├── lib/                # Utilities
└── styles/            # Global styles
```

## Future Enhancements

- Email integration for registration confirmations
- Content Management System (CMS) integration
- Online chess game integration
- Player profile pages
- Tournament bracket system
- Photo gallery
- Blog/news section

## Deployment

This project is optimized for deployment on Vercel, but can be deployed to any platform that supports Next.js.

```bash
npm run build
npm run start
```

## Contributing

This website was built for the Central NL Scholastic Chess Club. For modifications or updates, please contact the club administrators.