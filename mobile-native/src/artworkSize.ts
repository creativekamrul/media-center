/** Physical-pixel buckets prevent a new request for each small layout change. */
export function artworkSize(pixels:number,blurred=false):number {
 const target=Math.min(Number.isFinite(pixels)?Math.max(1,pixels):384,blurred?384:1536);
 return [96,192,384,768,1536].find(size=>size>=target)??1536;
}
