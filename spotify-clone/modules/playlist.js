import httpRequest from '../utils/httpRequest.js';

let editingPlaylistId = null;

function openModal(mode = 'create', playlist = null) {
    const modal = document.getElementById('createPlaylistModal');
    const modalTitle = modal?.querySelector('.modal-title');
    const playlistNameInput = document.getElementById('playlist-name');
    const playlistDescInput = document.getElementById('playlist-desc');
    const imagePreview = modal?.querySelector('.image-preview');

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        console.log('Modal opened', {mode, playlist});

        if (mode === 'edit' && playlist) {
            modalTitle.textContent = 'Chỉnh sửa Playlist';
            playlistNameInput.value = playlist.name || '';
            playlistDescInput.value = playlist.description || '';
            editingPlaylistId = playlist.id;
            if (playlist.image_url && imagePreview) {
                imagePreview.classList.remove('placeholder');
                imagePreview.innerHTML = `<img src="${playlist.image_url}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-sm);">`;
            } else if (imagePreview) {
                imagePreview.classList.add('placeholder');
                imagePreview.innerHTML = '<i class="fa-solid fa-music"></i>';
            }
        } else {
            modalTitle.textContent = 'Tạo Playlist Mới';
            editingPlaylistId = null;
            resetForm();
        }
    }
}

function closeModal() {
    const modal = document.getElementById('createPlaylistModal');
    const modalTitle = modal?.querySelector('.modal-title');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        resetForm();
        editingPlaylistId = null;
        console.log('Modal closed');
    }
}

function resetForm() {
    const playlistForm = document.querySelector('.create-playlist-form');
    const imagePreview = document.querySelector('.image-preview');
    if (playlistForm) playlistForm.reset();
    if (imagePreview) {
        imagePreview.classList.add('placeholder');
        imagePreview.innerHTML = '<i class="fa-solid fa-music"></i>';
    }
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) errorMessage.remove();
    const modalTitle = document.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = 'Tạo Playlist Mới';
}

