// Supabase Configuration
window.SUPABASE_CONFIG = {
    URL: 'https://nlupsphgfpvgghkkjsbu.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sdXBzcGhnZnB2Z2doa2tqc2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4NDIzNTMsImV4cCI6MjA1MzQxODM1M30.CV6f57QriX3S9tEPN0lmb3AiH8wylvzHfxgqDEGSLMw'
};

// Validation Configuration
window.VALIDATION = {
    email: {
        regex: /^[a-zA-Z0-9._%+-]+@mcpi\.edu\.ph$/,
        message: 'Please enter a valid MCPI email address'
    },
    password: {
        minLength: 8,
        maxLength: 32,
        requirements: [
            { 
                regex: /[A-Z]/, 
                message: 'Password must contain at least one uppercase letter' 
            },
            { 
                regex: /[a-z]/, 
                message: 'Password must contain at least one lowercase letter' 
            },
            { 
                regex: /[0-9]/, 
                message: 'Password must contain at least one number' 
            }
        ],
        validate(password) {
            const errors = [];
            if (password.length < this.minLength || password.length > this.maxLength) {
                errors.push(`Password must be between ${this.minLength} and ${this.maxLength} characters`);
            }
            this.requirements.forEach(req => {
                if (!req.regex.test(password)) {
                    errors.push(req.message);
                }
            });
            return errors;
        }
    }
};