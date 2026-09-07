import type { ItemDetail, Library, LibraryItem } from '../../shared/types'

export const sampleLibraries: Library[] = [
  { id: 'music', serverId: 'sample', kind: 'music', name: 'The record collection' },
  { id: 'books', serverId: 'sample', kind: 'audiobooks', name: 'The listening shelf' },
  { id: 'podcasts', serverId: 'sample', kind: 'podcasts', name: 'Following along' }
]
const base = { serverId: 'sample', description: 'Sample content for exploring the interface. Connect your own server to browse and play your collection.' }
export const sampleItems: LibraryItem[] = [
  ...[['Blue Hour', 'The Sunday Sessions', 2024], ['Quiet Geometry', 'North of Here', 2023], ['Tidal', 'Mira Sol', 2025], ['A Place to Land', 'The Lowlands', 2022], ['After the Rain', 'Juniper', 2024], ['In Good Time', 'Solstice Ensemble', 2021], ['Other Rooms', 'Daniel West', 2025], ['Slow Motion', 'Paper Satellites', 2023]].map(([title, subtitle, year], i) => ({ ...base, kind: 'album' as const, id: `album-${i}`, libraryId: 'music', title: String(title), subtitle: String(subtitle), year: Number(year), trackCount: 8 })),
  ...[['The Long Way Home', 'Eleanor Hayes'], ['An Ocean of Stars', 'Isaac Bell'], ['The Art of Noticing', 'Clara Winters'], ['Where the Wild Things Grow', 'Samuel Reed'], ['Small Hours', 'Nora Ellis'], ['Beyond the Horizon', 'James Morgan']].map(([title, author], i) => ({ ...base, kind: 'audiobook' as const, id: `book-${i}`, libraryId: 'books', title, subtitle: author, authors: [author], narrators: ['Alex Harper'], series: i === 0 ? ['The North Country'] : [], duration: 28800 + i * 1800, tracks: [{ index: 1, title: 'Part One', startOffset: 0, duration: 14400 }, { index: 2, title: 'Part Two', startOffset: 14400, duration: 14400 + i * 1800 }], chapters: Array.from({ length: 12 }, (_, n) => ({ id: n, title: n === 0 ? 'The beginning' : `Chapter ${n + 1}`, start: n * (2400 + i * 150), end: (n + 1) * (2400 + i * 150) })) })),
  ...[['The Curious Mind', 'A little more understanding'], ['Design, Considered', 'Conversations about the everyday'], ['Field Notes', 'Stories from outside'], ['Between the Lines', 'Good books. Better conversations.']].map(([title, subtitle], i) => ({ ...base, kind: 'podcast-show' as const, id: `show-${i}`, libraryId: 'podcasts', title, subtitle, author: subtitle, episodeCount: 4, episodes: ['A different way of seeing', 'The things we keep', 'Finding your own rhythm', 'Making room for wonder'].map((name, e) => ({ kind: 'podcast-episode' as const, id: `episode-${i}-${e}`, showId: `show-${i}`, serverId: 'sample', title: name, description: 'A sample episode. Episodes belong to a podcast show and have their own playback progress.', publishedAt: Date.UTC(2026, 8, 5 - e * 7), duration: 2100 + e * 300, downloaded: e !== 3 })) }))
]
export function sampleDetail(item: LibraryItem): ItemDetail {
  if (item.kind === 'album') return { kind: 'album', item, tracks: ['First Light', 'A Little Further', 'Blue Hour', 'Passing Through', 'Everything in Its Place', 'The Long Afternoon', 'Almost Home', 'Stay Awhile'].map((title, i) => ({ kind: 'music-track', id: `${item.id}-track-${i}`, serverId: 'sample', title, artist: item.subtitle, album: item.title, duration: 180 + i * 21, codec: 'flac', sampleRate: 96000, bitDepth: 24 })) }
  return item.kind === 'audiobook' ? { kind: 'audiobook', item } : { kind: 'podcast-show', item }
}
