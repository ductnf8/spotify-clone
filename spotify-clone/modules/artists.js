// File: modules/artists.js
import httpRequest from '../utils/httpRequest.js';

// window.addEventListener('artist:select', async (e) => {
//     const artist = e.detail.artist;
//     await updateArtistHero(artist);
//     await loadAndFilterTracksForSelectedArtist(artist.id, false);
//     hideHomeSections();
// });

// Formatting duration in seconds to MM:SS
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function initArtists() {
    let popularArtists = [];
    let selectedArtist = null;
    let popularTracks = [];
    let userPlaylists = [];
    let currentTrack = null;
    let filteredTracks = [];

    // Loading popular artists from API
    async function loadPopularArtists() {
        const artistsGrid = document.getElementById('artistsGrid');
        if (!artistsGrid) return;

        artistsGrid.innerHTML = '<div class="loading">Loading artists...</div>';

        try {
            const response = await httpRequest.get('artists/trending?limit=20');
            popularArtists = response.artists || [];

            if (popularArtists.length === 0) {
                artistsGrid.innerHTML = '<p>No artists available right now.</p>';
                return;
            }

            let artistsHTML = '';
            popularArtists.forEach((artist, index) => {
                const name = artist.name || 'Unknown Artist';
                const imageUrl = artist.image_url || 'placeholder.svg?height=160&width=160';
                artistsHTML += `
                    <div class="artist-card" data-artist-id="${artist.id || ''}" style="cursor: pointer;">
                        <div class="artist-card-cover">
                            <img src="${imageUrl}" alt="${name}" loading="lazy" />
                            <button class="artist-play-btn" data-artist-index="${index}">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                        <div class="artist-card-info">
                            <h3 class="artist-card-name">${name}</h3>
                            <p class="artist-card-type">Artist</p>
                        </div>
                    </div>
                `;
            });
            artistsGrid.innerHTML = artistsHTML;

            // Binding click events for play buttons on artist cards
            artistsGrid.querySelectorAll('.artist-play-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const index = parseInt(e.currentTarget.dataset.artistIndex);
                    selectedArtist = popularArtists[index];
                    await updateArtistHero(selectedArtist);
                    await loadAndFilterTracksForSelectedArtist(selectedArtist.id, true);
                    hideHomeSections();
                });
            });

            // Binding click events for artist cards
            artistsGrid.querySelectorAll('.artist-card').forEach(card => {
                card.addEventListener('click', async (e) => {
                    if (e.target.closest('.artist-play-btn')) return;
                    const index = Array.from(artistsGrid.children).indexOf(card);
                    selectedArtist = popularArtists[index];
                    await updateArtistHero(selectedArtist);
                    await loadAndFilterTracksForSelectedArtist(selectedArtist.id, false);
                    hideHomeSections();
                });
            });

            // Caching popular tracks if not loaded
            if (popularTracks.length === 0) await loadPopularTracksCache();

            window.addEventListener('artists:reload', loadPopularArtists);

        } catch (error) {
            console.error('Error loading artists:', error);
            artistsGrid.innerHTML = `
                <div class="error">
                    <p>Failed to load artists. Please check your connection.</p>
                    <button class="retry-btn">Retry</button>
                </div>
            `;
            const retryBtn = artistsGrid.querySelector('.retry-btn');
            if (retryBtn) retryBtn.addEventListener('click', loadPopularArtists);
            if (error.status === 401) {
                document.querySelector(".auth-buttons")?.classList.add('show');
            }
        }
    }

    // Hiding home sections to show artist details
    function hideHomeSections() {
        const hitsSection = document.querySelector('.hits-section');
        const artistsSection = document.querySelector('.artists-section');
        const albumsSection = document.querySelector('.albums-section');
        if (hitsSection) hitsSection.style.display = 'none';
        if (artistsSection) artistsSection.style.display = 'none';
        if (albumsSection) albumsSection.style.display = 'none';
    }

    // Caching popular tracks for filtering
    async function loadPopularTracksCache() {
        try {
            const response = await httpRequest.get('tracks/popular');
            popularTracks = response.tracks || [];
            console.log('Cached popular tracks:', popularTracks);
        } catch (error) {
            console.error('Error caching popular tracks:', error);
        }
    }

    // Loading and filtering tracks for selected artist
    async function loadAndFilterTracksForSelectedArtist(artistId, shouldPlay = false) {
        currentTrack = null;
        if (popularTracks.length === 0) await loadPopularTracksCache();
        filteredTracks = popularTracks.filter(track => track.artist_id === artistId);
        console.log('Filtered tracks for artist:', filteredTracks);
        renderPopularTracks(filteredTracks);

        // Showing hero, popular section, and artist controls
        const heroSection = document.querySelector('.artist-hero');
        const popularSection = document.querySelector('.popular-section');
        const artistControls = document.querySelector('.artist-controls');
        const likeBtn = artistControls?.querySelector('.like-btn');

        if (heroSection) heroSection.style.display = 'block';
        if (popularSection) popularSection.style.display = 'block';
        if (artistControls) artistControls.style.display = 'flex';

        // Fetching artist details to get is_following
        let isLiked = false;
        try {
            const artistDetails = await httpRequest.get(`artists/${artistId}`);
            isLiked = artistDetails.is_following || false;
        } catch (error) {
            console.error('Error fetching artist details:', error);
            isLiked = false; // Fallback to false if API fails
        }

        // Binding like button for artist with toggle functionality
        if (likeBtn) {
            likeBtn.setAttribute('data-tooltip', isLiked ? 'Bỏ follow artist này' : 'Follow artist này');
            const heartIcon = likeBtn.querySelector('i');
            heartIcon.classList.remove('fa-regular', 'fa-solid');
            heartIcon.classList.add(isLiked ? 'fa-solid' : 'fa-regular');
            if (isLiked) likeBtn.classList.add('liked');
            else likeBtn.classList.remove('liked');

            likeBtn.onclick = async () => {
                try {
                    if (!isLiked) {
                        try {
                            await httpRequest.post(`artists/${artistId}/follow`, {});
                        } catch (error) {
                            if (error.status === 409) {
                                await httpRequest.delete(`artists/${artistId}/follow`);
                                heartIcon.classList.remove('fa-solid');
                                heartIcon.classList.add('fa-regular');
                                likeBtn.classList.remove('liked');
                                likeBtn.setAttribute('data-tooltip', 'Follow artist này');
                                isLiked = false;
                                const successMsg = document.createElement('div');
                                successMsg.className = 'success-message';
                                successMsg.innerHTML = '<i class="fas fa-check-circle"></i><span>Đã bỏ follow artist!</span>';
                                document.body.appendChild(successMsg);
                                setTimeout(() => successMsg.remove(), 3000);
                                return;
                            }
                            throw error;
                        }
                        heartIcon.classList.remove('fa-regular');
                        heartIcon.classList.add('fa-solid');
                        likeBtn.classList.add('liked');
                        likeBtn.setAttribute('data-tooltip', 'Bỏ follow artist này');
                        isLiked = true;
                        const successMsg = document.createElement('div');
                        successMsg.className = 'success-message';
                        successMsg.innerHTML = '<i class="fas fa-check-circle"></i><span>Đã follow artist!</span>';
                        document.body.appendChild(successMsg);
                        setTimeout(() => successMsg.remove(), 3000);
                    } else {
                        await httpRequest.delete(`artists/${artistId}/follow`);
                        heartIcon.classList.remove('fa-solid');
                        heartIcon.classList.add('fa-regular');
                        likeBtn.classList.remove('liked');
                        likeBtn.setAttribute('data-tooltip', 'Follow artist này');
                        isLiked = false;
                        const successMsg = document.createElement('div');
                        successMsg.className = 'success-message';
                        successMsg.innerHTML = '<i class="fas fa-check-circle"></i><span>Đã bỏ follow artist!</span>';
                        document.body.appendChild(successMsg);
                        setTimeout(() => successMsg.remove(), 3000);
                    }
                } catch (error) {
                    console.error('Error toggling artist follow:', error);
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.innerHTML = '<i class="fas fa-info-circle"></i><span>' + (isLiked ? 'Bỏ follow artist thất bại!' : 'Follow artist thất bại!') + '</span>';
                    document.body.appendChild(errorMsg);
                    setTimeout(() => errorMsg.remove(), 3000);
                }
            };
        }

        if (shouldPlay && filteredTracks.length > 0) {
            const firstTrackItem = document.querySelector('.track-list .track-item:first-child');
            if (firstTrackItem) {
                firstTrackItem.click();
            } else {
                console.warn('No track items found to play for artist:', artistId);
            }
        }
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

    // Rendering popular tracks for artist
    function renderPopularTracks(tracks) {
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
                window.dispatchEvent(new CustomEvent('track:selected', {detail: {track: tracks[idx], queue: tracks}}));
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

    // Showing track menu for adding to playlists
    async function showTrackMenu(event, track) {
        if (!event.currentTarget) {
            console.error('showTrackMenu: event.currentTarget is null');
            return;
        }

        console.log('showTrackMenu called for track:', track?.id);

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
                        <span>${playlist.name || 'Untitled Playlist'}</span>
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
            <div class="track-menu-item" data-action="like-track">
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

    // Updating artist hero section
    async function updateArtistHero(artist) {
        const heroSection = document.querySelector('.artist-hero');
        if (!heroSection) return;

        const heroBackground = heroSection.querySelector('.hero-background img');
        const artistNameEl = heroSection.querySelector('.artist-name');
        const monthlyListenersEl = heroSection.querySelector('.monthly-listeners');
        const verifiedBadge = heroSection.querySelector('.verified-badge');

        let artistDetails;
        try {
            artistDetails = await httpRequest.get(`artists/${artist.id}`);
        } catch (error) {
            console.error('Error fetching artist details for hero:', error);
            artistDetails = artist; // fallback
        }

        if (heroBackground) heroBackground.src = artistDetails.background_image_url || artistDetails.image_url || 'placeholder.svg';
        if (artistNameEl) artistNameEl.textContent = artistDetails.name || 'Unknown Artist';
        if (monthlyListenersEl) monthlyListenersEl.textContent = `${(artistDetails.monthly_listeners || 0).toLocaleString()} monthly listeners`;
        if (verifiedBadge) verifiedBadge.style.display = artistDetails.is_verified ? 'flex' : 'none';
    }


    // Binding play button to trigger first track
    const playBtnLarge = document.querySelector('.play-btn-large');
    playBtnLarge?.addEventListener('click', () => {
        const firstTrackItem = document.querySelector('.track-list .track-item:first-child');
        if (firstTrackItem) {
            firstTrackItem.click();
        } else {
            console.warn('No track items found to play for artist:', selectedArtist?.id);
        }
    });

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

    loadPopularArtists();
}