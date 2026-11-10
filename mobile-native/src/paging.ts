export type Page<T>={items:T[];next:number|null};
/** Preserve duplicate playlist entries; offsets count server rows, not unique IDs. */
export function slicePage<T>(rows:T[],offset:number,size=40):Page<T>{return {items:rows.slice(offset,offset+size),next:offset+size<rows.length?offset+size:null}}
export function appendPage<T>(previous:T[],page:Page<T>):T[]{return [...previous,...page.items]}
