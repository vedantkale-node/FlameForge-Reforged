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

const iname = document.getElementById('name');
const email = document.getElementById('email');
const errorUrl = document.getElementById('errorUrl');
const message = document.getElementById('message');
const reportForm = document.getElementById('reportForm');

if (reportForm) {
    reportForm.addEventListener('submit', (e) => {
        let valid = true;
        if (!iname || iname.value.trim() === '') {
            showAlertErrorBox('Please enter your name');
            valid = false;
        }
        else if (!email || email.value.trim() === '' || !email.value.includes('@')) {
            showAlertErrorBox('Please provide a valid email address');
            valid = false;
        }
        else if (!errorUrl || errorUrl.value.trim() === '') {
            showAlertErrorBox('Please provide the target URL / endpoint');
            valid = false;
        }
        else if (!message || message.value.trim() === '') {
            showAlertErrorBox('Please write an issue description');
            valid = false;
        }

        if (!valid) {
            e.preventDefault();
        }
    });
}
