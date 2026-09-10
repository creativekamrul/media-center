import {MixLibrary} from './MixBuilder'
import {LibraryHeader,TabIcon} from './LibraryHeader'
import {PersonalShelves,OfflinePreparation,PeoplePage} from './PersonalLibrary'
import { useEffect, useState } from 'react'
import { api, Modal, ListenActions } from './actions'
import { message } from './ui'
import { TrackArtwork } from './Artwork'
import type {
  ListeningProfile,
  HealthIssue,
  Rediscovery,
  SeriesShelf,
  RecoveryState,
  PodcastDestination,
  PodcastFeed,
} from '../../shared/studio'
import type { LocalRoot } from '../../shared/types'
export type StudioTab =
  | 'mixes' | 'shelves' | 'offline' | 'people'
  | 'discover'
  | 'series'
  | 'podcasts'
  | 'health'
  | 'profiles'
  | 'recovery'
export const studioTabs: Record<StudioTab, string> = {
  mixes:'Custom mixes',shelves:'Personal shelves',offline:'Offline preparation',people:'People',
  discover: 'Rediscover',
  series: 'Book series',
  podcasts: 'Podcast subscriptions',
  health: 'Library health',
  profiles: 'Listening profiles',
  recovery: 'Connections',
}
export function StudioPage({
  tab,
  setTab,
  error,
  downloads,
}: {
  tab: StudioTab
  setTab: (t: StudioTab) => void
  error: (s: string) => void
  downloads: () => void
}) {
  return (
    <div className="studio-page">
      <LibraryHeader collection="tools" subtitle="Organize, discover and make your collection yours."/>
      <div className="browse-tabs" role="tablist" aria-label="Library tools">
        {Object.entries(studioTabs).map(([id, name]) => (
          <button
            className="secondary"
            role="tab"
            aria-selected={tab === id}
            key={id}
            onClick={() => setTab(id as StudioTab)}
          >
            <TabIcon id={id}/>{name}
          </button>
        ))}
      </div>
      {tab === 'mixes' ? <MixLibrary error={error}/> : tab === 'shelves' ? <PersonalShelves error={error}/> : tab === 'offline' ? <OfflinePreparation error={error}/> : tab === 'people' ? <PeoplePage error={error}/> : tab === 'discover' ? (
        <Discovery error={error} />
      ) : tab === 'series' ? (
        <Series error={error} />
      ) : tab === 'podcasts' ? (
        <PodcastSubscriptions error={error} />
      ) : tab === 'health' ? (
        <LibraryHealth error={error} />
      ) : tab === 'profiles' ? (
        <Profiles error={error} />
      ) : (
        <Recovery error={error} downloads={downloads} />
      )}
    </div>
  )
}
function useWork(error: (s: string) => void) {
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  const run = async (fn: () => Promise<unknown>, message = '') => {
    setBusy(true)
    setNotice('')
    try {
      await fn()
      setNotice(message)
    } catch (e) {
      error(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }
  return { busy, notice, run }
}
function Discovery({ error }: { error: (s: string) => void }) {
  const [data, setData] = useState<{
      shelves: Rediscovery[]
      warnings: string[]
    }>(),
    w = useWork(error)
  useEffect(() => {
    void w.run(async () => setData(await api.rediscover()))
  }, [])
  return (
    <>
      <div className="section-title">
        <div>
          <h2>Something worth returning to.</h2>
          <p className="muted">
            Suggestions explain why they appear and use your real collection and
            retained device history.
          </p>
        </div>
        <button
          className="secondary"
          disabled={w.busy}
          onClick={() =>
            void w.run(async () => setData(await api.rediscover()))
          }
        >
          Refresh rediscovery
        </button>
      </div>
      {w.busy && <p role="status">Finding forgotten favorites…</p>}
      {data?.warnings.map((s) => (
        <p role="status" key={s}>
          {s}
        </p>
      ))}
      {data?.shelves.map((s, i) => (
        <section className="settings-panel studio-shelf" key={i}>
          <h2>{s.title}</h2>
          <p className="muted">{s.reason}</p>
          <ListenActions items={s.items} error={error} />
          {s.items.slice(0, 8).map((q, j) => (
            <div className="unified-result" key={j}>
              <TrackArtwork item={q} />
              <div>
                <strong>{q.title}</strong>
                <small>{q.subtitle}</small>
              </div>
              <ListenActions items={[q]} compact error={error} />
            </div>
          ))}
        </section>
      ))}
      {data && !data.shelves.length && (
        <p className="studio-empty">
          Keep listening and star a few favorites. Rediscovery appears when your
          history has something to return to.
        </p>
      )}
    </>
  )
}
function Series({ error }: { error: (s: string) => void }) {
  const [data, setData] = useState<{
      shelves: SeriesShelf[]
      warnings: string[]
    }>(),
    [query, setQuery] = useState(''),
    [expanded, setExpanded] = useState<string[]>([]),
    [count, setCount] = useState(30),
    w = useWork(error)
  useEffect(() => {
    void w.run(async () => setData(await api.seriesShelves()))
  }, [])
  return (
    <>
      <h2>The next chapter in your collection.</h2>
      <label className="field">
        Find a series
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setCount(30)
          }}
        />
      </label>
      {w.busy && <p role="status">Reading your book series…</p>}
      {data?.warnings.map((s) => (
        <p key={s} role="status">
          {s}
        </p>
      ))}
      {data?.shelves
        .filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, count)
        .map((s) => {
          const next = s.books.find((b) => !b.finished)
          return (
            <section key={s.id} className="settings-panel studio-shelf">
              <div className="section-title">
                <div>
                  <h2>{s.title}</h2>
                  <p>
                    {s.source} · {s.books.filter((b) => b.finished).length}/
                    {s.books.length} completed
                  </p>
                </div>
                {next && (
                  <button
                    className="primary"
                    onClick={() =>
                      void api
                        .play({ queue: [next.item], index: 0 })
                        .catch((e) => error(message(e)))
                    }
                  >
                    Continue series
                  </button>
                )}
              </div>
              {s.books
                .slice(0, expanded.includes(s.id) ? s.books.length : 8)
                .map((b) => (
                  <div
                    className="unified-result"
                    key={JSON.stringify(b.item.target)}
                  >
                    <TrackArtwork item={b.item} />
                    <div>
                      <strong>
                        {b.sequence ? `${b.sequence}. ` : ''}
                        {b.item.title}
                      </strong>
                      <small>
                        {b.finished
                          ? 'Finished'
                          : b === next
                            ? 'Up next'
                            : 'Not finished'}{' '}
                        · {b.item.subtitle}
                      </small>
                    </div>
                    <ListenActions items={[b.item]} error={error} compact />
                  </div>
                ))}
              {s.books.length > 8 && !expanded.includes(s.id) && (
                <button
                  className="secondary"
                  onClick={() => setExpanded((v) => [...v, s.id])}
                >
                  Show all {s.books.length} books
                </button>
              )}
            </section>
          )
        })}
      {data &&
        data.shelves.filter((s) =>
          s.title.toLowerCase().includes(query.toLowerCase()),
        ).length > count && (
          <button className="secondary" onClick={() => setCount((n) => n + 30)}>
            Show more series
          </button>
        )}
      {data && !data.shelves.length && (
        <p className="studio-empty">
          No series metadata found in your audiobook libraries.
        </p>
      )}
    </>
  )
}
function LibraryHealth({ error }: { error: (s: string) => void }) {
  const [roots, setRoots] = useState<LocalRoot[]>([]),
    [root, setRoot] = useState(''),
    [data, setData] = useState<{
      issues: HealthIssue[]
      scanned: number
      warnings: string[]
    }>(),
    [filter, setFilter] = useState('all'),
    [page, setPage] = useState(0),
    w = useWork(error)
  useEffect(() => {
    void api
      .localRoots()
      .then((r) => {
        setRoots(r)
        setRoot(r[0]?.id ?? '')
      })
      .catch((e) => error(message(e)))
  }, [])
  const rows =
    data?.issues.filter((r) => filter === 'all' || r.issues.includes(filter)) ??
    []
  return (
    <>
      <h2>A healthier local library.</h2>
      <p className="muted">
        Review missing artwork, incomplete tags, unavailable files and likely
        duplicates. Audio files are never changed or deleted by this report.
      </p>
      <div className="settings-inline-form">
        <label className="field">
          Local source
          <select
            value={root}
            onChange={(e) => {
              setRoot(e.target.value)
              setData(undefined)
            }}
          >
            {roots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="primary"
          disabled={!root || w.busy}
          onClick={() =>
            void w.run(async () => {
              setData(await api.libraryHealth(root))
              setPage(0)
            })
          }
        >
          {w.busy ? 'Checking files…' : 'Check library health'}
        </button>
      </div>
      {data && (
        <>
          <p>
            {data.scanned.toLocaleString()} indexed files ·{' '}
            {data.issues.length.toLocaleString()} files need attention
          </p>
          {data.warnings.map((s) => (
            <p key={s}>{s}</p>
          ))}
          <label className="field">
            Show issues
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value)
                setPage(0)
              }}
            >
              {[
                'all',
                'Missing artwork',
                'Incomplete tags',
                'Unavailable file',
                'Unreadable metadata',
                'Possible duplicate',
              ].map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All issues' : s}
                </option>
              ))}
            </select>
          </label>
          {rows.slice(page * 50, (page + 1) * 50).map((r) => (
            <article className="health-row" key={r.fileId}>
              <div>
                <strong>{r.title}</strong>
                <small>{r.fileId}</small>
              </div>
              <div className="health-tags">
                {r.issues.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </article>
          ))}
          <div className="control-actions">
            <button
              className="secondary"
              disabled={!page}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous issues
            </button>
            <span>Page {page + 1}</span>
            <button
              className="secondary"
              disabled={(page + 1) * 50 >= rows.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next issues
            </button>
          </div>
          <p className="muted">
            Possible duplicates match title, artist and approximate duration;
            they are not verified identical files. Artwork and tag changes can
            be made in your preferred tag editor, then rescanned here.
          </p>
        </>
      )}
    </>
  )
}
export function Profiles({ error }: { error: (s: string) => void }) {
  const [profiles, setProfiles] = useState<ListeningProfile[]>([]),
    [name, setName] = useState(''),
    w = useWork(error)
  const refresh = () => api.profiles().then(setProfiles)
  useEffect(() => {
    void refresh().catch((e) => error(message(e)))
  }, [])
  return (
    <section className="settings-panel">
      <h2>Listening profiles</h2>
      <p className="muted">
        Capture your saved theme, lyric appearance, EQ, current volume and
        spoken playback speed. Set them up first, then save a profile for
        headphones, speakers or bedtime. Reusing a name updates that profile.
      </p>
      <div className="settings-inline-form">
        <label className="field">
          Profile name
          <input
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Headphones"
          />
        </label>
        <button
          className="primary"
          disabled={!name.trim() || w.busy}
          onClick={() =>
            void w.run(async () => {
              await api.profileSave(name)
              await refresh()
              setName('')
            }, 'Profile saved.')
          }
        >
          Save current setup
        </button>
      </div>
      {profiles.map((p) => (
        <div className="profile-row" key={p.id}>
          <div>
            <strong>{p.name}</strong>
            <small>
              {p.volume}% volume · {p.speed}× spoken speed ·{' '}
              {p.preferences.theme}
            </small>
          </div>
          <div className="control-actions">
            <button
              className="secondary"
              disabled={w.busy}
              onClick={() =>
                void w.run(async () => {
                  await api.profileApply(p.id)
                  window.dispatchEvent(new Event('profile-applied'))
                }, 'Profile applied.')
              }
            >
              Apply {p.name}
            </button>
            <button
              className="text-button"
              disabled={w.busy}
              onClick={() =>
                void w.run(async () => {
                  await api.profileDelete(p.id)
                  await refresh()
                })
              }
            >
              Remove {p.name}
            </button>
          </div>
        </div>
      ))}
      {w.notice && <p role="status">{w.notice}</p>}
    </section>
  )
}
export function AudioExtras({ error }: { error: (s: string) => void }) {
  const [t, setT] = useState({ seconds: 0, preserveAlbums: true }),
    [output, setOutput] = useState<{ saved: boolean; device: string }>(),
    w = useWork(error)
  useEffect(() => {
    void api
      .transitions()
      .then(setT)
      .catch((e) => error(message(e)))
    void api
      .outputProfile('get')
      .then(setOutput)
      .catch((e) => error(message(e)))
  }, [])
  return (
    <section className="settings-panel">
      <h2>Transitions & output memory</h2>
      <label className="field">
        Music crossfade · {t.seconds} seconds
        <input
          aria-label="Crossfade seconds"
          type="range"
          min={0}
          max={12}
          step={1}
          value={t.seconds}
          onChange={(e) => setT({ ...t, seconds: Number(e.target.value) })}
        />
      </label>
      <label className="check-field">
        <input
          type="checkbox"
          checked={t.preserveAlbums}
          onChange={(e) => setT({ ...t, preserveAlbums: e.target.checked })}
        />
        Keep album tracks gapless
      </label>
      <p className="muted">
        Music and local music only. Crossfade mixes original streams through MPV
        and requires shared audio output. Books, episodes and radio retain their
        normal playback.
      </p>
      <div className="settings-actions">
        <button
          className="primary"
          disabled={w.busy}
          onClick={() =>
            void w.run(() => api.transitions(t), 'Transitions saved.')
          }
        >
          Save transitions
        </button>
      </div>
      <div className="settings-subsection">
        <h3>Remember this output</h3>
        <p className="muted">
          Save volume and EQ for the selected output. Its settings return when
          you select it again. Device changes apply at the next playback start.
        </p>
        <div className="control-actions">
          <button
            className="secondary"
            disabled={w.busy}
            onClick={() =>
              void w.run(
                async () => setOutput(await api.outputProfile('save')),
                'Output preferences saved.',
              )
            }
          >
            Remember volume & EQ
          </button>
          <button
            className="text-button"
            disabled={!output?.saved || w.busy}
            onClick={() =>
              void w.run(async () =>
                setOutput(await api.outputProfile('remove')),
              )
            }
          >
            Forget output preferences
          </button>
        </div>
        {output?.saved && (
          <p className="muted">
            Saved for{' '}
            {output.device === 'auto' ? 'System default' : output.device}
          </p>
        )}
      </div>
      {w.notice && <p role="status">{w.notice}</p>}
    </section>
  )
}
function Recovery({
  error,
  downloads,
}: {
  error: (s: string) => void
  downloads: () => void
}) {
  const [data, setData] = useState<RecoveryState>(),
    w = useWork(error)
  useEffect(() => {
    void w.run(async () => setData(await api.recovery()))
  }, [])
  return (
    <section className="settings-panel">
      <h2>Connection recovery</h2>
      <p className="muted">
        Check each source and review pending progress before syncing. Your local
        checkpoints stay available.
      </p>
      <div className="control-actions">
        <button
          className="primary"
          disabled={w.busy}
          onClick={() => void w.run(async () => setData(await api.recovery()))}
        >
          {w.busy ? 'Checking…' : 'Retry connections'}
        </button>
        <button className="secondary" onClick={downloads}>
          Review offline progress
        </button>
        {data?.playbackError && (
          <button
            className="secondary"
            disabled={w.busy}
            onClick={() =>
              void w.run(async () => {
                const p = await api.playback(),
                  item = p.queue[p.queueIndex]
                if (!item) throw Error('Choose something to play first.')
                await api.play({
                  queue: p.queue,
                  index: p.queueIndex,
                  ...(['music-track', 'local-file'].includes(item.target.kind)
                    ? { position: p.position }
                    : {}),
                })
                setData(await api.recovery())
              })
            }
          >
            Retry current playback
          </button>
        )}
        <button
          className="secondary"
          disabled={w.busy}
          onClick={() =>
            void w.run(async () => {
              if (await api.exportDiagnostics()) return
              throw Error('Export cancelled.')
            }, 'Diagnostics report saved.')
          }
        >
          Export diagnostics report
        </button>
      </div>
      {data?.sources.map((s) => (
        <div className="profile-row" key={s.id}>
          <div>
            <strong>{s.name}</strong>
            <small>{s.message}</small>
          </div>
          <span className={`health-status ${s.connected ? 'online' : ''}`}>
            {s.connected ? 'Connected' : 'Needs attention'}
          </span>
        </div>
      ))}
      {data && <p>{data.pending} local checkpoints marked for review</p>}
      {data?.playbackError && (
        <p role="status">Playback: {data.playbackError}</p>
      )}
      {data?.syncError && <p role="status">Progress: {data.syncError}</p>}
      <p className="muted">
        The exported report contains versions, connection results and playback
        state. It excludes names, URLs, file paths, credentials and raw errors.
      </p>
      {w.notice && <p role="status">{w.notice}</p>}
    </section>
  )
}
function PodcastSubscriptions({ error }: { error: (s: string) => void }) {
  const [destinations, setDestinations] = useState<PodcastDestination[]>([]),
    [selected, setSelected] = useState('0'),
    [query, setQuery] = useState(''),
    [feeds, setFeeds] = useState<PodcastFeed[]>([]),
    [chosen, setChosen] = useState<string[]>([]),
    w = useWork(error),
    destination = destinations[Number(selected)]
  useEffect(() => {
    void w.run(async () => setDestinations(await api.podcastDestinations()))
  }, [])
  return (
    <section className="settings-panel">
      <h2>Find your next podcast.</h2>
      <p className="muted">
        Search through your Audiobookshelf server or paste an RSS URL.
        Subscriptions require server permission to manage podcasts. Review
        selected feeds before adding them; automatic audio downloads remain off.
      </p>
      <label className="field">
        Podcast library
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value)
            setFeeds([])
            setChosen([])
          }}
        >
          {destinations.map((d, i) => (
            <option key={i} value={String(i)}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <div className="settings-inline-form">
        <label className="field">
          Show name or RSS URL
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button
          className="primary"
          disabled={w.busy || !destination || query.trim().length < 2}
          onClick={() =>
            void w.run(async () => {
              setFeeds(
                await api.podcastDiscover({
                  serverId: destination.serverId,
                  query,
                }),
              )
              setChosen([])
            })
          }
        >
          Find podcasts
        </button>
      </div>
      <div className="control-actions">
        <button
          className="secondary"
          disabled={!destination || w.busy}
          onClick={() =>
            void w.run(async () => {
              const f = await api.podcastOPML({
                serverId: destination.serverId,
                action: 'import',
              })
              if (f) {
                setFeeds(f)
                setChosen([])
              }
            }, 'Review imported feeds below.')
          }
        >
          Import OPML
        </button>
        <button
          className="secondary"
          disabled={!destination || w.busy}
          onClick={() =>
            void w.run(async () => {
              const f = await api.podcastOPML({
                serverId: destination.serverId,
                action: 'export',
              })
              if (!f) throw Error('Export cancelled.')
            }, 'Subscriptions exported.')
          }
        >
          Export OPML
        </button>
      </div>
      {feeds.map((f) => (
        <label className="check-field" key={f.url}>
          <input
            type="checkbox"
            checked={chosen.includes(f.url)}
            onChange={(e) =>
              setChosen(
                e.target.checked
                  ? [...chosen, f.url]
                  : chosen.filter((v) => v !== f.url),
              )
            }
          />
          <span>
            {f.title}
            <small>
              {f.author} · {f.url}
            </small>
          </span>
        </label>
      ))}
      <div className="settings-actions">
        <button
          className="primary"
          disabled={!chosen.length || !destination || w.busy}
          onClick={() =>
            void w.run(async () => {
              await api.podcastSubscribe({ destination, feeds: chosen })
              setChosen([])
            }, 'Subscriptions requested. Audiobookshelf processes feeds in the background; refresh Podcasts shortly.')
          }
        >
          Subscribe to {chosen.length} selected
        </button>
      </div>
      {!destinations.length && !w.busy && (
        <p className="studio-empty">
          Connect an Audiobookshelf podcast library with a configured folder
          first.
        </p>
      )}
      {w.notice && <p role="status">{w.notice}</p>}
    </section>
  )
}
export function UndoToast({
  refresh,
  error,
}: {
  refresh: () => void
  error: (s: string) => void
}) {
  const [state, setState] = useState<{ label: string } | null>(null),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    void api.undoState().then(setState)
    return api.onUndo(setState)
  }, [])
  useEffect(() => {
    if (!state || busy) return
    const timer = setTimeout(() => setState(null), 8000)
    return () => clearTimeout(timer)
  }, [state, busy])
  if (!state) return null
  return (
    <aside className="undo-toast" role="status">
      <span>Saved {state.label}</span>
      <button
        className="secondary"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void api
            .undo()
            .then(refresh)
            .catch((e) => error(message(e)))
            .finally(() => setBusy(false))
        }}
      >
        Undo
      </button>
      <button
        className="icon-button"
        aria-label="Dismiss undo notification"
        onClick={() => setState(null)}
      >
        ×
      </button>
    </aside>
  )
}
