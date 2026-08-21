let toastTimer = null;

function showToast(message, type = 'error') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');
  const toastContent = document.getElementById('toastContent');

  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;

  if (type === 'success') {
    if (toastIcon) toastIcon.className = 'ti ti-circle-check text-emerald-400 text-base';
    toast.className = 'toast-box text-white bg-emerald-800 border border-emerald-500/50 toast-active';
  } else {
    if (toastIcon) toastIcon.className = 'ti ti-alert-triangle text-red-400 text-base';
    toast.className = 'toast-box text-white bg-red-900 border border-red-500/50 toast-active';
  }

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    toast.classList.remove('toast-active');
  }, 4000);
}

// Global helper for Handlebars flash hooks
window.showAlertBox = function(msg) {
  showToast(msg, 'success');
};

window.showAlertErrorBox = function(msg) {
  showToast(msg, 'error');
};

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const showPasswordBtn = document.getElementById('showPasswordBtn');
const showHideIcon = document.getElementById('showHideIcon') || document.querySelector('.show-hide-icon');
const submitBtn = document.getElementById('submitBtn') || document.getElementById('loginBtn');

// Password Visibility Toggle
if (showPasswordBtn && passwordInput && showHideIcon) {
  showPasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    if (isPassword) {
      showHideIcon.className = 'ti ti-eye text-red-400 text-lg';
    } else {
      showHideIcon.className = 'ti ti-eye-off text-slate-400 text-lg';
    }
  });
}

// Client-side Validation
if (loginForm && emailInput && passwordInput) {
  loginForm.addEventListener('submit', (e) => {
    const emailValue = emailInput.value.trim();
    const passwordValue = passwordInput.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValue) {
      e.preventDefault();
      showToast('Please enter your email address', 'error');
      emailInput.focus();
      return;
    }

    if (!emailRegex.test(emailValue)) {
      e.preventDefault();
      showToast('Please enter a valid email address', 'error');
      emailInput.focus();
      return;
    }

    if (!passwordValue) {
      e.preventDefault();
      showToast('Please enter your password', 'error');
      passwordInput.focus();
      return;
    }

    if (passwordValue.length < 8) {
      e.preventDefault();
      showToast('Password must be at least 8 characters long', 'error');
      passwordInput.focus();
      return;
    }

    // Indicate loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span>Signing in...</span>
      `;
    }
  });
}
