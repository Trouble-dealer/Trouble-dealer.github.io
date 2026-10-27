export const ARRIVAL_SESSION_KEY='juye-shore-entered-v1';
export function waveProgress(seconds:number){
  const smooth=(a:number,b:number,value:number)=>{const x=Math.max(0,Math.min(1,(value-a)/(b-a)));return x*x*(3-2*x);};
  // One incoming wave followed by a retreat; writing follows the retreat.
  return {shore:.54+.26*smooth(.15,2.25,seconds)-.25*smooth(2.3,4.8,seconds),writing:smooth(2.65,4.4,seconds),ready:seconds>=5};
}
