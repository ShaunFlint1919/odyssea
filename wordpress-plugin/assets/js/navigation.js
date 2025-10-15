/**
 * Odyssea Lymphea Navigation
 * 
 * @package Odyssea_Lymphea
 * @version 1.0.0
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        // Mobile menu toggle (if theme supports it)
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuToggle && mobileMenu) {
            mobileMenuToggle.addEventListener('click', function() {
                mobileMenu.classList.toggle('active');
                
                const isExpanded = mobileMenu.classList.contains('active');
                mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
            });

            // Close mobile menu when clicking on a link
            const mobileMenuLinks = mobileMenu.querySelectorAll('a');
            mobileMenuLinks.forEach(function(link) {
                link.addEventListener('click', function() {
                    mobileMenu.classList.remove('active');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                });
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', function(event) {
                if (!mobileMenu.contains(event.target) && !mobileMenuToggle.contains(event.target)) {
                    mobileMenu.classList.remove('active');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    });
})();
