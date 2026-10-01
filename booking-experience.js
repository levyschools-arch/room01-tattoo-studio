(() => {
  'use strict';
  const section=document.querySelector('.booking-experience');
  if(!section) return;
  const $=selector=>section.querySelector(selector);
  const $$=selector=>[...section.querySelectorAll(selector)];
  const form=$('#room01-booking-form'), steps=$$('[data-booking-step]');
  const values={style:'',artist:'',regions:[],date:'',time:''};
  const sizes=['Small','Medium','Large'];
  // Concept rates, not a studio quote. Dimensions and coverage are area specific.
  const regions={
    'Face':{view:'front',x:134,y:28,w:22,h:25,cm:[[2,2],[4,3],[7,5]],prices:[[120,190],[200,350],[400,650]]},
    'Neck':{view:'front',x:134,y:54,w:24,h:19,cm:[[3,3],[6,4],[9,6]],prices:[[140,220],[250,400],[450,700]]},
    'Left shoulder':{view:'front',x:164,y:77,w:22,h:19,cm:[[4,4],[9,8],[15,13]],prices:[[140,210],[280,420],[480,720]]},
    'Right shoulder':{view:'front',x:100,y:77,w:22,h:19,cm:[[4,4],[9,8],[15,13]],prices:[[140,210],[280,420],[480,720]]},
    'Left upper arm':{view:'front',x:186,y:106,w:18,h:40,cm:[[5,4],[10,6],[18,9]],prices:[[130,190],[260,380],[450,680]]},
    'Right upper arm':{view:'front',x:80,y:106,w:18,h:40,cm:[[5,4],[10,6],[18,9]],prices:[[130,190],[260,380],[450,680]]},
    'Left forearm':{view:'front',x:203,y:155,w:15,h:42,cm:[[5,3],[12,5],[20,7]],prices:[[120,180],[240,360],[420,620]]},
    'Right forearm':{view:'front',x:65,y:155,w:15,h:42,cm:[[5,3],[12,5],[20,7]],prices:[[120,180],[240,360],[420,620]]},
    'Chest':{view:'front',x:134,y:97,w:54,h:34,cm:[[5,5],[14,10],[28,18]],prices:[[150,230],[360,550],[750,1150]]},
    'Upper back':{view:'back',x:134,y:103,w:55,h:52,cm:[[6,5],[17,13],[30,24]],prices:[[160,240],[420,620],[900,1400]]},
    'Lower back':{view:'back',x:134,y:158,w:51,h:33,cm:[[5,4],[14,8],[27,15]],prices:[[150,230],[330,500],[650,1000]]},
  };
  // Both anatomical sides are clickable, in both views. Front left appears on screen right.
  for(const bodyView of ['front','back'])for(const side of ['Left','Right']){
    const onScreenLeft=bodyView==='front'?side==='Right':side==='Left';
    regions[`${side} thigh / ${bodyView}`]={view:bodyView,x:onScreenLeft?103:151,y:231,w:28,h:48,cm:[[6,5],[15,10],[25,17]],prices:[[150,230],[340,500],[650,950]]};
    regions[`${side} lower leg / ${bodyView}`]={view:bodyView,x:onScreenLeft?94:160,y:282,w:22,h:45,cm:[[5,4],[12,7],[22,12]],prices:[[140,210],[280,420],[500,750]]};
  }
  let mode='guided',current=0,reached=0,guidedStep=0,view='front',arrangeLater=false,suggestion='';
  const answers={},dateLabels=new Map();
  let activeRegion='';
  const ns='http://www.w3.org/2000/svg';
  Object.entries(regions).forEach(([name,r])=>{
    const area=document.createElementNS(ns,'rect');
    Object.entries({x:r.x-r.w/2,y:r.y-r.h/2,width:r.w,height:r.h,rx:5,role:'button',tabindex:0,'aria-label':name,'aria-pressed':'false','data-region':name}).forEach(([key,value])=>area.setAttribute(key,value));
    area.addEventListener('click',()=>choose('placement',name));
    area.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose('placement',name);}});
    $('[data-body-hotspots]').append(area);
  });
  const today=new Date();today.setHours(0,0,0,0);
  let calendarMonth=new Date(today.getFullYear(),today.getMonth(),1),referenceUrl='',referenceName='',referenceRequest=0;
  const timeSlots=['09:30','10:15','11:00','11:45','14:00','14:45','15:30','16:15','17:00'];
  const dateKey=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  // Stable fictional availability, never a live studio calendar.
  function isBooked(time){const seed=[...values.date+values.artist].reduce((sum,char)=>sum+char.charCodeAt(0),0);return (timeSlots.indexOf(time)+seed)%3===0;}
  function renderCalendar(){
    const grid=$('[data-booking-dates]');grid.replaceChildren();
    $('[data-booking-month]').textContent=calendarMonth.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
    $('[data-calendar-prev]').disabled=calendarMonth.getFullYear()===today.getFullYear()&&calendarMonth.getMonth()===today.getMonth();
    const offset=(calendarMonth.getDay()+6)%7,days=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate();
    for(let i=0;i<offset;i++){const spacer=document.createElement('span');spacer.setAttribute('aria-hidden','true');grid.append(spacer);}
    for(let day=1;day<=days;day++){
      const date=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),day),key=dateKey(date),label=date.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
      dateLabels.set(key,label);
      const button=document.createElement('button');button.type='button';button.className='booking-choice';button.dataset.value=key;button.textContent=day;button.disabled=date<today;button.setAttribute('aria-pressed',String(key===values.date));button.setAttribute('aria-label',label+(date<today?', past date':', sample availability'));
      if(key===dateKey(today))button.setAttribute('aria-current','date');grid.append(button);
    }
  }
  function renderTimes(){
    const grid=$('[data-booking-times]');grid.replaceChildren();
    $('[data-time-caption]').textContent=values.date?`${dateLabels.get(values.date)}. Choose an available consultation time.`:'Choose a date to see sample consultation times.';
    timeSlots.forEach(time=>{
      const booked=!!values.date&&isBooked(time),button=document.createElement('button');button.type='button';button.className='booking-choice';button.dataset.value=time;button.disabled=!values.date||booked;button.dataset.booked=String(booked);button.setAttribute('aria-pressed',String(time===values.time));button.setAttribute('aria-label',`${time}, ${booked?'booked':values.date?'available':'choose a date first'}`);
      const label=document.createElement('span'),status=document.createElement('small');label.textContent=time;status.textContent=booked?'Booked':values.date?'Available':'Select a date';button.append(label,status);grid.append(button);
    });
  }
  $('[data-calendar-prev]').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderCalendar();});
  $('[data-calendar-next]').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderCalendar();});
  function clearReference(){
    referenceRequest++;if(referenceUrl)URL.revokeObjectURL(referenceUrl);referenceUrl='';referenceName='';
    $('[data-reference-image]').removeAttribute('src');$('[data-reference-preview]').hidden=true;$('[data-reference-input]').value='';$('[data-reference-feedback]').textContent='';update();
  }
  $('[data-reference-input]').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    clearReference();const request=referenceRequest;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){$('[data-reference-feedback]').textContent='Choose a JPG, PNG or WebP image up to 10 MB.';return;}
    const url=URL.createObjectURL(file),image=new Image();image.src=url;
    try{await image.decode();}catch{URL.revokeObjectURL(url);if(request===referenceRequest)$('[data-reference-feedback]').textContent='This image could not be opened. Try a different JPG, PNG or WebP file.';return;}
    if(request!==referenceRequest){URL.revokeObjectURL(url);return;}
    referenceUrl=url;referenceName=file.name;$('[data-reference-image]').src=url;$('[data-reference-name]').textContent=file.name;$('[data-reference-preview]').hidden=false;update();
  });
  $('[data-reference-remove]').addEventListener('click',clearReference);
  window.addEventListener('pagehide',()=>{if(referenceUrl)URL.revokeObjectURL(referenceUrl);});
  function estimates(){return values.regions.map(item=>{const r=regions[item.name],i=sizes.indexOf(item.size);return {...item,estimate:r&&i>=0?{cm:r.cm[i],prices:r.prices[i]}:null};});}
  function price(){const entries=estimates().filter(item=>item.estimate);if(!entries.length)return 'Add a size for each selected area';const low=entries.reduce((sum,item)=>sum+item.estimate.prices[0],0),high=entries.reduce((sum,item)=>sum+item.estimate.prices[1],0);return `EUR ${low} to ${high}`;}
  function artistName(){return ['Nova','Hiro'].includes(values.artist)?values.artist:'Discuss at consultation';}
  function setView(next){
    view=next;
    $$('[data-body-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bodyView===view)));
    $('[data-body-front]').setAttribute('visibility',view==='front'?'visible':'hidden');
    $('[data-body-back]').setAttribute('visibility',view==='back'?'visible':'hidden');
    $$('[data-region]').forEach(area=>{const visible=regions[area.dataset.region].view===view;area.style.display=visible?'':'none';area.setAttribute('tabindex',visible?'0':'-1');});
    updateMarker();
  }
  function updateMarker(){
    const marker=$('[data-booking-marker]'),entries=values.regions.filter(entry=>regions[entry.name].view===view);
    marker.setAttribute('visibility','hidden');if(!entries.length)return;
    const item=entries.find(entry=>entry.name===activeRegion)||entries[entries.length-1],r=regions[item.name],i=sizes.indexOf(item.size),factor=[.28,.57,.88][i<0?0:i];
    Object.entries({x:r.x-r.w*factor/2,y:r.y-r.h*factor/2,width:r.w*factor,height:r.h*factor}).forEach(([key,value])=>marker.setAttribute(key,value));
  }
  function renderReview(target){
    const entries=estimates(),rows=[['Artist',artistName()],['Consultation','Free. No commitment.']];
    if(mode==='guided')rows.push(['Style',values.style||'To discuss'],['Placements',entries.length?entries.map(item=>`${item.name} / ${item.size||'size to choose'}${item.estimate?` / about ${item.estimate.cm[0]} by ${item.estimate.cm[1]} cm`:''}`).join('; '):'To discuss'],['Example tattoo range',price()],['Consultation time',values.date&&!arrangeLater?`${dateLabels.get(values.date)} at ${values.time||'a time to arrange'}`:'Arrange together']);
    const custom=form.elements.namedItem('customIdea').value.trim(),idea=form.elements.namedItem('idea').value.trim();
    if(values.style==='Custom'&&custom)rows.push(['Custom direction',custom]);
    if(idea)rows.push(['Your idea',idea]);
    if(referenceName)rows.push(['Reference picture',referenceName+' / local preview only']);
    target.replaceChildren(...rows.map(([label,value])=>{const row=document.createElement('div'),term=document.createElement('dt'),desc=document.createElement('dd');term.textContent=label;desc.textContent=value;row.append(term,desc);return row;}));
  }
  function update(){
    const entries=estimates(),item=entries.find(entry=>entry.name===activeRegion),e=item?.estimate,r=item?regions[item.name]:null;
    $('[data-booking-live-title]').textContent=mode==='quick'?`FREE CONSULTATION / ${artistName()}`:[values.style,values.artist?artistName():''].filter(Boolean).join(' / ')||'YOUR PIECE STARTS HERE.';
    $('[data-booking-live-detail]').textContent=mode==='quick'?'Bring an idea or a question. We can work out the details together.':[entries.length?`${entries.length} ${entries.length===1?'AREA':'AREAS'}`:'',entries.some(entry=>!entry.size)?'SIZE TO CHOOSE':entries.length?price():''].filter(Boolean).join(' / ')||'Explore at your own pace, or start with a conversation.';
    $('[data-booking-study-label]').textContent=item?.name||'YOUR CANVAS';
    $('[data-booking-size-label]').textContent=e?`ABOUT ${e.cm[0]} BY ${e.cm[1]} CM`:'SELECT A SIZE';
    $('[data-active-region]').textContent=item?.name?.toUpperCase()||'CHOOSE AN AREA';
    $$('[data-size-note]').forEach(node=>{const cm=r?.cm[sizes.indexOf(node.dataset.sizeNote)];node.textContent=cm?`About ${cm[0]} by ${cm[1]} cm`:'Choose a body area';});
    $('[data-placement-caption]').textContent=item?`${item.name}: ${item.size||'choose small, medium or large'}. Coverage is an illustration, not a measurement of your body.`:'Tap up to five areas. Choose a size for each one.';
    $('[data-booking-price]').textContent=entries.length?`${price()} combined example range. Your consultation is free. The artist confirms each quote after discussing your idea.`:'Choose areas and sizes to see a combined example range.';
    $('[data-custom-detail]').hidden=values.style!=='Custom';
    $('[data-contact-artist]').textContent=`Free consultation / ${artistName()}`;
    const chipBox=$('[data-selected-regions]');chipBox.replaceChildren(...entries.map(entry=>{const chip=document.createElement('div');chip.className='region-chip';chip.dataset.active=String(entry.name===activeRegion);const selectButton=document.createElement('button');selectButton.type='button';selectButton.className='region-chip-select';selectButton.setAttribute('aria-pressed',String(entry.name===activeRegion));const label=document.createElement('span');label.textContent=entry.name;const size=document.createElement('small');size.textContent=entry.size||'Size?';selectButton.append(label,size);const remove=document.createElement('button');remove.type='button';remove.className='region-chip-remove';remove.dataset.removeRegion=entry.name;remove.setAttribute('aria-label',`Remove ${entry.name}`);remove.textContent='×';selectButton.addEventListener('click',()=>{activeRegion=entry.name;setView(regions[entry.name].view);update();});chip.append(selectButton,remove);return chip;}));
    $$('[data-region]').forEach(node=>node.setAttribute('aria-pressed',String(entries.some(entry=>entry.name===node.dataset.region))));
    $$('[data-booking-choice="size"] [data-value]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===item?.size)));
    updateMarker();renderReview($('[data-booking-review]'));renderReview($('[data-booking-final-review]'));
  }
  function choose(field,value){
    if(field==='placement'&&!regions[value])return;
    if(field==='time'&&(!values.date||!timeSlots.includes(value)||isBooked(value)))return;
    if(field==='date'&&value<dateKey(today))return;
    if(field==='date'||field==='artist')values.time='';
    if(field==='placement'){
      if(values.regions.some(entry=>entry.name===value)){activeRegion=value;setView(regions[value].view);update();return;}
      if(values.regions.length>=5){$('[data-booking-feedback]').textContent='Choose up to five areas. Remove one to add another.';return;}
      values.regions.push({name:value,size:''});activeRegion=value;setView(regions[value].view);
    }else if(field==='size'){
      const entry=values.regions.find(region=>region.name===activeRegion);if(!entry)return;entry.size=value;
    }else values[field]=value;
    $$(`[data-booking-choice="${field}"] [data-value]`).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===value)));
    if(field==='artist')$('[data-matcher]').hidden=value!=='Choose for me';
    if(field==='date'||field==='time')arrangeLater=false;
    if(field==='date'||field==='artist')renderTimes();
    $('[data-booking-feedback]').textContent='';update();
  }
  $$('[data-booking-choice]').forEach(group=>group.addEventListener('click',event=>{const button=event.target.closest('button[data-value]');if(button&&!button.disabled&&group.contains(button))choose(group.dataset.bookingChoice,button.dataset.value);}));
  $$('[data-selected-regions]').forEach(box=>box.addEventListener('click',event=>{const button=event.target.closest('[data-remove-region]');if(!button)return;const name=button.dataset.removeRegion;values.regions=values.regions.filter(item=>item.name!==name);if(activeRegion===name)activeRegion=values.regions.at(-1)?.name||'';if(activeRegion)setView(regions[activeRegion].view);update();}));
  $$('[data-body-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.bodyView)));
  function showStep(index,focus=true){
    current=index;
    if(mode==='guided'){guidedStep=index;reached=Math.max(reached,index);}
    steps.forEach((step,i)=>step.hidden=i!==index);
    $$('[data-booking-goto]').forEach((button,i)=>{button.disabled=i>reached;button.toggleAttribute('aria-current',i===index);if(i===index)button.setAttribute('aria-current','step');});
    $('.booking-steps').hidden=mode==='quick';
    $('[data-booking-step-count]').textContent=mode==='quick'?'FREE CONSULTATION':`${index+1} / 4`;
    $('[data-booking-next-label]').textContent=['CHOOSE THE PLACEMENT','PLAN A FREE CONSULTATION','ADD YOUR IDEA','PREVIEW CONSULTATION REQUEST'][index];
    $('[data-booking-back]').hidden=mode==='quick'||index===0;
    $('[data-booking-feedback]').textContent='';
    update();
    if(window.matchMedia('(max-width:760px)').matches)window.scrollTo({top:section.offsetTop,behavior:'auto'});
    if(focus)steps[index].querySelector('h3').focus({preventScroll:true});
  }
  function setMode(next,focus=true){
    mode=next;section.dataset.route=mode;
    $$('[data-route]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.route===mode)));
    form.hidden=false;$('[data-booking-complete]').hidden=true;
    showStep(mode==='quick'?3:guidedStep,focus);
  }
  $$('[data-route]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.route)));
  function validate(){
    if(mode==='guided'&&current===3){
      const incomplete=[['style','artist'],[],arrangeLater?[]:['date','time']].findIndex(fields=>fields.some(key=>!values[key]));
      if(incomplete===-1&&values.regions.length&&values.regions.some(entry=>!entry.size)){showStep(1);$('[data-booking-feedback]').textContent='Choose a size for each selected area.';return false;}
      if(incomplete!==-1){showStep(incomplete);validate();return false;}
    }
    const required=mode==='quick'?null:[['style','artist'],[],arrangeLater?[]:['date','time']][current];
    const missing=required?.find(key=>!values[key]);
    if(missing){$('[data-booking-feedback]').textContent=`Choose a ${missing} to continue.`;$(`[data-booking-choice="${missing}"] button`)?.focus({preventScroll:true});return false;}
    if(mode==='guided'&&current===1&&(!values.regions.length||values.regions.some(entry=>!entry.size))){$('[data-booking-feedback]').textContent=values.regions.length?'Choose a size for each selected area.':'Tap at least one area on the figure.';return false;}
    if(current===3){for(const key of ['name','email']){const input=form.elements.namedItem(key);input.value=input.value.trim();if(!input.checkValidity()){input.reportValidity();return false;}}}
    return true;
  }
  function advance(){
    if(!validate())return;
    if(current<3){showStep(current+1);return;}
    update();form.hidden=true;$('.booking-steps').hidden=true;$('[data-booking-complete]').hidden=false;
    $('[data-booking-step-count]').textContent='PREVIEW';
    $('[data-booking-confirmation]').textContent=`${form.elements.namedItem('name').value}, here is your consultation request. Take your time. You can edit any detail.`;
    $('[data-booking-complete] h3').focus({preventScroll:true});
  }
  $('[data-booking-next]').addEventListener('click',advance);
  form.addEventListener('submit',event=>{event.preventDefault();advance();});
  $('[data-booking-back]').addEventListener('click',()=>showStep(Math.max(0,current-1)));
  $$('[data-booking-goto]').forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.bookingGoto))));
  $('[data-booking-edit]').addEventListener('click',()=>{form.hidden=false;$('[data-booking-complete]').hidden=true;showStep(3);});
  $('[data-skip-time]').addEventListener('click',()=>{arrangeLater=true;showStep(3);});
  $$('[data-match]').forEach(group=>group.addEventListener('click',event=>{
    const button=event.target.closest('[data-answer]');if(!button)return;
    answers[group.dataset.match]=button.dataset.answer;
    group.querySelectorAll('button').forEach(node=>node.setAttribute('aria-pressed',String(node===button)));
    if(Object.keys(answers).length<3)return;
    if(answers.subject==='outside'){
      suggestion='Discuss at consultation';$('[data-match-result]').textContent='Colour and realism are outside these example portfolios. A free consultation is the right place to check the fit.';
    }else{
      const nova=(answers.weight==='delicate'?1:0)+(answers.subject==='botanical'?1:0);
      suggestion=nova===2?'Nova':nova===0?'Hiro':'Discuss at consultation';
      $('[data-match-result]').textContent=suggestion==='Nova'?'Nova is a starting point for delicate botanical and ornamental work.':suggestion==='Hiro'?'Hiro is a starting point for bold illustrative work.':'Your answers span both portfolios. We can help you choose during a free consultation.';
    }
    if(answers.readiness==='explore')$('[data-match-result]').textContent+=' You can bring an unfinished idea.';
    $('[data-match-accept]').hidden=false;
  }));
  $('[data-match-accept]').addEventListener('click',()=>{choose('artist',suggestion);});
  $('[data-match-skip]').addEventListener('click',()=>choose('artist','Discuss at consultation'));
  document.addEventListener('room01:choose-artist',event=>{if(['Nova','Hiro'].includes(event.detail?.artist)){choose('artist',event.detail.artist);guidedStep=0;setMode('guided',false);}});
  renderCalendar();renderTimes();setView('front');setMode('guided',false);
})();