// NEW: Hàm hiển thị playlist lên Hero Section
async function displayPlaylistHero(playlist) {
    const heroBackground = document.querySelector('.hero-background img');
    const heroSection = document.querySelector('.artist-hero');
    const playlistNameEl = document.querySelector('.artist-name');
    const verifiedBadge = document.querySelector('.verified-badge');
    const verifiedBadgeIcon = verifiedBadge?.querySelector('i');
    const verifiedBadgeText = verifiedBadge?.querySelector('span');
    const monthlyListenersEl = document.querySelector('.monthly-listeners');

    // Hiển thị Hero Section
    if (heroSection) heroSection.style.display = 'block';

    // Set background image (nếu có, không thì để đen)
    if (heroBackground) {
        if (playlist.image_url && playlist.image_url !== 'null' && playlist.image_url !== '') {
            const imageUrl = playlist.image_url.startsWith('data:image') || playlist.image_url.startsWith('http')
                ? playlist.image_url
                : `https://spotify.f8team.dev${playlist.image_url.startsWith('/') ? '' : '/'}${playlist.image_url}`;
            heroBackground.src = imageUrl;
        } else {
            // Nền đen nếu không có ảnh
            heroBackground.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3Crect width="1" height="1" fill="%23000000"/%3E%3C/svg%3E';
        }
    }

    // Set playlist name
    if (playlistNameEl) playlistNameEl.textContent = playlist.name || 'Untitled Playlist';

    // Set verified badge (Public/Private)
    if (verifiedBadge) {
        if (playlist.is_public === 1 || playlist.is_public === true) {
            verifiedBadge.style.display = 'flex';
            if (verifiedBadgeIcon) verifiedBadgeIcon.className = 'fas fa-globe';
            if (verifiedBadgeText) verifiedBadgeText.textContent = 'Public Playlist';
        } else {
            verifiedBadge.style.display = 'flex';
            if (verifiedBadgeIcon) verifiedBadgeIcon.className = 'fas fa-lock';
            if (verifiedBadgeText) verifiedBadgeText.textContent = 'Private Playlist';
        }
    }

    // Get user info từ API để lấy avatar
    if (monthlyListenersEl) {
        try {
            const userResponse = await httpRequest.get('users/me');
            const user = userResponse?.user;
            const trackCount = playlist.total_tracks || 0;
            const creatorName = playlist.user_display_name || playlist.user_username || 'Unknown User';

            // Tạo HTML với avatar + username
            let avatarHTML = '';
            if (user?.avatar_url && user.avatar_url !== 'null' && user.avatar_url !== '') {
                const avatarUrl = user.avatar_url.startsWith('http')
                    ? user.avatar_url
                    : `https://spotify.f8team.dev${user.avatar_url.startsWith('/') ? '' : '/'}${user.avatar_url}`;
                avatarHTML = `<img src="${avatarUrl}" alt="${creatorName}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 8px;">`;
            } else {
                // Dùng icon mặc định nếu không có avatar
                avatarHTML = `<div style="width: 24px; height: 24px; border-radius: 50%; background: #333; display: flex; align-items: center; justify-content: center; margin-right: 8px;"><i class="fas fa-user" style="font-size: 12px; color: #b3b3b3;"></i></div>`;
            }

            monthlyListenersEl.innerHTML = `
                <div style="display: flex; align-items: center;">
                    ${avatarHTML}
                    <span>${creatorName} • ${trackCount} songs</span>
                </div>
            `;
        } catch (error) {
            console.error('Error loading user info:', error);
            // Fallback nếu không load được user
            const creatorName = playlist.user_display_name || playlist.user_username || 'Unknown User';
            const trackCount = playlist.total_tracks || 0;
            monthlyListenersEl.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: #333; display: flex; align-items: center; justify-content: center; margin-right: 8px;"><i class="fas fa-user" style="font-size: 12px; color: #b3b3b3;"></i></div>
                    <span>${creatorName} • ${trackCount} songs</span>
                </div>
            `;
        }
    }

    console.log('Playlist hero displayed:', playlist);
}

// NEW: Hàm ẩn home sections (hits và artists)
function hideHomeSections() {
    const hitsSection = document.querySelector('.hits-section');
    const artistsSection = document.querySelector('.artists-section');
    const albumsSection = document.querySelector('.albums-section');
    if (hitsSection) hitsSection.style.display = 'none';
    if (artistsSection) artistsSection.style.display = 'none';
    if (albumsSection) albumsSection.style.display = 'none';
}

// NEW: Hàm load tracks của playlist
async function loadPlaylistTracks(playlistId) {
    const trackList = document.querySelector('.popular-section .track-list');
    const popularSection = document.querySelector('.popular-section');
    const sectionTitle = popularSection?.querySelector('.section-title');

    if (!trackList || !popularSection) {
        console.error('Track list or popular section not found');
        return;
    }

    popularSection.style.display = 'block';
    if (sectionTitle) sectionTitle.textContent = 'Tracks';

    try {
        const response = await httpRequest.get(`playlists/${playlistId}/tracks`);
        const tracks = response?.tracks || [];

        console.log('Playlist tracks:', tracks);

        if (tracks.length === 0) {
            trackList.innerHTML = '<div class="no-tracks">This playlist is empty.</div>';
            return;
        }

        let tracksHTML = '';
        tracks.forEach((track, index) => {
            tracksHTML += `
                <div class="track-item" data-track-id="${track.id}">
                    <div class="track-number">${index + 1}</div>
                    <div class="track-image"><img src="${track.image_url}" alt="${track.title}"></div>
                    <div class="track-info"><div class="track-name">${track.title}</div></div>
                    <div class="track-plays">${track.play_count?.toLocaleString() || '0'}</div>
                    <div class="track-duration">${formatDuration(track.duration)}</div>
                    <button class="track-menu-btn" data-track-id="${track.id}"><i class="fas fa-ellipsis-h"></i></button>
                </div>
            `;
        });
        trackList.innerHTML = tracksHTML;

        trackList.querySelectorAll('.track-item').forEach((item, idx) => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.track-menu-btn')) return;
                window.dispatchEvent(new CustomEvent('track:selected', {
                    detail: {track: tracks[idx], queue: tracks}
                }));
            });
        });

        // Add menu functionality
        trackList.querySelectorAll('.track-menu-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const trackId = btn.dataset.trackId;
                const track = tracks.find(t => t.id === trackId);
                await showTrackMenu(e, track, playlistId);
            });
        });

    } catch (error) {
        console.error('Error loading playlist tracks:', error);
        trackList.innerHTML = '<div class="no-tracks">Failed to load tracks.</div>';
    }
}

// NEW: Show track menu với option remove from playlist
async function showTrackMenu(event, track, currentPlaylistId = null) {
    document.querySelectorAll('.track-menu').forEach(menu => menu.remove());

    // Load user playlists
    let userPlaylists = [];
    try {
        const response = await httpRequest.get('me/playlists');
        userPlaylists = response?.playlists || [];
    } catch (error) {
        console.error('Error loading playlists:', error);
    }

    const menu = document.createElement('div');
    menu.className = 'track-menu show';

    let playlistsHTML = '';
    if (userPlaylists.length === 0) {
        playlistsHTML = '<div class="track-submenu-item">No playlists</div>';
    } else {
        userPlaylists.forEach(playlist => {
            playlistsHTML += `
                <div class="track-submenu-item" data-playlist-id="${playlist.id}">
                    <i class="fas fa-music"></i>
                    <span>${playlist.name}</span>
                </div>
            `;
        });
    }

    // Add remove option if viewing a specific playlist
    let removeOption = '';
    if (currentPlaylistId) {
        removeOption = `
            <div class="track-menu-item" data-action="remove-from-playlist" data-playlist-id="${currentPlaylistId}" data-track-id="${track.id}">
                <i class="fas fa-trash"></i>
                <span>Xóa khỏi playlist</span>
            </div>
        `;
    }

    menu.innerHTML = `
        <div class="track-menu-item has-submenu" data-action="add-to-playlist">
            <i class="fas fa-list-ul"></i>
            <span>Thêm vào danh sách phát</span>
            <div class="track-submenu">
                ${playlistsHTML}
            </div>
        </div>
        <div class="track-menu-item" data-action="like-track">
            <i class="fas fa-heart"></i>
            <span>Yêu thích bài hát</span>
        </div>
        ${removeOption}
    `;

    const rect = event.currentTarget.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left - 150}px`;

    document.body.appendChild(menu);

    // Add to playlist
    menu.querySelectorAll('.track-submenu-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            e.stopPropagation();
            const playlistId = item.dataset.playlistId;
            if (playlistId) {
                await addTrackToPlaylist(track.id, playlistId);
                menu.remove();
            }
        });
    });

    // Remove from playlist
    const removeBtn = menu.querySelector('[data-action="remove-from-playlist"]');
    if (removeBtn) {
        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const playlistId = removeBtn.dataset.playlistId;
            const trackId = removeBtn.dataset.trackId;
            await removeTrackFromPlaylist(trackId, playlistId);
            menu.remove();
            // Reload playlist tracks
            loadPlaylistTracks(playlistId);
        });
    }

    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 100);
}

