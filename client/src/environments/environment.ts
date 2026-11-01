// Production: the Go server serves the app, so the socket is same-origin.
const scheme = location.protocol === 'https:' ? 'wss' : 'ws';

export const environment = {
  wsUrl: `${scheme}://${location.host}/ws`,
};
