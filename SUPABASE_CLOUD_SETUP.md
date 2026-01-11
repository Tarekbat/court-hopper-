# Supabase Cloud Setup Guide

This guide will help you connect your project to a cloud Supabase instance and initialize the database.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- A Supabase project created in the dashboard

## Quick Setup Steps

### 1. Login to Supabase CLI

```bash
npm run db:login
```

This will open your browser to authenticate. After successful login, you'll be able to link your project.

### 2. List Your Projects (Optional)

To see all your Supabase projects:

```bash
npm run db:projects
```

### 3. Link to Your Cloud Project

You'll need your project reference ID. You can find it:
- In your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Or from the projects list in step 2

Then link your project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Or use the interactive script:

```bash
./scripts/setup-supabase-cloud.sh
```

### 4. Push Database Migrations

After linking, push your database schema to the cloud:

```bash
npm run db:push
```

This will apply the migration in `supabase/migrations/001_initial_schema.sql` to your cloud database.

### 5. Seed the Database

Populate your database with initial data (courts):

```bash
npm run db:seed
```

## Environment Variables

Make sure you have these environment variables set in your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
```

You can find these values in your Supabase dashboard:
1. Go to **Settings** → **API**
2. Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy the **anon public** key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
4. Copy the **service_role** key → `SUPABASE_SECRET_KEY` (keep this secret!)

## Available Database Commands

- `npm run db:login` - Login to Supabase CLI
- `npm run db:projects` - List your Supabase projects
- `npm run db:link` - Link to a Supabase project (interactive)
- `npm run db:push` - Push migrations to cloud database
- `npm run db:seed` - Seed the database with initial data

## Troubleshooting

### "Access token not provided"
- Run `npm run db:login` first

### "Project not found"
- Make sure you're using the correct project reference ID
- Verify the project exists in your Supabase dashboard

### Migration errors
- Check that your migration SQL is valid
- Ensure you have the correct database permissions

## Next Steps

After completing the setup:
1. Verify your tables were created in the Supabase dashboard (Table Editor)
2. Check that the seed data was inserted (you should see 5 courts)
3. Test your application with the cloud database

