import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ListeningStats } from '../../shared/daily'
import { listeningDays } from '../../shared/listening-days'

const time = (seconds: number) => seconds <= 0 ? '—' : seconds < 60 ? `${Math.max(1,Math.round(seconds))}s` : seconds < 3600 ? `${Math.floor(seconds/60)}m` : `${Math.floor(seconds/3600)}h ${Math.floor(seconds%3600/60)}m`
export function ListeningBreakdown({ rows }: { rows: ListeningStats['days'] }) {
  const [quiet,setQuiet] = useState(false)
  const days = listeningDays(rows).reverse(), active = days.filter(d=>d.seconds>0), shown = quiet ? days : active
  const other = (d: ListeningStats['days'][number]) => Math.max(0,d.seconds-d.music-d.books-d.podcasts-d.local)
  const hasOther = days.some(d=>other(d)>1)
  return <details className="listening-breakdown">
    <summary><div><strong>Daily listening breakdown</strong><span>{active.length} active {active.length===1?'day':'days'} in the last 30 days</span></div><ChevronDown size={18}/></summary>
    <div className="breakdown-toolbar"><span>Most recent first · Listening time</span><label className="check-field"><input type="checkbox" checked={quiet} onChange={e=>setQuiet(e.target.checked)}/>Show quiet days</label></div>
    {shown.length ? <div className="breakdown-scroll" role="region" aria-label="Daily listening totals" tabIndex={0}><table>
      <caption className="sr-only">Daily listening time by media type, most recent first</caption>
      <thead><tr><th scope="col">Day</th><th scope="col">Total</th><th scope="col">Music</th><th scope="col">Books</th><th scope="col">Podcasts</th><th scope="col">Local</th>{hasOther&&<th scope="col">Other</th>}</tr></thead>
      <tbody>{shown.map(d=><tr key={d.day} className={d.seconds>0?'':'quiet-day'}><th scope="row"><time dateTime={d.day}>{new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time><small>{new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined,{weekday:'short'})}</small></th><td className="breakdown-total">{time(d.seconds)}</td><td>{time(d.music)}</td><td>{time(d.books)}</td><td>{time(d.podcasts)}</td><td>{time(d.local)}</td>{hasOther&&<td>{time(other(d))}</td>}</tr>)}</tbody>
    </table></div> : <p className="breakdown-empty">Your daily totals will appear here after you listen. Turn on Show quiet days to see the full calendar.</p>}
  </details>
}
