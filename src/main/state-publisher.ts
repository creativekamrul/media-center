/** Coalesce telemetry before creating an expensive snapshot. Urgent events flush it. */
export class StatePublisher {
  private timer?: ReturnType<typeof setTimeout>
  private last = -Infinity
  constructor(private emit: () => void, private interval = 250) {}
  publish(telemetry = false) {
    const remaining = this.interval - (performance.now() - this.last)
    if (!telemetry || remaining <= 0) {
      this.cancel()
      this.last = performance.now()
      this.emit()
    } else if (!this.timer) {
      this.timer = setTimeout(() => { this.timer = undefined; this.publish(true) }, Math.ceil(remaining))
    }
  }
  cancel() { if (this.timer) clearTimeout(this.timer); this.timer = undefined }
}
