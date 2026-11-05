import {useState} from 'react'
import {coverPrintPath} from '../../shared/cover-print'

export function CoverImage({src,title}:{src?:string|null;title:string}) {
  const [failed,setFailed] = useState<string>()
  const useOriginal = !!src && failed !== src
  return <img alt="" decoding="async" src={useOriginal ? src : './' + coverPrintPath(title)}
    onError={useOriginal ? () => setFailed(src) : undefined}/>
}
