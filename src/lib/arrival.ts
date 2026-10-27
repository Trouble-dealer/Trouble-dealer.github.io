export const ARRIVAL_SESSION_KEY='juye-shore-entered-v1';
export function waveProgress(seconds:number){
  const smooth=(a:number,b:number,value:number)=>{const x=Math.max(0,Math.min(1,(value-a)/(b-a)));return x*x*(3-2*x);};
  // One incoming wave, followed by a retreat; writing is physically masked by water.
  return {shore:.39+.47*smooth(.15,2.25,seconds)-.43*smooth(2.3,4.8,seconds),writing:smooth(2.45,4.2,seconds),ready:seconds>=5};
}
