// A stable application shell: header, map workspace, scrollable sidebar, controls footer.
export function arrangeGameLayout(main:HTMLElement){
 const find=(s:string)=>main.querySelector<HTMLElement>(s)!;
 const mapPanel=find('.map-panel'),sidebar=find('aside'),controls=find('.controls');
 const legend=find('.legend'),history=find('.history-controls'),historyTitle=find('.history-title'),log=find('#log'),profile=find('#migrant-profile');
 const center=document.createElement('section');center.className='dashboard-main';center.setAttribute('aria-label','世界地図と現在の状態');
 const summary=document.createElement('div');summary.className='dashboard-summary';
 for(const selector of ['.world-head','.progress','.century-marks','#loading','#stats'])summary.append(find(selector));
 const space=document.createElement('div');space.className='map-space';const map=find('#map');map.before(space);space.append(map);
 center.append(summary,mapPanel);
 sidebar.className='dashboard-sidebar';sidebar.setAttribute('aria-label','介入・地域詳細・歴史');
 const toolsSection=document.createElement('section');toolsSection.className='sidebar-interventions';
 for(const node of Array.from(sidebar.children))if(node!==profile&&node!==historyTitle&&node!==log)toolsSection.append(node);
 toolsSection.append(profile);
 const region=document.createElement('section');region.className='sidebar-section';region.innerHTML='<h2>地域の詳細</h2><div id="region-details"><p class="muted">地図のマスを選ぶと、自然・暮らし・文明の詳細が表示されます。</p></div>';
 const chronicle=document.createElement('section');chronicle.className='sidebar-section';chronicle.append(historyTitle,history,log);
 const key=document.createElement('details');key.className='sidebar-section map-key';key.innerHTML='<summary>地図の凡例</summary>';key.append(legend);const note=document.createElement('p');note.className='muted';note.textContent='地域色：濃緑＝森林、黄土＝農業、砂茶＝交易、灰緑＝都市、乾褐＝荒廃、灰茶＝廃墟。介入影響：黄＝直接、橙＝二次、赤＝長期、紫＝文明への因果依存。影響の強さや単独原因を断定する表示ではありません。';key.append(note);
 sidebar.replaceChildren(toolsSection,region,chronicle,key);
 main.classList.add('game-dashboard');main.replaceChildren(center,sidebar);
 const footer=main.parentElement!.querySelector<HTMLElement>(':scope > footer')!;
 footer.classList.add('dashboard-footer');footer.replaceChildren(controls);
}
