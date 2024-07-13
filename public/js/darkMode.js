// Tailwind configuration
if (typeof tailwind !== 'undefined') {
    tailwind.config = {
        darkMode: 'class',
        // Add any other Tailwind configurations here
    };
}

// Check for dark mode preference at the operating system level
if (localStorage.getItem('darkMode') === 'true' ||
    (!('darkMode' in localStorage) &&
     window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

// Watch for changes in the color scheme
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (e.matches) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
});
