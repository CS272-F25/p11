// Component loader for CoHabit website
(function() {
  'use strict';

  // Load component from file and insert into target element
  async function loadComponent(componentName, targetSelector) {
    try {
      const response = await fetch(`/components/${componentName}.html`);
      if (!response.ok) throw new Error(`Failed to load ${componentName}`);
      const html = await response.text();
      const target = document.querySelector(targetSelector);
      if (target) {
        target.innerHTML = html;
        return true;
      }
    } catch (error) {
      console.error(`Error loading component ${componentName}:`, error);
      return false;
    }
  }

  // Set active navigation state based on current page
  function setActiveNav(pageName) {
    // Wait a bit for navbar to load
    setTimeout(() => {
      const links = document.querySelectorAll('.navbar [data-page]');
      links.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if (linkPage === pageName) {
          link.classList.add('active');
        }
      });
    }, 50);
  }

  // Initialize components on page load
  document.addEventListener('DOMContentLoaded', async () => {
    // Load navbar if placeholder exists
    const navPlaceholder = document.querySelector('[data-component="navbar"]');
    if (navPlaceholder) {
      await loadComponent('navbar', '[data-component="navbar"]');
      const pageName = navPlaceholder.getAttribute('data-page');
      if (pageName) setActiveNav(pageName);
    }

    // Load footer if placeholder exists
    const footerPlaceholder = document.querySelector('[data-component="footer"]');
    if (footerPlaceholder) {
      await loadComponent('footer', '[data-component="footer"]');
    }
  });
})();
