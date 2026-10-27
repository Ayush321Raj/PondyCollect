/**
 * PondyCollect - Storefront Interactions & Common Utilities
 */

// Cart state (stored in memory/sessionStorage for client demo)
let cartCount = parseInt(sessionStorage.getItem('pondycollect_cart_count') || '0', 10);

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();

    // Mobile Navigation Toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('is-active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('is-active');
            }
        });
    }

    // Check session status to adjust Sign In button if logged in
    checkSessionStatus();
});

// Update cart counter display
function updateCartUI() {
    const badge = document.getElementById('cart-counter');
    if (badge) {
        badge.textContent = cartCount;
    }
}

// Add item to cart
function addToCart(productName, price) {
    cartCount += 1;
    sessionStorage.setItem('pondycollect_cart_count', cartCount.toString());
    updateCartUI();
    showToast(`🛍️ Added "${productName}" (₹${price.toLocaleString('en-IN')}) to cart!`);
}

// Product Details modal/toast
function showProductDetails(name, category, price, description) {
    showToast(`ℹ️ [${category}] ${name} — ₹${price.toLocaleString('en-IN')}. ${description}`);
}

// Filter product category
function filterCategory(categoryName) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const itemCat = card.getAttribute('data-category');
        if (!categoryName || categoryName === 'All' || itemCat === categoryName) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
    showToast(`Filtering items by: ${categoryName}`);
}

// Toast notification helper
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Check if user is logged in to show Portal link in header
async function checkSessionStatus() {
    try {
        const res = await fetch('/api/auth/current-user');
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
                const loginLink = document.getElementById('nav-login-link');
                const registerBtn = document.getElementById('nav-register-btn');
                
                if (loginLink) {
                    const dashboardUrl = data.user.role === 'admin' ? 'admin-dashboard.html' : 'employee-dashboard.html';
                    loginLink.textContent = `👤 ${data.user.name.split(' ')[0]} (${data.user.role.toUpperCase()})`;
                    loginLink.href = dashboardUrl;
                    loginLink.style.color = '#2DD4BF';
                }

                if (registerBtn) {
                    registerBtn.textContent = 'Dashboard';
                    registerBtn.href = data.user.role === 'admin' ? 'admin-dashboard.html' : 'employee-dashboard.html';
                }
            }
        }
    } catch (e) {
        // Not logged in or network error, leave default buttons
    }
}
