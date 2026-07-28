# Vercel Deployment Guide

## Overview
Deploy both frontend and backend to Vercel for testing.

## Step 1: Push to GitHub

```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

## Step 2: Deploy Backend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. **Configure Project:**
   - **Root Directory:** `backend`
   - **Framework Preset:** Other
   
4. **Add Environment Variables:**
   | Variable | Description |
   |----------|-------------|
   | `DB_HOST` | PostgreSQL host (e.g., from Neon, Supabase) |
   | `DB_USER` | Database username |
   | `DB_PASSWORD` | Database password |
   | `DB_NAME` | Database name |
   | `DB_PORT` | Usually `5432` |
   | `DB_SSL` | `true` for cloud databases |
   | `JWT_SECRET` | Your secret key |
   | `GROQ_API_KEY` | Your Groq API key |
   | `FRONTEND_URL` | Will be your frontend Vercel URL |

5. Click **Deploy**
6. Copy the deployed URL (e.g., `https://judicial-gpt-backend.vercel.app`)

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project (again)
2. Import the **same** GitHub repository
3. **Configure Project:**
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js
   
4. **Add Environment Variables:**
   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | Your backend Vercel URL from Step 2 |

5. Click **Deploy**

## Step 4: Update Backend FRONTEND_URL

Go to your backend project on Vercel:
1. Settings → Environment Variables
2. Update `FRONTEND_URL` to your frontend URL
3. Redeploy

## PostgreSQL Cloud Options (Free Tier)

| Provider | Free Tier |
|----------|-----------|
| [Neon](https://neon.tech) | 512MB, 3 projects |
| [Supabase](https://supabase.com) | 500MB, 2 projects |
| [Railway](https://railway.app) | $5 credit |

## Run Database Migrations

Connect to your cloud database and run:
```sql
-- Run these migration files:
-- 1. backend/src/database/migrations/add_shared_chats.sql
-- 2. backend/src/database/migrations/fix_shared_chats_constraint.sql
```

## Testing

After deployment:
1. Visit your frontend URL
2. Register/Login
3. Test all features

## Troubleshooting

- **CORS errors:** Check `FRONTEND_URL` in backend env
- **Database errors:** Verify `DB_SSL=true` for cloud databases
- **API errors:** Check backend Vercel logs
