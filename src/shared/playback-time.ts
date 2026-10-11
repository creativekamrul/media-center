/** Count observed playing time, never position jumps, stalls or suspended time. */
export class PlaybackTime {
 private previous?:{time:number;position:number;playing:boolean}
 reset(){this.previous=undefined}
 sample(position:number,playing:boolean,now=performance.now()):number{
  const previous=this.previous;this.previous={time:now,position,playing}
  if(!previous||!playing||!previous.playing)return 0
  const seconds=(now-previous.time)/1000,advance=position-previous.position
  return seconds>0&&seconds<=2.5&&advance>0&&advance<=seconds*2+1?Math.min(seconds,advance):0
 }
}
