/**
 * GET /api/yt?pl=tool|hbl — 홈 '영상으로 보기' 의 유튜브 재생목록을 새로 올린 차례로(사용자 요청 2026-10-19).
 *
 * 재생목록 RSS(feeds/videos.xml?playlist_id=)는 새 형식의 짧은 재생목록 id(PLGjp8KApz6SY)를 받지 않고,
 * 채널 RSS 도 404 를 낸다(2026-10-19 확인). 그래서 재생목록 페이지의 ytInitialData 를 읽는다 —
 * 영상마다 id · 제목 · 길이 · 'N일 전'. 재생목록 순서는 올린 차례가 아니라서 'N일 전' 으로 줄 세우고,
 * 맨 앞이 비기면(Shorts 가 아닌 영상 둘 이상이 같은 'N일 전') 그 영상들의 시청 페이지에서 올린 날짜로 가른다.
 * 정해 둔 두 재생목록만 읽는다 — 아무 주소나 대신 읽어 주지 않게.
 * 결과는 엣지에 30분(_cache.js). 못 읽으면 502 — 홈은 HTML 에 적어 둔 목록을 그대로 둔다.
 *
 *   { ok, pl, items: [{ id, title, short, age(초), up(올린 날짜 — 갈라야 했던 것만) }] }  새 것부터
 */
import { cached, json } from './_cache.js';

const PLAYLISTS = { tool: 'PLGjp8KApz6SY', hbl: 'PLc-_6Tm7aCL4' };
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.5',
  'Cookie': 'CONSENT=YES+cb; SOCS=CAI',   // 유럽 엣지에서 동의 화면으로 넘어가지 않게
};
const UNIT = {
  '초': 1, '분': 60, '시간': 3600, '일': 86400, '주': 604800, '개월': 2592000, '년': 31536000,
  second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2592000, year: 31536000,
};
const FAR = 1e10;   // 'N일 전' 을 못 읽은 영상 — 맨 뒤로

export async function onRequestGet(context) {
  const pl = new URL(context.request.url).searchParams.get('pl');
  const list = PLAYLISTS[pl];
  if (!list) return json({ ok: false, error: 'unknown playlist' }, 400);
  return cached(context, 1800, async () => {
    try {
      const items = await readPlaylist(list);
      if (!items.length) return json({ ok: false, error: 'no videos' }, 502);
      await breakTopTie(items);
      return json({ ok: true, pl, items: items.map(({ id, title, short, age, up }) => ({ id, title, short, age, up })) });
    } catch (e) {
      return json({ ok: false, error: String((e && e.message) || e) }, 502);
    }
  });
}

async function getText(url) {
  const r = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!r.ok) throw new Error('youtube ' + r.status);
  return r.text();
}

async function readPlaylist(list) {
  const html = await getText('https://www.youtube.com/playlist?list=' + list + '&hl=ko&gl=KR');
  const mark = 'var ytInitialData = ';
  const a = html.indexOf(mark);
  const b = a < 0 ? -1 : html.indexOf(';</script>', a);
  if (a < 0 || b < 0) throw new Error('no ytInitialData');
  const data = JSON.parse(html.slice(a + mark.length, b));
  const out = [], seen = new Set();
  (function walk(x) {
    if (Array.isArray(x)) { for (const v of x) walk(v); return; }
    if (!x || typeof x !== 'object') return;
    const l = x.lockupViewModel;
    if (l && l.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO' && /^[\w-]{11}$/.test(l.contentId || '')) {
      if (!seen.has(l.contentId)) { seen.add(l.contentId); out.push(entry(l, out.length)); }
      return;
    }
    for (const k in x) walk(x[k]);
  })(data);
  // 'N일 전' 이 같으면 재생목록에 나중에 넣은 것을 먼저(새 영상은 보통 끝에 붙는다)
  out.sort((p, q) => p.age - q.age || q.pos - p.pos);
  return out;
}

function entry(l, pos) {
  const meta = (l.metadata && l.metadata.lockupMetadataViewModel) || {};
  const title = String((meta.title && meta.title.content) || '');
  let age = FAR;
  const rows = (meta.metadata && meta.metadata.contentMetadataViewModel && meta.metadata.contentMetadataViewModel.metadataRows) || [];
  for (const row of rows) {
    for (const part of row.metadataParts || []) {
      const t = String((part.text && part.text.content) || '');
      const m = t.match(/(\d+)\s*(초|분|시간|일|주|개월|년)\s*전/) || t.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
      if (m) age = Math.min(age, Number(m[1]) * UNIT[m[2].toLowerCase()]);
    }
  }
  const d = JSON.stringify(l.contentImage || {}).match(/"text":"(?:(\d+):)?(\d+):(\d\d)"/);
  const secs = d ? (Number(d[1] || 0) * 3600 + Number(d[2]) * 60 + Number(d[3])) : 0;
  const short = /#shorts\b/i.test(title) || (secs > 0 && secs <= 60);
  return { id: l.contentId, title, short, age, pos, up: '' };
}

// 큰 칸에 놓일 영상(Shorts 가 아닌 첫 영상)이 다른 영상과 'N일 전' 이 같으면 시청 페이지의 올린 날짜로 가른다(셋까지)
async function breakTopTie(items) {
  const vids = items.filter((i) => !i.short);
  if (vids.length < 2 || vids[0].age !== vids[1].age || vids[0].age >= FAR) return;
  const tied = vids.filter((i) => i.age === vids[0].age).slice(0, 3);
  await Promise.all(tied.map(async (i) => {
    try {
      const h = await getText('https://www.youtube.com/watch?v=' + i.id + '&hl=ko');
      const m = h.match(/"uploadDate":"([^"]+)"/) || h.match(/"publishDate":"([^"]+)"/);
      if (m && !isNaN(Date.parse(m[1]))) i.up = m[1];
    } catch (e) { /* 못 읽으면 재생목록 차례 그대로 */ }
  }));
  const t = (i) => (i.up ? Date.parse(i.up) : 0);
  items.sort((p, q) => p.age - q.age || t(q) - t(p) || q.pos - p.pos);
}
