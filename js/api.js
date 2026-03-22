// ═══════════════════════════════════════════════
// ANILIST API
// ═══════════════════════════════════════════════

const AL = 'https://graphql.anilist.co';

async function alQ(q, v = {}) {
  const r = await fetch(AL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, variables: v })
  });
  const d = await r.json();
  if (d.errors) throw new Error(d.errors[0].message);
  return d.data;
}

const CF = `id title{romaji english native}coverImage{large extraLarge}bannerImage averageScore popularity genres status startDate{year month day}episodes nextAiringEpisode{episode timeUntilAiring}format season seasonYear idMal`;

async function fetchTrending(s = 'WINTER', y = 2025) {
  const d = await alQ(`query($s:MediaSeason,$y:Int){Page(perPage:16){media(season:$s,seasonYear:$y,sort:TRENDING_DESC,type:ANIME,isAdult:false){${CF}}}}`, { s, y });
  return d.Page.media;
}

async function fetchTopRated() {
  const d = await alQ(`query{Page(perPage:12){media(sort:SCORE_DESC,type:ANIME,isAdult:false){${CF}}}}`);
  return d.Page.media;
}

async function fetchAiringSchedule() {
  const now = Math.floor(Date.now() / 1000), w = now + 7 * 24 * 3600;
  const d = await alQ(`query($a:Int,$b:Int){Page(perPage:50){airingSchedules(airingAt_greater:$a,airingAt_lesser:$b,sort:TIME){id episode timeUntilAiring media{id title{romaji english}coverImage{large extraLarge}averageScore}}}}`, { a: now, b: w });
  return d.Page.airingSchedules;
}

async function fetchAnimeDetail(id) {
  const d = await alQ(`query($id:Int){Media(id:$id,type:ANIME){
    ${CF} description(asHtml:false) duration
    studios{edges{isMain node{id name siteUrl}}}
    staff{edges{role node{id name{full}}}}
    streamingEpisodes{title thumbnail url site}
    relations{edges{relationType(version:2)node{${CF}}}}
    externalLinks{id url site color icon}
    rankings{id rank type context season year allTime}
    tags{id name description rank isGeneralSpoiler isMediaSpoiler isAdult}
    source trailer{id site}
    endDate{year month day}
  }}`, { id });
  return d.Media;
}

async function searchAnime(q) {
  const d = await alQ(`query($q:String){Page(perPage:8){media(search:$q,type:ANIME,isAdult:false,sort:SEARCH_MATCH){${CF}}}}`, { q });
  return d.Page.media;
}

async function fetchBrowse({ genre, year, status, sort, page = 1 } = {}) {
  const v = { sort: [sort || 'TRENDING_DESC'], page, perPage: 24 };
  if (genre) v.genre = genre;
  if (year) v.year = parseInt(year);
  if (status) v.status = status;
  const d = await alQ(`query($sort:[MediaSort],$page:Int,$perPage:Int,$genre:String,$year:Int,$status:MediaStatus){Page(page:$page,perPage:$perPage){pageInfo{hasNextPage}media(sort:$sort,type:ANIME,isAdult:false,genre:$genre,seasonYear:$year,status:$status){${CF}}}}`, v);
  return d.Page;
}

async function fetchAnimeByIds(ids) {
  if (!ids || !ids.length) return [];
  const d = await alQ(`query($ids:[Int]){Page(perPage:50){media(id_in:$ids,type:ANIME){${CF}}}}`, { ids });
  return d.Page.media;
}

// ═══════════════════════════════════════════════
// MAL API (via Jikan — free, unofficial MAL wrapper)
// ═══════════════════════════════════════════════

const JIKAN = 'https://api.jikan.moe/v4';

async function fetchMALByTitle(title) {
  try {
    const r = await fetch(`${JIKAN}/anime?q=${encodeURIComponent(title)}&limit=1&sfw=true`);
    const d = await r.json();
    return d.data?.[0] || null;
  } catch (e) { return null; }
}

async function fetchMALById(malId) {
  try {
    const r = await fetch(`${JIKAN}/anime/${malId}/full`);
    const d = await r.json();
    return d.data || null;
  } catch (e) { return null; }
}
