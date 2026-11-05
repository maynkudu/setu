import { renderToStaticMarkup } from "react-dom/server";
import { readFile, writeFile } from "node:fs/promises";
import { MentorshipFigureLive } from "../src/components/figures/mentorship/live";
import {
  deskArt,
  folderArt,
  frontArt,
  travel,
  partCount,
} from "../src/components/figures/mentorship/geometry";
import { stages } from "../src/components/figures/mentorship/model";
const markup = renderToStaticMarkup(
  <MentorshipFigureLive
    desk={deskArt}
    folder={folderArt}
    front={frontArt}
    travel={travel}
  />,
);
const kit = await readFile("src/components/iso/iso.css", "utf8");
const css = await readFile(
  "src/components/figures/mentorship/figure.css",
  "utf8",
);
const script = `const stages=${JSON.stringify(stages)},travel=${JSON.stringify(travel)};
const root=document.querySelector('figure'),folder=root.querySelector('.request-folder'),buttons=[...root.querySelectorAll('button')],marker=root.querySelector('.figure-selection');
const still=matchMedia('(prefers-reduced-motion: reduce)');let x=0,target=0,frame=0,last=0,tour=0,manual=false,hovered=false,visible=true;
function select(index){target=Math.max(0,Math.min(2,index));root.dataset.stage=target;buttons.forEach((b,n)=>b.setAttribute('aria-pressed',n===target));marker.style.transform='translateX(calc('+target*100+'% + '+target*5+'px))';root.querySelector('figcaption strong').textContent=stages[target].title;root.querySelector('figcaption span').textContent=stages[target].detail;}
function tick(now){frame=0;if(!visible)return;const dt=last?Math.min((now-last)/1000,1/30):0;last=now;if(!still.matches&&!manual&&!hovered){tour+=dt;const next=Math.floor(tour/4)%3;if(next!==target)select(next);}const desired=stages[target].x;x=still.matches?desired:x+(desired-x)*(1-Math.exp(-dt/.24));if(Math.abs(x-desired)<.02)x=desired;folder.setAttribute('transform','translate('+x*travel.x+' '+x*travel.y+')');if((!still.matches&&!manual&&!hovered)||x!==desired)frame=requestAnimationFrame(tick);}
function run(){if(!frame&&visible){last=0;frame=requestAnimationFrame(tick);}}
buttons.forEach((button,i)=>button.onclick=()=>{manual=true;select(i);run();});
root.onpointerenter=()=>{hovered=true;};root.onpointerleave=()=>{hovered=false;run();};root.onfocusin=()=>{manual=true;};root.onfocusout=e=>{if(!root.contains(e.relatedTarget)){manual=false;run();}};
root.querySelector('.figure-controls').onkeydown=e=>{const key=e.key;if(!['ArrowLeft','ArrowRight','Home','End'].includes(key))return;e.preventDefault();manual=true;select(key==='Home'?0:key==='End'?2:target+(key==='ArrowRight'?1:-1));run();};
new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;root.dataset.visible=visible;if(visible)run();}).observe(root);still.onchange=run;run();`;
const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SETU mentorship desk</title><style>html,body{margin:0;background:transparent;font-family:Arial,sans-serif}*{box-sizing:border-box}button{font:inherit;border:0;background:none;cursor:pointer}.mentorship-figure{--brand-dark:#651d26;--gold:#e4b76d;--white-soft:#fff9f2}${kit}${css}</style></head><body>${markup}<script>${script}</script></body></html>`;
await writeFile(".plannotator/setu-app/diagram.html", html);
console.log(`Exported Anatomy figure with ${partCount} parts.`);
