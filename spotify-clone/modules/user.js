// Nhập httpRequest để gọi API
import httpRequest from '../utils/httpRequest.js';

// Khởi tạo user module (dropdown, logout, profile, check user)
export function initUser() {
    // User Menu Dropdown Functionality
    const userAvatar = document.getElementById("userAvatar");
    const userDropdown = document.getElementById("userDropdown");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const authButtons = document.querySelector(".auth-buttons");
    const userInfo = document.querySelector(".user-info");

    // Toggle dropdown when clicking avatar
    userAvatar?.addEventListener("click", function (e) {
        e.stopPropagation();
        if (userDropdown) {
            userDropdown.classList.toggle("show");
            console.log('Dropdown toggled:', userDropdown.classList.contains("show") ? 'Shown' : 'Hidden');
        } else {
            console.error('userDropdown not found');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
        if (
            userAvatar &&
            userDropdown &&
            !userAvatar.contains(e.target) &&
            !userDropdown.contains(e.target)
        ) {
            userDropdown.classList.remove("show");
        }
    });

    // Close dropdown when pressing Escape
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && userDropdown?.classList.contains("show")) {
            userDropdown.classList.remove("show");
            console.log('Dropdown closed: Escape key');
        }
    });

    // NEW: Handle profile button click
    profileBtn?.addEventListener("click", async function () {
        // Close dropdown first
        userDropdown?.classList.remove("show");
        console.log("Profile clicked");

        try {
            // Gọi API lấy thông tin user
            const response = await httpRequest.get("users/me");
            const user = response?.user;
            const stats = response?.stats;

            console.log('User profile data:', {user, stats});

            if (user) {
                displayUserProfile(user, stats);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    });

    // Handle logout button click
    logoutBtn?.addEventListener("click", function () {
        // Close dropdown first
        userDropdown?.classList.remove("show");
        console.log("Logout clicked");
        // Xóa token và user khỏi localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        // Reset UI: ẩn user info, hiện auth buttons
        if (userInfo && authButtons) {
            userInfo.classList.remove("show");
            authButtons.classList.add("show");
            console.log('UI toggled: user-info hidden, auth-buttons shown');
        } else {
            console.error('userInfo or authButtons not found');
        }
        // Optional: Reload hits để reset state nếu cần
        // window.dispatchEvent(new Event('hits:reload'));
    });

    // Other functionality
    // TODO: Implement other functionality here
    // Kiểm tra user hiện tại khi load trang
    async function checkUser() {
        try {
            // Gọi API lấy user
            const response = await httpRequest.get("users/me");
            console.log('Check user response:', response);
            const {user} = response;
            updateCurrentUser(user); // Cập nhật UI user
            if (userInfo && authButtons) {
                userInfo.classList.add("show"); // Hiện user info
                authButtons.classList.remove("show"); // Ẩn auth buttons
                console.log('UI toggled: user-info shown, auth-buttons hidden');
            }
        } catch (e) {
            console.error('No user logged in:', e);
            if (authButtons && userInfo) {
                authButtons.classList.add("show"); // Hiện auth buttons
                userInfo.classList.remove("show"); // Ẩn user info
            }
        }
    }

    // Cập nhật UI khi signup/login thành công
    window.addEventListener('user:updated', (e) => {
        updateCurrentUser(e.detail.user);
        if (userInfo && authButtons) {
            userInfo.classList.add("show");
            authButtons.classList.remove("show");
            console.log('UI toggled by user:updated: user-info shown, auth-buttons hidden');
        }
    });

    // Gọi checkUser khi khởi tạo
    checkUser();
}

// User Menu Dropdown Functionality
const updateCurrentUser = (user) => {
    const userName = document.querySelector("#user-name");
    const userAvatar = document.querySelector("#user-avatar");

    if (user.avatar_url) {
        userAvatar.src = user.avatar_url;
    }
    if (user.username) {
        userName.textContent = user.username;
    }
};

// Hiển thị user profile lên Hero Section
function displayUserProfile(user, stats) {
    const heroBackground = document.querySelector('.hero-background img');
    const heroSection = document.querySelector('.artist-hero');
    const userNameEl = document.querySelector('.artist-name');
    const verifiedBadge = document.querySelector('.verified-badge');
    const verifiedBadgeIcon = verifiedBadge?.querySelector('i');
    const verifiedBadgeText = verifiedBadge?.querySelector('span');
    const statsEl = document.querySelector('.monthly-listeners');
    const artistControls = document.querySelector('.artist-controls');
    const popularSection = document.querySelector('.popular-section');

    // Ẩn home sections
    const hitsSection = document.querySelector('.hits-section');
    const artistsSection = document.querySelector('.artists-section');
    if (hitsSection) hitsSection.style.display = 'none';
    if (artistsSection) artistsSection.style.display = 'none';

    // Ẩn artist controls và popular section
    if (artistControls) artistControls.style.display = 'none';
    if (popularSection) popularSection.style.display = 'none';

    // Hiển thị Hero Section
    if (heroSection) heroSection.style.display = 'block';

    // Set background image (avatar hoặc nền đen)
    if (heroBackground) {
        if (user.avatar_url && user.avatar_url !== 'null' && user.avatar_url !== '') {
            const avatarUrl = user.avatar_url.startsWith('http')
                ? user.avatar_url
                : `https://spotify.f8team.dev${user.avatar_url.startsWith('/') ? '' : '/'}${user.avatar_url}`;
            heroBackground.src = avatarUrl;
        } else {
            // Nền đen nếu không có avatar
            heroBackground.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3Crect width="1" height="1" fill="%23000000"/%3E%3C/svg%3E';
        }
    }

    // Set user name
    if (userNameEl) {
        userNameEl.textContent = user.display_name || user.username || user.email || 'User';
    }

    // Set verified badge to "HỒ SƠ"
    if (verifiedBadge) {
        verifiedBadge.style.display = 'flex';
        if (verifiedBadgeIcon) {
            verifiedBadgeIcon.style.display = 'none'; // Ẩn icon
        }
        if (verifiedBadgeText) {
            verifiedBadgeText.textContent = 'HỒ SƠ';
            verifiedBadgeText.style.color = '#ffffff';
            verifiedBadgeText.style.fontSize = '16px';
            verifiedBadgeText.style.fontWeight = '700';
            verifiedBadgeText.style.textTransform = 'uppercase';
            verifiedBadgeText.style.letterSpacing = '2px';
        }
    }

    // Set stats
    if (statsEl) {
        const playlists = stats?.playlists || 0;
        const following = stats?.following || 0;
        const plays = stats?.plays || 0;

        statsEl.textContent = `${playlists} Playlists • ${following} Following • ${plays} Plays`;
    }

    console.log('User profile displayed:', {user, stats});
}