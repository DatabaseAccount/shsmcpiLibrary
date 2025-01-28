// Supabase Configuration
const SUPABASE_URL = 'https://nlupsphgfpvgghkkjsbu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sdXBzcGhnZnB2Z2doa2tqc2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4NDIzNTMsImV4cCI6MjA1MzQxODM1M30.CV6f57QriX3S9tEPN0lmb3AiH8wylvzHfxgqDEGSLMw';

// Verify configuration values
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase configuration values');
}

// Set global configuration
window.SUPABASE_CONFIG = {
    URL: SUPABASE_URL,
    ANON_KEY: SUPABASE_ANON_KEY
};

// Log configuration
console.log('Supabase configuration loaded:', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
    urlLength: SUPABASE_URL.length,
    keyLength: SUPABASE_ANON_KEY.length
});

// Validation configuration
window.VALIDATION_CONFIG = {
    email: {
        maxLength: 254,  // RFC 5321
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        validate(email) {
            if (!email) return 'Email is required';
            if (email.length > this.maxLength) return `Email must be less than ${this.maxLength} characters`;
            if (!this.pattern.test(email)) return 'Invalid email format';
            return null;
        }
    },
    password: {
        minLength: 6,
        maxLength: 72,
        validate(password) {
            if (!password) return 'Password is required';
            if (password.length < this.minLength) return `Password must be at least ${this.minLength} characters`;
            if (password.length > this.maxLength) return `Password must be less than ${this.maxLength} characters`;
            return null;
        }
    }
};