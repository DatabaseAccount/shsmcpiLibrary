# PHP Supabase Form Handler Setup

## Prerequisites
1. PHP 7.4+ 
2. Composer (Dependency Manager)
3. Supabase Account

## Installation Steps
1. Install Composer dependencies:
```bash
composer require supabase/supabase-php
```

2. Set up Supabase Environment Variables:
- Replace `YOUR_SUPABASE_PROJECT_URL` with your actual Supabase project URL
- Replace `YOUR_SUPABASE_ANON_KEY` with your Supabase anon key

3. Create Supabase Table
In your Supabase dashboard, create a table named `contacts` with columns:
- `id` (auto-incrementing primary key)
- `name` (text)
- `email` (text)
- `message` (text)
- `submitted_at` (timestamp)

## Security Notes
- NEVER commit sensitive keys to version control
- Use environment variables or a secure configuration management system
- Implement additional server-side validation and sanitization

## Troubleshooting
- Ensure all Composer dependencies are installed
- Check PHP error logs for any connection issues
- Verify Supabase credentials are correct
