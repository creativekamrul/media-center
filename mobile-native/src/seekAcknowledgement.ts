/** Native positions use whole-item seconds for music, books and podcast episodes. */
export function awaitingSeek(sample:number,target:number,elapsedMs:number):boolean {
 return elapsedMs<2000&&Math.abs(sample-target)>1.5;
}
