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
        // Get Supabase client
        getSupabase() {
            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }
            return window.supabaseClient;
        },

        // Initialize Supabase Client
        async initSupabase() {
            try {
                return this.getSupabase();
            } catch (error) {
                console.error('Failed to get Supabase client:', error);
                throw error;
            }
        },

        // Rate limit tracking
        _signupAttempts: 0,
        _lastSignupAttempt: 0,

        // Method to check and manage signup rate limits
        _checkSignupRateLimit() {
            const now = Date.now();
            const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes instead of 15
            const MAX_ATTEMPTS = 10; // Increased from 5 to 10 attempts

            // Reset attempts if outside the time window
            if (now - this._lastSignupAttempt > RATE_LIMIT_WINDOW) {
                this._signupAttempts = 0;
                this._lastSignupAttempt = now;
                return true;
            }

            // Check if rate limit is exceeded
            if (this._signupAttempts >= MAX_ATTEMPTS) {
                const waitTimeMs = RATE_LIMIT_WINDOW - (now - this._lastSignupAttempt);
                const waitTimeMin = Math.ceil(waitTimeMs / 60000);
                throw new Error(`Too many signup attempts. Please wait ${waitTimeMin} minute${waitTimeMin > 1 ? 's' : ''} before trying again.`);
            }

            // Increment attempts
            this._signupAttempts++;
            this._lastSignupAttempt = now;
            return true;
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

            return errors;
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

        // Method to show message in login modal
        showLoginMessage(message, isSuccess = false) {
            const messageContainer = document.getElementById('loginModalMessage');
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

        async signUp(formData) {
            try {
                // Get form data
                const email = formData.email.trim();
                const password = formData.password;
                const fullName = formData.fullName.trim();

                // Basic validation
                if (!email || !password || !fullName) {
                    throw new Error('All fields are required');
                }

                // Get Supabase client
                const supabase = this.getSupabase();

                // Attempt signup
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName
                        }
                    }
                });

                if (error) throw error;

                if (!data.user) {
                    throw new Error('Signup failed - no user data received');
                }

                // Show success message
                this.showSignupMessage('Signup successful! Please check your email for verification.', true);

                // Close modal after delay
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
                    if (modal) {
                        modal.hide();
                    }
                }, 2000);

                return data;
            } catch (error) {
                console.error('Signup Error:', error);
                const message = error.message || 'An unexpected error occurred';
                this.showSignupMessage(message, false);
                throw error;
            }
        },

        // Authentication Methods
        async login(formData) {
            try {
                // Initialize Supabase first
                await this.initSupabase();
                
                // Validate form data first
                const validationErrors = this.validateForm('login', formData);
                
                if (validationErrors.length > 0) {
                    // Show all validation errors
                    const errorMessage = validationErrors.join('\n');
                    this.showLoginMessage(errorMessage, false);
                    return Promise.reject(new Error(errorMessage));
                }

                // Proceed with Supabase login
                const { data, error } = await this.getSupabase().auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                });

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
                    
                    this.showLoginMessage(userFriendlyMessage, false);
                    return Promise.reject(error);
                }

                // Check if user was logged in successfully
                if (data.user) {
                    this.showLoginMessage('Login successful!', true);
                    window.location.href = 'homepage.html';
                    return data.user;
                } else {
                    this.showLoginMessage('Login process incomplete. Please try again.', false);
                    return Promise.reject(new Error('Login process incomplete'));
                }
            } catch (error) {
                console.error('Login error:', error);
                this.showLoginMessage(`An unexpected error occurred: ${error.message}`, false);
                return Promise.reject(error);
            }
        },

        // Method to show error message
        displayErrorMessage(message) {
            const errorMessageElement = document.getElementById('errorMessage');
            if (errorMessageElement) {
                errorMessageElement.textContent = message;
                errorMessageElement.style.display = 'block';
            }
        },

        async logout() {
            try {
                // Clear any local storage or session data if needed
                localStorage.clear();
                sessionStorage.clear();

                // Sign out from Supabase
                const { error } = await this.getSupabase().auth.signOut();
                
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

        getSignupFields() {
            const email = document.querySelector('#signupEmail')?.value?.trim();
            const password = document.querySelector('#signupPassword')?.value;
            const confirmPassword = document.querySelector('#signupConfirmPassword')?.value;
            const fullName = document.querySelector('#signupName')?.value?.trim();

            // Log field presence for debugging
            console.log('Signup fields present:', {
                hasEmail: !!email,
                hasPassword: !!password,
                hasFullName: !!fullName,
                hasConfirmPassword: !!confirmPassword
            });

            // Validate required fields
            if (!email) throw new Error('Email is required');
            if (!password) throw new Error('Password is required');
            if (!confirmPassword) throw new Error('Please confirm your password');
            if (!fullName) throw new Error('Full name is required');

            // Validate email format
            if (!this.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            // Validate password match
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            return {
                email,
                password,
                confirmPassword,
                fullName
            };
        },

        getLoginFields() {
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;

            if (!email || !password) {
                throw new Error('Required login fields are missing');
            }

            return { email, password };
        },
    };

    // Book Order Module
    const OrderModule = {
        async submitOrder(bookId) {
            try {
                // Initialize Supabase if not already initialized
                const supabase = await AuthModule.initSupabase();
                
                // Check if user is authenticated
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session) {
                    throw new Error('Please log in to order books');
                }

                // Get the current user
                const userId = session.user.id;
                
                // Create the order in the orders table
                const { data: order, error: orderError } = await supabase
                    .from('orders')
                    .insert([
                        {
                            user_id: userId,
                            book_id: bookId,
                            status: 'pending',
                            order_date: new Date().toISOString()
                        }
                    ])
                    .select()
                    .single();

                if (orderError) {
                    console.error('Order creation error:', orderError);
                    throw new Error('Failed to create order. Please try again.');
                }

                // Update the book status to 'Borrowed'
                const { error: updateError } = await supabase
                    .from('books')
                    .update({ status: 'Borrowed' })
                    .eq('id', bookId);

                if (updateError) {
                    console.error('Book status update error:', updateError);
                    // Rollback the order if book update fails
                    await supabase
                        .from('orders')
                        .delete()
                        .eq('id', order.id);
                    throw new Error('Failed to update book status. Please try again.');
                }

                return {
                    success: true,
                    message: 'Order placed successfully!',
                    orderId: order.id
                };

            } catch (error) {
                console.error('Order submission error:', error);
                return {
                    success: false,
                    message: error.message || 'Failed to place order. Please try again.'
                };
            }
        }
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
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const formData = AuthModule.getSignupFields();
                    // Basic validation
                    if (!formData.email || !formData.password || !formData.fullName) {
                        throw new Error('All fields are required');
                    }
        
                    // Attempt signup
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
                } finally {
                    // Re-enable the submit button...
                    const submitButton = e.target.querySelector('button[type="submit"]');
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Sign Up';
                    }
                }
            });
        }

        console.log('Signup form event listener added successfully');
        
        // Add event listener for opening the modal
        const signupModal = document.getElementById('signupModal');
        if (signupModal) {
            signupModal.addEventListener('shown.bs.modal', () => {
                console.log('Signup modal opened');
                // Reset form fields
                signupForm.reset();
            });
        }
    }

    // Ensure the listener is added after DOM is fully loaded
    document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('DOMContentLoaded', () => {
            const signupForm = document.getElementById('signupForm'); // Ensure this ID matches your HTML
            if (signupForm) {
                signupForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    try {
                        const formData = AuthModule.getSignupFields();
                        // Basic validation
                        if (!formData.email || !formData.password || !formData.fullName) {
                            throw new Error('All fields are required');
                        }

                        // Attempt signup
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
                    } finally {
                        // Re-enable the submit button...
                        const submitButton = e.target.querySelector('button[type="submit"]');
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.innerHTML = 'Sign Up';
                        }
                    }
                });
            } else {
                console.error('Signup form not found');
            }
        });
    });

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
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="viewBookDetails('${book.id}')">
                            Details
                        </button>
                        ${book.status === 'Available' ? `
                            <button class="btn btn-sm btn-success" 
                                    onclick="orderBook('${book.id}')">
                                Order
                            </button>
                        ` : ''}
                    </div>
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

    // Global order function
    async function orderBook(bookId) {
        try {
            const result = await OrderModule.submitOrder(bookId);
            if (result.success) {
                alert(result.message);
                // Refresh the book list or update the UI
                location.reload();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Order error:', error);
            alert(error.message || 'Failed to place order. Please try again.');
        }
    }

    // Expose necessary functions globally
    window.orderBook = orderBook;

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

                const formData = AuthModule.getLoginFields();

                console.log('Login attempt:', { email: formData.email });

                try {
                    // Validate form data
                    const validationErrors = AuthModule.validateForm('login', formData);
                    
                    // Add defensive checks
                    if (!validationErrors) {
                        console.error('Validation errors is null or undefined');
                        throw new Error('Validation process failed');
                    }

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
                    console.error('Error stack:', error.stack);

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
                try {
                    const formData = AuthModule.getSignupFields();
                    // Basic validation
                    if (!formData.email || !formData.password || !formData.fullName) {
                        throw new Error('All fields are required');
                    }
        
                    // Attempt signup
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
                } finally {
                    // Re-enable the submit button...
                    const submitButton = e.target.querySelector('button[type="submit"]');
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Sign Up';
                    }
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
                    const createClientMethod = supabaseLib.createClient || supabaseLib.default?.createClient;
                    if (!createClientMethod) {
                        throw new Error('Supabase createClient not found');
                    }

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
                    window.supabaseClient = supabaseClient;

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