export const EQ_FREQUENCIES=[31,62,125,250,500,1000,2000,4000,8000,16000] as const;
export type EqProfile={id:string;name:string;bands:number[];eqPreamp:number;parametric?:boolean;filters?:{frequency:number;gain:number;q:number}[]};
const preset=(id:string,name:string,bands:number[]):EqProfile=>({id,name,bands,eqPreamp:-Math.max(0,...bands)});
export const EQ_PRESETS:EqProfile[]=[
 preset('flat','Flat',[0,0,0,0,0,0,0,0,0,0]),
 preset('bass','Bass boost',[5,4,3,1,0,0,0,0,0,0]),
 preset('deep-bass','Deep bass',[6,5,2,0,-1,0,0,0,0,0]),
 preset('bass-treble','Bass & treble',[4,3,2,0,-1,-1,0,2,3,3]),
 preset('treble','Treble lift',[0,0,0,0,0,0,1,2,3,3]),
 preset('vocals','Vocal clarity',[-2,-2,-1,0,1,3,3,1,0,-1]),
 preset('warm','Warm',[2,2,1,1,0,0,-1,-1,-2,-2]),
 preset('bright','Bright',[-1,-1,0,0,0,1,2,2,2,1]),
 preset('rock','Rock',[3,2,1,-1,-1,1,2,3,2,1]),
 preset('pop','Pop',[-1,0,1,2,2,2,1,0,1,1]),
 preset('electronic','Electronic',[4,3,1,0,-1,0,1,2,3,2]),
 preset('acoustic','Acoustic',[0,0,1,1,0,1,2,2,1,1]),
 preset('speech','Speech',[-4,-3,-2,0,1,3,2,0,-1,-2]),
];
export function validateEqProfile(value:unknown):EqProfile{
 const p=value as EqProfile;if(!p||typeof p.id!=='string'||!p.id||typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>48||!Array.isArray(p.bands)||p.bands.length!==10||p.bands.some(v=>!Number.isFinite(v)||v< -12||v>12)||!Number.isFinite(p.eqPreamp)||p.eqPreamp< -24||p.eqPreamp>6)throw Error('Choose a name and valid EQ levels.');
 if(p.filters!==undefined&&(!Array.isArray(p.filters)||p.filters.length>12||p.filters.some(f=>!f||!Number.isFinite(f.frequency)||f.frequency<20||f.frequency>20000||!Number.isFinite(f.gain)||Math.abs(f.gain)>12||!Number.isFinite(f.q)||f.q<.1||f.q>12)))throw Error('Invalid parametric filters.');
 return {id:p.id,name:p.name.trim(),bands:[...p.bands],eqPreamp:p.eqPreamp,...(p.parametric?{parametric:true,filters:(p.filters??[]).map(f=>({...f}))}:{})};
}
export function readEqProfiles(value:unknown):EqProfile[]{if(!Array.isArray(value))return [];return value.slice(0,100).flatMap(p=>{try{return [validateEqProfile(p)]}catch{return []}})}
export function saveEqProfile(profiles:EqProfile[],profile:EqProfile):EqProfile[]{const p=validateEqProfile(profile);if(profiles.some(x=>x.id!==p.id&&x.name.toLocaleLowerCase()===p.name.toLocaleLowerCase()))throw Error('A profile with that name already exists.');if(profiles.length>=100&&!profiles.some(x=>x.id===p.id))throw Error('You can save up to 100 profiles.');return [...profiles.filter(x=>x.id!==p.id),p];}
export function matchingEqProfile(profiles:EqProfile[],bands:number[],preamp:number){return profiles.find(p=>p.eqPreamp===preamp&&p.bands.every((v,i)=>v===bands[i]));}
