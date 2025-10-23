// File: modules/albums.js
import httpRequest from '../utils/httpRequest.js';

// Formatting duration in seconds to MM:SS
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function initAlbums() {
    let popularAlbums = [];
    let selectedAlbum = null;
    let selectedAlbumTracks = [];
    let userPlaylists = [];
    let playBtnLargeInitialized = false;
    let currentTrack = null;

    // Loading popular albums from API
    async function loadPopularAlbums() {
        const albumsGrid = document.getElementById('albumsGrid');
        if (!albumsGrid) return;

        albumsGrid.innerHTML = '<div class="loading">Loading albums...</div>';

        try {
            const response = await httpRequest.get('albums/popular?limit=20');
            popularAlbums = response.albums || [];

            if (popularAlbums.length === 0) {
                albumsGrid.innerHTML = '<p>No albums available right now.</p>';
                return;
            }

            let albumsHTML = '';
            popularAlbums.forEach((album, index) => {
                const title = album.title || 'Unknown Album';
                const artistName = album.artist_name || 'Unknown Artist';
                const imageUrl = album.cover_image_url || 'placeholder.svg?height=160&width=160';
                albumsHTML += `
                    <div class="artist-card album-card" data-album-id="${album.id || ''}" style="cursor: pointer;">
                        <div class="artist-card-cover">
                            <img src="${imageUrl}" alt="${title}" loading="lazy" />
                            <button class="artist-play-btn album-play-btn" data-album-index="${index}">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                        <div class="artist-card-info">
                            <h3 class="artist-card-name">${title}</h3>
                            <p class="artist-card-type">${artistName}</p>
                        </div>
                    </div>
                `;
            });
            albumsGrid.innerHTML = albumsHTML;

            // Binding click events for play buttons on album cards
            albumsGrid.querySelectorAll('.album-play-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const index = parseInt(e.currentTarget.dataset.albumIndex);
                    selectedAlbum = popularAlbums[index];
                    await loadAlbumDetails(selectedAlbum.id, true);
                    hideHomeSections();
                });
            });

            // Binding click events for album cards
            albumsGrid.querySelectorAll('.album-card').forEach(card => {
                card.addEventListener('click', async (e) => {
                    if (e.target.closest('.album-play-btn')) return;
                    const albumId = card.dataset.albumId;
                    selectedAlbum = popularAlbums.find(album => album.id === albumId);
                    await loadAlbumDetails(albumId, false);
                    hideHomeSections();
                });
            });

            window.addEventListener('albums:reload', loadPopularAlbums);

        } catch (error) {
            console.error('Error loading albums:', error);
            albumsGrid.innerHTML = `
                <div class="error">
                    <p>Failed to load albums. Please check your connection.</p>
                    <button class="retry-btn">Retry</button>
                </div>
            `;
            const retryBtn = albumsGrid.querySelector('.retry-btn');
            if (retryBtn) retryBtn.addEventListener('click', loadPopularAlbums);
            if (error.status === 401) {
                document.querySelector(".auth-buttons")?.classList.add('show');
            }
        }
    }

    // Hiding home sections to show album details
    function hideHomeSections() {
        const hitsSection = document.querySelector('.hits-section');
        const artistsSection = document.querySelector('.artists-section');
        const albumsSection = document.querySelector('.albums-section');
        if (hitsSection) hitsSection.style.display = 'none';
        if (artistsSection) artistsSection.style.display = 'none';
        if (albumsSection) albumsSection.style.display = 'none';
    }

    // Loading album details and tracks from API
    async function loadAlbumDetails(albumId, shouldPlay = false) {
        try {
            const albumResponse = await httpRequest.get(`albums/${albumId}`);
            selectedAlbum = albumResponse;

            console.log('Album details:', selectedAlbum);

            updateAlbumHero(selectedAlbum);

            const tracksResponse = await httpRequest.get(`albums/${albumId}/tracks`);
            selectedAlbumTracks = tracksResponse.tracks || [];

            console.log('Album tracks loaded:', selectedAlbumTracks);

            renderAlbumTracks(selectedAlbumTracks);

            // Showing hero, popular section, and artist controls
            const heroSection = document.querySelector('.artist-hero');
            const popularSection = document.querySelector('.popular-section');
            const artistControls = document.querySelector('.artist-controls');
            const likeBtn = artistControls?.querySelector('.like-btn');

            if (heroSection) heroSection.style.display = 'block';
            if (popularSection) popularSection.style.display = 'block';
            if (artistControls) artistControls.style.display = 'flex';

            // Binding like button for album with toggle functionality
            if (likeBtn) {
                const isLiked = selectedAlbum.is_liked || false;
                likeBtn.setAttribute('data-tooltip', isLiked ? 'Bỏ thích album này' : 'Thích album này');
                const heartIcon = likeBtn.querySelector('i');
                heartIcon.classList.remove('fa-regular', 'fa-solid');
                heartIcon.classList.add(isLiked ? 'fa-solid' : 'fa-regular');
                if (isLiked) likeBtn.classList.add('liked');
                else likeBtn.classList.remove('liked');

                likeBtn.onclick = async () => {
                    try {
                        if (!isLiked) {
                            try {
                                await httpRequest.post(`albums/${albumId}/like`, {});
                            } catch (error) {
                                if (error.status === 409) {
                                    await httpRequest.delete(`albums/${albumId}/like`);
                                    heartIcon.classList.remove('fa-solid');
                                    heartIcon.classList.add('fa-regular');
                                    likeBtn.classList.remove('liked');
                                    likeBtn.setAttribute('data-tooltip', 'Thích album này');
                                    selectedAlbum.is_liked = false;
                                    const successMsg = document.createElement('div');
                                    successMsg.className = 'success-message';
                                    successMsg.innerHTML = '<i class="fas fa-check-circle"></i><span>Đã bỏ thích album!</span>';
                                    document.body.appendChild(successMsg);
                                    setTimeout(() => successMsg.remove(), 3000);
                                    return;
                                }
                                throw error;
                            }
                            heartIcon.classList.remove('fa-regular');
                            heartIcon.classList.add('fa-solid');
                            likeBtn.classList.add('liked');
                            likeBtn.setAttribute('data-tooltip', 'Bỏ thích album này');
                            selectedAlbum.is_liked = true;
                            const successMsg = document.createElement('div');
                            successMsg.className = 'success-message';
                            successMsg.innerHTML = '<i class="fas fa-check-circle"></i><span>Đã thích album!</span>';
                            document.body.appendChild(successMsg);
                            setTimeout(() => successMsg.remove(), 3000);
                        } else {
                            await httpRequest.delete(`albums/${albumId}/like`);
                            heartIcon.classList.remove('fa-solid');
                            heartIcon.classList.add('fa-regular');
                            likeBtn.classList.remove('liked');
                            likeBtn.setAttribute('data-tooltip', 'Thích album này');
                            selectedAlbum.is_liked = false;
                            const successMsg = document.createElement('div');
                            successMsg.className = 'success-message';
                            successMsg.innerHTML = '<i class="fas fa-check-circle"></i><span>Đã bỏ thích album!</span>';
                            document.body.appendChild(successMsg);
                            setTimeout(() => successMsg.remove(), 3000);
                        }
                    } catch (error) {
                        console.error('Error toggling album like:', error);
                        const errorMsg = document.createElement('div');
                        errorMsg.className = 'error-message';
                        errorMsg.innerHTML = '<i class="fas fa-info-circle"></i><span>' + (isLiked ? 'Bỏ thích album thất bại!' : 'Thích album thất bại!') + '</span>';
                        document.body.appendChild(errorMsg);
                        setTimeout(() => errorMsg.remove(), 3000);
                    }
                };
            }

            if (shouldPlay && selectedAlbumTracks.length > 0) {
                const firstTrackItem = document.querySelector('.track-list .track-item:first-child');
                if (firstTrackItem) {
                    firstTrackItem.click();
                } else {
                    console.warn('No track items found to play for album:', albumId);
                }
            }

        } catch (error) {
            console.error('Error loading album details:', error);
            const trackList = document.querySelector('.track-list');
            if (trackList) {
                trackList.innerHTML = `
                    <div class="error">
                        <p>Failed to load album tracks. Please check your connection.</p>
                        <button class="retry-btn">Retry</button>
                    </div>
                `;
                const retryBtn = trackList.querySelector('.retry-btn');
                if (retryBtn) retryBtn.addEventListener('click', () => loadAlbumDetails(albumId, shouldPlay));
            }
            if (error.status === 401) {
                document.querySelector(".auth-buttons")?.classList.add('show');
            }
        }
    }

    // Updating album hero section
    function updateAlbumHero(album) {
        const heroSection = document.querySelector('.artist-hero');
        if (!heroSection) return;

        const heroBackground = heroSection.querySelector('.hero-background img');
        const albumTitleEl = heroSection.querySelector('.artist-name');
        const monthlyListenersEl = heroSection.querySelector('.monthly-listeners');
        const verifiedBadge = heroSection.querySelector('.verified-badge');
        const verifiedBadgeIcon = verifiedBadge?.querySelector('i');
        const verifiedBadgeText = verifiedBadge?.querySelector('span');

        // Cập nhật ảnh nền
        if (heroBackground)
            heroBackground.src = album.cover_image_url || album.image_url || 'placeholder.svg';

        // Hiển thị tên album
        if (albumTitleEl)
            albumTitleEl.textContent = album.title || 'Unknown Album';

        // Hiển thị tên nghệ sĩ (dùng dòng monthly listeners có sẵn để hiển thị)
        if (monthlyListenersEl)
            monthlyListenersEl.textContent = album.artist_name || 'Unknown Artist';

        // Hiển thị nhãn “Album”
        if (verifiedBadge) verifiedBadge.style.display = 'flex';
        if (verifiedBadgeIcon) verifiedBadgeIcon.className = 'fas fa-record-vinyl';
        if (verifiedBadgeText) verifiedBadgeText.textContent = 'Album';
    }


    // Rendering album tracks
    function renderAlbumTracks(tracks) {
        const trackList = document.querySelector('.track-list');
        if (!trackList) {
            console.error('Track list element not found');
            return;
        }

        trackList.innerHTML = '';
        let tracksHTML = '';
        tracks.forEach((track, idx) => {
            const isPlaying = track.id === currentTrack?.id ? 'playing' : '';
            tracksHTML += `
                <div class="track-item ${isPlaying}" data-track-id="${track.id || ''}">
                    <div class="track-number">${idx + 1}</div>
                    <div class="track-image">
                        <img src="${track.image_url || 'placeholder.svg?height=40&width=40'}" alt="${track.title || 'Unknown Track'}" />
                    </div>
                    <div class="track-info">
                        <div class="track-name ${isPlaying ? 'playing-text' : ''}">${track.title || 'Unknown Track'}</div>
                    </div>
                    <div class="track-plays">${(track.plays || 0).toLocaleString()}</div>
                    <div class="track-duration">${formatDuration(track.duration || 0)}</div>
                    <button class="track-menu-btn" data-track-id="${track.id}">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </div>
            `;
        });
        trackList.innerHTML = tracksHTML;

        // Binding click events for track items
        trackList.querySelectorAll('.track-item').forEach((item, idx) => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.track-menu-btn')) return;
                currentTrack = tracks[idx];
                window.dispatchEvent(new CustomEvent('track:selected', {
                    detail: {track: tracks[idx], queue: tracks}
                }));
            });
        });

        // Binding click events for track menu buttons
        trackList.querySelectorAll('.track-menu-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const trackId = btn.dataset.trackId;
                const track = tracks.find(t => t.id === trackId);
                console.log('Track menu clicked for:', track);
                await showTrackMenu(e, track);
            });
        });
    }

    // Loading user playlists for track menu
    async function loadUserPlaylists() {
        try {
            const response = await httpRequest.get('me/playlists');
            userPlaylists = response?.playlists || [];
            console.log('User playlists loaded:', userPlaylists);
        } catch (error) {
            console.error('Error loading user playlists:', error);
        }
    }

    // Showing track menu for adding to playlists
    async function showTrackMenu(event, track) {
        console.log('showTrackMenu called for track:', track.id);

        document.querySelectorAll('.track-menu').forEach(menu => menu.remove());

        await loadUserPlaylists();

        const menu = document.createElement('div');
        menu.className = 'track-menu show';

        let playlistsHTML = '';
        if (userPlaylists.length === 0) {
            playlistsHTML = '<div class="track-submenu-item" style="pointer-events: none; color: #6a6a6a;">Không có playlist</div>';
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

        menu.innerHTML = `
            <div class="track-menu-item has-submenu">
                <i class="fas fa-list-ul"></i>
                <span>Thêm vào danh sách phát</span>
                <div class="track-submenu">
                    ${playlistsHTML}
                </div>
            </div>
            <div class="track-menu-item">
                <i class="fas fa-heart"></i>
                <span>Yêu thích bài hát</span>
            </div>
        `;

        const rect = event.currentTarget.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left - 150}px`;

        document.body.appendChild(menu);
        console.log('Menu appended to body');

        // Binding click events for playlist items in track menu
        menu.querySelectorAll('.track-submenu-item[data-playlist-id]').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const playlistId = item.dataset.playlistId;
                console.log('Adding track to playlist:', playlistId);
                await addTrackToPlaylist(track.id, playlistId);
                menu.remove();
            });
        });

        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
    }

    // Adding track to playlist via API
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

    // Binding play button to trigger first track
    function bindPlayButton() {
        if (playBtnLargeInitialized) return;

        const playBtnLarge = document.querySelector('.play-btn-large');
        if (!playBtnLarge) {
            console.error('play-btn-large not found');
            return;
        }

        playBtnLarge.addEventListener('click', () => {
            const firstTrackItem = document.querySelector('.track-list .track-item:first-child');
            if (firstTrackItem) {
                firstTrackItem.click();
            } else {
                console.warn('No track items found to play for album');
            }
        });

        playBtnLargeInitialized = true;
        console.log('Play button bound');
    }

    // Handling track selection event
    window.addEventListener('track:selected', (e) => {
        currentTrack = e.detail.track;
        document.querySelectorAll('.track-item').forEach(item => {
            if (item.dataset.trackId === currentTrack.id) {
                item.classList.add('playing');
            } else {
                item.classList.remove('playing');
            }
        });
    });

    loadPopularAlbums();
    bindPlayButton();
}