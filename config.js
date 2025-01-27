// Supabase Configuration
const SUPABASE_CONFIG = {
    URL: 'https://nlupsphgfpvgghkkjsbu.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sdXBzcGhnZnB2Z2doa2tqc2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4NDIzNTMsImV4cCI6MjA1MzQxODM1M30.CV6f57QriX3S9tEPN0lmb3AiH8wylvzHfxgqDEGSLMw',
    
    // Additional configuration for user management
    AUTH_CONFIG: {
        // Ensure user creation is allowed
        allowSignup: true,
        
        // Configure user metadata handling
        metadataOptions: {
            allowedFields: ['full_name'],
            maxMetadataSize: 1024  // Limit metadata size
        }
    }
};

// Ensure global exposure
window.SUPABASE_CONFIG = SUPABASE_CONFIG;

// Optional: Log configuration for debugging
console.log('Supabase configuration loaded:', SUPABASE_CONFIG);

// Validation Configuration
window.VALIDATION = {
    email: {
        // Comprehensive regex for MCPI email validation
        regex: /^[a-zA-Z0-9._%+-]+@mcpi\.edu\.ph$/i,
        message: 'Please enter a valid MCPI email address',
        
        // Enhanced validation method
        validate(email) {
            // Trim whitespace
            email = email.trim();
            
            // Check if email matches the regex
            if (!this.regex.test(email)) {
                return 'Invalid email format. Must be @mcpi.edu.ph';
            }
            
            // Additional checks
            const [localPart, domain] = email.split('@');
            
            // Ensure local part is not empty
            if (localPart.length === 0) {
                return 'Email username cannot be empty';
            }
            
            // Optional: Additional domain-specific checks
            if (domain !== 'mcpi.edu.ph') {
                return 'Only @mcpi.edu.ph emails are allowed';
            }
            
            // Optional: Length restrictions
            if (email.length > 254) {
                return 'Email address is too long';
            }
            
            // Passed all checks
            return null;
        }
    },
    password: {
        minLength: 6,  // Supabase default minimum
        maxLength: 72, // Supabase maximum password length
        requirements: [
            { type: 'uppercase', required: true },
            { type: 'lowercase', required: true },
            { type: 'number', required: true }
        ],
        validate(password) {
            const errors = [];

            // Length check
            if (password.length < this.minLength) {
                errors.push(`Password must be at least ${this.minLength} characters`);
            }

            if (password.length > this.maxLength) {
                errors.push(`Password must be no more than ${this.maxLength} characters`);
            }

            // Requirement checks
            this.requirements.forEach(req => {
                switch(req.type) {
                    case 'uppercase':
                        if (req.required && !/[A-Z]/.test(password)) {
                            errors.push('Password must contain an uppercase letter');
                        }
                        break;
                    case 'lowercase':
                        if (req.required && !/[a-z]/.test(password)) {
                            errors.push('Password must contain a lowercase letter');
                        }
                        break;
                    case 'number':
                        if (req.required && !/[0-9]/.test(password)) {
                            errors.push('Password must contain a number');
                        }
                        break;
                }
            });

            return errors;
        }
    }
};