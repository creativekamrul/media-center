import { useEffect, useState } from 'react'
import { api, Modal } from './actions'
import type { PlaybackState } from '../../shared/types'
import { encodeLrc, type LyricsResult } from '../../shared/lyrics'
import { message } from './ui'
const stamp = (time: number) =>
  `[${String(Math.floor(time / 60)).padStart(2, '0')}:${(time % 60).toFixed(2).padStart(5, '0')}]`
export function LyricEditor({
  songKey,
  player,
  result,
  close,
  saved,
}: {
  songKey: string
  player: PlaybackState
  result?: LyricsResult
  close: () => void
  saved: () => void
}) {
  const [text, setText] = useState(''),
    [line, setLine] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    void api
      .lyricEdit({ key: songKey })
      .then((t) => {
        if (live) setText(t || (result ? encodeLrc(result) : ''))
      })
      .catch((e) => setError(message(e)))
    return () => {
      live = false
    }
  }, [songKey])
  const rows = text.split('\n')
  return (
    <Modal title="Edit song lyrics" close={close}>
      <p className="muted">
        Edit text or LRC line timestamps. Changes are saved for this song on
        this device and included in personal backups. Timing a line here
        replaces that line’s word timing.
      </p>
      <label className="field">
        Lyric text
        <textarea
          aria-label="Lyric text"
          className="lyric-editor-text"
          value={text}
          maxLength={200000}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div className="settings-inline-form">
        <label className="field">
          Line to time
          <select
            aria-label="Line to time"
            value={Math.min(line, rows.length - 1)}
            onChange={(e) => setLine(Number(e.target.value))}
          >
            {rows.map((r, i) => (
              <option key={i} value={i}>
                {i + 1}. {r.slice(0, 90)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          disabled={!['playing', 'paused'].includes(player.status)}
          onClick={() =>
            setText(
              rows
                .map((r, i) =>
                  i === Math.min(line, rows.length - 1)
                    ? stamp(player.position) +
                      r
                        .replace(/\[[^\]]*\]/g, '')
                        .replace(/<\d+:\d+(?:[.:]\d+)?>/g, '')
                    : r,
                )
                .join('\n'),
            )
          }
        >
          Use current playback time
        </button>
      </div>
      <div className="settings-actions">
        <button
          className="primary"
          disabled={busy || !text.trim()}
          onClick={() => {
            setBusy(true)
            void api
              .lyricEdit({ key: songKey, text })
              .then(() => {
                saved()
                close()
              })
              .catch((e) => setError(message(e)))
              .finally(() => setBusy(false))
          }}
        >
          Save song lyrics
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </Modal>
  )
}
