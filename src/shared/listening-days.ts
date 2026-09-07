import type { ListeningStats } from './daily'

/** Calendar arithmetic keeps the chart on local dates across DST and month boundaries. */
export function listeningDays(rows: ListeningStats['days'], now = new Date()): ListeningStats['days'] {
  const byDay = new Map(rows.map(row => [row.day, row]))
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + index)
    const day = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    return byDay.get(day) ?? { day, seconds: 0, music: 0, books: 0, podcasts: 0, local: 0 }
  })
}
