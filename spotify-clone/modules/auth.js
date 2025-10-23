// Nhập httpRequest để gọi API
import httpRequest from '../utils/httpRequest.js';

// Khởi tạo auth module (modal, signup, login)
export function initAuth() {
    // === DOM Elements ===
    const signupBtn = document.querySelector(".signup-btn");
    const loginBtn = document.querySelector(".login-btn");
    const authModal = document.getElementById("authModal");
    const modalClose = document.getElementById("modalClose");
    const signupForm = document.getElementById("signupForm");
    const loginForm = document.getElementById("loginForm");
    const showLoginBtn = document.getElementById("showLogin");
    const showSignupBtn = document.getElementById("showSignup");
    const authButtons = document.querySelector(".auth-buttons");
    const userInfo = document.querySelector(".user-info");

    // === Hiển thị form Sign Up ===
    function showSignupForm() {
        signupForm.style.display = "block";
        loginForm.style.display = "none";
    }

    // === Hiển thị form Login ===
    function showLoginForm() {
        signupForm.style.display = "none";
        loginForm.style.display = "block";
    }

    // === Dọn sạch form khi đóng modal ===
    function resetAuthForms() {
        const inputs = authModal.querySelectorAll('.form-input');
        const errorMessages = authModal.querySelectorAll('.error-message');
        const formGroups = authModal.querySelectorAll('.form-group');

        inputs.forEach(input => input.value = '');
        errorMessages.forEach(msg => msg.style.display = 'none');
        formGroups.forEach(g => g.classList.remove('invalid'));
    }

    // === Mở modal ===
    function openModal() {
        authModal.classList.add("show");
        document.body.style.overflow = "hidden";
    }

    // === Đóng modal ===
    function closeModal() {
        authModal.classList.remove("show");
        document.body.style.overflow = "auto";
        resetAuthForms(); // ✅ Dọn dẹp form khi đóng modal
    }

    // === Sự kiện mở modal ===
    signupBtn?.addEventListener("click", () => {
        showSignupForm();
        openModal();
    });

    loginBtn?.addEventListener("click", () => {
        showLoginForm();
        openModal();
    });

    // === Sự kiện đóng modal ===
    modalClose?.addEventListener("click", closeModal);
    authModal?.addEventListener("click", (e) => {
        if (e.target === authModal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && authModal.classList.contains("show")) {
            closeModal();
        }
    });

    // === Chuyển đổi giữa 2 form ===
    showLoginBtn?.addEventListener("click", showLoginForm);
    showSignupBtn?.addEventListener("click", showSignupForm);

    // ============================================================
    // 🧾 Đăng ký (Sign Up)
    // ============================================================
    signupForm?.querySelector('.auth-form-content')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.querySelector('#signupEmail');
        const passwordInput = document.querySelector('#signupPassword');
        const email = emailInput?.value.trim();
        const password = passwordInput?.value.trim();

        // Xóa lỗi cũ
        emailInput.closest('.form-group').classList.remove('invalid');
        passwordInput.closest('.form-group').classList.remove('invalid');
        signupForm.querySelectorAll('.error-message').forEach(msg => msg.style.display = 'none');

        if (!email || !password) return;

        const username = email.split('@')[0] || `user_${Date.now()}`;
        const credentials = {username, email, password};

        try {
            const {user, access_token} = await httpRequest.post('auth/register', credentials);
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user', JSON.stringify(user));

            if (authButtons && userInfo) {
                authButtons.classList.remove("show");
                userInfo.classList.add("show");
            }

            window.dispatchEvent(new CustomEvent('user:updated', {detail: {user}}));
            closeModal();
            window.location.reload();

        } catch (error) {
            console.error('Signup failed:', error);
            const errMsg = error?.response?.error?.message || 'Signup failed';
            // ✅ Hiển thị lỗi dưới ô password (đúng yêu cầu)
            const pwGroup = passwordInput.closest('.form-group');
            const pwError = pwGroup.querySelector('.error-message');
            pwGroup.classList.add('invalid');
            if (pwError) {
                pwError.querySelector('span').textContent = errMsg;
                pwError.style.display = 'flex';
            }
        }
    });

    // ============================================================
    // 🔐 Đăng nhập (Login)
    // ============================================================
    loginForm?.querySelector('.auth-form-content')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.querySelector('#loginEmail');
        const passwordInput = document.querySelector('#loginPassword');
        const email = emailInput?.value.trim();
        const password = passwordInput?.value.trim();

        // Xóa lỗi cũ
        emailInput.closest('.form-group').classList.remove('invalid');
        passwordInput.closest('.form-group').classList.remove('invalid');
        loginForm.querySelectorAll('.error-message').forEach(msg => msg.style.display = 'none');

        if (!email || !password) return;

        try {
            const {user, access_token} = await httpRequest.post('auth/login', {email, password});
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user', JSON.stringify(user));

            if (authButtons && userInfo) {
                authButtons.classList.remove("show");
                userInfo.classList.add("show");
            }

            window.dispatchEvent(new CustomEvent('user:updated', {detail: {user}}));
            closeModal();
            window.location.reload();

        } catch (error) {
            console.error('Login failed:', error);
            const errMsg = error?.response?.error?.message || 'Invalid email or password';
            // ✅ Hiển thị lỗi dưới ô password
            const pwGroup = passwordInput.closest('.form-group');
            const pwError = pwGroup.querySelector('.error-message');
            pwGroup.classList.add('invalid');
            if (pwError) {
                pwError.querySelector('span').textContent = errMsg;
                pwError.style.display = 'flex';
            }
        }
    });
}
