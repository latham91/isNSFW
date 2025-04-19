// Supabase client instance (initialized below)
let supabase = null;

// Function to initialize Supabase client
async function initializeSupabase() {
  try {
    const response = await fetch('/api/supabase-config');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const config = await response.json();

    if (!config.url || !config.key) {
        console.error('Supabase URL or Key missing from config endpoint.');
        return;
    }

    // Initialize the client
    supabase = supabase.createClient(config.url, config.key);
    console.log('Supabase client initialized (client-side).');

    // --- Add Auth State Change Listener ---
    // This function runs when the script loads and whenever the auth state changes (login/logout)
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth event:', event, 'Session:', session);
        if (event === 'SIGNED_IN') {
          // User is signed in - you can update the UI here
          // e.g., hide login button, show user info/logout button
          updateUIForUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          // User is signed out - update UI accordingly
          updateUIForGuest();
        }
    });

    // Check initial session state
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        console.log('Initial session found:', session);
        updateUIForUser(session.user);
    } else {
        console.log('No initial session found.');
        updateUIForGuest();
    }

  } catch (error) {
    console.error('Error initializing Supabase client:', error);
  }
}

// --- UI Update Functions --- // Modified
function updateUIForUser(user) {
    console.log('Updating UI for user:', user.email);
    const loginButton = document.querySelector('.login-btn');
    const logoutButton = document.getElementById('logout-btn');

    if (loginButton) loginButton.style.display = 'none';
    if (logoutButton) {
        logoutButton.style.display = 'block'; // Or 'inline-flex' etc.
        // Add event listener only if it doesn't exist already to avoid duplicates
        if (!logoutButton.dataset.listenerAttached) {
            logoutButton.addEventListener('click', async (e) => {
                e.preventDefault(); // Prevent default link behavior
                console.log('Logout clicked');
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Error logging out:', error);
                } else {
                    console.log('User logged out successfully.');
                    // UI update will be handled by onAuthStateChange
                }
            });
            logoutButton.dataset.listenerAttached = 'true'; // Mark listener as attached
        }
    }
    // Add code here to show user info if desired
}

function updateUIForGuest() {
    console.log('Updating UI for guest.');
    const loginButton = document.querySelector('.login-btn');
    const logoutButton = document.getElementById('logout-btn');

    if (loginButton) loginButton.style.display = 'block'; // Or 'inline-flex'
    if (logoutButton) logoutButton.style.display = 'none';
    // No need to remove listener, just hide the button

    // Add code here to remove user info if it exists
}

// Call the initialization function when the script loads
initializeSupabase();

// Add functionality for toggling dark mode/light mode
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const htmlElement = document.documentElement;

// Check and apply the saved theme from localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  htmlElement.setAttribute('data-theme', savedTheme);
  themeIcon.className = savedTheme === 'dark' ? 'fas fa-moon theme-toggle-icon' : 'fas fa-sun theme-toggle-icon';
}

// Add event listener to toggle theme
themeToggle.addEventListener('click', () => {
  const currentTheme = htmlElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';

  // Update the theme attribute and icon
  htmlElement.setAttribute('data-theme', newTheme);
  themeIcon.className = newTheme === 'dark' ? 'fas fa-moon theme-toggle-icon' : 'fas fa-sun theme-toggle-icon';

  // Save the new theme to localStorage
  localStorage.setItem('theme', newTheme);
});