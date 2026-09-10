import { useEffect, useRef, useState } from 'react'
import { Modal, api } from './actions'
import { themes } from '../../shared/themes'
export interface PaletteAction {
  label: string
  run: () => void | Promise<unknown>
}
export function CommandPalette({
  actions,
  close,
  error,
}: {
  actions: PaletteAction[]
  close: () => void
  error: (s: string) => void
}) {
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState(0)
  const all = [
      ...actions,
      ...themes.map((t) => ({
        label: 'Theme: ' + t.name,
        run: async () => {
          const prefs = await api.preferences()
          await api.savePreferences({ ...prefs, theme: t.id })
        },
      })),
      ...[15, 30, 60].map((n) => ({
        label: `Sleep timer: ${n} minutes`,
        run: () => api.command({ action: 'sleep', value: n }),
      })),
    ],
    found = all
      .filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 40)
  const results = useRef<HTMLDivElement>(null)
  useEffect(() => {
    results.current
      ?.querySelector('.selected')
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected])
  const run = async (a: PaletteAction) => {
    close()
    try {
      await a.run()
    } catch (e) {
      error(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <Modal title="Command palette" close={close}>
      <label className="field">
        Find an action
        <input
          autoFocus
          aria-controls="command-results"
          aria-activedescendant={
            found[selected] ? `command-option-${selected}` : undefined
          }
          value={query}
          placeholder="Theme, queue, sleep timer…"
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(0)
          }}
          onKeyDown={(e) => {
            if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key))
              e.preventDefault()
            if (e.key === 'ArrowDown')
              setSelected((i) => Math.min(found.length - 1, i + 1))
            if (e.key === 'ArrowUp') setSelected((i) => Math.max(0, i - 1))
            if (e.key === 'Enter' && found[selected]) void run(found[selected])
          }}
        />
      </label>
      <div
        ref={results}
        className="command-results"
        id="command-results"
        role="listbox"
        aria-label="Matching commands"
      >
        {found.map((a, i) => (
          <button
            role="option"
            aria-selected={i === selected}
            id={`command-option-${i}`}
            className={
              i === selected ? 'command-result selected' : 'command-result'
            }
            key={a.label}
            onClick={() => void run(a)}
          >
            {a.label}
            <span>↵</span>
          </button>
        ))}
      </div>
      {!found.length && <p>No matching actions.</p>}
      <p className="muted">
        Ctrl+Shift+P · Arrow keys to choose · Enter to run
      </p>
    </Modal>
  )
}
