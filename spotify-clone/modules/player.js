// File: modules/player.js
import httpRequest from '../utils/httpRequest.js';

export function initPlayer() {
    const player = document.querySelector('.player');
    const playerImage = player?.querySelector('.player-image');
    const playerTitle = player?.querySelector('.player-title');
    const playerArtist = player?.querySelector('.player-artist');
    const playBtn = player?.querySelector('.play-btn');
    const prevBtn = player?.querySelector('.control-btn:has(.fa-step-backward)');
    const nextBtn = player?.querySelector('.control-btn:has(.fa-step-forward)');
    const shuffleBtn = player?.querySelector('.control-btn:has(.fa-random)');
    const repeatBtn = player?.querySelector('.control-btn:has(.fa-redo)');
    const volumeBtn = player?.querySelector('.control-btn:has(.fa-volume-down,.fa-volume-up,.fa-volume-mute)');
    const progressBar = player?.querySelector('.progress-bar');
    const progressFill = player?.querySelector('.progress-fill');
    const progressHandle = player?.querySelector('.progress-handle');
    const currentTime = player?.querySelector('.time:first-child');
    const totalTime = player?.querySelector('.time:last-child');

    const audio = new Audio();
    let currentTrack = null;
    let currentQueue = [];
    let currentIndex = 0;
    let previousVolume = audio.volume || 1;
    let isShuffled = false;
    let repeatMode = 'off'; // off → all → one
    // let isDraggingProgress = false;
    let isTrackLoading = false;
    let playedTracks = new Set(); // ✅ Lưu các bài đã phát trong chế độ random

    console.log('Player DOM elements:', {playBtn, prevBtn, nextBtn, shuffleBtn, repeatBtn});

    // 🧭 Tooltip cho nút điều khiển
    function addTooltips() {
        const controlButtons = player?.querySelectorAll('.control-btn');
        controlButtons.forEach(btn => {
            const icon = btn.querySelector('i');
            let tooltipText = '';
            if (icon.classList.contains('fa-random'))
                tooltipText = btn.classList.contains('active') ? 'Tắt random' : 'Random bài hát';
            else if (icon.classList.contains('fa-step-backward')) tooltipText = 'Bài trước';
            else if (icon.classList.contains('fa-play')) tooltipText = 'Phát';
            else if (icon.classList.contains('fa-pause')) tooltipText = 'Tạm dừng';
            else if (icon.classList.contains('fa-step-forward')) tooltipText = 'Bài tiếp theo';
            else if (icon.classList.contains('fa-redo')) tooltipText = 'Lặp lại tất cả';
            else if (icon.classList.contains('fa-volume-mute')) tooltipText = 'Tắt tiếng';
            else if (icon.classList.contains('fa-volume-up') || icon.classList.contains('fa-volume-down'))
                tooltipText = 'Âm lượng';

            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            btn.appendChild(tooltip);
        });
    }

    // 🎵 Cập nhật UI khi phát bài mới
    async function updatePlayerUI(track, queue, index) {
        if (isTrackLoading) return;
        isTrackLoading = true;

        currentTrack = track;
        currentQueue = queue || [];
        currentIndex = index ?? 0;

        playerImage.src = track.image_url || 'placeholder.svg?height=56&width=56';
        playerTitle.textContent = track.title || 'Unknown Track';
        playerArtist.textContent = track.artist_name || 'Unknown Artist';
        totalTime.textContent = formatDuration(track.duration || 0);

        if (track.audio_url && audio.src !== track.audio_url) {
            audio.pause();
            audio.src = track.audio_url;
            audio.load();
            audio.volume = previousVolume || 1;
            updateVolumeIcon();

            try {
                await audio.play();
                playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
            } catch (error) {
                console.error('Error playing audio:', error);
                playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
            }
        }

        document.querySelectorAll('.hit-card, .track-item').forEach(card => {
            card.classList.remove('playing');
            if (card.dataset.trackId === track.id) card.classList.add('playing');
        });

        isTrackLoading = false;
    }

    function formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    function togglePlayPause() {
        if (audio.paused) {
            audio.play().then(() => {
                playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
            }).catch(error => console.error('Error playing audio:', error));
        } else {
            audio.pause();
            playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
        }
    }

    function playTrackAtIndex(index) {
        if (index >= 0 && index < currentQueue.length) {
            currentIndex = index;
            currentTrack = currentQueue[index];
            updatePlayerUI(currentTrack, currentQueue, currentIndex);
        }
    }

    // ⏮ Bài trước (đã thêm logic: >2s thì phát lại, <2s thì về bài trước)
    prevBtn?.addEventListener('click', () => {
        if (!audio.duration) return;

        // ✅ Nếu bài hát đã chạy hơn 2 giây → phát lại bài hiện tại
        if (audio.currentTime > 2) {
            audio.currentTime = 0;
            audio.play().catch(err => console.error('Error restarting track:', err));
            console.log('[Player] Restart current track');
            return;
        }

        // ✅ Nếu chưa đến 2 giây → chuyển về bài trước
        if (isShuffled) {
            const availableTracks = currentQueue.filter(t => t.id !== currentTrack?.id);
            const prevTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
            const prevIndex = currentQueue.findIndex(t => t.id === prevTrack.id);
            playTrackAtIndex(prevIndex);
        } else {
            let prevIndex = currentIndex - 1;
            if (prevIndex < 0) prevIndex = currentQueue.length - 1;
            playTrackAtIndex(prevIndex);
        }
    });

    // ⏭ Bài tiếp theo (có xét bài đã phát)
    nextBtn?.addEventListener('click', () => {
        if (isShuffled) {
            let unplayed = currentQueue.filter(t => !playedTracks.has(t.id));
            if (unplayed.length === 0) {
                playedTracks.clear();
                unplayed = currentQueue.filter(t => t.id !== currentTrack?.id);
            }
            const nextTrack = unplayed[Math.floor(Math.random() * unplayed.length)];
            playedTracks.add(nextTrack.id);
            const nextIndex = currentQueue.findIndex(t => t.id === nextTrack.id);
            playTrackAtIndex(nextIndex);
        } else {
            let nextIndex = currentIndex + 1;
            if (nextIndex >= currentQueue.length) nextIndex = 0;
            playTrackAtIndex(nextIndex);
        }
    });

    // 🔀 Bật / Tắt Random
    shuffleBtn?.addEventListener('click', () => {
        isShuffled = !isShuffled;
        shuffleBtn.classList.toggle('active');
        if (isShuffled) playedTracks.clear();
        const tooltip = shuffleBtn.querySelector('.tooltip');
        if (tooltip) tooltip.textContent = isShuffled ? 'Tắt random' : 'Random bài hát';
        console.log('[Player] Shuffle mode:', isShuffled ? 'ON' : 'OFF');
    });

    // 🔁 Repeat mode: off → all → one
    repeatBtn?.addEventListener('click', () => {
        if (repeatMode === 'off') {
            repeatMode = 'all';
            repeatBtn.classList.add('active');
        } else if (repeatMode === 'all') {
            repeatMode = 'one';
            repeatBtn.classList.add('single');
        } else {
            repeatMode = 'off';
            repeatBtn.classList.remove('active', 'single');
        }

        const tooltip = repeatBtn.querySelector('.tooltip');
        if (tooltip) {
            tooltip.textContent =
                repeatMode === 'off'
                    ? 'Lặp lại tất cả'
                    : repeatMode === 'all'
                        ? 'Lặp lại bài này'
                        : 'Tắt lặp lại';
        }
        console.log('[Player] Repeat mode:', repeatMode);
    });

    // 🔊 Cập nhật icon âm lượng
    function updateVolumeIcon() {
        const volumeIcon = volumeBtn?.querySelector('i');
        if (volumeIcon) {
            volumeIcon.classList.remove('fa-volume-mute', 'fa-volume-down', 'fa-volume-up');
            if (audio.volume === 0) volumeIcon.classList.add('fa-volume-mute');
            else if (audio.volume < 0.5) volumeIcon.classList.add('fa-volume-down');
            else volumeIcon.classList.add('fa-volume-up');
        }
    }

    volumeBtn?.addEventListener('click', () => {
        const icon = volumeBtn.querySelector('i');
        if (audio.volume > 0) {
            previousVolume = audio.volume;
            audio.volume = 0;
        } else {
            audio.volume = previousVolume || 1;
        }
        updateVolumeIcon();
    });

    // 🎚️ Thanh tiến trình nâng cao
    let isHoveringProgress = false;
    let isDraggingProgress = false;
    let hoverPercentage = 0;

    // 🎚️ Thanh tiến trình tối ưu
    function updateProgressDisplay(percentage) {
        progressFill.style.width = `${percentage}%`;
        if (progressHandle) progressHandle.style.left = `${percentage}%`;
    }

// Hover → chỉ đổi màu fill
    progressBar?.addEventListener('mouseenter', () => {
        progressBar.classList.add('hovering');
    });
    progressBar?.addEventListener('mouseleave', () => {
        progressBar.classList.remove('hovering');
    });

// Click chuột vào progress-bar → tua nhạc đến vị trí tương ứng
    progressBar?.addEventListener('click', (e) => {
        if (!audio.duration || isDraggingProgress) return;
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
        const newTime = (percentage / 100) * audio.duration;
        audio.currentTime = newTime;
        updateProgressDisplay(percentage);
    });

// Kéo handle để tua
    progressHandle?.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDraggingProgress = true;
        progressBar.classList.add('dragging');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDraggingProgress || !audio.duration) return;

        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        updateProgressDisplay(percentage);
    });

    document.addEventListener('mouseup', (e) => {
        if (!isDraggingProgress || !audio.duration) return;
        isDraggingProgress = false;
        progressBar.classList.remove('dragging');

        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const newTime = (percentage / 100) * audio.duration;

        audio.currentTime = newTime;
        updateProgressDisplay(percentage);

        // Nếu bài đang tạm dừng thì phát lại
        if (audio.paused) {
            audio.play().catch(err => console.error('Error resuming audio:', err));
        }
    });


    // 🧹 Reset player
    window.addEventListener('reset:player', () => {
        currentTrack = null;
        currentQueue = [];
        currentIndex = 0;
        isShuffled = false;
        repeatMode = 'off';
        playedTracks.clear();
        audio.pause();
        audio.src = '';
        playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
        playerImage.src = 'placeholder.svg?height=56&width=56';
        playerTitle.textContent = 'Unknown Track';
        playerArtist.textContent = 'Unknown Artist';
        totalTime.textContent = '0:00';
        currentTime.textContent = '0:00';
        progressFill.style.width = '0%';
        if (progressHandle) progressHandle.style.left = '0%';
        shuffleBtn?.classList.remove('active');
        repeatBtn?.classList.remove('active', 'single');
        console.log('Player reset');
    });

    // 📀 Khi chọn bài mới
    window.addEventListener('track:selected', (e) => {
        const track = e.detail.track;
        const queue = e.detail.queue || [];
        currentQueue = queue;
        currentIndex = queue.findIndex(t => t.id === track.id) || 0;
        playedTracks.clear();
        updatePlayerUI(track, queue, currentIndex);
    });

    playBtn?.addEventListener('click', togglePlayPause);

    // ⏱ Cập nhật thời gian
    audio.addEventListener('timeupdate', () => {
        if (audio.duration && !isDraggingProgress) {
            const percent = (audio.currentTime / audio.duration) * 100;
            updateProgressDisplay(percent);
            currentTime.textContent = formatDuration(Math.floor(audio.currentTime));
        }
    });

    // 🔚 Khi bài hát kết thúc
    audio.addEventListener('ended', () => {
        console.log(`[Player] Track ended: ${currentTrack?.title || 'Unknown'} (id=${currentTrack?.id})`);

        if (repeatMode === 'one') {
            audio.currentTime = 0;
            audio.play().catch(err => console.error('Replay error:', err));
            return;
        }

        if (isShuffled) {
            playedTracks.add(currentTrack.id);
            let unplayed = currentQueue.filter(t => !playedTracks.has(t.id));
            if (unplayed.length === 0) {
                playedTracks.clear();
                unplayed = currentQueue.filter(t => t.id !== currentTrack.id);
            }
            const next = unplayed[Math.floor(Math.random() * unplayed.length)];
            playedTracks.add(next.id);
            const idx = currentQueue.findIndex(t => t.id === next.id);
            playTrackAtIndex(idx);
            return;
        }

        if (repeatMode === 'all') {
            let nextIndex = currentIndex + 1;
            if (nextIndex >= currentQueue.length) nextIndex = 0;
            playTrackAtIndex(nextIndex);
            return;
        }

        if (currentIndex < currentQueue.length - 1) {
            playTrackAtIndex(currentIndex + 1);
        } else {
            playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
            console.log('[Player] Queue ended');
        }
    });

    addTooltips();
}
