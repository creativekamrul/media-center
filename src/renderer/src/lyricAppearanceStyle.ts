import type {CSSProperties} from 'react'
import {fonts} from '../../shared/appearance'
import type {PlayingScreenPreferences} from '../../shared/playing-screen'
export function lyricAppearanceStyle(prefs:PlayingScreenPreferences):CSSProperties {return {'--lyric-size':`${prefs.fontSize}px`,'--screen-lyric-font':prefs.font==='theme'?'var(--lyrics-font)':fonts[prefs.font].css,'--lyric-weight':prefs.weight,'--lyric-align':prefs.alignment,'--lyric-leading':prefs.lineHeight,'--lyric-base':prefs.textColor,'--lyric-sung':prefs.sungColor,'--lyric-word':prefs.wordColor,'--lyric-dim':prefs.inactiveOpacity,'--lyric-glow':`${prefs.glow}px`,'--backdrop-dim':prefs.backdropDim} as CSSProperties}
