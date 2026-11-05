// Renderer-only interpolation. Never use this clock for seeking, checkpoints or stats.
export class VisualPlayhead {
 private position=0
 private receivedAt=0
 private speed=1
 private advancing=false
 private correction=0
 sample(position:number,speed:number,advancing:boolean,now:number){
  const previous=this.at(now),difference=previous-position
  // Reconcile small telemetry jitter without a visible jump. Seeks and state
  // changes are authoritative and must not animate across unrelated positions.
  this.correction=this.advancing&&advancing&&Math.abs(difference)<.5?difference:0
  this.position=position;this.speed=speed;this.advancing=advancing;this.receivedAt=now
 }
 at(now:number){
  const elapsed=Math.max(0,now-this.receivedAt)
  // Stop predicting if native telemetry stops arriving.
  return this.position+(this.advancing?Math.min(elapsed,750)/1000*this.speed:0)
   +this.correction*Math.max(0,1-elapsed/150)
 }
}
