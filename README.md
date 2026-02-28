# ProductiQuest - Gamified Productivity App

A modern, fully-featured productivity application with gamification elements, built with React, Vite, TailwindCSS, Framer Motion, and Supabase.

## Features

### Authentication
- Email/Password authentication
- Google OAuth login
- Secure JWT-based sessions
- Protected routes

### Gamification System
- Level system (1-5) based on points
- Points earned from completing tasks, focus sessions, study, workouts, and self-care
- Motivational messages on achievements
- Real-time level progress tracking

### Core Features

#### Dashboard
- Today's Top 3 priority tasks
- Daily notes
- Weekly streak visualization for tasks, study, self-care, and workouts
- Real-time gamification stats

#### Tasks
- Create, edit, and delete tasks
- Categories: Home, Admin, Study, Personal, Fun
- Priority levels: Low, Medium, High
- Filters: All, Today, Overdue, By Category
- Task completion tracking with points

#### Focus Timer
- Customizable duration (default 10 minutes)
- Start, pause, and stop functionality
- Session logging with task names
- Continue or complete options
- Points rewards for completed sessions

#### Thesis Tracker
- Configurable sample sizes (default 135 total)
- Group tracking (A, B, C)
- Patient logging with notes and proforma status
- Progress visualization
- CSV export

#### Study Tracker
- Daily study minutes and notes
- Resource and chapter management
- Chapter status: Not Started, In Progress, Done
- Video link support for chapters
- Weekly totals and streak tracking

#### Daily Tracker
- Sleep hours
- Workout minutes
- Phone screen time
- Sunlight exposure
- Mood tracking (1-5)
- Weekly averages

#### Expenses
- Track expenses by category
- Categories: Food, Transport, Home, Personal, Medical, Fun, Other
- Daily and monthly totals
- CSV export

#### Self Care
- Customizable checklist (AM, PM, Hair routines)
- Daily completion tracking
- Streak monitoring
- Completion percentage

#### Calendar
- Monthly view with activity indicators
- Daily metrics: tasks, focus sessions, study minutes, expenses
- Click days for detailed breakdown

#### Settings
- 5 theme options: Light, Dark, Ocean Blue, Forest Green, Deep Ocean
- Full data backup/restore (JSON export/import)
- Theme preferences saved per user

### Responsive Design
- Mobile: Bottom navigation bar
- Tablet/Desktop: Left sidebar navigation
- Optimized layouts for all screen sizes
- Touch-friendly interactions

### Animations
- Smooth page transitions with Framer Motion
- Interactive button effects
- Completion animations
- Loading states
- Motivational message popups

## Tech Stack

### Frontend
- React 18
- Vite
- TypeScript
- TailwindCSS
- Framer Motion
- React Router DOM
- date-fns

### Backend
- Supabase (PostgreSQL database)
- Row Level Security (RLS)
- Real-time subscriptions
- Authentication & Authorization

## Setup Instructions

### Prerequisites
- Node.js 16+ installed
- Supabase account (already configured)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Environment variables are already configured in `.env`

3. Database is already set up with all necessary tables and RLS policies

### Running the App

Development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Usage Guide

### Getting Started

1. Sign up with email/password or Google OAuth
2. Complete your profile setup
3. Start with the Dashboard to set your Top 3 tasks for today
4. Use the Focus Timer while working on tasks
5. Track your daily activities in the Track page
6. Monitor your progress in the Calendar view

### Earning Points

- Complete a task: +10 points
- Complete all 3 Top 3 tasks: +20 points
- Finish a focus session: +5 points
- Log a study session: +10 points
- Log a workout: +10 points
- Complete self-care items: +15 points

### Level System

- Level 1: 0-99 points
- Level 2: 100-299 points
- Level 3: 300-699 points
- Level 4: 700-1499 points
- Level 5: 1500+ points

### Data Management

- Export your data anytime from Settings
- Import previous backups to restore data
- All data is encrypted and secured with RLS

## Database Schema

The app uses the following tables:
- `user_profiles` - User info, level, points, theme
- `tasks` - Task management
- `daily_top_three` - Daily priority tasks
- `daily_notes` - Daily notes
- `focus_sessions` - Focus timer logs
- `thesis_settings` & `thesis_patients` - Thesis tracking
- `study_sessions`, `study_resources`, `study_chapters` - Study tracking
- `daily_tracking` - Sleep, workout, mood, etc.
- `expenses` - Expense tracking
- `self_care_template` & `self_care_logs` - Self-care routines

## Security

- All routes are protected with authentication
- Row Level Security (RLS) ensures users only access their own data
- JWT tokens for secure sessions
- Google OAuth integration
- Secure password handling

## Mobile Support

The app is fully responsive and works perfectly on:
- Mobile phones (iOS & Android)
- Tablets (iPad, Android tablets)
- Laptops and desktops

## Performance

- Optimized bundle size
- Lazy loading for routes
- Real-time updates with Supabase
- Smooth animations with Framer Motion
- Fast navigation with React Router

## Contributing

This is a production-ready application. All features are implemented and tested.

## License

MIT
