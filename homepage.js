(function() {
    // Wait for all scripts to load
    if (typeof window.SUPABASE_CONFIG === 'undefined') {
        // If config is not immediately available, wait and retry
        window.addEventListener('DOMContentLoaded', function() {
            // Check if config is now available
            if (typeof window.SUPABASE_CONFIG !== 'undefined') {
                initializeHomepage();
            } else {
                // Fallback if config is still not available
                console.error('Supabase configuration could not be loaded');
                alert('Authentication service is not configured. Please refresh the page or contact support.');
            }
        });
        return;
    }

    // Main initialization function
    function initializeHomepage() {
        // Comprehensive debugging for configuration
        console.log('Window object:', window);
        console.log('Supabase configuration:', window.SUPABASE_CONFIG);
        
        // Extended safety check for Supabase configuration
        if (typeof window.SUPABASE_CONFIG === 'undefined') {
            console.error('CRITICAL: Supabase configuration is completely missing');
            alert('Configuration error: Unable to load authentication settings.');
            return;
        }

        // Detailed configuration validation
        const config = window.SUPABASE_CONFIG;
        const configErrors = [];

        if (!config.URL) configErrors.push('Missing Supabase URL');
        if (!config.ANON_KEY) configErrors.push('Missing Supabase Anon Key');

        if (configErrors.length > 0) {
            console.error('Supabase Configuration Errors:', configErrors);
            alert('Configuration is incomplete: ' + configErrors.join(', '));
            return;
        }

        // Use the global configuration from config.js
        const supabase = window.supabase.createClient(
            config.URL, 
            config.ANON_KEY
        );

        // DOM Elements with safe retrieval
        const totalBooksCount = document.getElementById('totalBooksCount');
        const currentlyReadingCount = document.getElementById('currentlyReadingCount');
        const completedBooksCount = document.getElementById('completedBooksCount');
        const recentBooksTableBody = document.getElementById('recentBooksTableBody');
        const addBookBtn = document.getElementById('addBookBtn');
        const logoutLink = document.getElementById('logoutLink');

        // Safe text content setter
        function safeSetTextContent(element, content) {
            if (element) {
                element.textContent = content;
            } else {
                console.warn(`Element not found when trying to set text content: ${content}`);
            }
        }

        // Authentication Check
        async function checkAuthentication() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = 'index.html';
            }
            return user;
        }

        // Debugging function for Supabase table access
        async function debugSupabaseAccess(user) {
            try {
                console.log('Debugging Supabase Access');
                console.log('Current User:', user);

                // Check user authentication
                const { data: { session } } = await supabase.auth.getSession();
                console.log('Current Session:', session);

                // Attempt to fetch books with detailed logging
                const { data, error, status, statusText } = await supabase
                    .from('books')
                    .select('*')
                    .eq('user_id', user.id);

                console.log('Supabase Query Details:', {
                    data: data,
                    error: error,
                    status: status,
                    statusText: statusText
                });

                // Additional checks
                if (error) {
                    console.error('Detailed Supabase Error:', {
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        code: error.code
                    });
                }

                return { data, error };
            } catch (catchError) {
                console.error('Comprehensive Access Error:', catchError);
                return { error: catchError };
            }
        }

        // Fetch Book Statistics
        async function fetchBookStatistics(user) {
            // Add debugging call before main fetch
            await debugSupabaseAccess(user);

            try {
                console.log('Fetching books for user:', user.id);
                
                // Detailed logging for debugging
                const { data: books, error } = await supabase
                    .from('books')
                    .select('*')
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Detailed Supabase Error:', {
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        code: error.code
                    });
                    
                    // Show user-friendly error message
                    const errorMessageElement = document.getElementById('bookErrorMessage');
                    if (errorMessageElement) {
                        errorMessageElement.textContent = 'Unable to load your books. Please try again later.';
                        errorMessageElement.style.display = 'block';
                    }
                    return;
                }

                // If no books found, update UI accordingly
                if (!books || books.length === 0) {
                    console.log('No books found for user');
                    safeSetTextContent(totalBooksCount, '0');
                    safeSetTextContent(currentlyReadingCount, '0');
                    safeSetTextContent(completedBooksCount, '0');
                    
                    if (recentBooksTableBody) {
                        recentBooksTableBody.innerHTML = '<tr><td colspan="5">No books added yet</td></tr>';
                    } else {
                        console.warn('recentBooksTableBody element not found');
                    }
                    return;
                }

                // Existing book statistics logic
                safeSetTextContent(totalBooksCount, books.length.toString());
                safeSetTextContent(currentlyReadingCount, books.filter(book => book.status === 'reading').length.toString());
                safeSetTextContent(completedBooksCount, books.filter(book => book.status === 'completed').length.toString());

                // Populate Recent Books
                if (recentBooksTableBody) {
                    const sortedBooks = books.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
                    recentBooksTableBody.innerHTML = sortedBooks.map(book => `
                        <tr>
                            <td>${book.title}</td>
                            <td>${book.author}</td>
                            <td><span class="badge bg-${getStatusColor(book.status)}">${book.status}</span></td>
                            <td>${new Date(book.created_at).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="viewBookDetails('${book.id}')">View</button>
                            </td>
                        </tr>
                    `).join('');
                } else {
                    console.warn('recentBooksTableBody element not found');
                }
            } catch (catchError) {
                console.error('Unexpected error in fetchBookStatistics:', catchError);
                
                // Show user-friendly error message
                const errorMessageElement = document.getElementById('bookErrorMessage');
                if (errorMessageElement) {
                    errorMessageElement.textContent = 'An unexpected error occurred. Please try again.';
                    errorMessageElement.style.display = 'block';
                }
            }
        }

        // Helper function to map status to Bootstrap color
        function getStatusColor(status) {
            switch(status) {
                case 'reading': return 'primary';
                case 'completed': return 'success';
                case 'to-read': return 'warning';
                default: return 'secondary';
            }
        }

        // Event Listeners
        if (addBookBtn) {
            addBookBtn.addEventListener('click', () => {
                window.location.href = 'books.html';
            });
        } else {
            console.warn('addBookBtn element not found');
        }

        // Remove existing logout event listener
        // Logout functionality will be handled by global logout function in script.js

        // Initialize Page
        async function initializePage() {
            try {
                const user = await checkAuthentication();
                await fetchBookStatistics(user);
            } catch (error) {
                console.error('Initialization error:', error);
                window.location.href = 'index.html';
            }
        }

        // Start initialization
        initializePage();
    }

    // If config is already available, initialize immediately
    if (typeof window.SUPABASE_CONFIG !== 'undefined') {
        initializeHomepage();
    }
})();
