import React from 'react';

import Svg,{Path} from 'react-native-svg';

// Decorative wave envelope: both ends return to the seek baseline without a cutoff.

const curve=(phase:number)=>Array.from({length:101},(_,i)=>{const envelope=Math.sin(Math.PI*i/100)**1.4;const y=20-envelope*(6+4*Math.sin(i*.26+phase)+2*Math.sin(i*.61));return `${i===0?'M':'L'}${i},${y.toFixed(2)}`}).join(' ')+' L100,20 L0,20 Z';
const paths=[curve(0),curve(2)];

export function SeekWave({progress,color}:{progress:number;color:string}){

 const width=Math.max(0,Math.min(1,progress))*100;



 return <Svg pointerEvents="none" style={{position:'absolute',left:0,bottom:16,width:`${width}%`,height:20}} viewBox="0 0 100 20" preserveAspectRatio="none"><Path d={paths[0]} fill={color} opacity={.5}/><Path d={paths[1]} fill={color} opacity={.32}/></Svg>

}

