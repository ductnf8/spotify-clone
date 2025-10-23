// File: modules/followedArtists.js
import httpRequest from '../utils/httpRequest.js';

let followedArtists = [];
let currentArtistId = null;

export function initFollowedArtists() {
    loadFollowedArtists();

    window.addEventListener('followed-artists:reload', loadFollowedArtists);
    window.addEventListener('artist:select', (e) => {
        currentArtistId = e.detail.artist.id;
        updateActiveState();
    });
}

async function loadFollowedArtists() {
    const container = document.querySelector('.followed-artists-list');
    if (!container) return;

    container.innerHTML = '<div class="loading">Đang tải...</div>';

    try {
        const {artists = []} = await httpRequest.get('me/following?limit=20&offset=0');
        followedArtists = artists;

        if (artists.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); padding: 0 var(--spacing-lg); font-size: 14px; margin: 8px 0;">Chưa follow nghệ sĩ nào.</p>`;
            return;
        }

        renderArtists(container);

    } catch (error) {
        console.error('[FollowedArtists] Load failed:', error);
        const msg = error.status === 401 ? 'Vui lòng đăng nhập.' : 'Không thể tải danh sách.';
        container.innerHTML = `
            <div style="padding: 0 var(--spacing-lg); font-size: 14px; color: var(--text-muted);">
                <p>${msg}</p>
                ${error.status !== 401 ? '<button class="retry-btn" style="margin-top: 8px; font-size: 13px;">Thử lại</button>' : ''}
            </div>
        `;
        container.querySelector('.retry-btn')?.addEventListener('click', loadFollowedArtists);
    }
}

function renderArtists(container) {
    const html = followedArtists.map(artist => {
        const imgUrl = artist.image_url && !['null', ''].includes(artist.image_url)
            ? (artist.image_url.startsWith('http') ? artist.image_url : `https://spotify.f8team.dev${artist.image_url}`)
            : 'placeholder.svg?height=40&width=40';

        const verified = artist.is_verified
            ? '<i class="fas fa-check-circle" style="color: #1da1f2; margin-left: 4px;"></i>'
            : '';

        return `
            <div class="followed-artist-item" data-artist-id="${artist.id}">
                <img src="${imgUrl}" alt="${artist.name}" class="artist-avatar" 
                     onerror="this.src='placeholder.svg?height=40&width=40'" />
                <div class="artist-info">
                    <div class="artist-name" title="${artist.name}">${artist.name}</div>
                    <div class="verified-badge">Artist${verified}</div>
                </div>
                <button class="playlist-menu-btn artist-menu-btn" data-artist-id="${artist.id}">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Click item → mở trang chi tiết
    container.querySelectorAll('.followed-artist-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.artist-menu-btn')) return;

            const artistId = item.dataset.artistId;
            const artist = followedArtists.find(a => a.id === artistId);
            if (!artist) return;

            container.querySelectorAll('.followed-artist-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentArtistId = artistId;

            hideHomeSections();
            window.dispatchEvent(new CustomEvent('artist:select', {detail: {artist}}));
        });
    });

    // Menu 3 chấm
    container.querySelectorAll('.artist-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const artistId = btn.dataset.artistId;
            const artist = followedArtists.find(a => a.id === artistId);
            showArtistMenu(e, artist, btn);
        });
    });

    updateActiveState();
}

// MENU UNFOLLOW – CĂN DƯỚI NÚT 3 CHẤM, KÉO DÀI VỀ BÊN PHẢI
function showArtistMenu(event, artist, triggerBtn) {
    event.stopPropagation();

    // Nếu menu đang mở cho cùng nút → đóng lại
    const existingMenu = document.querySelector('.artist-menu');
    if (existingMenu) {
        // Kiểm tra xem menu có cùng vị trí nút hiện tại không
        const isSameButton = existingMenu.dataset.triggerId === triggerBtn.dataset.artistId;
        if (isSameButton) {
            existingMenu.remove();
            return;
        } else {
            existingMenu.remove(); // Xóa menu cũ khác
        }
    }

    // Tạo menu mới
    const menu = document.createElement('div');
    menu.className = 'artist-menu';
    menu.dataset.triggerId = triggerBtn.dataset.artistId; // đánh dấu menu của nút nào
    menu.innerHTML = `
        <div class="menu-item unfollow-artist" data-artist-id="${artist.id}">
            <span class="menu-icon"><i class="fas fa-user-minus"></i></span>
            <span class="menu-text">Unfollow</span>
        </div>
    `;

    // Tính toán vị trí hiển thị (sang bên phải giống playlist)
    const btnRect = triggerBtn.getBoundingClientRect();
    const menuWidth = 160;
    const top = btnRect.bottom + 5;
    const left = btnRect.right - menuWidth;

    menu.style.position = 'fixed';
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.zIndex = '1000';
    menu.style.minWidth = menuWidth + 'px';

    document.body.appendChild(menu);

    // Click unfollow
    menu.querySelector('.unfollow-artist').addEventListener('click', async () => {
        try {
            await httpRequest.delete(`artists/${artist.id}/follow`);
            menu.remove();
            const msg = document.createElement('div');
            msg.className = 'success-message';
            msg.innerHTML = `<i class="fas fa-check-circle"></i><span>Unfollowed ${artist.name}!</span>`;
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
            window.dispatchEvent(new Event('followed-artists:reload'));
        } catch (error) {
            console.error('Unfollow failed:', error);
            const errMsg = document.createElement('div');
            errMsg.className = 'error-message';
            errMsg.innerHTML = `<i class="fas fa-info-circle"></i><span>Unfollow failed!</span>`;
            document.body.appendChild(errMsg);
            setTimeout(() => errMsg.remove(), 3000);
        }
    });

    // Đóng menu khi click ra ngoài
    const close = (e) => {
        if (!menu.contains(e.target) && !triggerBtn.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', close);
        }
    };
    setTimeout(() => document.addEventListener('click', close), 100);
}


function updateActiveState() {
    if (!currentArtistId) return;
    const activeItem = document.querySelector(`.followed-artist-item[data-artist-id="${currentArtistId}"]`);
    document.querySelectorAll('.followed-artist-item').forEach(i => i.classList.remove('active'));
    if (activeItem) activeItem.classList.add('active');
}

function hideHomeSections() {
    ['.hits-section', '.artists-section', '.albums-section'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.style.display = 'none';
    });
}