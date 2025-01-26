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
        // Initialize Supabase Client
        initSupabase() {
            // Check if Supabase is initialized
            if (!window.supabase) {
                throw new Error('Supabase not initialized. Please reload the page.');
            }
            return window.supabase;
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

            // Email Validation
            try {
                this.validateEmail(formData.email);
            } catch (error) {
                errors.push(error.message);
            }

            // Password Validation
            if (type === 'signup' || type === 'login') {
                const password = formData.password;
                
                // Length check
                if (password.length < VALIDATION.password.minLength || 
                    password.length > VALIDATION.password.maxLength) {
                    errors.push(`Password must be between ${VALIDATION.password.minLength} and ${VALIDATION.password.maxLength} characters`);
                }

                // Uppercase check
                if (VALIDATION.password.requireUppercase && !/[A-Z]/.test(password)) {
                    errors.push('Password must contain an uppercase letter');
                }

                // Lowercase check
                if (VALIDATION.password.requireLowercase && !/[a-z]/.test(password)) {
                    errors.push('Password must contain a lowercase letter');
                }

                // Number check
                if (VALIDATION.password.requireNumber && !/[0-9]/.test(password)) {
                    errors.push('Password must contain a number');
                }
            }

            // Confirm password match (only for signup)
            if (type === 'signup' && formData.password !== formData.confirmPassword) {
                errors.push('Passwords do not match');
            }

            return errors;
        },

        // Modify signup method to remove email verification
        async signUp(formData) {
            try {
                // Validate email before proceeding
                this.validateEmail(formData.email);

                const { data, error } = await this.initSupabase().auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.fullName,
                            student_id: formData.studentId
                        }
                    }
                });

                if (error) {
                    throw error;
                }

                // Close signup modal
                const signupModal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
                if (signupModal) signupModal.hide();

                // Show success message or redirect
                alert('Signup successful! You can now log in.');

                return { 
                    success: true, 
                    message: 'Signup successful',
                    user: data.user
                };
            } catch (error) {
                // Handle both validation and signup errors
                console.error('Signup error:', error);
                throw new Error(error.message || 'Signup failed');
            }
        },

        // Function to show email verification modal
        showEmailVerificationModal(email) {
            const verificationModal = new bootstrap.Modal(document.getElementById('checkEmailModal'));
            const emailDisplay = document.getElementById('verificationEmailDisplay');
            const resendVerificationBtn = document.getElementById('resendVerificationBtn');

            // Display the email in the modal
            if (emailDisplay) {
                emailDisplay.textContent = email;
            }

            // Show the modal
            verificationModal.show();

            // Resend verification link functionality
            if (resendVerificationBtn) {
                resendVerificationBtn.onclick = async () => {
                    try {
                        const { error } = await this.initSupabase().auth.resend({
                            type: 'signup',
                            email: email
                        });

                        if (error) {
                            throw error;
                        }

                        alert('Verification email resent successfully!');
                    } catch (error) {
                        console.error('Error resending verification email:', error);
                        alert('Failed to resend verification email. Please try again.');
                    }
                };
            }
        },

        // Authentication Methods
        async login(formData) {
            const { email, password } = formData;
            
            return new Promise((resolve, reject) => {
                this.initSupabase().auth.signInWithPassword({
                    email: email,
                    password: password
                }).then(({ data, error }) => {
                    // Get the error message element
                    const errorMessageElement = document.getElementById('loginErrorMessage');
                    
                    if (error) {
                        // Display generic error message in the UI
                        if (errorMessageElement) {
                            errorMessageElement.textContent = 'Invalid email or password';
                            errorMessageElement.style.display = 'block';
                        }
                        reject(new Error('Invalid email or password'));
                        return;
                    }

                    // Hide any previous error messages
                    if (errorMessageElement) {
                        errorMessageElement.textContent = '';
                        errorMessageElement.style.display = 'none';
                    }

                    if (data.user) {
                        // Redirect to homepage after successful login
                        window.location.href = 'homepage.html';
                        resolve({ 
                            success: true, 
                            message: 'Login successful',
                            user: data.user
                        });
                    } else {
                        reject(new Error('Login failed'));
                    }
                }).catch(err => {
                    // Get the error message element
                    const errorMessageElement = document.getElementById('loginErrorMessage');
                    
                    // Display generic error message in the UI
                    if (errorMessageElement) {
                        errorMessageElement.textContent = 'Unable to log in. Please try again.';
                        errorMessageElement.style.display = 'block';
                    }
                    reject(new Error('Unable to log in'));
                });
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
            const modals = document.querySelectorAll('.modal');
            
            modals.forEach(modal => {
                modal.addEventListener('show.bs.modal', (event) => {
                    // Trap focus within the modal
                    const focusableElements = modal.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    
                    if (focusableElements.length > 0) {
                        focusableElements[0].focus();
                    }
                });

                modal.addEventListener('hidden.bs.modal', (event) => {
                    // Return focus to the element that opened the modal
                    const triggerElement = document.querySelector(`[data-bs-target="#${modal.id}"]`);
                    if (triggerElement) {
                        triggerElement.focus();
                    }
                });
            });
        },
    };

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
                const formData = {
                    email: loginForm.querySelector('#loginEmail').value,
                    password: loginForm.querySelector('#loginPassword').value
                };

                const validationErrors = AuthModule.validateForm('login', formData);
                if (validationErrors.length > 0) {
                    // Show error message for validation errors
                    const errorMessageElement = document.getElementById('loginErrorMessage');
                    if (errorMessageElement) {
                        errorMessageElement.textContent = validationErrors.join(', ');
                        errorMessageElement.style.display = 'block';
                    }
                    throw new Error(validationErrors.join(', '));
                }

                try {
                    const result = await AuthModule.login(formData);
                } catch (error) {
                    const errorMessage = error && error.message 
                        ? error.message 
                        : (typeof error === 'string' 
                            ? error 
                            : 'Login failed');
                    alert(errorMessage);
                }
            });
        }

        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    fullName: signupForm.querySelector('#signupName').value,
                    studentId: signupForm.querySelector('#signupStudentId').value,
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

    // Signup form event listener with robust error checking
    document.addEventListener('DOMContentLoaded', () => {
        const signupForm = document.getElementById('signupForm');
        if (!signupForm) {
            console.error('Signup form not found');
            return;
        }

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Robust element selection with null checks
            const getElementValue = (selector) => {
                const element = document.querySelector(selector);
                if (!element) {
                    console.warn(`Element not found: ${selector}`);
                    return '';
                }
                return element.value;
            };

            try {
                const formData = {
                    fullName: getElementValue('#signupName') || '',
                    email: getElementValue('#signupEmail') || '',
                    password: getElementValue('#signupPassword') || '',
                    confirmPassword: getElementValue('#signupConfirmPassword') || '',
                    studentId: getElementValue('#studentId') || ''
                };

                // Validate form data
                if (!formData.fullName || !formData.email || !formData.password) {
                    throw new Error('Please fill in all required fields');
                }

                // Attempt signup
                const result = await AuthModule.signUp(formData);
                
                // Handle successful signup
                if (result.success) {
                    // Reset form
                    signupForm.reset();
                }
            } catch (error) {
                console.error('Signup Error:', error);
                
                // Display error to user
                const errorMessageElement = document.getElementById('signupErrorMessage');
                if (errorMessageElement) {
                    errorMessageElement.textContent = error.message || 'Signup failed. Please try again.';
                    errorMessageElement.style.display = 'block';
                } else {
                    alert(error.message || 'Signup failed. Please try again.');
                }
            }
        });
    });
})();