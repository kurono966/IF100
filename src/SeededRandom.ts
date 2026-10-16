// Counter-based random: unrelated calls never consume a shared sequence.
export class SeededRandom {
 static value(seed:number,stream:string,year=0,cell=0):number {
  let h=seed|0; for(const c of `${stream}:${year}:${cell}`) { h=Math.imul(h^c.charCodeAt(0),16777619); }
  h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return ((h^(h>>>16))>>>0)/4294967296;
 }
}