async function addTrackToPlaylist(trackId, playlistId) {
    try {
        await httpRequest.post(`playlists/${playlistId}/tracks`, {
            track_id: trackId
        });
        console.log(`Track ${trackId} added to playlist ${playlistId}`);

        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = '<i class="fas fa-check-circle"></i><span>Đã thêm vào playlist!</span>';
        document.body.appendChild(successMessage);
        setTimeout(() => successMessage.remove(), 3000);
    } catch (error) {
        console.error('Error adding track to playlist:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = '<i class="fas fa-info-circle"></i><span>Thêm vào playlist thất bại!</span>';
        document.body.appendChild(errorMessage);
        setTimeout(() => errorMessage.remove(), 3000);
    }
}

async function removeTrackFromPlaylist(trackId, playlistId) {
    try {
        await httpRequest.delete(`playlists/${playlistId}/tracks/${trackId}`);
        console.log(`Track ${trackId} removed from playlist ${playlistId}`);

        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = '<i class="fas fa-check-circle"></i><span>Đã xóa khỏi playlist!</span>';
        document.body.appendChild(successMessage);
        setTimeout(() => successMessage.remove(), 3000);
    } catch (error) {
        console.error('Error removing track from playlist:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = '<i class="fas fa-info-circle"></i><span>Xóa khỏi playlist thất bại!</span>';
        document.body.appendChild(errorMessage);
        setTimeout(() => errorMessage.remove(), 3000);
    }
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function initPlaylist() {
    const createBtn = document.querySelector('.create-btn');
    const modal = document.getElementById('createPlaylistModal');
    const modalCloses = modal?.querySelectorAll('.modal-close');
    const playlistForm = modal?.querySelector('.create-playlist-form');
    const playlistNameInput = document.getElementById('playlist-name');
    const playlistDescInput = document.getElementById('playlist-desc');
    const playlistImageInput = document.getElementById('playlist-image');
    const imagePreview = modal?.querySelector('.image-preview');
    const saveBtn = modal?.querySelector('.save-playlist');

    console.log('Playlist module initialized', {createBtn, modal, playlistForm});

    playlistImageInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 5 * 1024 * 1024) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.innerHTML = '<i class="fas fa-info-circle"></i><span>Ảnh quá lớn (tối đa 5MB).</span>';
                playlistForm.querySelector('.modal-body').appendChild(errorMessage);
                setTimeout(() => errorMessage.remove(), 3000);
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.innerHTML = '<i class="fas fa-info-circle"></i><span>Chỉ hỗ trợ JPG, PNG hoặc WebP.</span>';
                playlistForm.querySelector('.modal-body').appendChild(errorMessage);
                setTimeout(() => errorMessage.remove(), 3000);
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                if (imagePreview) {
                    imagePreview.classList.remove('placeholder');
                    imagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-sm);">`;
                }
            };
            reader.readAsDataURL(file);
        }
    });

    createBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('create');
    });

    modalCloses?.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
        });
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('show')) {
            closeModal();
        }
    });

    playlistForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = playlistNameInput?.value.trim() || 'My Playlist';
        const description = playlistDescInput?.value.trim();

        if (!name) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.innerHTML = '<i class="fas fa-info-circle"></i><span>Vui lòng nhập tên playlist!</span>';
            playlistForm.querySelector('.modal-body').appendChild(errorMessage);
            setTimeout(() => errorMessage.remove(), 3000);
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = editingPlaylistId ? 'Đang cập nhật...' : 'Đang lưu...';

            const playlistData = {
                name,
                description: description || '',
                is_public: true
            };

            let response;
            let createdPlaylist;

            if (editingPlaylistId) {
                console.log('Updating playlist:', {playlistId: editingPlaylistId, data: playlistData});
                response = await httpRequest.put(`playlists/${editingPlaylistId}`, playlistData);
                console.log('Playlist updated:', JSON.stringify(response, null, 2));
                createdPlaylist = response?.playlist;
            } else {
                console.log('Creating playlist:', playlistData);
                response = await httpRequest.post('playlists', playlistData);
                console.log('Playlist created:', JSON.stringify(response, null, 2));
                createdPlaylist = response?.playlist;
            }

            console.log('Created/Updated playlist image_url:', createdPlaylist?.image_url);

            if (playlistImageInput?.files[0] && createdPlaylist?.id) {
                const file = playlistImageInput.files[0];
                console.log('File details:', {name: file.name, size: file.size, type: file.type});

                try {
                    const formData = new FormData();
                    formData.append('image', file);
                    formData.append('file', file);
                    formData.append('cover_image', file);

                    console.log('Uploading image for playlist:', createdPlaylist.id);
                    const uploadResponse = await httpRequest.post(`upload/playlist/${createdPlaylist.id}/cover`, formData);
                    console.log('Image uploaded:', JSON.stringify(uploadResponse, null, 2));

                    const imageUrl = uploadResponse?.image_url || uploadResponse?.cover_image_url;
                    if (!imageUrl) {
                        console.warn('Server did not return image_url or cover_image_url after upload');
                        throw new Error('No image URL in response');
                    }

                    const updateData = {
                        name,
                        description: description || '',
                        is_public: true,
                        image_url: imageUrl
                    };
                    console.log('Updating playlist with image_url:', updateData);
                    const updateResponse = await httpRequest.put(`playlists/${createdPlaylist.id}`, updateData);
                    console.log('Playlist updated:', JSON.stringify(updateResponse, null, 2));
                } catch (imgError) {
                    console.error('Image upload failed:', imgError);
                    console.error('Error details:', JSON.stringify(imgError.response, null, 2));

                    const reader = new FileReader();
                    reader.onload = async () => {
                        const base64Image = reader.result;
                        const updateData = {
                            name,
                            description: description || '',
                            is_public: true,
                            image_url: base64Image
                        };

                        console.log('Updating playlist with base64 image_url:', updateData);
                        const updateResponse = await httpRequest.put(`playlists/${createdPlaylist.id}`, updateData);
                        console.log('Playlist updated with base64:', JSON.stringify(updateResponse, null, 2));
                    };
                    reader.readAsDataURL(file);
                }
            }

            closeModal();
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `<i class="fas fa-check-circle"></i><span>${editingPlaylistId ? 'Cập nhật' : 'Tạo'} playlist thành công!</span>`;
            document.body.appendChild(successMessage);
            setTimeout(() => successMessage.remove(), 3000);

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('playlist:created', {
                    detail: {playlist: createdPlaylist}
                }));
            }, 500);

        } catch (error) {
            console.error(`Error ${editingPlaylistId ? 'updating' : 'creating'} playlist:`, error);
            console.error('Error response:', JSON.stringify(error.response, null, 2));
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.innerHTML = `<i class="fas fa-info-circle"></i><span>${editingPlaylistId ? 'Cập nhật' : 'Tạo'} playlist thất bại. Vui lòng thử lại!</span>`;
            playlistForm.querySelector('.modal-body').appendChild(errorMessage);
            setTimeout(() => errorMessage.remove(), 3000);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Lưu';
        }
    });

    loadUserPlaylists();
    window.addEventListener('playlist:created', loadUserPlaylists);

    // Listen for track selected event to update playing state
    window.addEventListener('track:selected', (e) => {
        const selectedTrackId = e.detail.track.id;
        document.querySelectorAll('.track-item').forEach(item => {
            if (item.dataset.trackId === selectedTrackId) {
                item.classList.add('playing');
            } else {
                item.classList.remove('playing');
            }
        });
    });
}

