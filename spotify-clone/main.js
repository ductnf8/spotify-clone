// File: main.js
import {initAuth} from './modules/auth.js';
import {initUser} from './modules/user.js';
import {initHits} from './modules/hits.js';
import {initArtists} from './modules/artists.js';
import {initAlbums} from './modules/albums.js';
import {initPlayer} from './modules/player.js';
import {initPlaylist} from "./modules/playlist.js";
import {initFollowedArtists} from "./modules/followedArtists.js";

// Khởi tạo tất cả logic khi DOM load xong
document.addEventListener("DOMContentLoaded", function () {
    initAuth();
    initUser();
    initHits();
    initArtists();
    initAlbums();
    initPlayer();
    initPlaylist();
    initFollowedArtists()

    // Logic cho logo Spotify và button home: reset về home state
    const logo = document.querySelector('.logo i');
    const homeBtn = document.querySelector('.home-btn');

    const resetToHome = () => {
        // Show lại các section bị ẩn
        const hitsSection = document.querySelector('.hits-section');
        const artistsSection = document.querySelector('.artists-section');
        const albumsSection = document.querySelector('.albums-section');
        if (hitsSection) hitsSection.style.display = 'block';
        if (artistsSection) artistsSection.style.display = 'block';
        if (albumsSection) albumsSection.style.display = 'block';

        // Ẩn hero và controls để tránh hiện sai
        const heroSection = document.querySelector('.artist-hero');
        const artistControls = document.querySelector('.artist-controls');
        const popularSection = document.querySelector('.popular-section');
        if (heroSection) heroSection.style.display = 'none';
        if (artistControls) artistControls.style.display = 'none';
        if (popularSection) popularSection.style.display = 'none';

        // Reload data
        window.dispatchEvent(new Event('hits:reload'));
        window.dispatchEvent(new Event('artists:reload'));
        window.dispatchEvent(new Event('albums:reload'));

        // Scroll to top
        window.scrollTo(0, 0);
        console.log('Reset to home view');
    };

    logo?.addEventListener('click', resetToHome);
    homeBtn?.addEventListener('click', resetToHome);
});