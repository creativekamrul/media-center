import {createPortal} from 'react-dom'
import type {ReactNode} from 'react'
import {Modal} from './actions'

export function DowntifyDrawer({title,close,children,wide=false}:{title:string;close:()=>void;children:ReactNode;wide?:boolean}){
 return createPortal(<div className={`dt-drawer-host${wide?' wide':''}`}><Modal title={title} close={close}>{children}</Modal></div>,document.body)
}
