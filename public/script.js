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