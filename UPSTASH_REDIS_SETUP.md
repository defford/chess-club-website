# Upstash Redis Setup for Chess Club Website

## Quick Setup Guide

Since Vercel KV is now available through the Marketplace, here's the updated setup process:

### 1. Enable Upstash Redis via Vercel Marketplace

1. **Go to Vercel Dashboard** → Your Project → **Storage**
2. **Click "Create Database"**
3. **Select "Marketplace Database Providers"**
4. **Choose "Upstash"** (for Redis)
5. **Click "Add Integration"**
6. **Create Upstash account** (if needed)
7. **Create Redis database** in your preferred region

### 2. Get Connection Details

From your Upstash dashboard:
- Copy `UPSTASH_REDIS_REST_URL`
- Copy `UPSTASH_REDIS_REST_TOKEN`

### 3. Add Environment Variables to Vercel

In your Vercel project settings:
```env
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
WEBHOOK_SECRET=your_webhook_secret_here
REVALIDATE_TOKEN=your_revalidation_token_here
```

### 4. Install Dependencies

```bash
npm install @upstash/redis
```

### 5. Deploy

```bash
git add .
git commit -m "Add Upstash Redis caching"
git push
```

## What Changed

- **Package**: `@vercel/kv` → `@upstash/redis`
- **Environment Variables**: `KV_*` → `UPSTASH_REDIS_*`
- **Setup Process**: Direct Vercel KV → Marketplace integration

## Benefits of Upstash

- **Same Performance**: Sub-100ms response times
- **Better Pricing**: Often more cost-effective
- **More Features**: Additional Redis features available
- **Global Edge**: Multiple regions available

## Testing

After deployment, test the cache:

```bash
# Test cache warming
curl -X POST https://your-app.vercel.app/api/cron/warm-cache \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check cache status in Upstash dashboard
```

The rest of the setup (Google Apps Script webhook, ISR, etc.) remains the same!
