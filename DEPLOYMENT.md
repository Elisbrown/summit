# Deployment Guide for Summit

This guide outlines the steps to deploy Summit to Vercel and important considerations regarding the database.

> [!WARNING]
> **Database Persistence**: This application currently uses `better-sqlite3` (SQLite). In a Vercel Serverless environment, the filesystem is ephemeral, meaning **data will be lost** between deployments and potentially between function invocations. For production use, you **MUST** migrate to a cloud database provider like Vercel Postgres, Turso, or Neon.

## Prerequisites

1.  GitHub Account
2.  Vercel Account
3.  `pnpm` installed locally

## Deployment Steps

1.  **Push to GitHub**:
    Ensure all your changes are committed and pushed to your GitHub repository (`kugie-app/summit`).

    ```bash
    git add .
    git commit -m "Prepare for deployment"
    git push origin main
    ```

2.  **Import to Vercel**:
    - Go to your Vercel Dashboard.
    - Click "Add New..." -> "Project".
    - Import the `summit` repository.

3.  **Configure Project**:
    - **Framework Preset**: Next.js (should be auto-detected).
    - **Build Command**: `next build` (default).
    - **Environment Variables**: Add the variables from your `.env` file.
      - `NEXTAUTH_SECRET`: Generate a random string (e.g., `openssl rand -base64 32`).
      - `NEXTAUTH_URL`: Your Vercel URL (e.g., `https://your-project.vercel.app`).
      - `DATABASE_PATH`: `/tmp/sigalix.db` (Since Vercel only allows writing to `/tmp`, though this is still ephemeral).
      - `RESEND_API_KEY`: Your Resend API Key.

4.  **Deploy**:
    - Click "Deploy".
    - Wait for the build to complete.

5.  **Post-Deployment (Admin Seed)**:
    Since we cannot easily run shell scripts on Vercel's build step that modify a production database (and the DB is ephemeral anyway), you might need to rely on the application effectively starting fresh or using a cloud DB.

    **To Create the Admin User (Locally for Testing/Production with Persistent DB):**
    Run the seed script:

    ```bash
    npx tsx scripts/seed-admin.ts
    ```

    _User: `elisbrown@sigalix.net`_
    _Password: `12345678`_

## Credits

This platform was built and enhanced by **Elisbrown** in collaboration with `kugie-app/summit`.
Major features include:

- Invoice & Quote Management
- Project Management (Kanban, Gantt)
- Email Notifications with Payment Integration
- Mobile Money Support (MTN/Orange Cameroon)
