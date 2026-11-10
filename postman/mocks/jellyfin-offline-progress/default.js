// Local-only transport fixture. Never deploy: reads a generated test video from disk.
const http = require('http');
const fs = require('fs');
const path = require('path');
const video = process.env.MEDIA_CENTER_VIDEO_FIXTURE || path.join(process.cwd(), 'artifacts/mobile-native-tests/video-fixture.mp4');
const seconds = Number(process.env.MEDIA_CENTER_VIDEO_FIXTURE_SECONDS || 5);
const movie = { Id: '33333333333333333333333333333333', Type: 'Movie', Name: 'MC Playback Fixture', RunTimeTicks: seconds * 10000000,
  Overview: 'Disposable generated test pattern, not library content.', MediaSources: [{Id:'44444444444444444444444444444444'}], UserData: { PlaybackPositionTicks: 0, Played:false, PlayCount:0, LastPlayedDate:'initial' }, Genres: ['Test fixture'] };
const events = [];
const requests = [];
let failStream = false, mode='';
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture');
  const p = url.pathname;
  const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  let data;
  // Postman's interceptor has already parsed the body; direct Node execution has not.
  if (req.body !== undefined && req.body !== null) {
    try { data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body; } catch { return send(400, {}); }
  }
  else {
    let body = '';
    for await (const part of req) { body += part; if (body.length > 65536) return send(413, {}); }
    try { data = body ? JSON.parse(body) : {}; } catch { return send(400, {}); }
  }
  if(p==='/__state')return send(200,{movie,events,requests,mode});
  if(p==='/__control'){if(data.mode!==undefined)mode=data.mode;if(data.position!==undefined)movie.UserData.PlaybackPositionTicks=data.position*10000000;if(data.finished!==undefined)movie.UserData.Played=data.finished;return send(200,{ok:true});}
  if(mode==='offline'&&!p.startsWith('/__'))return send(503,{error:'Generated outage'});
  if (p === '/__events') return send(200, events);
  if (p === '/__requests') return send(200, requests);
  if (p === '/__reset' && req.method === 'POST') { events.length = 0; requests.length = 0; failStream = data.failStream === true; return send(200, { reset: true }); }
  requests.push({ method:req.method, path:p, static:url.searchParams.get('Static'), source:url.searchParams.get('MediaSourceId'), authorized:req.headers['x-emby-token']==='fixture-token'||String(req.headers.authorization||'').includes('fixture-token') }); if(requests.length>1000)requests.shift();
  if (p === '/Users/AuthenticateByName' && req.method === 'POST') {
    return data.Username === 'fixture-user' && data.Pw === 'fixture-secret'
      ? send(200, { AccessToken: 'fixture-token', User: { Id: '11111111111111111111111111111111' } }) : send(401, {});
  }
  if (p === '/System/Info/Public') return send(200, { Version: '10.11.11', ServerName: 'MC Fixture' });
  if (p === '/Users/Me') return send(200, { Id: '11111111111111111111111111111111' });
  if (p === '/Users/11111111111111111111111111111111/Views') return send(200, { Items: [{ Id: 'fixture-library', Type: 'CollectionFolder', Name: 'MC Fixture Movies' }], TotalRecordCount: 1 });
  if (p === '/Users/11111111111111111111111111111111/Items/Resume') return send(200, { Items: [], TotalRecordCount: 0 });
  if (p === '/Items') return send(200, { Items: [movie], TotalRecordCount: 1 });
  if (p === '/Users/11111111111111111111111111111111/Items/33333333333333333333333333333333') return send(200, movie);
  if (p === '/Items/33333333333333333333333333333333/PlaybackInfo') return send(200, { PlaySessionId: 'fixture-session', MediaSources: [{ Id: '44444444444444444444444444444444', Container: 'mp4', Protocol: 'File', RequiresOpening: false, IsInfiniteStream: false }] });
  if (/^\/Sessions\/Playing(?:\/(?:Progress|Stopped))?$/.test(p) && req.method === 'POST') {
    if (data.ItemId !== movie.Id || !Number.isFinite(data.PositionTicks) || data.PositionTicks < 0) return send(400, {});
    if(p!=='/Sessions/Playing/Stopped'||Object.keys(data).some(k=>!['ItemId','MediaSourceId','PositionTicks','Failed'].includes(k)))return send(400,{error:'Offline sync must not invent sessions or listening deltas'});
    if(mode==='before')return send(503,{error:'Before write'});events.push({ event: p.split('/').pop(), ...data });movie.UserData.PlaybackPositionTicks=data.PositionTicks;movie.UserData.LastPlayedDate=String(events.length);if(mode==='after')return send(503,{error:'Applied but response failed'});
    res.writeHead(204); return res.end();
  }
  if (p === '/Videos/33333333333333333333333333333333/stream') {
    if (failStream) return send(503, { error: 'Explicit test fault' });
    if (!fs.existsSync(video)) return send(503, { error: 'Generate the documented test video first' });
    const size = fs.statSync(video).size;
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
    const headers = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 };
    if (range) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    res.writeHead(range ? 206 : 200, headers);
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(video, { start, end });
    stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); return stream.pipe(res);
  }
  if (/^\/(Items|Users\/fixture-user\/Items)\//.test(p)) return send(404, { error: 'Unknown fixture item' });
  return send(501, { error: 'Not modeled by this fixture' });
}).listen(process.env.PORT || 18550, '127.0.0.1');
