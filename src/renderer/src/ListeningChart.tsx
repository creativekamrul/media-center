import type { ListeningStats } from '../../shared/daily'
import { listeningDays } from '../../shared/listening-days'

export function ListeningChart({ rows }: { rows: ListeningStats['days'] }) {
  const days = listeningDays(rows), maximum = Math.max(60, ...days.map(d => d.seconds))
  const label = (seconds: number) => seconds < 60 ? `${Math.round(seconds)}s` : seconds < 3600 ? `${Math.round(seconds/60)}m` : `${(seconds/3600).toFixed(1)}h`
  const dateLabel = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {month:'short',day:'numeric'})
  return <figure className="listening-chart">
    <svg viewBox="0 0 800 210" role="img" aria-label="Listening time over the last 30 days">
      {[0, .5, 1].map(f => <g key={f}><line x1="44" x2="794" y1={170-f*144} y2={170-f*144}/><text x="36" y={174-f*144} textAnchor="end">{label(maximum*f)}</text></g>)}
      {days.map((d,i) => <rect className="listening-bar" key={d.day} x={49+i*25} y={170-d.seconds/maximum*144} width="15" height={d.seconds/maximum*144} rx="3"><title>{dateLabel(d.day)}: {label(d.seconds)} listened</title></rect>)}
      {[0,7,14,21,29].map(i => <text key={i} x={49+i*25} y="197" textAnchor={i===29?'end':'start'}>{dateLabel(days[i].day)}</text>)}
    </svg>
    <figcaption>{days.some(d=>d.seconds>0) ? 'Time listened each day · Hover over a bar for details.' : 'No listening recorded in the last 30 days. Play something to start your chart.'}</figcaption>
  </figure>
}
