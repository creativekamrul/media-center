import type {CSSProperties} from 'react'
import {fontCss} from '../../shared/appearance'
import type {PlayingScreenPreferences} from '../../shared/playing-screen'
export function lyricAppearanceStyle(prefs:PlayingScreenPreferences):CSSProperties {return {'--lyric-size':`${prefs.fontSize}px`,'--screen-lyric-font':prefs.font==='theme'?'var(--lyrics-font)':fontCss(prefs.font),'--lyric-weight':prefs.weight,'--lyric-align':prefs.alignment,'--lyric-word-spacing':`${prefs.wordSpacing??0}em`,'--lyric-row-gap':`${Math.max(0,prefs.lineHeight-1)*24}px`,'--lyric-leading':prefs.lineHeight,'--lyric-base':prefs.textColor,'--lyric-sung':prefs.sungColor,'--lyric-word':prefs.wordColor,'--lyric-dim':prefs.inactiveOpacity,'--lyric-glow':`${prefs.glow}px`,'--backdrop-dim':prefs.backdropDim} as CSSProperties}
