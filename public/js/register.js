/**
 * PondyCollect - Registration Page Script
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

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('register-form');
    const errorAlert = document.getElementById('register-error-alert');
    const successAlert = document.getElementById('register-success-alert');
    const submitBtn = document.getElementById('register-submit-btn');
    const btnText = document.getElementById('register-btn-text');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Clear previous alerts
        errorAlert.style.display = 'none';
        errorAlert.textContent = '';
        successAlert.style.display = 'none';
        successAlert.textContent = '';

        // Form field values
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const role = document.getElementById('role').value;
        const department = document.getElementById('department').value.trim();
        const designation = document.getElementById('designation').value.trim();
        const phone = document.getElementById('phone').value.trim();

        // Client-side validations
        if (!name || !email || !password || !confirmPassword || !role || !department || !designation) {
            showError('Please fill in all required fields.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('Please provide a valid email address.');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters in length.');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match. Please verify and try again.');
            return;
        }

        // Set Loading State
        setLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    confirmPassword,
                    role,
                    department,
                    designation,
                    phone
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showError(data.message || 'Registration failed. Please check your inputs.');
                setLoading(false);
                return;
            }

            // Success state
            successAlert.textContent = data.message || 'Registration successful! Redirecting to login...';
            successAlert.style.display = 'block';
            form.reset();

            setTimeout(() => {
                window.location.href = data.redirectUrl || '/login.html';
            }, 1600);

        } catch (err) {
            console.error('Registration network error:', err);
            showError('Unable to connect to server. Please ensure the backend and MySQL database are active.');
            setLoading(false);
        }
    });

    function showError(msg) {
        errorAlert.textContent = msg;
        errorAlert.style.display = 'block';
        window.scrollTo({ top: 120, behavior: 'smooth' });
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.textContent = 'Creating Account...';
            submitBtn.style.opacity = '0.75';
        } else {
            submitBtn.disabled = false;
            btnText.textContent = 'Create Account';
            submitBtn.style.opacity = '1';
        }
    }
});
