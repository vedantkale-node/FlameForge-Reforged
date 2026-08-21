let alertBoxTimer = null;
let alertBoxErrorTimer = null;

function showAlertBox(msg) {
    const alertBox = document.getElementById('alertBox');
    if (!alertBox) return;
    alertBox.innerHTML = `<i class="ti ti-circle-check text-emerald-300 text-lg mr-2"></i><span>${msg}</span>`;
    alertBox.classList.add('toast-active');
    if (alertBoxTimer) clearTimeout(alertBoxTimer);
    alertBoxTimer = setTimeout(() => {
        alertBox.classList.remove('toast-active');
    }, 3500);
}

function showAlertErrorBox(msg) {
    const alertBox = document.getElementById('alertBoxError');
    if (!alertBox) return;
    alertBox.innerHTML = `<i class="ti ti-alert-triangle text-red-400 text-lg mr-2"></i><span>${msg}</span>`;
    alertBox.classList.add('toast-active');
    if (alertBoxErrorTimer) clearTimeout(alertBoxErrorTimer);
    alertBoxErrorTimer = setTimeout(() => {
        alertBox.classList.remove('toast-active');
    }, 4000);
}

const form = document.getElementById('registerForm');
const firstName = document.getElementById('firstName');
const lastName = document.getElementById('lastName');
const email = document.getElementById('email');
const username = document.getElementById('username');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');

if (form) {
    form.addEventListener('submit', (e) => {
        let valid = true;
        if (!firstName || firstName.value.trim() === '') {
            showAlertErrorBox('First name is required');
            valid = false;
        }
        else if (!lastName || lastName.value.trim() === '') {
            showAlertErrorBox('Last name is required');
            valid = false;
        }
        else if (!email || email.value.trim() === '' || !email.value.includes('@')) {
            showAlertErrorBox('Please enter a valid email address');
            valid = false;
        }
        else if (!username || username.value.trim() === '') {
            showAlertErrorBox('Username is required');
            valid = false;
        }
        else if (!password || password.value.length < 8) {
            showAlertErrorBox('Password must be at least 8 characters long');
            valid = false;
        }
        else if (!confirmPassword || confirmPassword.value !== password.value) {
            showAlertErrorBox('Passwords do not match');
            valid = false;
        }

        if (!valid) {
            e.preventDefault();
        }
    });
}

const showPasswordBtn = document.getElementById('showPasswordBtn');
const showHideIcon = document.getElementById('showHideIcon');

if (showPasswordBtn && showHideIcon && password) {
    showPasswordBtn.addEventListener('click', () => {
        if (password.type === 'password') {
            password.type = 'text';
            if (confirmPassword) confirmPassword.type = 'text';
            showHideIcon.className = 'ti ti-eye text-base';
        } else {
            password.type = 'password';
            if (confirmPassword) confirmPassword.type = 'password';
            showHideIcon.className = 'ti ti-eye-off text-base';
        }
    });
}
