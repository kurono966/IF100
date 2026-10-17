export const END_YEAR=1000;
export const CENTURY=100;
export function era(year:number):string {return year<100?'芽吹きと定住':year<300?'交流と地域文化':year<600?'都市圏と文明': '継承と再編';}
export function century(year:number):string {const start=Math.min(900,Math.floor(year/100)*100);return `${start}–${start+100}年 · ${era(year)}`;}
