export const ARRIVAL_SESSION_KEY='juye-shore-entered-v1';
export function videoProgress(seconds:number,duration:number){
  const end=Number.isFinite(duration)&&duration>0?duration:5.055;
  return {writing:seconds>=Math.max(0,end-1.45),ready:seconds>=end};
}
