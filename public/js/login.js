/**
 * PondyCollect - Login Page Script
 */

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

// Quick autofill helper for lab evaluations
function fillCredentials(email, password) {
    document.getElementById('email').value = email;
    document.getElementById('password').value = password;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const errorAlert = document.getElementById('login-error-alert');
    const successAlert = document.getElementById('login-success-alert');
    const submitBtn = document.getElementById('login-submit-btn');
    const btnText = document.getElementById('login-btn-text');

    // Handle unauthorized redirect query param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'unauthorized') {
        errorAlert.textContent = '⚠️ Protected area: Please sign in with an authorized account to access the dashboard.';
        errorAlert.style.display = 'block';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset alerts
        errorAlert.style.display = 'none';
        errorAlert.textContent = '';
        successAlert.style.display = 'none';
        successAlert.textContent = '';

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showError('Please enter both email address and password.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                showError(data.message || 'Invalid credentials. Please verify your email and password.');
                setLoading(false);
                return;
            }

            // Success feedback and role-based redirect
            successAlert.textContent = `${data.message} Redirecting to your dashboard...`;
            successAlert.style.display = 'block';

            setTimeout(() => {
                window.location.href = data.redirectUrl || (data.user.role === 'admin' ? '/admin-dashboard.html' : '/employee-dashboard.html');
            }, 800);

        } catch (err) {
            console.error('Login network error:', err);
            showError('Unable to connect to the authentication server. Please check your network and MySQL status.');
            setLoading(false);
        }
    });

    function showError(msg) {
        errorAlert.textContent = msg;
        errorAlert.style.display = 'block';
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.textContent = 'Authenticating...';
            submitBtn.style.opacity = '0.75';
        } else {
            submitBtn.disabled = false;
            btnText.textContent = 'Sign In';
            submitBtn.style.opacity = '1';
        }
    }
});
