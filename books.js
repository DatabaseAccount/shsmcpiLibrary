(function() {
    // Initialize Supabase client
    const supabase = window.supabase.createClient(
        window.SUPABASE_CONFIG.URL, 
        window.SUPABASE_CONFIG.ANON_KEY
    );

    // DOM Elements
    const booksTableBody = document.getElementById('booksTableBody');
    const bookErrorMessage = document.getElementById('bookErrorMessage');
    const addBookForm = document.getElementById('addBookForm');
    const editBookForm = document.getElementById('editBookForm');
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');

    // Authentication Check
    async function checkAuthentication() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'index.html';
        }
        return user;
    }

    // Fetch Books
    async function fetchBooks(user) {
        try {
            const { data: books, error } = await supabase
                .from('books')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return books || [];
        } catch (error) {
            console.error('Error fetching books:', error);
            displayErrorMessage('Failed to load books. Please try again.');
            return [];
        }
    }

    // Render Books Table
    function renderBooksTable(books) {
        // Clear existing table rows
        booksTableBody.innerHTML = '';

        // Check if no books
        if (books.length === 0) {
            booksTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No books found. Add your first book!</td>
                </tr>
            `;
            return;
        }

        // Populate table with books
        books.forEach(book => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>
                    <span class="badge bg-${getStatusColor(book.status)}">
                        ${book.status}
                    </span>
                </td>
                <td>${new Date(book.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-info me-1 edit-book" 
                            data-id="${book.id}"
                            data-title="${book.title}"
                            data-author="${book.author}"
                            data-status="${book.status}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-book" data-id="${book.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            booksTableBody.appendChild(row);
        });

        // Add event listeners for edit and delete buttons
        setupBookActionListeners();
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

    // Display Error Message
    function displayErrorMessage(message) {
        bookErrorMessage.textContent = message;
        bookErrorMessage.style.display = 'block';
        setTimeout(() => {
            bookErrorMessage.style.display = 'none';
        }, 5000);
    }

    // Add Book
    async function addBook(bookData) {
        try {
            const user = await checkAuthentication();
            
            const { data, error } = await supabase
                .from('books')
                .insert({
                    user_id: user.id,
                    title: bookData.title,
                    author: bookData.author,
                    status: bookData.status
                })
                .select();

            if (error) throw error;

            // Refresh books list
            const books = await fetchBooks(user);
            renderBooksTable(books);

            // Close modal and reset form
            const addBookModal = bootstrap.Modal.getInstance(document.getElementById('addBookModal'));
            addBookModal.hide();
            addBookForm.reset();
        } catch (error) {
            console.error('Error adding book:', error);
            displayErrorMessage('Failed to add book. Please try again.');
        }
    }

    // Edit Book
    async function editBook(bookData) {
        try {
            const user = await checkAuthentication();
            
            const { data, error } = await supabase
                .from('books')
                .update({
                    title: bookData.title,
                    author: bookData.author,
                    status: bookData.status
                })
                .eq('id', bookData.id)
                .eq('user_id', user.id)
                .select();

            if (error) throw error;

            // Refresh books list
            const books = await fetchBooks(user);
            renderBooksTable(books);

            // Close modal and reset form
            const editBookModal = bootstrap.Modal.getInstance(document.getElementById('editBookModal'));
            editBookModal.hide();
            editBookForm.reset();
        } catch (error) {
            console.error('Error editing book:', error);
            displayErrorMessage('Failed to update book. Please try again.');
        }
    }

    // Delete Book
    async function deleteBook(bookId) {
        try {
            const user = await checkAuthentication();
            
            const { data, error } = await supabase
                .from('books')
                .delete()
                .eq('id', bookId)
                .eq('user_id', user.id);

            if (error) throw error;

            // Refresh books list
            const books = await fetchBooks(user);
            renderBooksTable(books);
        } catch (error) {
            console.error('Error deleting book:', error);
            displayErrorMessage('Failed to delete book. Please try again.');
        }
    }

    // Setup Book Action Listeners (Edit and Delete)
    function setupBookActionListeners() {
        // Edit Book Button
        document.querySelectorAll('.edit-book').forEach(button => {
            button.addEventListener('click', (e) => {
                const bookId = e.currentTarget.dataset.id;
                const bookTitle = e.currentTarget.dataset.title;
                const bookAuthor = e.currentTarget.dataset.author;
                const bookStatus = e.currentTarget.dataset.status;

                // Populate edit modal
                document.getElementById('editBookId').value = bookId;
                document.getElementById('editBookTitle').value = bookTitle;
                document.getElementById('editBookAuthor').value = bookAuthor;
                document.getElementById('editBookStatus').value = bookStatus;

                // Show edit modal
                const editBookModal = new bootstrap.Modal(document.getElementById('editBookModal'));
                editBookModal.show();
            });
        });

        // Delete Book Button
        document.querySelectorAll('.delete-book').forEach(button => {
            button.addEventListener('click', (e) => {
                const bookId = e.currentTarget.dataset.id;
                
                // Confirm deletion
                if (confirm('Are you sure you want to delete this book?')) {
                    deleteBook(bookId);
                }
            });
        });
    }

    // Filter and Search Books
    function filterAndSearchBooks(books, status, searchTerm) {
        return books.filter(book => {
            const matchesStatus = !status || book.status === status;
            const matchesSearch = !searchTerm || 
                book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                book.author.toLowerCase().includes(searchTerm.toLowerCase());
            
            return matchesStatus && matchesSearch;
        });
    }

    // Initialize Page
    async function initializePage() {
        try {
            const user = await checkAuthentication();
            const books = await fetchBooks(user);
            renderBooksTable(books);

            // Add Book Form Submission
            addBookForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const bookData = {
                    title: document.getElementById('bookTitle').value,
                    author: document.getElementById('bookAuthor').value,
                    status: document.getElementById('bookStatus').value
                };
                addBook(bookData);
            });

            // Edit Book Form Submission
            editBookForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const bookData = {
                    id: document.getElementById('editBookId').value,
                    title: document.getElementById('editBookTitle').value,
                    author: document.getElementById('editBookAuthor').value,
                    status: document.getElementById('editBookStatus').value
                };
                editBook(bookData);
            });

            // Status Filter
            statusFilter.addEventListener('change', async () => {
                const status = statusFilter.value;
                const searchTerm = searchInput.value;
                const allBooks = await fetchBooks(user);
                const filteredBooks = filterAndSearchBooks(allBooks, status, searchTerm);
                renderBooksTable(filteredBooks);
            });

            // Search Input
            searchInput.addEventListener('input', async () => {
                const status = statusFilter.value;
                const searchTerm = searchInput.value;
                const allBooks = await fetchBooks(user);
                const filteredBooks = filterAndSearchBooks(allBooks, status, searchTerm);
                renderBooksTable(filteredBooks);
            });
        } catch (error) {
            console.error('Initialization error:', error);
            displayErrorMessage('Failed to load page. Please try again.');
        }
    }

    // Start initialization when DOM is ready
    document.addEventListener('DOMContentLoaded', initializePage);
})();
