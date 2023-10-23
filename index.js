import express from 'express';
import fs from 'fs';
import path from 'path';
import superagent from 'superagent';

const {
    TAUTULLI_HOST: apiHost,
    TAUTULLI_KEY: apiKey,
    PLEX_USERNAME: plexUsername,
} = process.env;

const cwd = process.cwd();
const app = express();

let currentActivity = {};
const getPlexActivies = () => new Promise(resolve => {
    superagent('GET', `${apiHost}/api/v2`)
        .set('content-type', 'application/json')
        .query({
            apikey: apiKey,
            cmd: 'get_activity'
        })
        .then(resp => {
            return resolve(
                resp.body?.response?.data);
        })
        .catch(error => {
            console.log('Failed to fetch activities from Tautulli',
                error.response ? error.response.text : error);

            return resolve();
        })
});

//https://tautulli.danny.ink/pms_image_proxy/?img=%2Flibrary%2Fmetadata%2F29276%2Fthumb%2F1691985930&rating_key=29276&width=300&height=300&opacity=100&background=282828&fallback=cover&refresh=true
const getImageURL = (url) =>
    `${apiHost}/pms_image_proxy?img=${encodeURIComponent(url)}&width=300&height=300&opacity=100&background=282828&fallback=cover&refresh=true`;

const fetchAndUpdateActivity = async () => {
    const activies = await getPlexActivies();
    if (!activies || !activies.sessions) return;

    const session = activies.sessions.find(session => session.user === plexUsername);
    if (!session) return;

    let {
        state, // playing, paused
        title, // name of song
        parent_title, // name of album
        grandparent_title, // name of artist
        year, // year of album

        media_type, // track
        thumb,

        duration, // length of song in ms
        progress_percent, // progress of song in percent
    } = session;

    if (media_type !== 'track') return;
    if (!year) year = 'XXXX';

    duration = Number(duration);
    progress_percent = Number(progress_percent);

    currentActivity = {
        state,
        title,
        album: parent_title,
        artist: grandparent_title,
        year,
        thumbnail: getImageURL(thumb),
        duration: duration,
        progress: Math.ceil(duration * (progress_percent / 100)),
    }
}

app.use('/assets', express.static(path.join(cwd, 'assets')));

app.get('/', (req, resp) => {
    const index = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf-8');
    return resp.send(
        index.replace(/{%%}/g, JSON.stringify(currentActivity))
    );
});

app.get('/api/activity', express.json(), async (_req, resp) => {
    return resp.send(currentActivity);
});

app.get('*', (req, resp) => {
    resp.redirect(`https://s.danny.ink${req.url}`);
})

await fetchAndUpdateActivity();

app.listen(8080, () => {
    console.log('Listening on port 8080');
});

while (true) {
    await new Promise(resolve => setTimeout(resolve, 5 * 1000));
    await fetchAndUpdateActivity();
}
