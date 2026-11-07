(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const W = 1000, H = 520;
  const arena = { x: 175, y: 278, w: 650, h: 205 };
  const $ = (s) => document.querySelector(s);
  const hpFill = $('#hp-fill'), hpText = $('#hp-text'), quip = $('#quip'), toast = $('#toast');
  const buttons = [...document.querySelectorAll('.action')];
  const keys = new Set();
  let phase = 'menu', hp = 20, enemyHp = 100, spared = 0, round = 1, selected = 0, locked = false;
  let soul = { x: 500, y: 385, invuln: 0 }, bones = [], elapsed = 0, last = 0, tick = 0;
  let meterPos = 0, meterDir = 1, attackPower = 0, speech = '', speechUntil = 0, toastTimer;
  let sound = false, ac;
  const sayings = [
    'heya. ready for a little bone-afide challenge?',
    'you look like you could use a break. too bad.',
    'welp. this is where it gets a little bony.',
    'you keep dodging. i respect the commitment.'
  ];
  const actLines = ['You tell Sans a joke. He lets out a tiny snort.', 'You ask Sans to take it easy. “yeah, sure. totally.”', 'Sans gives you a solemn nod. The blue glow softens.'];
  const rand = (a,b) => a + Math.random() * (b-a);

  function updateHud() {
    hpText.textContent = `${hp} / 20`;
    hpFill.style.width = `${hp * 5}%`;
    hpFill.style.background = hp <= 6 ? '#ff676e' : hp <= 12 ? '#f5a64e' : '#f3cb62';
    $('#round-label').textContent = `ENCOUNTER 0${Math.min(round, 4)}`;
    buttons.forEach((b, i) => b.classList.toggle('selected', i === selected && phase === 'menu'));
    buttons[3].title = spared >= 3 ? 'Spare Sans' : 'Get to know Sans first';
  }
  function say(text, duration=2600) {
    speech = text; speechUntil = performance.now() + duration;
    quip.textContent = text;
  }
  function notify(text) {
    toast.textContent = text; toast.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
  }
  function beep(freq=440, duration=.07, type='sine') {
    if (!sound) return;
    try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); const o=ac.createOscillator(), g=ac.createGain(); o.type=type;o.frequency.value=freq;g.gain.value=.035;o.connect(g);g.connect(ac.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration);o.stop(ac.currentTime+duration); } catch {}
  }
  function setPhase(next) { phase = next; updateHud(); }
  function attack() {
    if (phase !== 'menu') return;
    setPhase('aim'); meterPos=0; meterDir=1;
    say('Choose your moment. Press ENTER or SPACE!', 5000); beep(340,.08);
  }
  function strike() {
    if (phase !== 'aim') return;
    const accuracy = Math.max(0, 1 - Math.abs(meterPos - .5) * 2);
    attackPower = Math.round(14 + accuracy * 25);
    enemyHp = Math.max(0, enemyHp - attackPower);
    beep(accuracy > .8 ? 770 : 490,.15,'triangle');
    if (enemyHp <= 0) { setPhase('victory'); say('okay, okay. you win. i’m outta here.', 99999); return; }
    say(accuracy > .8 ? `A perfect hit! Sans loses ${attackPower} HP.` : `You hit Sans for ${attackPower} damage.`, 2200);
    setTimeout(() => { if (phase === 'aim') beginDodge(); }, 650);
  }
  function doAct() {
    if (phase !== 'menu' || locked) return;
    locked = true;
    spared = Math.min(3, spared + 1);
    const line = actLines[Math.min(spared - 1, 2)];
    say(line, 2600); notify(spared >= 3 ? 'Sans can now be spared.' : `Sans is warming up to you · ${spared}/3`); beep(510,.08,'triangle');
    setTimeout(() => { if (phase === 'menu') beginDodge(); }, 1400);
  }
  function doItem() {
    if (phase !== 'menu' || locked) return;
    if (hp >= 20) { say('Your inventory is empty. Your heart is full.', 2400); notify('You already have full HP.'); return; }
    const gain = Math.min(8, 20-hp); hp += gain; locked = true; updateHud(); say(`You ate a cinnamon star. Recovered ${gain} HP!`, 2400); beep(660,.1,'sine');
    setTimeout(() => { if (phase === 'menu') beginDodge(); }, 900);
  }
  function doMercy() {
    if (phase !== 'menu' || locked) return;
    if (spared >= 3 || enemyHp <= 18) {
      setPhase('victory'); say('heh. guess you really are a good person.', 99999); beep(620,.2,'triangle');
    } else { say('Sans isn’t ready to give up just yet.', 2200); notify('Try ACT a few times, or lower his HP.'); }
  }
  function beginDodge() {
    if (phase === 'victory' || phase === 'defeat') return;
    locked=false; bones=[]; elapsed=0; soul={x:500,y:380,invuln:.8}; setPhase('dodge');
    say(sayings[Math.min(round-2,sayings.length-1)], 2300); beep(230,.12,'square');
  }
  function nextMenu() {
    bones=[];
    if (round >= 4) { endGame(true); return; }
    round++;
    setPhase('menu');
    const lines=['sans is checking his phone. typical.','sans looks a little less sure of himself.','the corridor grows quiet. for now.'];
    say(lines[Math.min(round-2,2)] || 'he stretches. “that all you got?”', 5000);
  }
  function endGame(won) {
    hp=won?hp:0; setPhase(won?'victory':'defeat');
    say(won?'The corridor is yours. You showed mercy and heart.':'Your soul faded away… but the story can start again.',99999);
    updateHud();
  }
  function handleAction(name) {
    if (phase === 'victory' || phase === 'defeat') { restart(); return; }
    if (phase !== 'menu' || locked) return;
    if (name==='fight') attack(); if (name==='act') doAct(); if (name==='item') doItem(); if (name==='mercy') doMercy();
  }
  function restart() {
    hp=20;enemyHp=100;spared=0;round=1;locked=false;bones=[];soul={x:500,y:380,invuln:0};say('A strange calm settles over the corridor.');setPhase('menu');
  }
  buttons.forEach((b,i)=>{
    b.addEventListener('click',()=>{selected=i;updateHud();handleAction(b.dataset.action);});
    b.addEventListener('mouseenter',()=>{selected=i;updateHud();});
  });
  $('#sound-toggle').addEventListener('click',e=>{sound=!sound;e.currentTarget.setAttribute('aria-pressed',String(sound));e.currentTarget.innerHTML=`SOUND <span>${sound?'ON':'OFF'}</span>`;if(sound)beep(540,.08);});
  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
    keys.add(k);
    if (phase==='menu' && (k==='arrowleft'||k==='a')) {selected=(selected+3)%4;updateHud();}
    if (phase==='menu' && (k==='arrowright'||k==='d')) {selected=(selected+1)%4;updateHud();}
    if (k==='enter'||k===' ') { if(phase==='aim')strike(); else if(phase==='menu')handleAction(buttons[selected].dataset.action); else if(phase==='victory'||phase==='defeat')restart(); }
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  document.querySelectorAll('[data-dir]').forEach(b=>{
    const key={up:'arrowup',down:'arrowdown',left:'arrowleft',right:'arrowright'}[b.dataset.dir];
    const down=e=>{e.preventDefault();keys.add(key);}; const up=e=>{e.preventDefault();keys.delete(key);};
    b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);
  });

  function rr(c,x,y,w,h,r,fill,stroke,lw=1){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.lineWidth=lw;c.strokeStyle=stroke;c.stroke()}}
  function text(str,x,y,size,color,align='center',font='500 14px "DM Mono", monospace') {ctx.font=font.replace('14px',`${size}px`);ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(str,x,y)}
  function drawBackground(now) {
    const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#111722');grad.addColorStop(.58,'#141a27');grad.addColorStop(1,'#0e121c');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    // faint corridor architecture
    ctx.strokeStyle='#293144';ctx.lineWidth=1;
    for(let i=0;i<8;i++){const y=44+i*26;ctx.globalAlpha=.12;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.globalAlpha=1;
    ctx.fillStyle='#212a39';ctx.globalAlpha=.56;ctx.fillRect(0,251,W,2);ctx.globalAlpha=1;
    for(let i=0;i<18;i++){const x=(i*83+19)%W;const blink=(Math.sin(now/700+i*5)+1)/2;ctx.fillStyle=`rgba(157,186,218,${.16+blink*.35})`;ctx.fillRect(x,36+(i*37)%175,2,2);}
    // pedestal behind the skeleton
    ctx.fillStyle='#1c2533';ctx.beginPath();ctx.ellipse(500,264,124,13,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#39465a';ctx.stroke();
  }
  function drawSans(now) {
    const bob=phase==='dodge'?Math.sin(now/190)*1.8:Math.sin(now/550)*2;
    ctx.save();ctx.translate(500,0);
    // shadow
    ctx.fillStyle='#080b11';ctx.beginPath();ctx.ellipse(0,264,54,8,0,0,Math.PI*2);ctx.fill();
    // hoodie body and sleeves
    ctx.lineJoin='round';ctx.lineCap='round';ctx.fillStyle='#d9e0e9';ctx.strokeStyle='#718095';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-29,192+bob);ctx.quadraticCurveTo(-43,201,-42,228+bob);ctx.lineTo(-34,250);ctx.quadraticCurveTo(0,263,34,250);ctx.lineTo(42,228+bob);ctx.quadraticCurveTo(42,202,29,192+bob);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#e3e8ec';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(-32,205+bob);ctx.lineTo(-47,235);ctx.moveTo(31,205+bob);ctx.lineTo(47,234);ctx.stroke();
    // jacket trim
    ctx.strokeStyle='#a7b3c2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-16,198+bob);ctx.lineTo(-9,248);ctx.moveTo(15,198+bob);ctx.lineTo(9,248);ctx.stroke();
    // skull
    ctx.fillStyle='#f0eee7';ctx.strokeStyle='#aeb8c5';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,162+bob,43,41,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    // jaw and teeth
    rr(ctx,-22,174+bob,44,20,6,'#e6e5df','#aab4c0',1.5);ctx.strokeStyle='#b9c1cb';ctx.lineWidth=1;for(let x=-13;x<=13;x+=9){ctx.beginPath();ctx.moveTo(x,181+bob);ctx.lineTo(x,193+bob);ctx.stroke();}
    // sockets
    ctx.fillStyle='#161b27';ctx.beginPath();ctx.ellipse(-15,159+bob,10,14,.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(15,159+bob,10,14,-.2,0,Math.PI*2);ctx.fill();
    // eye glints, changing blue when attacking
    const glow=phase==='dodge'&&round>=3;
    ctx.shadowColor=glow?'#56aaff':'#f3d9aa';ctx.shadowBlur=glow?13:5;ctx.fillStyle=glow?'#65b9ff':'#f4e3bf';ctx.beginPath();ctx.ellipse(-13,161+bob,3,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7fa9d8';ctx.beginPath();ctx.ellipse(17,158+bob,2.4,3.8,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    // collar, zipper, tiny hands
    ctx.fillStyle='#e6e8e6';ctx.beginPath();ctx.moveTo(-15,196+bob);ctx.lineTo(0,208+bob);ctx.lineTo(15,196+bob);ctx.lineTo(10,215+bob);ctx.lineTo(-9,215+bob);ctx.closePath();ctx.fill();
    ctx.fillStyle='#555f70';ctx.fillRect(-2,214+bob,4,22);ctx.fillStyle='#909dad';ctx.fillRect(-2,238+bob,4,3);
    ctx.fillStyle='#ecebe5';ctx.beginPath();ctx.arc(-48,237,7,0,Math.PI*2);ctx.arc(48,237,7,0,Math.PI*2);ctx.fill();
    // shoes
    ctx.fillStyle='#b8c2ce';rr(ctx,-32,249+bob,24,9,4,'#aab6c5');rr(ctx,8,249+bob,24,9,4,'#aab6c5');
    ctx.restore();
    // name and enemy health
    text('SANS',500,54,10,'#aebbd0','center','500 10px "DM Mono", monospace');
    rr(ctx,444,62,112,4,2,'#303949');rr(ctx,444,62,112*enemyHp/100,4,2,'#87a9d2');
    // speech bubble
    const bubble=speech && now<speechUntil && (phase==='menu'||phase==='victory'||phase==='defeat');
    if(bubble){rr(ctx,571,104,245,53,8,'#202839','#59657a',1);ctx.beginPath();ctx.moveTo(573,141);ctx.lineTo(559,151);ctx.lineTo(581,148);ctx.fillStyle='#202839';ctx.fill();ctx.strokeStyle='#59657a';ctx.stroke();wrapText(speech,586,124,214,13,'#d7dce5',11);}
  }
  function wrapText(str,x,y,maxW,lineH,color,size) {
    ctx.font=`400 ${size}px "DM Mono", monospace`;ctx.textAlign='left';ctx.fillStyle=color;const words=str.split(' ');let line='', yy=y;
    for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxW&&line){ctx.fillText(line,x,yy);line=word;yy+=lineH;}else line=test;}if(line)ctx.fillText(line,x,yy);
  }
  function drawArena() {
    const {x,y,w,h}=arena;
    ctx.fillStyle='#090c13';ctx.fillRect(x,y,w,h);ctx.strokeStyle=phase==='dodge'?'#ddd9d2':'#aab4c6';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
    // grid dots
    ctx.fillStyle='#252b36';for(let i=1;i<10;i++)for(let j=1;j<4;j++)ctx.fillRect(x+i*w/10,y+j*h/4,1,1);
    if(phase==='menu'){
      const line=round===1?'* Sans blocks the way. What will you do?':'* Keep your guard up. Sans is watching.';
      text(line,x+w/2,y+34,12,'#d7dce4');text(`SANS  ${enemyHp} / 100`,x+w/2,y+59,10,'#8e9bb0');
    } else if(phase==='aim') drawMeter();
    else if(phase==='dodge') {
      const remaining=Math.max(0,Math.ceil(8-elapsed));text(`DODGE!  ${remaining}`,x+w/2,y-9,10,'#9bbfea');
      bones.forEach(drawBone);
      if(soul.invuln<=0||Math.floor(performance.now()/90)%2===0)drawSoul(soul.x,soul.y);
      rr(ctx,x+12,y+h-25,105,5,3,'#363d4a');rr(ctx,x+12,y+h-25,105*(1-elapsed/8),5,3,'#85b9fa');
    } else if(phase==='victory'||phase==='defeat') {
      const won=phase==='victory';text(won?'* YOU SPARED THE SKELETON':'* YOUR SOUL NEEDS A RESET',x+w/2,y+72,15,won?'#f4cf77':'#ff8484');
      text(won?'The corridor is quiet. For once.':'Sans waits patiently for another try.',x+w/2,y+103,11,'#bdc4d1');
      rr(ctx,x+w/2-104,y+129,208,32,5,'#272e3d','#687388');text('PRESS ENTER TO PLAY AGAIN',x+w/2,y+149,10,'#f0e9dd');
    }
  }
  function drawMeter() {
    const cx=arena.x+arena.w/2, y=arena.y+66, width=410;
    text('TIME YOUR STRIKE',cx,y-16,11,'#d3d9e3');
    rr(ctx,cx-width/2,y,width,24,5,'#292f3b','#5b6575');
    ctx.fillStyle='#62734b';ctx.fillRect(cx-width*.09,y+2,width*.18,20);
    ctx.fillStyle='#db6b68';ctx.fillRect(cx-width*.17,y+2,width*.08,20);ctx.fillRect(cx+width*.09,y+2,width*.08,20);
    ctx.fillStyle='#e5e3dd';ctx.fillRect(cx-width/2+meterPos*width-2,y-5,4,34);
    text('PRESS ENTER',cx,y+56,10,'#8e9caf');
  }
  function drawSoul(x,y) {
    ctx.save();ctx.translate(x,y);ctx.shadowColor='#ff5768';ctx.shadowBlur=10;ctx.fillStyle='#ff334d';ctx.beginPath();ctx.moveTo(0,8);ctx.bezierCurveTo(-4,5,-12,0,-12,-6);ctx.bezierCurveTo(-12,-14,-2,-14,0,-7);ctx.bezierCurveTo(3,-14,12,-14,12,-6);ctx.bezierCurveTo(12,0,4,5,0,8);ctx.fill();ctx.shadowBlur=0;ctx.restore();
  }
  function spawnBone() {
    const side=Math.random()<.5?'left':'right';
    if(round===2 || Math.random()<.23){
      const x=rand(arena.x+35,arena.x+arena.w-35);bones.push({x,y:arena.y-25,w:15,h:46,vx:0,vy:rand(145,205),type:'vertical',warn:true});
    } else {
      const left=side==='left';const y=rand(arena.y+28,arena.y+arena.h-30);
      bones.push({x:left?arena.x-90:arena.x+arena.w+15,y,w:rand(75,115),h:13,vx:left?rand(190,270):-rand(190,270),vy:0,type:'horizontal'});
    }
  }
  function drawBone(b) {
    ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle='#e8e8e4';ctx.strokeStyle='#929eac';ctx.lineWidth=1;
    if(b.type==='vertical'){
      rr(ctx,-b.w/2,-b.h/2,b.w,b.h,7,'#e8e8e4','#aeb9c4');ctx.beginPath();ctx.arc(0,-b.h/2+2,7,0,Math.PI*2);ctx.arc(0,b.h/2-2,7,0,Math.PI*2);ctx.fill();
    } else {rr(ctx,0,-b.h/2,b.w,b.h,6,'#e8e8e4','#aeb9c4');ctx.beginPath();ctx.arc(3,-b.h/2,7,0,Math.PI*2);ctx.arc(3,b.h/2,7,0,Math.PI*2);ctx.arc(b.w-3,-b.h/2,7,0,Math.PI*2);ctx.arc(b.w-3,b.h/2,7,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  function overlap(b) {
    if(b.type==='vertical')return Math.abs(soul.x-b.x)<15&&Math.abs(soul.y-b.y)<31;
    return soul.x+9>b.x&&soul.x-9<b.x+b.w&&soul.y+8>b.y-b.h/2-6&&soul.y-8<b.y+b.h/2+6;
  }
  function update(dt,now) {
    tick+=dt;
    if(phase==='aim'){meterPos+=meterDir*dt*.8;if(meterPos>1){meterPos=1;meterDir=-1}if(meterPos<0){meterPos=0;meterDir=1}}
    if(phase==='dodge'){
      elapsed+=dt;const speed=205;
      if(keys.has('arrowleft')||keys.has('a'))soul.x-=speed*dt;if(keys.has('arrowright')||keys.has('d'))soul.x+=speed*dt;if(keys.has('arrowup')||keys.has('w'))soul.y-=speed*dt;if(keys.has('arrowdown')||keys.has('s'))soul.y+=speed*dt;
      soul.x=Math.max(arena.x+16,Math.min(arena.x+arena.w-16,soul.x));soul.y=Math.max(arena.y+17,Math.min(arena.y+arena.h-17,soul.y));soul.invuln=Math.max(0,soul.invuln-dt);
      const interval=Math.max(.36,.88-(round-1)*.12);if(elapsed<7.8&&Math.floor(elapsed/interval)!==Math.floor((elapsed-dt)/interval))spawnBone();
      for(const b of bones){b.x+=b.vx*dt;b.y+=b.vy*dt;if(soul.invuln<=0&&overlap(b)){hp=Math.max(0,hp-4);soul.invuln=.7;updateHud();beep(160,.12,'sawtooth');if(hp<=0){endGame(false);return;}}}
      bones=bones.filter(b=>b.x+b.w>-20&&b.x< W+20&&b.y<arena.y+arena.h+30);
      if(elapsed>=8)nextMenu();
    }
  }
  function render(now) {
    ctx.clearRect(0,0,W,H);drawBackground(now);drawSans(now);drawArena();
    if(phase==='victory'||phase==='defeat'){
      ctx.fillStyle='#0a0c12a8';ctx.fillRect(0,0,W,H);
      // redraw arena above dim veil
      drawArena();
    }
  }
  function frame(now) {const dt=Math.min(.04,(now-last)/1000||0);last=now;update(dt,now);render(now);requestAnimationFrame(frame);}
  updateHud();requestAnimationFrame(frame);
})();
