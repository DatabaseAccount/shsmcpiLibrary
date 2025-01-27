(function() {
    // Wait for Supabase library to load
    function waitForSupabase(maxAttempts = 50, interval = 100) {
        return new Promise((resolve, reject) => {
            let attempts = 0;

            function checkSupabase() {
                attempts++;

                // Check multiple ways Supabase might be available
                const supabaseLib = window.supabase || window.createClient || (typeof supabase !== 'undefined' ? supabase : null);

                if (supabaseLib && supabaseLib.createClient) {
                    console.log('Supabase library loaded successfully');
                    resolve(supabaseLib);
                    return;
                }

                // Retry or reject
                if (attempts >= maxAttempts) {
                    console.log('Supabase library failed to load after multiple attempts');
                    reject(new Error('Supabase library could not be loaded'));
                } else {
                    console.log(`Waiting for Supabase (Attempt ${attempts})...`);
                    setTimeout(checkSupabase, interval);
                }
            }

            // Start checking
            checkSupabase();
        });
    }

    // Authentication and Validation Module
    const AuthModule = {
        // Supabase client instance
        supabase: null,

        // Rate limit tracking
        _signupAttempts: 0,
        _lastSignupAttempt: 0,

        // Initialize Supabase Client
        initSupabase() {
            console.log('Attempting Supabase Client Initialization');
            
            // Check if Supabase is already initialized
            if (this.supabase) {
                console.log('Supabase already initialized');
                return this.supabase;
            }

            // Validate Supabase configuration
            if (!window.SUPABASE_CONFIG) {
                const configError = new Error('Supabase configuration is missing');
                console.error(configError);
                throw configError;
            }

            const { URL: supabaseUrl, ANON_KEY: supabaseAnonKey } = window.SUPABASE_CONFIG;

            // Validate URL and Anon Key
            if (!supabaseUrl || !supabaseAnonKey) {
                const configError = new Error('Incomplete Supabase configuration');
                console.error(configError, window.SUPABASE_CONFIG);
                throw configError;
            }

            try {
                // Detailed logging of Supabase library structure
                console.log('Supabase library structure:', {
                    supabaseType: typeof supabase,
                    supabaseMethods: Object.keys(supabase),
                    windowSupabaseType: typeof window.supabase,
                    windowSupabaseMethods: window.supabase ? Object.keys(window.supabase) : 'N/A'
                });

                // Check if createClient exists in the library
                if (typeof supabase.createClient === 'function') {
                    console.log('Using supabase.createClient method');
                    this.supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
                    return this.supabase;
                }

                // Check if the library itself is a function
                if (typeof supabase === 'function') {
                    console.log('Using supabase as a function');
                    this.supabase = supabase(supabaseUrl, supabaseAnonKey);
                    return this.supabase;
                }

                // Fallback to window.supabase methods
                if (window.supabase) {
                    console.log('Attempting to use window.supabase methods');
                    
                    // Check for createClient method
                    if (typeof window.supabase.createClient === 'function') {
                        console.log('Using window.supabase.createClient');
                        this.supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
                        return this.supabase;
                    }

                    // Alternative method using auth
                    if (window.supabase.auth) {
                        console.log('Using window.supabase.auth initialization');
                        this.supabase = {
                            auth: window.supabase.auth,
                            url: supabaseUrl,
                            key: supabaseAnonKey
                        };
                        return this.supabase;
                    }
                }

                // If all attempts fail
                throw new Error('Cannot find a valid method to create Supabase client');

            } catch (error) {
                console.error('Supabase initialization error:', error);
                console.error('Supabase URL:', supabaseUrl);
                console.error('Anon Key Length:', supabaseAnonKey?.length);
                console.error('Supabase library details:', {
                    supabaseType: typeof supabase,
                    supabaseMethods: Object.keys(supabase),
                    windowSupabase: window.supabase
                });

                throw new Error(`Supabase initialization failed: ${error.message}`);
            }
        },

        // Method to check and manage signup rate limits
        _checkSignupRateLimit() {
            const now = Date.now();
            const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
            const MAX_ATTEMPTS = 5; // Maximum signup attempts in the window

            // Reset attempts if outside the time window
            if (now - this._lastSignupAttempt > RATE_LIMIT_WINDOW) {
                this._signupAttempts = 0;
            }

            // Increment attempts
            this._signupAttempts++;
            this._lastSignupAttempt = now;

            // Check if rate limit is exceeded
            if (this._signupAttempts > MAX_ATTEMPTS) {
                const waitTime = Math.ceil((RATE_LIMIT_WINDOW - (now - this._lastSignupAttempt)) / 60000);
                throw new Error(`Too many signup attempts. Please wait ${waitTime} minutes before trying again.`);
            }
        },

        // Update UI based on authentication state
        updateAuthUI(user) {
            const loginSection = document.querySelector('section.bg-light');
            const navDropdown = document.querySelector('.navbar .dropdown-menu');
            
            // Add null checks with optional chaining and early return
            if (!loginSection || !navDropdown) {
                console.log('Login section or navigation dropdown not found in the DOM');
                return;
            }
            
            if (user) {
                // Hide login section
                loginSection.classList.add('d-none');
                
                // Show logout link in dropdown
                const logoutLink = navDropdown.querySelector('#logoutLink');
                if (logoutLink) {
                    logoutLink.classList.remove('d-none');
                }
                
                // Optional: Display user email or name if you want
                console.log('User logged in:', user.email);
            } else {
                // Show login section
                loginSection.classList.remove('d-none');
                
                // Hide logout link in dropdown
                const logoutLink = navDropdown.querySelector('#logoutLink');
                if (logoutLink) {
                    logoutLink.classList.add('d-none');
                }
            }
        },

        // Email validation function
        validateEmail(email) {
            // Regex to specifically validate @mcpi.edu.ph domain
            const mcpiEmailRegex = /^[a-zA-Z0-9._%+-]+@mcpi\.edu\.ph$/;
            
            if (!mcpiEmailRegex.test(email)) {
                throw new Error('Only @mcpi.edu.ph email addresses are allowed');
            }
            
            return true;
        },

        // Form Validation
        validateForm(type, formData) {
            const errors = [];

            // Email validation
            if (type === 'signup' || type === 'login') {
                if (!formData.email) {
                    errors.push('Email is required');
                } else if (!this.validateEmail(formData.email)) {
                    errors.push('Invalid email format');
                } else if (!formData.email.endsWith('@mcpi.edu.ph')) {
                    errors.push('Only @mcpi.edu.ph email addresses are allowed');
                }
            }

            // Password validation
            if (type === 'signup') {
                if (!formData.password) {
                    errors.push('Password is required');
                } else if (formData.password.length < 8) {
                    errors.push('Password must be at least 8 characters long');
                }

                // Confirm password check
                if (!formData.confirmPassword) {
                    errors.push('Please confirm your password');
                } else if (formData.password !== formData.confirmPassword) {
                    errors.push('Passwords do not match');
                }

                // Full name validation
                if (!formData.fullName || formData.fullName.trim().length < 2) {
                    errors.push('Full name is required');
                }
            }

            return errors.length > 0 ? errors : null;
        },

        // Robust element value retrieval with comprehensive null and error handling
        getElementValue(selector, defaultValue = '') {
            try {
                // Use multiple selection methods
                const element = 
                    document.querySelector(selector) || 
                    document.getElementById(selector.replace('#', '')) ||
                    document.getElementsByName(selector.replace('[name="', '').replace('"]', ''))[0];

                // Check if element exists and has a value property
                if (element) {
                    // Handle different types of elements
                    if (element.value !== undefined) {
                        return (element.value || '').trim();
                    }
                    // Handle other element types that might have textContent
                    return (element.textContent || element.innerText || defaultValue).trim();
                }

                // Log when element is not found
                console.warn(`Element not found: ${selector}`);
                return defaultValue;
            } catch (error) {
                // Comprehensive error handling
                console.error(`Error retrieving element value for ${selector}:`, error);
                return defaultValue;
            }
        },

        // Method to show message in signup modal
        showSignupMessage(message, isSuccess = false) {
            const messageContainer = document.getElementById('signupModalMessage');
            if (!messageContainer) return;

            // Clear previous messages
            messageContainer.innerHTML = '';

            // Create message element
            const messageEl = document.createElement('div');
            messageEl.classList.add('alert', isSuccess ? 'alert-success' : 'alert-danger');
            messageEl.textContent = message;

            // Append message
            messageContainer.appendChild(messageEl);

            // Optional: Auto-remove message after 5 seconds
            if (isSuccess) {
                setTimeout(() => {
                    messageContainer.innerHTML = '';
                }, 5000);
            }
        },

        // Modify signup method to include comprehensive error handling
        signUp(formData) {
            try {
                // Check rate limiting before proceeding
                this._checkSignupRateLimit();
            } catch (rateLimitError) {
                this.showSignupMessage(rateLimitError.message, false);
                return Promise.reject(rateLimitError);
            }

            // Validate form data first
            const validationErrors = this.validateForm('signup', formData);
            
            if (validationErrors.length > 0) {
                // Show all validation errors
                const errorMessage = validationErrors.join('\n');
                this.showSignupMessage(errorMessage, false);
                return Promise.reject(new Error(errorMessage));
            }

            // Proceed with Supabase signup
            return this.initSupabase().auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    // Explicitly disable email confirmation
                    emailRedirectTo: null,
                    data: {
                        full_name: formData.fullName || ''
                    },
                    shouldCreateUser: true // Explicitly create user
                }
            }).then(({ data, error }) => {
                // Comprehensive logging of signup response
                console.log('Detailed Signup Response:', {
                    data: data ? {
                        user: data.user ? 'User object exists' : 'No user object',
                        session: data.session ? 'Session object exists' : 'No session object'
                    } : 'No data object',
                    error: error ? {
                        name: error.name,
                        message: error.message,
                        status: error.status
                    } : 'No error'
                });

                // Successful user creation
                if (data?.user) {
                    this.showSignupMessage('Signup successful! You can now log in.', true);
                    return data.user;
                }

                // Handle specific error scenarios
                if (error) {
                    let userFriendlyMessage = 'Signup failed. ';
                    
                    // Detailed error handling
                    switch (error.message) {
                        case 'User already exists':
                            userFriendlyMessage += 'An account with this email already exists.';
                            break;
                        case 'Rate limit exceeded':
                        case 'email rate limit exceeded':
                            userFriendlyMessage += 'Too many signup attempts. Please wait 15 minutes and try again.';
                            break;
                        case 'Email not confirmed':
                        case 'email not confirmed':
                            userFriendlyMessage += 'Please complete email verification or contact support.';
                            break;
                        case 'Database error saving new user':
                            userFriendlyMessage += 'There was a problem saving your user information.';
                            break;
                        default:
                            userFriendlyMessage += error.message;
                    }
                    
                    // Log the original error for debugging
                    console.error('Detailed Signup Error:', {
                        errorName: error.name,
                        errorMessage: error.message,
                        errorStatus: error.status,
                        fullError: error
                    });
                    
                    // Show user-friendly message
                    this.showSignupMessage(userFriendlyMessage, false);
                    
                    return Promise.reject(error);
                }

                // Unexpected scenario
                this.showSignupMessage('An unexpected error occurred during signup. Please try again.', false);
                return Promise.reject(new Error('Unexpected signup result'));

            }).catch(error => {
                console.error('Signup Catch Block Error:', error);
                
                // Additional error logging
                console.error('Error Details:', {
                    name: error.name,
                    message: error.message,
                    status: error.status,
                    stack: error.stack
                });

                // More informative error message
                const userFriendlyMessage = `Signup failed: ${error.message}. Please try again or contact support.`;
                this.showSignupMessage(userFriendlyMessage, false);
                
                return Promise.reject(error);
            });
        },

        // Authentication Methods
        login(formData) {
            // Validate form data first
            const validationErrors = this.validateForm('login', formData);
            
            if (validationErrors.length > 0) {
                // Show all validation errors
                const errorMessage = validationErrors.join('\n');
                this.showSignupMessage(errorMessage, false);
                return Promise.reject(new Error(errorMessage));
            }

            // Proceed with Supabase login
            return this.initSupabase().auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            }).then(({ data, error }) => {
                if (error) {
                    // More specific error handling
                    let userFriendlyMessage = 'Login failed. ';
                    switch (error.message) {
                        case 'Invalid login credentials':
                            userFriendlyMessage += 'Incorrect email or password.';
                            break;
                        case 'Rate limit exceeded':
                            userFriendlyMessage += 'Too many login attempts. Please try again later.';
                            break;
                        default:
                            userFriendlyMessage += error.message;
                    }
                    
                    this.showSignupMessage(userFriendlyMessage, false);
                    return Promise.reject(error);
                }

                // Check if user was logged in successfully
                if (data.user) {
                    this.showSignupMessage('Login successful!', true);
                    window.location.href = 'homepage.html';
                    return data.user;
                } else {
                    this.showSignupMessage('Login process incomplete. Please try again.', false);
                    return Promise.reject(new Error('Login process incomplete'));
                }
            }).catch(error => {
                console.error('Login error:', error);
                this.showSignupMessage(`An unexpected error occurred: ${error.message}`, false);
                return Promise.reject(error);
            });
        },

        async logout() {
            try {
                // Clear any local storage or session data if needed
                localStorage.clear();
                sessionStorage.clear();

                // Sign out from Supabase
                const { error } = await this.initSupabase().auth.signOut();
                
                if (error) {
                    console.error('Logout Error:', error);
                    this.displayErrorMessage('Failed to log out. Please try again.');
                    return { 
                        success: false, 
                        message: error.message || 'Logout failed' 
                    };
                }

                // Redirect to login page
                window.location.href = 'index.html';

                return { 
                    success: true, 
                    message: 'Logged out successfully' 
                };
            } catch (error) {
                console.error('Comprehensive Logout Error:', error);
                this.displayErrorMessage('An unexpected error occurred during logout.');
                return { 
                    success: false, 
                    message: error.message || 'Logout failed' 
                };
            }
        },

        // Modal Accessibility Improvements
        setupModalAccessibility() {
            const loginModal = document.getElementById('loginModal');
            const signupModal = document.getElementById('signupModal');

            if (loginModal) {
                console.log('Login modal found, initializing...');
                try {
                    // Ensure Bootstrap is available
                    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                        const loginModalInstance = new bootstrap.Modal(loginModal);
                        console.log('Login modal initialized successfully');
                    } else {
                        console.error('Bootstrap Modal not available');
                    }
                } catch (error) {
                    console.error('Error initializing login modal:', error);
                }
            } else {
                console.error('Login modal element not found');
            }

            if (signupModal) {
                console.log('Signup modal found, initializing...');
                try {
                    // Ensure Bootstrap is available
                    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                        const signupModalInstance = new bootstrap.Modal(signupModal);
                        console.log('Signup modal initialized successfully');
                    } else {
                        console.error('Bootstrap Modal not available');
                    }
                } catch (error) {
                    console.error('Error initializing signup modal:', error);
                }
            } else {
                console.error('Signup modal element not found');
            }
        },
    };

    // Comprehensive signup form debugging function
    function debugSignupFormInitialization() {
        console.group('Signup Form Comprehensive Debug');
        
        // Check document state
        console.log('Document Ready State:', document.readyState);
        console.log('Current URL:', window.location.href);

        // Check for modal
        const signupModal = document.getElementById('signupModal');
        console.log('Signup Modal Exists:', !!signupModal);
        if (signupModal) {
            console.log('Signup Modal Details:', {
                id: signupModal.id,
                className: signupModal.className,
                innerHTML: signupModal.innerHTML.substr(0, 500) + '...'
            });
        }

        // Check all forms
        const allForms = document.getElementsByTagName('form');
        console.log('Total Forms Found:', allForms.length);
        
        // Detailed form logging
        Array.from(allForms).forEach((form, index) => {
            console.group(`Form ${index + 1}`);
            console.log('Form ID:', form.id);
            console.log('Form Name:', form.name);
            console.log('Form Class:', form.className);
            
            // Check for specific signup-related inputs
            const signupInputs = {
                name: form.querySelector('#signupName'),
                email: form.querySelector('#signupEmail'),
                password: form.querySelector('#signupPassword'),
                confirmPassword: form.querySelector('#signupConfirmPassword')
            };

            console.log('Signup-related Inputs:', {
                name: !!signupInputs.name,
                email: !!signupInputs.email,
                password: !!signupInputs.password,
                confirmPassword: !!signupInputs.confirmPassword
            });

            console.groupEnd();
        });

        // Check script and config loading
        console.log('Config Script Loaded:', !!window.SUPABASE_CONFIG);
        console.log('Supabase Library Loaded:', typeof supabase !== 'undefined');

        console.groupEnd();
    }

    // Function to set up signup form event listener with enhanced debugging
    function setupSignupFormListener() {
        // Comprehensive initial debugging
        debugSignupFormInitialization();

        console.log('Attempting to set up signup form listener');
        console.log('Current document readyState:', document.readyState);
        
        // Comprehensive selector list with more aggressive detection
        const signupFormSelectors = [
            '#signupForm',
            'form[id="signupForm"]', 
            'form[name="signupForm"]',
            '#signupModal form',
            '.signup-form',
            'form.signup-form',
            'form[data-type="signup"]',
            '[id*="signup"][id*="form"]',
            '[name*="signup"][name*="form"]'
        ];

        let signupForm = null;

        // Try each selector
        for (const selector of signupFormSelectors) {
            signupForm = document.querySelector(selector);
            if (signupForm) {
                console.log(`Signup form found using selector: ${selector}`);
                console.log('Signup form details:', {
                    id: signupForm.id,
                    name: signupForm.name,
                    className: signupForm.className,
                    innerHTML: signupForm.innerHTML.substr(0, 200) + '...'
                });
                break;
            }
        }

        // If no form found, do a more aggressive search
        if (!signupForm) {
            console.error('No signup form found using standard selectors');
            
            // Try finding form with specific input fields
            const allForms = document.getElementsByTagName('form');
            signupForm = Array.from(allForms).find(form => 
                form.querySelector('#signupName') && 
                form.querySelector('#signupEmail') && 
                form.querySelector('#signupPassword') && 
                form.querySelector('#signupConfirmPassword')
            );

            if (signupForm) {
                console.log('Signup form found through input field detection');
            }
        }

        // Final check and error handling
        if (!signupForm) {
            console.error('No signup form found after comprehensive search');
            
            // Add a global window error handler for additional context
            window.addEventListener('error', function(event) {
                console.error('Global Error Handler:', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                });
            });

            // Retry with multiple methods
            const retryMethods = [
                () => document.getElementById('signupForm'),
                () => document.querySelector('#signupModal form'),
                () => document.querySelector('form[id*="signup"]'),
                () => {
                    const forms = document.getElementsByTagName('form');
                    return forms.length > 0 ? forms[0] : null;
                }
            ];

            for (const method of retryMethods) {
                const retriedForm = method();
                if (retriedForm) {
                    console.log('Signup form found through alternative method');
                    signupForm = retriedForm;
                    break;
                }
            }

            // If still no form, log extreme debugging information
            if (!signupForm) {
                console.error('CRITICAL: Signup form could not be found through any method');
                debugSignupFormInitialization();
                return;
            }
        }

        // Add submit event listener
        signupForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            try {
                // Comprehensive element checks
                const nameInput = this.querySelector('#signupName');
                const emailInput = this.querySelector('#signupEmail');
                const passwordInput = this.querySelector('#signupPassword');
                const confirmPasswordInput = this.querySelector('#signupConfirmPassword');
                const submitButton = this.querySelector('button[type="submit"]');

                // Detailed logging of input elements
                console.log('Signup Form Inputs:', {
                    nameInput: !!nameInput,
                    emailInput: !!emailInput,
                    passwordInput: !!passwordInput,
                    confirmPasswordInput: !!confirmPasswordInput,
                    submitButton: !!submitButton
                });

                // Disable submit button to prevent multiple submissions
                if (submitButton) {
                    submitButton.disabled = true;
                }

                // Attempt signup with comprehensive input validation
                const signupResult = await AuthModule.signUp({
                    fullName: nameInput ? nameInput.value : '',
                    email: emailInput ? emailInput.value : '',
                    password: passwordInput ? passwordInput.value : '',
                    confirmPassword: confirmPasswordInput ? confirmPasswordInput.value : ''
                });

                // Safely check signup result
                if (signupResult && signupResult.success) {
                    console.log('Signup successful');
                } else if (signupResult) {
                    console.error('Signup failed:', signupResult.message);
                }
            } catch (error) {
                // Log the error for debugging
                console.error('Signup Error:', error);
            } finally {
                // Re-enable submit button
                const submitButton = this.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });

        console.log('Signup form event listener added successfully');
    }

    // Ensure the listener is added after DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupSignupFormListener);
    } else {
        setupSignupFormListener();
    }

    // Additional global debugging
    window.addEventListener('load', () => {
        console.log('Window load event triggered');
        debugSignupFormInitialization();
    });

    // Book-related functions
    // Function to create a book card
    function createBookCard(book) {
        // Create the main card element
        const cardCol = document.createElement('div');
        cardCol.className = 'col book-card';
        cardCol.setAttribute('data-genre', book.genre || 'unknown');
        cardCol.setAttribute('data-status', book.status || 'available');

        // Construct the card HTML
        cardCol.innerHTML = `
            <div class="card h-100 shadow-sm">
                <img src="${book.coverImage || 'https://via.placeholder.com/300x450?text=Book+Cover'}" 
                     class="card-img-top book-card-img" 
                     alt="Book Cover for ${book.title}">
                <div class="card-body">
                    <h5 class="card-title">${book.title}</h5>
                    <p class="card-text text-muted mb-2">${book.author}</p>
                    <span class="badge ${getStatusBadgeClass(book.status)}">
                        ${book.status || 'Unknown Status'}
                    </span>
                </div>
                <div class="card-footer bg-transparent d-flex justify-content-between align-items-center">
                    <small class="text-muted">
                        ${book.status === 'Available' ? 'Available' : 'Borrowed'}
                    </small>
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="viewBookDetails('${book.id}')">
                        Details
                    </button>
                </div>
            </div>
        `;

        return cardCol;
    }

    // Helper function to get badge class based on book status
    function getStatusBadgeClass(status) {
        switch(status) {
            case 'Available':
                return 'bg-success';
            case 'Borrowed':
                return 'bg-warning text-dark';
            case 'Reserved':
                return 'bg-info';
            default:
                return 'bg-secondary';
        }
    }

    // Function to view book details (placeholder for future implementation)
    function viewBookDetails(bookId) {
        // This will be expanded later to show full book details
        console.log(`Viewing details for book ID: ${bookId}`);
        // Future implementation might open a modal or navigate to a details page
    }

    // Function to populate books list
    function populateBooksList(books) {
        const booksContainer = document.getElementById('booksContainer');
        
        // Clear existing books
        if (booksContainer) {
            booksContainer.innerHTML = '';

            // Create and append book cards
            books.forEach(book => {
                const bookCard = createBookCard(book);
                booksContainer.appendChild(bookCard);
            });
        } else {
            console.error('Books container not found');
        }
    }

    // Expose functions globally if needed
    window.populateBooksList = populateBooksList;
    window.createBookCard = createBookCard;
    window.viewBookDetails = viewBookDetails;

    // Example book data (this would typically come from a database)
    const sampleBooks = [
        {
            id: 'book1',
            title: 'To Kill a Mockingbird',
            author: 'Harper Lee',
            genre: 'Fiction',
            status: 'Available',
            coverImage: 'path/to/mockingbird-cover.jpg'
        },
        {
            id: 'book2',
            title: 'A Brief History of Time',
            author: 'Stephen Hawking',
            genre: 'Non-Fiction',
            status: 'Borrowed',
            coverImage: 'path/to/time-cover.jpg'
        }
    ];

    // Global Logout Function
    async function globalLogout() {
        try {
            // Initialize Supabase client using the global Supabase library
            const supabaseClient = window.supabase && typeof window.supabase.createClient === 'function' 
                ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
                : (window.createClient 
                    ? window.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
                    : null);

            // Clear any local storage or session data if needed
            localStorage.clear();
            sessionStorage.clear();

            // Sign out from Supabase
            if (supabaseClient && typeof supabaseClient.auth.signOut === 'function') {
                const { error } = await supabaseClient.auth.signOut();
                
                if (error) {
                    console.error('Logout Error:', error);
                    alert('Failed to log out. Please try again.');
                    return false;
                }
            } else {
                console.warn('Supabase client not properly initialized');
            }

            // Redirect to login page
            window.location.href = 'index.html';

            return true;
        } catch (error) {
            console.error('Comprehensive Logout Error:', error);
            alert('An unexpected error occurred during logout.');
            return false;
        }
    }

    // Add event listeners for logout links after DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Find all logout links
        const logoutLinks = document.querySelectorAll('#logoutLink');
        
        logoutLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                await globalLogout();
            });
        });
    });

    // Event Listeners Setup
    function setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const logoutButton = document.getElementById('logoutButton');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Reset error message
                const errorMessageElement = document.getElementById('loginErrorMessage');
                if (errorMessageElement) {
                    errorMessageElement.textContent = '';
                    errorMessageElement.style.display = 'none';
                }

                const formData = {
                    email: loginForm.querySelector('#loginEmail').value,
                    password: loginForm.querySelector('#loginPassword').value
                };

                console.log('Login attempt:', { email: formData.email });

                try {
                    // Validate form data
                    const validationErrors = AuthModule.validateForm('login', formData);
                    if (validationErrors.length > 0) {
                        throw new Error(validationErrors.join(', '));
                    }

                    // Attempt login
                    const result = await AuthModule.login(formData);

                    console.log('Login successful:', result);

                    // Close login modal
                    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                    if (loginModal) {
                        loginModal.hide();
                    }

                    // Update UI or redirect
                    AuthModule.updateAuthUI(result.user);

                } catch (error) {
                    console.error('Login error:', error);

                    // Display error message
                    if (errorMessageElement) {
                        errorMessageElement.textContent = error.message || 'Login failed. Please try again.';
                        errorMessageElement.style.display = 'block';
                    }
                }
            });
        }

        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    fullName: signupForm.querySelector('#signupName').value,
                    email: signupForm.querySelector('#signupEmail').value,
                    password: signupForm.querySelector('#signupPassword').value,
                    confirmPassword: signupForm.querySelector('#signupConfirmPassword').value
                };

                const validationErrors = AuthModule.validateForm('signup', formData);
                if (validationErrors.length > 0) {
                    // Show error message for validation errors
                    const errorMessageElement = document.getElementById('signupErrorMessage');
                    if (errorMessageElement) {
                        errorMessageElement.textContent = validationErrors.join(', ');
                        errorMessageElement.style.display = 'block';
                    }
                    throw new Error(validationErrors.join(', '));
                }

                try {
                    const result = await AuthModule.signUp(formData);
                    
                    // More detailed error handling
                    if (result.success) {
                        alert(result.message);
                        // Optional: Close signup modal or redirect
                    } else {
                        // Log full error details to console
                        console.log('Signup Failed:', result.fullError);
                        
                        // Show user-friendly error message
                        alert(result.message);
                    }
                } catch (error) {
                    console.log('Unexpected Signup Error:', error);
                    alert('An unexpected error occurred during signup. Please try again.');
                }
            });
        }

        // Logout button event listener
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    const result = await AuthModule.logout();
                    alert(result.message);
                } catch (error) {
                    console.log('Logout error:', error);
                    alert(error.message || 'Logout failed');
                }
            });
        }
    }
    
    // Application Initialization
    function initialize() {
        try {
            // Verify Supabase configuration
            if (!window.SUPABASE_CONFIG) {
                throw new Error('Supabase configuration is missing');
            }

            // Wait for Supabase library with extended timeout
            waitForSupabase()
                .then((supabaseLib) => {
                    // Ensure we have a createClient method
                    const createClientMethod = supabaseLib.createClient || supabaseLib;

                    // Initialize Supabase client
                    const supabaseClient = createClientMethod(
                        window.SUPABASE_CONFIG.URL,
                        window.SUPABASE_CONFIG.ANON_KEY,
                        {
                            auth: {
                                persistSession: true,
                                autoRefreshToken: true,
                                detectSessionInUrl: true
                            }
                        }
                    );

                    // Set global Supabase client
                    window.supabase = supabaseClient;

                    // Set up authentication listeners
                    supabaseClient.auth.onAuthStateChange((event, session) => {
                        console.log('Auth state change event:', event);
                        AuthModule.updateAuthUI(session?.user || null);
                    });

                    // Initial session check
                    supabaseClient.auth.getSession()
                        .then(({ data: { session } }) => {
                            console.log('Initial session:', session);
                            AuthModule.updateAuthUI(session?.user || null);
                        })
                        .catch(error => {
                            console.log('Error getting initial session:', error);
                        });

                    // Set up other event listeners
                    setupEventListeners();
                    AuthModule.setupModalAccessibility();
                })
                .catch(error => {
                    console.log('Supabase initialization failed:', error);
                    
                    // More detailed error handling
                    const errorDisplay = document.getElementById('supabaseInitError');
                    if (errorDisplay) {
                        errorDisplay.textContent = `Authentication service failed to load: ${error.message}. Please refresh the page.`;
                        errorDisplay.style.display = 'block';
                    }
                    
                    alert('Failed to load authentication service. Please reload the page.');
                });
        } catch (error) {
            console.log('Initialization error:', error);
            
            // Display error to user
            const errorDisplay = document.getElementById('supabaseInitError');
            if (errorDisplay) {
                errorDisplay.textContent = `Initialization error: ${error.message}. Please reload the page.`;
                errorDisplay.style.display = 'block';
            }
            
            alert('Failed to initialize the application. Please reload the page.');
        }
    }

    // Start the application when DOM is ready
    document.addEventListener('DOMContentLoaded', initialize);
})();