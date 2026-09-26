# Habit Tracker

A full-stack habit tracking app built with Next.js, TypeScript, Tailwind CSS, Prisma, and SQLite.

## Setup

1. Install dependencies:
   npm install
2. Copy environment variables:
   cp .env.example .env
3. Generate Prisma client and create the database:
   npm run db:push
4. Seed demo data:
   npm run db:seed
5. Start the development server:
   npm run dev

## Features

- Dashboard with daily habit checklist
- Habit CRUD with categories
- Calendar backfilling and weekly/monthly views
- Analytics summaries and charts
- Settings for profile and preferences
- Email/password auth with JWT

## Deployment

This project is designed for Vercel free tier. For persistent production data, use a Supabase Postgres free tier and switch the Prisma datasource URL.
