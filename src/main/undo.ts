export class UndoJournal {
  private entries: { label: string; restore: () => Promise<void> }[] = []
  private busy = false
  constructor(private changed: (state: { label: string } | null) => void) {}
  snapshot() {
    const entry = this.entries.at(-1)
    return entry ? { label: entry.label } : null
  }
  add(label: string, restore: () => Promise<void>) {
    this.entries.push({ label, restore })
    this.entries = this.entries.slice(-20)
    this.changed(this.snapshot())
  }
  async undo() {
    if (this.busy) throw Error('An undo is already running.')
    const entry = this.entries.at(-1)
    if (!entry) return
    this.busy = true
    try {
      await entry.restore()
      const index = this.entries.indexOf(entry)
      if (index >= 0) this.entries.splice(index, 1)
      this.changed(this.snapshot())
    } finally {
      this.busy = false
    }
  }
  clear() {
    if (this.busy)
      throw Error('Wait for the current undo to finish before removing data.')
    this.entries = []
    this.changed(null)
  }
}
export function assertUnchanged(before: unknown, current: unknown) {
  if (JSON.stringify(before) !== JSON.stringify(current))
    throw Error(
      'This collection changed again. Undo would overwrite newer edits.',
    )
}
