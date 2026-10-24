/* Actual GLORIA v19/FOMO cotton fluid, encoded once as a small silent loop. */
(function(){
 const X=window.XMB,v=document.getElementById('cotton-bg');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');let active=false,started=false;
 function update(){
  const visible=active&&!document.hidden&&!document.body.classList.contains('has-preview')&&!document.body.classList.contains('viewing');
  if(!visible||reduce.matches){v.pause();return;}
  if(!started){v.src=X.content.cotton.video;started=true;}
  v.play().catch(()=>{});
 }
 X.cotton={sync(enabled,hour){
  const night=1-X.theme.timeState(hour??new Date().getHours()).day;
  document.body.style.setProperty("--cotton-night",night.toFixed(4));
  document.body.classList.toggle("cotton-night",enabled&&night>.5);
  active=enabled;document.body.classList.toggle('cotton',enabled);
  if(X.content&&X.content.cotton){v.poster=X.content.cotton.poster;v.muted=true;update();}
 }};
 new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',update);
 reduce.addEventListener('change',update);
 addEventListener('pointerdown',update,{passive:true});
})();
