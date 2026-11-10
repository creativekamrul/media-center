/** Portable playlists reference completed files only, never stream URLs. */
export type DownloadedTrack = {
  identity: string;
  title: string;
  artist: string;
  durationSeconds: number;
  /** Path relative to the selected export root, after storage publication. */
  relativePath: string;
  state: 'complete' | 'pending' | 'failed';
};
function pathSegments(path: string): string[] {
  if (!path || path.startsWith('/') || /[:\\\r\n\x00-\x1f]/.test(path)) throw new Error('Export requires a relative local path');
  const parts = path.split('/');
  if (parts.some(p => !p || p === '.' || p === '..')) throw new Error('Invalid export path');
  return parts;
}
function line(value: string): string { return value.replace(/[\r\n\x00-\x1f]/g,' ').trim(); }
export function createPlaylist(playlistPath: string, tracks: DownloadedTrack[], allowPartial = false) {
  const parent = pathSegments(playlistPath).slice(0,-1);
  const missing = tracks.filter(t => t.state !== 'complete').map(t => t.identity);
  if (missing.length && !allowPartial) throw new Error('Playlist contains incomplete downloads');
  const lines = ['#EXTM3U'];
  for (const track of tracks) {
    if (track.state !== 'complete') continue;
    const parts = pathSegments(track.relativePath);
    let common = 0;
    while (common < parent.length && common < parts.length && parent[common] === parts[common]) common++;
    const relative = [...parent.slice(common).map(()=>'..'),...parts.slice(common)].join('/');
    const seconds = Number.isFinite(track.durationSeconds) && track.durationSeconds >= 0 ? Math.floor(track.durationSeconds) : -1;
    lines.push(`#EXTINF:${seconds},${line(track.artist)} - ${line(track.title)}`);
    // A leading # is a comment in M3U, so make such a filename explicitly relative.
    lines.push(relative.startsWith('#') ? './'+relative : relative);
  }
  return {text: lines.join('\n')+'\n', missing, count: tracks.length-missing.length};
}
