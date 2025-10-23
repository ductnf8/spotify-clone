// File: modules/hits.js
import httpRequest from '../utils/httpRequest.js';

export let tracksData = [];
let userPlaylists = [];

export function initHits() {
    async function loadTodayHits() {
        const hitsGrid = document.getElementById('hitsGrid');
        if (!hitsGrid) {
            console.error("hitsGrid element not found");
            return;
        }

        hitsGrid.innerHTML = '<div class="loading">Loading hits...</div>';

        try {
            const response = await httpRequest.get('tracks/trending?limit=6');
            console.log('Hits API response:', response);
            tracksData = response.tracks || [];

            if (tracksData.length === 0) {
                hitsGrid.innerHTML = '<p>No hits available right now.</p>';
                return;
            }

            let hitsHTML = '';
            tracksData.forEach(hit => {
                hitsHTML += `
                    <div class="hit-card" data-track-id="${hit.id || ''}">
                        <div class="hit-card-cover">
                            <img src="${hit.image_url || 'placeholder.svg?height=160&width=160'}" alt="${hit.title || 'Unknown Track'}" loading="lazy" />
                            <button class="hit-play-btn" data-track-id="${hit.id || ''}">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                        <h3 class="hit-card-title">${hit.title || 'Unknown Track'}</h3>
                        <p class="hit-card-artist">${hit.artist_name || 'Unknown Artist'}</p>
                    </div>
                `;
            });

            hitsGrid.innerHTML = hitsHTML;

            hitsGrid.querySelectorAll('.hit-play-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const trackId = e.currentTarget.dataset.trackId;
                    const track = tracksData.find(h => h.id === trackId);
                    console.log('Selected track:', track);
                    window.dispatchEvent(new CustomEvent('track:selected', {detail: {track, queue: tracksData}}));
                });
            });

            hitsGrid.querySelectorAll('.hit-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.hit-play-btn')) return;
                    const trackId = card.dataset.trackId;
                    const track = tracksData.find(h => h.id === trackId);
                    window.dispatchEvent(new CustomEvent('track:selected', {detail: {track, queue: tracksData}}));
                });
            });

            console.log('Loaded hits:', tracksData);

        } catch (error) {
            console.error('Error loading hits:', error);
            hitsGrid.innerHTML = `
                <div class="error">
                    <p>Failed to load hits. Please check your connection.</p>
                    <button class="retry-btn">Retry</button>
                </div>
            `;
            const retryBtn = hitsGrid.querySelector('.retry-btn');
            if (retryBtn) retryBtn.addEventListener('click', loadTodayHits);
            if (error.status === 401) {
                const authButtons = document.querySelector(".auth-buttons");
                authButtons?.classList.add('show');
                console.log('Unauthorized: Please log in to access hits.');
            }
        }
    }

    loadTodayHits();

    window.addEventListener('hits:reload', () => {
        loadTodayHits();
    });

    // Listen for track selected event to update playing state on hit cards
    window.addEventListener('track:selected', (e) => {
        const selectedTrackId = e.detail.track.id;
        document.querySelectorAll('.hit-card').forEach(card => {
            if (card.dataset.trackId === selectedTrackId) {
                card.classList.add('playing');
            } else {
                card.classList.remove('playing');
            }
        });
    });
}