async function loadUserPlaylists() {
    const libraryContent = document.querySelector('.library-content');
    if (!libraryContent) {
        console.error('Library content element not found');
        return;
    }

    let playlists = [];

    try {
        console.log('Fetching playlists from API: GET /me/playlists');
        const response = await httpRequest.get('me/playlists');
        // console.log('Playlists response:', JSON.stringify(response, null, 2));

        playlists = response?.playlists || [];
        console.log('Parsed playlists:', playlists);

        let playlistsHTML = `
            <div class="library-item active">
                <div class="item-icon liked-songs">
                    <i class="fas fa-heart"></i>
                </div>
                <div class="item-info">
                    <div class="item-title">Liked Songs</div>
                    <div class="item-subtitle">
                        <i class="fas fa-thumbtack"></i>
                        Playlist • 0 songs
                    </div>
                </div>
            </div>
        `;

        if (playlists.length === 0) {
            console.warn('No playlists found');
        }

        const menuTemplate = document.getElementById('playlist-menu-template');
        playlists.forEach(playlist => {
            const hasValidImage = playlist.image_url && playlist.image_url !== 'null' && playlist.image_url !== '';

            const trackCount = playlist.total_tracks || 0;
            const imageSrc = hasValidImage && !playlist.image_url.startsWith('data:image')
                ? `https://spotify.f8team.dev${playlist.image_url.startsWith('/') ? '' : '/'}${playlist.image_url}`
                : playlist.image_url;

            const menu = menuTemplate.content.cloneNode(true).querySelector('.playlist-menu');
            menu.setAttribute('data-playlist-id', playlist.id);
            menu.querySelector('.edit-playlist').setAttribute('data-playlist-id', playlist.id);
            menu.querySelector('.delete-playlist').setAttribute('data-playlist-id', playlist.id);

            playlistsHTML += `
                <div class="library-item" data-playlist-id="${playlist.id}">
                    ${hasValidImage ?
                `<img src="${imageSrc}" alt="${playlist.name}" class="item-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                         <div class="item-icon no-image" style="display: none;"><i class="fas fa-music"></i></div>` :
                `<div class="item-icon no-image"><i class="fas fa-music"></i></div>`
            }
                    <div class="item-info">
                        <div class="item-title">${playlist.name}</div>
                        <div class="item-subtitle">Playlist • ${trackCount} songs</div>
                    </div>
                    <button class="playlist-menu-btn" data-playlist-id="${playlist.id}">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    ${menu.outerHTML}
                </div>
            `;
        });

        // console.log('Updating library content with HTML:', playlistsHTML);
        libraryContent.innerHTML = playlistsHTML;

        // Toggle menu visibility
        libraryContent.querySelectorAll('.playlist-menu').forEach(menu => {
            const btn = menu.previousElementSibling;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = !menu.classList.contains('hidden');
                libraryContent.querySelectorAll('.playlist-menu').forEach(m => m.classList.add('hidden'));
                if (!isVisible) {
                    menu.classList.remove('hidden');
                    const rect = btn.getBoundingClientRect();
                    menu.style.top = `${rect.bottom + window.scrollY}px`;
                    menu.style.left = `${rect.left + window.scrollX}px`;
                }
            });
        });

        // Handle edit click
        libraryContent.querySelectorAll('.edit-playlist').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const playlistId = item.dataset.playlistId;
                const playlist = playlists.find(p => p.id === playlistId);
                if (playlist) {
                    console.log('Opening edit modal for playlist:', playlistId);
                    openModal('edit', playlist);
                } else {
                    console.error('Playlist not found:', playlistId);
                }
                libraryContent.querySelectorAll('.playlist-menu').forEach(m => m.classList.add('hidden'));
            });
        });

        // Handle delete click
        libraryContent.querySelectorAll('.delete-playlist').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const playlistId = item.dataset.playlistId;
                try {
                    console.log('Deleting playlist:', playlistId);
                    await httpRequest.delete(`playlists/${playlistId}`);
                    console.log('Playlist deleted:', playlistId);
                    const successMessage = document.createElement('div');
                    successMessage.className = 'success-message';
                    successMessage.innerHTML = '<i class="fas fa-check-circle"></i><span>Xóa playlist thành công!</span>';
                    document.body.appendChild(successMessage);
                    setTimeout(() => successMessage.remove(), 3000);
                    loadUserPlaylists();
                } catch (error) {
                    console.error('Error deleting playlist:', error);
                    console.error('Error response:', JSON.stringify(error.response, null, 2));
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'error-message';
                    errorMessage.innerHTML = '<i class="fas fa-info-circle"></i><span>Xóa playlist thất bại. Vui lòng thử lại!</span>';
                    document.body.appendChild(errorMessage);
                    setTimeout(() => errorMessage.remove(), 3000);
                }
                libraryContent.querySelectorAll('.playlist-menu').forEach(m => m.classList.add('hidden'));
            });
        });

        // Click outside to close menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.playlist-menu-btn') && !e.target.closest('.playlist-menu')) {
                libraryContent.querySelectorAll('.playlist-menu').forEach(m => m.classList.add('hidden'));
            }
        });

        // Initial hide all menus
        libraryContent.querySelectorAll('.playlist-menu').forEach(m => m.classList.add('hidden'));

        // NEW: Handle library item click - hiển thị playlist hero
        libraryContent.querySelectorAll('.library-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.playlist-menu-btn') || e.target.closest('.playlist-menu')) {
                    return;
                }

                // Remove active from all items
                libraryContent.querySelectorAll('.library-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const playlistId = item.dataset.playlistId;

                if (playlistId) {
                    // Tìm playlist data
                    const playlist = playlists.find(p => p.id === playlistId);
                    if (playlist) {
                        console.log('Display playlist:', playlist);
                        // Ẩn home sections
                        hideHomeSections();
                        // Hiển thị playlist hero (async)
                        displayPlaylistHero(playlist).catch(err => {
                            console.error('Error displaying playlist hero:', err);
                        });
                        // Load tracks của playlist
                        loadPlaylistTracks(playlistId);
                    }
                } else {
                    // Liked Songs - có thể implement sau
                    console.log('Liked Songs clicked');
                }
            });
        });

        libraryContent.querySelectorAll('.item-image').forEach(img => {
            img.addEventListener('error', () => {
                console.error(`Failed to load image: ${img.src}`);
            });
        });

    } catch (error) {
        console.error('Error loading playlists:', error);
        console.error('Error response:', JSON.stringify(error.response, null, 2));
        libraryContent.innerHTML = `
            <div class="library-item active">
                <div class="item-icon liked-songs">
                    <i class="fas fa-heart"></i>
                </div>
                <div class="item-info">
                    <div class="item-title">Liked Songs</div>
                    <div class="item-subtitle">
                        <i class="fas fa-thumbtack"></i>
                        Playlist • 0 songs
                    </div>
                </div>
            </div>
        `;
    }
}