export type InboxEntry={key:string;account:string;id:string;title:string;coverArt?:string;seenAt:number};
export type LibrarySnapshot={account:string;ids:string[]};
export function detectLibraryChanges(previous:LibrarySnapshot|undefined,account:string,rows:{id:string;title?:string;name?:string;coverArt?:string}[],now:number){
 const unique=[...new Map(rows.map(t=>[t.id,t])).values()];const ids=unique.map(t=>t.id);const baseline=previous?.account===account?previous:undefined;const known=new Set(baseline?.ids??[]);
 return {snapshot:{account,ids},added:baseline?unique.filter(t=>!known.has(t.id)).map(t=>({key:JSON.stringify([account,t.id]),account,id:t.id,title:t.title??t.name??'Untitled',coverArt:t.coverArt,seenAt:now})):[]};
}
