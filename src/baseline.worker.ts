import {initialWorld} from './SimulationArchive';
import {step} from './Simulation';
import {END_YEAR} from './HistoryConfig';
self.onmessage=(event:MessageEvent<{seed:number}>)=>{try{const w=initialWorld(event.data.seed);while(w.year<END_YEAR){step(w);if(w.year%100===0)self.postMessage({type:'progress',year:w.year});}self.postMessage({type:'ready',world:w});}catch(error){self.postMessage({type:'error',message:String(error)});}};
