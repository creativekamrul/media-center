import { useEffect, useState, type ReactNode } from 'react'
import { api, Modal } from './actions'
import { message } from './ui'
export function PlaylistCover({
  source,
  id,
  children,
}: {
  source: string
  id?: string
  children: ReactNode
}) {
  const [image, setImage] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    const reload = () => {
      setImage(null)
      if (id)
        void api
          .playlistArtwork({ source, id, action: 'get' })
          .then((v) => {
            if (live) setImage(v)
          })
          .catch(() => {})
    }
    reload()
    window.addEventListener('playlist-artwork', reload)
    return () => {
      live = false
      window.removeEventListener('playlist-artwork', reload)
    }
  }, [source, id])
  return image ? (
    <div className="art">
      <img src={image} alt="Playlist cover" />
    </div>
  ) : (
    <>{children}</>
  )
}
export function PlaylistDesigner({
  source,
  id,
  name,
  close,
}: {
  source: string
  id: string
  name: string
  close: () => void
}) {
  const [title, setTitle] = useState(name),
    [color, setColor] = useState('#142d32'),
    [textColor, setTextColor] = useState('#ffffff'),
    [layout, setLayout] = useState('grid'),
    [size, setSize] = useState(64),
    [png, setPng] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setNotice('')
    try {
      await fn()
    } catch (e) {
      setNotice(message(e))
    } finally {
      setBusy(false)
    }
  }
  const generate = async () => {
    const roots = await api.localRoots()
    let images: (string | null)[] = []
    if (roots.some((r) => r.id === source)) {
      const p = await api.localPlaylistContents({ rootId: source, id })
      images = await Promise.all(
        p.files
          .slice(0, 4)
          .map((fileId) =>
            api.localCover({ rootId: source, fileId }).catch(() => null),
          ),
      )
    } else {
      const p = await api.musicDetail({
        serverId: source,
        kind: 'playlist',
        id,
      })
      images = await Promise.all(
        p.tracks
          .slice(0, 4)
          .map((t) =>
            api
              .cover({ serverId: source, itemId: t.cover ?? t.id })
              .catch(() => null),
          ),
      )
    }
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 800
    const c = canvas.getContext('2d')!
    c.fillStyle = color
    c.fillRect(0, 0, 800, 800)
    for (let i = 0; i < images.length; i++) {
      if (!images[i]) continue
      const image = new Image()
      image.src = images[i]!
      await image.decode()
      c.save()
      if (layout === 'stack') {
        c.translate(400, 330)
        c.rotate((i - 1.5) * 0.1)
        c.drawImage(image, -235 + i * 12, -235 + i * 12, 470, 470)
      } else
        c.drawImage(image, (i % 2) * 400, Math.floor(i / 2) * 400, 400, 400)
      c.restore()
    }
    if (title.trim()) {
      c.fillStyle = '#000000b8'
      c.fillRect(0, 600, 800, 200)
      c.fillStyle = textColor
      c.font = `700 ${size}px "Segoe UI"`
      const words = title.split(' ')
      let line = '',
        y = 672
      for (const word of words) {
        const next = line ? line + ' ' + word : word
        if (c.measureText(next).width > 700 && line) {
          c.fillText(line, 48, y, 704)
          line = word
          y += size * 1.15
          if (y > 770) break
        } else line = next
      }
      if (y <= 770) c.fillText(line, 48, y, 704)
    }
    setPng(canvas.toDataURL('image/png'))
  }
  return (
    <Modal title="Design playlist cover" close={close}>
      <p className="muted">
        Create a collage or choose a picture. Covers are saved locally for this
        playlist. Export PNG to share or upload elsewhere.
      </p>
      <div className="designer-grid">
        <div>
          <label className="field">
            Cover title (optional)
            <input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            Collage layout
            <select value={layout} onChange={(e) => setLayout(e.target.value)}>
              <option value="grid">Album grid</option>
              <option value="stack">Stack of records</option>
            </select>
          </label>
          <div className="control-actions">
            <label>
              Background{' '}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <label>
              Title color{' '}
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            Title size · {size}px
            <input
              type="range"
              min={30}
              max={90}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </label>
          <div className="control-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void run(generate)}
            >
              Generate collage
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const v = await api.playlistArtwork({
                    source,
                    id,
                    action: 'import',
                  })
                  if (v) {
                    setPng(v)
                    window.dispatchEvent(new Event('playlist-artwork'))
                    setNotice('Picture applied.')
                  }
                })
              }
            >
              Choose picture
            </button>
          </div>
        </div>
        <div className="cover-preview">
          {png ? (
            <img src={png} alt="Playlist cover preview" />
          ) : (
            <span>Your cover preview</span>
          )}
        </div>
      </div>
      <div className="settings-actions">
        <button
          className="primary"
          disabled={!png || busy}
          onClick={() =>
            void run(async () => {
              await api.playlistArtwork({ source, id, action: 'save', png })
              window.dispatchEvent(new Event('playlist-artwork'))
              setNotice('Playlist cover saved.')
            })
          }
        >
          Save playlist cover
        </button>
        <button
          className="secondary"
          disabled={!png || busy}
          onClick={() =>
            void run(async () => {
              if (await api.exportArtwork(png)) setNotice('Cover exported.')
            })
          }
        >
          Export cover PNG
        </button>
        <button
          className="text-button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await api.playlistArtwork({ source, id, action: 'remove' })
              setPng('')
              window.dispatchEvent(new Event('playlist-artwork'))
              setNotice('Default cover restored.')
            })
          }
        >
          Restore default cover
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
    </Modal>
  )
}
