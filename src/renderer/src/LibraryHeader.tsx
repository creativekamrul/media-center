import type {ReactNode} from 'react'
import {Disc3,Music2,Users,Tags,Folder,Heart,Clock,ListMusic,Radio,Shuffle,Sparkles,BookOpen,Download,SlidersHorizontal,Library,CheckCircle,Podcast} from 'lucide-react'
import {useExperience} from './Experience'
import {collectionIconComponents} from './CollectionControls'

export function LibraryHeader({collection,subtitle,actions,title}:{collection:'music'|'local'|'audiobooks'|'podcasts'|'tools';subtitle:ReactNode;actions?:ReactNode;title?:string}){
  const [prefs]=useExperience(),config=prefs.navigation.collections[collection],Icon=collectionIconComponents[config.icon]
  return <header className="library-heading"><div className="library-heading-identity"><span className="library-heading-icon"><Icon size={30}/></span><div><h1>{title??config.name}</h1><p>{subtitle}</p></div></div><div className="library-heading-actions">{actions}</div></header>
}
const icons={albums:Disc3,songs:Music2,artists:Users,genres:Tags,folders:Folder,favorites:Heart,newest:Sparkles,recent:Clock,frequent:Clock,playlists:ListMusic,radio:Radio,random:Shuffle,mixes:Sparkles,shelves:Library,offline:Download,people:Users,discover:Shuffle,series:BookOpen,podcasts:Podcast,health:CheckCircle,profiles:SlidersHorizontal,recovery:Radio,all:Library,continuing:Clock,finished:CheckCircle}
export function TabIcon({id}:{id:string}){const Icon=icons[id as keyof typeof icons]??Library;return <Icon size={15} aria-hidden="true"/>}
