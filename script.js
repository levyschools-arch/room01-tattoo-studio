(() => {
  const cover = document.querySelector(".cover");
  const coverStage = document.querySelector(".cover-stage");
  const coverArt = document.querySelector(".cover-art");
  const entryFilm = document.querySelector(".entry-film");
  const sculptureArt = document.querySelector(".sculpture-art");
  const butterflyField = document.querySelector(".butterfly-field");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const bookingNav=document.querySelector('.nav-book');
  let ticking = false;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function createButterflies() {
    if (!butterflyField) return [];
    butterflyField.innerHTML = '<svg width="0" height="0" aria-hidden="true"><defs><filter id="room01-original-ink" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="1.2" intercept="-.08"/><feFuncG type="linear" slope="1.2" intercept="-.08"/><feFuncB type="linear" slope="1.2" intercept="-.08"/></feComponentTransfer><feColorMatrix type="matrix" values="0 0 0 0 .06 0 0 0 0 .06 0 0 0 0 .06 -.3333 -.3333 -.3333 0 1"/></filter></defs></svg>';
    // Crop the actual engraved butterfly from the approved artwork. The two
    // wings retain the original pixels and animate independently.
    const wing = '<svg viewBox="0 0 138 85" aria-hidden="true"><image filter="url(#room01-original-ink)" href="assets/room-artbook-landscape.png" x="-1110" y="-460" width="1672" height="941"/></svg>';
    const markup = `<span class="original-wing original-wing-left">${wing}</span><span class="original-wing original-wing-right">${wing}</span>`;
    const butterflies = [];
    for (let index = 0; index < 6; index += 1) {
      const element = document.createElement("span");
      element.className = "butterfly";
      element.innerHTML = markup;
      element.style.width = `${40 + index % 3 * 9}px`;
      const x = [.18,.77,.12,.83,.29,.68][index];
      const y = [.28,.31,.61,.69,.81,.19][index];
      const item = {element,index,x,y,tx:x,ty:y,next:0,scaredUntil:0};
      const escape = event => {
        const now=performance.now();
        if(now<item.scaredUntil) return;
        const rect=butterflyField.getBoundingClientRect();
        const px=(event.clientX-rect.left)/rect.width,py=(event.clientY-rect.top)/rect.height;
        let dx=item.x-px,dy=item.y-py;
        const length=Math.hypot(dx,dy)||1;
        dx=dx/length*.25;dy=dy/length*.25;
        item.tx=clamp(item.x+dx+(index%2?.12:-.12),.1,.86);
        item.ty=clamp(item.y+dy+(index%2?-.12:.12),.15,.82);
        if(Math.hypot(item.tx-item.x,item.ty-item.y)<.13){item.tx=item.x>.5?.25:.72;item.ty=item.y>.5?.28:.72;}
        item.scaredUntil=now+1300;item.next=now+4200;
      };
      element.addEventListener("pointerenter",escape);
      element.addEventListener("click",escape);
      butterflyField.append(element);butterflies.push(item);
    }
    return butterflies;
  }

  function createSunSpinner() {
    if (!coverStage || coverStage.querySelector(".sun-spinner")) return null;
    const sun = document.createElement("div");
    sun.className = "sun-spinner";
    sun.setAttribute("aria-hidden", "true");
    sun.innerHTML = '<svg viewBox="0 0 210 210"><image filter="url(#room01-original-ink)" href="assets/room-artbook-landscape.png" x="-1000" y="-21" width="1672" height="941"/></svg>';
    coverStage.append(sun);
    return sun;
  }

  const butterflies = createButterflies();
  const sunSpinner = createSunSpinner();
  const portal = document.createElement("div");
  portal.className = "entry-portal";
  portal.setAttribute("aria-hidden", "true");
  // Storefront behind, and two grain panels in front that open like double doors.
  portal.innerHTML = '<div class="entry-scene-host"></div><div class="cover-door cover-door-left"></div><div class="cover-door cover-door-right"></div>';
  coverStage?.prepend(portal);

  let butterflyProgress=0,previousFrame=0;
  function paintButterflies(progress) { butterflyProgress=progress; }
  function floatButterflies(now) {
    const elapsed=Math.min(50,now-previousFrame||16);previousFrame=now;
    if(butterflyProgress<1&&!document.hidden){
      const w=coverStage.clientWidth,h=coverStage.clientHeight;
      butterflies.forEach(item=>{
        if(!reduceMotion.matches&&now>item.next){
          item.tx=.12+(Math.sin(now*.00013+item.index*2.1)+1)*.34;
          item.ty=.16+(Math.cos(now*.00017+item.index*1.8)+1)*.31;
          item.next=now+4300+item.index*230;
        }
        const speed=reduceMotion.matches?1:1-Math.exp(-elapsed/(now<item.scaredUntil?210:2100));
        item.x+=(item.tx-item.x)*speed;item.y+=(item.ty-item.y)*speed;
        const flutter=reduceMotion.matches?0:Math.sin(now*.002+item.index)*7;
        item.element.style.transform=`translate3d(${item.x*(w-60)}px,${item.y*(h-60)}px,0) rotate(${flutter}deg)`;
        item.element.style.opacity=String(1-butterflyProgress);
      });
    }else butterflies.forEach(item=>item.element.style.opacity='0');
    requestAnimationFrame(floatButterflies);
  }
  requestAnimationFrame(floatButterflies);

  function updateScrollEffects() {
    ticking = false;
    if (cover && coverArt) {
      const coverRect = cover.getBoundingClientRect();
      const coverProgress = clamp(-coverRect.top / Math.max(1, cover.offsetHeight - window.innerHeight), 0, 1);
      // breakProgress is the visible break: 0 = whole sculpture, 1 = last
      // fragment off screen. The stone renderer's pieces are all off screen at
      // .42 of its own timeline (measured at 1440x900), so the whole cover
      // scroll is spent on the visible part of the shatter.
      const breakProgress = clamp((coverProgress - .025) / .975, 0, 1);
      const scatterProgress = breakProgress * .42;
      const remnant = 1 - clamp(scatterProgress / .14, 0, 1);
      cover.style.setProperty("--cover-progress", coverProgress.toFixed(3));
      coverArt.classList.toggle("is-crumbling", scatterProgress > 0);
      sculptureArt?.style.setProperty("--shatter-progress", scatterProgress.toFixed(3));
      coverStage.style.setProperty("--scene-remnant", remnant.toFixed(3));
      // 0% = whole sculpture, 100% = last fragment off screen. From 30% the cover
      // splits along its centre line and opens like double doors; behind them the
      // full-screen storefront settles from soft focus and a slight zoom to sharp,
      // and at 100% the camera move takes over on the same frame.
      const entry = clamp((breakProgress - .30) / .70, 0, 1);
      const door = reduceMotion.matches ? 1 : ease(entry), focus = (1 - entry) ** 2;
      coverStage.style.setProperty("--entry-opacity", reduceMotion.matches ? entry.toFixed(3) : entry > 0 ? "1" : "0");
      coverStage.style.setProperty("--door", door.toFixed(4));
      coverStage.style.setProperty("--focus-blur", reduceMotion.matches ? "0px" : `${(9 * focus).toFixed(2)}px`);
      coverStage.style.setProperty("--focus-scale", reduceMotion.matches ? "1" : (1 + .06 * focus).toFixed(4));
      // Any fragment still near the edge of a tall screen dissolves instead of popping at the handoff.
      coverStage.style.setProperty("--stone-fade", (1 - clamp((breakProgress - .92) / .08, 0, 1)).toFixed(3));
      coverStage.style.setProperty("--cover-copy-opacity", (1 - clamp(scatterProgress / .10, 0, 1)).toFixed(3));
      coverStage.style.setProperty("--meta-opacity", scatterProgress > 0 ? "0" : "1");
      coverStage.style.visibility = coverProgress >= 1 ? "hidden" : "visible";
      coverStage.style.pointerEvents = coverProgress >= 1 ? "none" : "";
      if (sunSpinner) sunSpinner.style.opacity = remnant.toFixed(3);
      window.room01Fracture?.setProgress(scatterProgress, reduceMotion.matches);
      paintButterflies(reduceMotion.matches ? 0 : clamp(scatterProgress / .42, 0, 1));
      if (reduceMotion.matches) butterflyField.style.opacity = remnant.toFixed(3);
      else butterflyField.style.opacity = "1";
    }

    if (entryFilm) {
      const rect=entryFilm.getBoundingClientRect(),travel=Math.max(1,entryFilm.offsetHeight-window.innerHeight);
      // The last 2.2 screens hold the camera at the wall: 1.2 to open an artist,
      // then 1 while the booking page slides up over the still wall.
      const scrub=Math.max(1,travel-window.innerHeight*2.2);
      const progress=reduceMotion.matches?1:clamp(-rect.top/scrub,0,1);
      entryFilm.style.setProperty('--entry-film-progress',progress.toFixed(4));
      filmScene?.set(progress);
    }
  }

  // Storefront -> door -> wall, drawn on one canvas per scene. Same geometry as a
  // real camera: each layer is scaled by perspective for its depth. One canvas at
  // screen size keeps scrolling smooth (huge 3D layers made the browser stall).
  // Measurements come from the approved storefront photo (2688x1520) and wall.
  const SCENE={aspect:2688/1520,wallAspect:2560/1276,wallStartW:.481,wallStartY:.525,wallEndFill:.8,
    glass:[[395,1030],[1659,2300]],glassY:[149,1278],door:[1092,1587],src:2688};
  const ARTISTS={
    NOVA:{name:'Nova',index:'FIG. 04 / NOVA',style:'Fine line. Ornamental.',note:'Botanical forms, delicate detail and a little negative space.',portrait:'assets/artist-portrait.webp',portraitAlt:'Fictional tattoo artist Nova with tattoos on her arms',flash:'assets/nova-flash.png',flashAlt:'AI concept tattoo flash for Nova with botanical and ornamental designs',rect:[.2488,.0768,.102,.2751]},
    HIRO:{name:'Hiro',index:'FIG. 05 / HIRO',style:'Blackwork. Illustrative.',note:'Bold silhouettes, deep black and stories drawn on skin.',portrait:'assets/artist-hiro.webp',portraitAlt:'Fictional tattoo artist Hiro with neck and arm tattoos',flash:'assets/hiro-flash.png',flashAlt:'AI concept tattoo flash for Hiro with bold blackwork and illustrative designs',rect:[.7957,.0204,.102,.2751]}
  };
  const ease=t=>t<.5?2*t*t:1-(-2*t+2)**2/2;
  const SCENE_V='20261002a';
  const sceneImages=Object.fromEntries(['facade','wall','room'].map(name=>{const img=new Image();img.decoding='async';img.src=`assets/scene/${name}.webp?v=${SCENE_V}`;return [name,img];}));
  const sceneReady=Promise.all(Object.values(sceneImages).map(img=>img.decode().catch(()=>{})));
  function createScene(host,interactive){
    if(!host)return null;
    const canvas=document.createElement('canvas');canvas.className='entry-scene-canvas';host.append(canvas);
    const ctx=canvas.getContext('2d');
    const buttons=interactive?Object.entries(ARTISTS).map(([key,a])=>{
      const b=document.createElement('button');b.type='button';b.className='wall-artist';b.dataset.artist=key;b.tabIndex=-1;
      b.setAttribute('aria-label',`Open ${a.name}'s card`);b.innerHTML=`<span class="wall-artist-tag">${a.name.toUpperCase()}</span>`;
      host.append(b);return b;}):[];
    let g=null,ready=false,last=0,atWall=false,dirty=true;
    function layout(){
      const vw=host.clientWidth||innerWidth,vh=host.clientHeight||innerHeight;
      // Retina sharpness without drawing millions of extra pixels on large displays.
      const ratio=Math.min(devicePixelRatio||1,2,3200/vw);
      canvas.width=Math.round(vw*ratio);canvas.height=Math.round(vh*ratio);
      // Landscape: storefront covers the screen. Portrait: door centred, windows
      // run off the sides, page colour above and below.
      const Wc=vw/vh>=1?Math.max(vw,vh*SCENE.aspect):vw*1.5,Hc=Wc/SCENE.aspect,P=Wc;
      // Landscape stops with floor and ceiling in view; portrait lets the wall run
      // slightly past the screen edges so the two frames stay big enough to tap.
      const fill=vw/vh>=1?SCENE.wallEndFill:1.1,r=SCENE.wallStartW*Wc/(fill*Math.min(Wc,vw));
      const Dw=Math.max(1.6*P,1.12*P/(1-r)-P),k0=P/(P+Dw),cEnd=(P+Dw)*(1-r);
      const Dr=Dw*1.35+.5*P,kr0=P/(P+Dr),coverEnd=Math.max(vw,vh*SCENE.aspect)*1.04;
      const roomW=Math.max(Wc/kr0,coverEnd*(P+Dr-cEnd)/P,vh*SCENE.aspect/kr0);
      const wallW=SCENE.wallStartW*Wc/k0;
      g={vw,vh,ratio,Wc,Hc,P,Dw,Dr,cEnd,roomW,wallW,wallY:(SCENE.wallStartY-.5)*Hc/k0,
        paper:getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()||'#d8d8d4'};
      dirty=true;draw();
    }
    function draw(){
      if(!g||!ready)return;
      const {vw,vh,ratio,Wc,Hc,P,Dw,Dr,cEnd,roomW,wallW,wallY,paper}=g;
      const progress=last,c=cEnd*ease(progress),cx=vw/2,cy=vh/2;
      ctx.setTransform(ratio,0,0,ratio,0,0);ctx.imageSmoothingQuality='high';
      ctx.clearRect(0,0,vw,vh);
      ctx.fillStyle='#8d8c88';ctx.fillRect(0,0,vw,vh);
      const kr=P/(P+Dr-c),rw=roomW*kr,rh=rw/SCENE.aspect;
      ctx.drawImage(sceneImages.room,cx-rw/2,cy-rh/2,rw,rh);
      const kw=P/(P+Dw-c),ww=wallW*kw,wh=ww/SCENE.wallAspect,wx=cx-ww/2,wy=cy+wallY*kw-wh/2;
      ctx.save();ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=wh*.08;ctx.shadowOffsetY=wh*.035;
      ctx.drawImage(sceneImages.wall,wx,wy,ww,wh);ctx.restore();
      if(c<.95*P){
        const kf=P/(P-c),fw=Wc*kf,fh=Hc*kf,fx=cx-fw/2,fy=cy-fh/2,u=fw/SCENE.src;
        ctx.save();ctx.globalAlpha=1-clamp((c/P-.86)/.09,0,1);
        drawDoor(c,P,cx,cy,Wc,Hc);
        ctx.drawImage(sceneImages.facade,fx,fy,fw,fh);
        // page colour above and below the photo on tall screens (hides the room)
        ctx.fillStyle=paper;if(fy>0)ctx.fillRect(0,0,vw,fy+.5);if(fy+fh<vh)ctx.fillRect(0,fy+fh-.5,vw,vh-fy-fh+.5);
        ctx.fillStyle='rgba(255,255,255,.07)';
        SCENE.glass.forEach(([a,b])=>ctx.fillRect(fx+a*u,fy+SCENE.glassY[0]*u,(b-a)*u,(SCENE.glassY[1]-SCENE.glassY[0])*u));
        ctx.fillStyle='rgba(255,255,255,.92)';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font=`300 ${fw*.0105}px "Helvetica Neue",Arial,sans-serif`;ctx.letterSpacing=`${fw*.0105*.45}px`;
        ctx.fillText('TATTOO',fx+fw*.272,fy+fh*.447);ctx.fillText('STUDIO',fx+fw*.736,fy+fh*.447);
        ctx.restore();
      }
      if(interactive){
        buttons.forEach(b=>{const [l,t,w,h]=ARTISTS[b.dataset.artist].rect;
          b.style.cssText=`left:${wx+l*ww}px;top:${wy+t*wh}px;width:${w*ww}px;height:${h*wh}px`;});
        const reached=progress>=.985;
        if(reached!==atWall){atWall=reached;host.classList.toggle('is-at-wall',reached);buttons.forEach(b=>b.tabIndex=reached?0:-1);
          host.closest('.entry-film')?.querySelector('[data-film-hint]')?.replaceChildren(reached?'CHOOSE YOUR ARTIST / TAP A PORTRAIT':'SCROLL THROUGH THE STUDIO');}
      }
    }
    // Glass door on its right hinge, swinging inward (away from the camera).
    function drawDoor(c,P,cx,cy,Wc,Hc){
      const theta=86*ease(clamp((last-.04)/.28,0,1))*Math.PI/180,u=Wc/SCENE.src;
      const xr=(SCENE.door[1]-SCENE.src/2)*u,dw=(SCENE.door[1]-SCENE.door[0])*u;
      const yt=(SCENE.glassY[0]-1520/2)*u,yb=(SCENE.glassY[1]-1520/2)*u;
      const pt=(d,y)=>{const z=d*Math.sin(theta),k=P/(P+z-c);return [cx+(xr-d*Math.cos(theta))*k,cy+y*k];};
      const quad=(d0,d1,y0,y1,fill)=>{const a=pt(d0,y0),b=pt(d1,y0),e=pt(d1,y1),f=pt(d0,y1);
        ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...e);ctx.lineTo(...f);ctx.closePath();ctx.fillStyle=fill;ctx.fill();};
      const st=Wc*.01,rl=Wc*.012,h=yb-yt;
      quad(0,dw,yt,yb,'rgba(255,255,255,.06)');
      quad(dw-st,dw,yt,yb,'#121212');quad(0,st,yt,yb,'#121212');
      quad(0,dw,yt,yt+rl,'#121212');quad(0,dw,yb-rl,yb,'#121212');
      quad(dw-dw*.05-Wc*.0035,dw-dw*.05,yt+h*.37,yt+h*.59,'#0b0b0b');
      if(theta<.7){const a=pt(dw*.523,yt+h*.47),b=pt(dw*.523-1,yt+h*.47),k=Math.hypot(a[0]-b[0],a[1]-b[1]);
        ctx.save();ctx.globalAlpha*=1-theta/.7;ctx.translate(...a);ctx.scale(k,P/(P+dw*.523*Math.sin(theta)-c));
        ctx.fillStyle='rgba(255,255,255,.92)';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font=`300 ${Wc*.0105}px "Helvetica Neue",Arial,sans-serif`;ctx.letterSpacing=`${Wc*.0105*.45}px`;ctx.fillText('ROOM/01',0,0);ctx.restore();}
    }
    sceneReady.then(()=>{ready=true;host.classList.add('is-ready');draw();});
    new ResizeObserver(layout).observe(host);layout();
    return {
      set(progress){if(progress===last&&!dirty)return;last=progress;dirty=false;draw();},
      buttons
    };
  }
  const filmScene=createScene(document.querySelector('[data-scene="film"]'),true);
  createScene(portal.querySelector('.entry-scene-host'),false)?.set(0);

  // Floating artist card: native <dialog> gives Esc, focus trap and focus return.
  const dialog=document.querySelector('.artist-card-dialog');
  if(dialog&&filmScene){
    const card=dialog.querySelector('[data-artist-card]'),q=sel=>dialog.querySelector(sel);
    let current=null;
    filmScene.buttons.forEach(button=>button.addEventListener('click',()=>{
      const a=ARTISTS[button.dataset.artist];current=a;card.classList.remove('is-flipped');
      q('[data-card-portrait]').src=a.portrait;q('[data-card-portrait]').alt=a.portraitAlt;
      q('[data-card-index]').textContent=a.index;q('[data-card-name]').textContent=a.name;
      q('[data-card-style]').textContent=a.style;q('[data-card-note]').textContent=a.note;
      q('[data-card-studies]').textContent=`STUDIES BY ${a.name.toUpperCase()}`;q('[data-card-style-back]').textContent=a.style;
      q('[data-card-flash]').src=a.flash;q('[data-card-flash]').alt=a.flashAlt;
      q('[data-card-choose]').textContent=`CHOOSE ${a.name.toUpperCase()}`;
      dialog.showModal();
    }));
    dialog.querySelectorAll('[data-card-flip]').forEach(b=>b.addEventListener('click',()=>card.classList.toggle('is-flipped')));
    dialog.querySelectorAll('[data-card-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    q('[data-card-choose]').addEventListener('click',event=>{
      event.preventDefault();dialog.close();
      document.dispatchEvent(new CustomEvent('room01:choose-artist',{detail:{artist:current.name}}));
      const target=document.querySelector('#booking');history.pushState(null,'','#booking');
      window.scrollTo({top:window.scrollY+target.getBoundingClientRect().top,behavior:reduceMotion.matches?'auto':'smooth'});
    });
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScrollEffects);
  }

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-inview");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .14 });
    document.querySelectorAll("[data-scroll-reveal]").forEach(item => revealObserver.observe(item));
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  reduceMotion.addEventListener?.("change", requestUpdate);
  bookingNav?.addEventListener('click',event=>{
    const target=document.querySelector('#booking');if(!target)return;
    event.preventDefault();history.pushState(null,'','#booking');
    window.scrollTo({top:window.scrollY+target.getBoundingClientRect().top,behavior:reduceMotion.matches?'auto':'smooth'});
  });
  if(location.hash==='#booking')requestAnimationFrame(()=>{const target=document.querySelector('#booking');if(target)window.scrollTo({top:target.offsetTop,behavior:'auto'});});
  updateScrollEffects();

  const form = document.querySelector("#concept-form");
  form?.addEventListener("submit", event => {
    event.preventDefault();
    document.querySelector("#form-message").textContent = "Demo only. No request was sent or stored.";
  });
})();
