import { useState } from 'react'
import { MoreHorizontal, Play } from 'lucide-react'
import type { QueueItem } from '../../shared/types'
import { api, ListenActions } from './actions'
import { message } from './ui'

export function CardActions({ item, error }: { item: QueueItem; error: (s:string)=>void }) {
  const [busy,setBusy] = useState(false)
  return <>
    <button className="icon-button card-play" aria-label={`Play ${item.title}`} title={`Play ${item.title}`} disabled={busy} onClick={async()=>{setBusy(true);try{await api.play({queue:[item],index:0})}catch(e){error(message(e))}finally{setBusy(false)}}}><Play size={19}/></button>
    <details className="card-more"><summary aria-label={`More actions for ${item.title}`} title="More actions"><MoreHorizontal size={18}/></summary><ListenActions items={[item]} error={error} hidePlay/></details>
  </>
}

