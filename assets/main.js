window.addEventListener('load', () => {
    [...document.getElementsByTagName('img')]
        .map(img => img.draggable = false);

    const mediaPlayer = {
        artwork: document.getElementById('artwork'),
        progressBar: document.getElementById('progress'),
        currentPos: document.getElementById('player-current-pos'),
        endPos: document.getElementById('player-end-pos'),

        artist: document.getElementById('player-artist'),
        title: document.getElementById('player-title'),
        album: document.getElementById('player-album'),

        caption: document.getElementById('music-caption'),
    }

    const updateMediaStatus = async () => {
        const resp =
            await fetch('/api/activity');

        const json = await resp.json();

        if (
            json.progress < currentActivity.progress &&
            json.state === 'playing' &&
            currentActivity.title === json.title
        ) return;

        currentActivity = json || currentActivity;
    }

    const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);

        const formattedSeconds = seconds % 60;
        const formattedMinutes = minutes % 60;

        return `${formattedMinutes}:${formattedSeconds.toString().padStart(2, '0')}`;
    }

    const updatePage = () => {
        if (!currentActivity) return;

        const {
            state,
            title,
            artist,
            album,
            year,
            thumbnail,
            duration,
            progress,
        } = currentActivity;

        if (mediaPlayer.artwork.src !== thumbnail)
            mediaPlayer.artwork.src = thumbnail;
        mediaPlayer.artist.innerText = artist;
        mediaPlayer.title.innerText = title.substring(0, 35);
        mediaPlayer.album.innerText = `${album} (${year})`;

        mediaPlayer.currentPos.innerText = formatTime(progress);
        mediaPlayer.endPos.innerText = formatTime(duration);

        mediaPlayer.progressBar.max = duration;
        mediaPlayer.progressBar.value = progress;

        mediaPlayer.caption.innerText =
            state === 'playing'
                ? 'i\'m currently listening to:'
                : 'i just listened to:';
    }

    const updateAndModifyProgress = () => {
        updatePage();

        if (
            currentActivity.state === 'playing' &&
            currentActivity.progress + 1000 < currentActivity.duration
        ) currentActivity.progress += 1000;
    }

    (async () => {
        updateAndModifyProgress();
        setInterval(updateAndModifyProgress, 1000)

        await updateMediaStatus();
        setInterval(updateMediaStatus, 5 * 1000);
    })();
});


