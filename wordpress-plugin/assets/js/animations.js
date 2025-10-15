/**
 * Odyssea Lymphea Animations
 * Scroll animations using Intersection Observer
 * 
 * @package Odyssea_Lymphea
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe all fade-in elements
    document.addEventListener('DOMContentLoaded', function() {
        const fadeElements = document.querySelectorAll('.odyssea-fade-in');
        fadeElements.forEach(function(element) {
            observer.observe(element);
        });
    });

    // Smooth scroll for anchor links within odyssea content
    document.addEventListener('DOMContentLoaded', function() {
        const odysseaPages = document.querySelectorAll('.odyssea-page');
        odysseaPages.forEach(function(page) {
            const anchors = page.querySelectorAll('a[href^="#"]');
            anchors.forEach(function(anchor) {
                anchor.addEventListener('click', function(e) {
                    const href = this.getAttribute('href');
                    if (href !== '#' && href !== '') {
                        e.preventDefault();
                        const target = document.querySelector(href);
                        if (target) {
                            target.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }
                    }
                });
            });
        });
    });
})();
