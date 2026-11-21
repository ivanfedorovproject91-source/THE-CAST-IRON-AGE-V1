/* ===== Питомцы: индивидуальный уход и поведение Чугунка и Чугуна ===== */
(function () {
  'use strict';
  const G=window.G,D=G.D,K=G.career;
  const F=()=>G.s.flags;
  const C=G.clamp;
  const SPEC={
    cat:{name:'Чугунок',emoji:'🐈',key:'petCat',food:100,kind:'кот'},
    dog:{name:'Чугун',emoji:'🐕',key:'petDog',food:150,kind:'собака'}
  };
  function init(){
    const f=F();
    // Старые сохранения не отличают дружбу с котом от переезда. Наличие Чугуна — надёжный признак, что Чугунок уже уехал домой.
    if(f.dog && f.catHome == null) f.catHome=1;
    if((f.cat || f.catHome) && !f.petCat) f.petCat={satiety:75,mood:70,trust:Math.max(15,f.catLove||10),health:90,energy:75,lastFed:f.catFed||G.s.t.day,lastCare:G.s.t.day};
    if(f.catHome) f.cat=1;
    if(f.dog&&!f.petDog)f.petDog={satiety:70,mood:70,trust:25,health:95,energy:80,lastFed:G.s.t.day,lastCare:G.s.t.day,lastWalk:G.s.t.day};
  }
  function petState(type){
    init();
    const f=F(),key=SPEC[type].key;
    if(!f[key])f[key]=type==='cat'?{satiety:75,mood:70,trust:Math.max(15,f.catLove||10),health:90,energy:75,lastFed:f.catFed||G.s.t.day,lastCare:G.s.t.day}:{satiety:70,mood:70,trust:25,health:95,energy:80,lastFed:G.s.t.day,lastCare:G.s.t.day,lastWalk:G.s.t.day};
    return f[key];
  }
  function clampPet(p){['satiety','mood','trust','health','energy'].forEach(k=>p[k]=C(Math.round(p[k]),0,100));}
  function bars(p){
    return ['satiety','mood','trust','health','energy'].map((k)=>'<div class="kv"><span>'+({satiety:'Сытость',mood:'Настроение',trust:'Доверие',health:'Здоровье',energy:'Энергия'}[k])+'</span><b>'+Math.round(p[k])+'/100</b></div>').join('');
  }
  function result(type,title,text,fx,delta){
    const p=petState(type);Object.keys(delta||{}).forEach(k=>p[k]+=delta[k]);clampPet(p);
    if(/Уход/.test(title))p.lastCare=G.s.t.day;
    // Настроение хозяина: заметный бонус, зависящий от доверия питомца; за день «полный» эффект ограничен (потом слабее)
    let sum='';
    if(fx){
      const day=G.s.t.day;if(p.moodDay!==day){p.moodDay=day;p.moodGiven=0;}
      const f2=Object.assign({},fx);
      if(f2.mood>0){
        const base=f2.mood*(1+p.trust/100);          // доверие 0..100 → до ×2
        const full=Math.max(0,Math.min(base,30-p.moodGiven)), rest=base-full;
        f2.mood=Math.round(full+rest*0.35);p.moodGiven+=f2.mood;
      }
      sum=G.fx(f2);
    }
    G.spend(1);
    G.modal({title,face:type==='cat'?'chugunok':'chugun',bg:'checkpoint',text:text+(sum?'<br><b>🙂 '+sum+'</b>':'')+'<br><br>'+bars(p),opts:[{t:'Хорошо',fn:()=>{}}]});
  }
  function catMenu(){
    const p=petState('cat'),s=G.s;
    const opts=[
      {t:'🐾 Погладить',fn:()=>result('cat','Чугунок мурлычет','Кот прищурился, подставил голову под ладонь и довольно замурлыкал.',{mood:5},{mood:9,trust:5,energy:-2})},
      {t:'🤲 Взять на руки',fn:()=>result('cat','На руках','Чугунок устроился поудобнее. Если не тянуть за лапы и не удерживать силой, он спокойно мурлычет.',{mood:5},{mood:7,trust:4,energy:-5})},
      {t:'🧡 Потискать',fn:()=>{if(p.trust<35)return result('cat','Чугунок не в настроении','Кот мягко вывернулся и отошёл. Он пока не настолько доверяет тесным объятиям.',{mood:-1},{mood:-3,trust:-2,energy:-2});result('cat','Мягкий рыжий комок','Чугунок терпеливо принимает ласку, потом довольно потягивается.',{mood:6},{mood:10,trust:4,energy:-5});}},
      {t:'🥫 Покормить (100 ₽)',dis:s.money<100?'Нет денег':p.satiety>92?'Кот пока сыт':null,fn:()=>{G.addMoney(-100);p.lastFed=s.t.day;result('cat','Миска Чугунка','Чугунок съел порцию и тщательно умылся.',{mood:3},{satiety:32,mood:5,trust:3,energy:4});}},
      {t:'🧶 Поиграть',dis:p.energy<15?'Кот устал':null,fn:()=>result('cat','Охота на верёвочку','Чугунок крадётся, прыгает за игрушкой и в конце победно валится на бок.',{mood:7},{mood:12,trust:5,energy:-18,satiety:-7})},
      {t:'👀 Наблюдать за поведением',fn:()=>{const mood=p.mood>70?'довольно мурлычет и ищет компанию':p.mood<30?'прячется и просит оставить его в покое':'умывается и внимательно следит за происходящим';G.modal({title:'Наблюдение за Чугунком',face:'chugunok',text:'Чугунок '+mood+'.<br><br>'+bars(p),opts:[{t:'Продолжить',fn:()=>{}}]});}},
      {t:'🧼 Ухаживать',fn:()=>result('cat','Уход за котом','Ты проверил воду, чистоту места отдыха и шерсть. Чугунок доволен спокойным уходом.',{mood:3},{health:5,mood:5,trust:4,energy:3})},
      {t:'🚽 Убрать туалет ('+litterLabel()+')',dis:litterWhy(),fn:()=>G.litterGame()},
      {t:'🏠 Забрать домой (500 ₽)',dis:!G.isFree()?'Забрать домой можно после смены':F().catHome?'Уже дома':s.money<500?'Нет денег':null,fn:()=>{G.addMoney(-500);F().cat=1;F().catHome=1;F().petCat=p;G.fx({mood:8});G.modal({title:'Чугунок переезжает',face:'chugunok',bg:'gate',text:'Чугунок осмотрел комнату, выбрал самое тёплое место и улёгся. На заводе теперь появится новый хвостатый знакомый — пёс Чугун.',opts:[{t:'Добро пожаловать домой',fn:()=>{F().dog=1;F().petDog=F().petDog||{satiety:70,mood:70,trust:25,health:95,energy:80,lastFed:s.t.day,lastCare:s.t.day,lastWalk:s.t.day};G.R('chugun').met=true;}}]});}}
    ];
    G.modal({title:'🐈 Чугунок — заводской кот',face:'chugunok',text:'Рыжий кот — самостоятельное животное. Не разговаривает как человек, а отвечает позой, мурлыканьем и поведением.<br><br>'+bars(p)+(F().catHome?'<div class="kv"><span>🚽 Лоток</span><b>'+litterLabel()+'</b></div>':''),opts:opts.concat([{t:'Закрыть',fn:()=>{}}]),wide:true});
  }
  function dogBite(p,reason){
    p.mood=C(p.mood-12);p.trust=C(p.trust-16);
    G.spend(1);
    const hurt=G.chance(12);
    if(hurt){G.fx({health:-3,mood:-3});G.modal({title:'Чугун прихватил зубами',face:'chugun',vib:'warning',text:'Пёс предупредительно прихватил за руку. Это редкая защитная реакция, а не случайная агрессия. '+reason+'<br>Нужно дать ему пространство и не навязывать контакт.',opts:[{t:'Отойти и успокоиться',fn:()=>{}}]});}
    else G.modal({title:'Чугун предупредил',face:'chugun',text:'Пёс отстранился и тихо рыкнул. '+reason+' Он не хочет продолжать контакт. Дай ему пространство.',opts:[{t:'Понял',fn:()=>{}}]});
  }
  function dogMenu(){
    const p=petState('dog'),s=G.s;
    const opts=[
      {t:'🐾 Погладить',fn:()=>{if(p.trust<15&&G.chance(10))return dogBite(p,'Ты подошёл слишком резко.');result('dog','Чугун рад','Добрый дворняга виляет хвостом и с удовольствием подставляет бок.',{mood:5},{mood:9,trust:5,energy:-2});}},
      {t:'🧡 Потискать',fn:()=>{if(p.trust<40||p.mood<25)return dogBite(p,'Псу не понравилось, что его крепко удерживают.');result('dog','Чугун обнимается','Чугун радостно прижимается и лижет руку.',{mood:6},{mood:11,trust:5,energy:-5});}},
      {t:'🥣 Покормить (150 ₽)',dis:s.money<150?'Нет денег':p.satiety>98?'Пёс совсем сыт':null,fn:()=>{if(p.satiety>90&&G.chance(8))return dogBite(p,'Ты снова предлагаешь еду, хотя Чугун уже наелся.');G.addMoney(-150);p.lastFed=s.t.day;if(p.satiety>85){result('dog','Чугун переел','Пёс съел лишнее и теперь тяжело вздыхает. Лучше соблюдать режим кормления.',{mood:-2},{satiety:15,mood:-3,health:-2,trust:-1});return;}G.addMoney(0);result('dog','Миска Чугуна','Пёс съел свою порцию. Кормление по режиму помогает ему чувствовать себя хорошо.',{mood:2},{satiety:35,mood:5,trust:3,energy:3});}},
      {t:'🎾 Поиграть',dis:p.energy<20?'Чугун устал':null,fn:()=>result('dog','Игра с Чугуном','Чугун носится за мячом и возвращает его, гордо виляя хвостом.',{mood:7},{mood:13,trust:5,energy:-22,satiety:-8})},
      {t:'🦮 Погулять',dis:!G.isFree()?'Прогулка возможна после смены':p.energy<15?'Пёс слишком устал':null,fn:()=>{p.lastWalk=s.t.day;result('dog','Прогулка','Вы прошлись по двору. Чугун обнюхал кусты, познакомился с запахами и вернулся довольным.',{mood:8},{mood:12,trust:6,energy:-16,satiety:-9,health:2});}},
      {t:'🧼 Ухаживать',fn:()=>result('dog','Уход за Чугуном','Ты проверил воду, лапы и шерсть, устроил ему чистое место отдыха.',{mood:2},{health:6,mood:5,trust:4,energy:3})},
      {t:'👀 Наблюдать за поведением',fn:()=>{const mood=p.mood>70?'радостно виляет хвостом и ищет игру':p.mood<30?'держится в стороне и выглядит подавленным':'спокойно лежит рядом и прислушивается';G.modal({title:'Наблюдение за Чугуном',face:'chugun',text:'Чугун '+mood+'.<br><br>'+bars(p),opts:[{t:'Продолжить',fn:()=>{}}]});}}
    ];
    G.modal({title:'🐕 Чугун — добрая дворняга',face:'chugun',text:'Чугун — ласковый пёс, который любит внимание, прогулки и спокойное обращение.<br><br>'+bars(p),opts:opts.concat([{t:'Закрыть',fn:()=>{}}]),wide:true});
  }
  // ---------- Лоток: убирать каждый день после смены, иначе последствия
  const dirt=()=>F().litterDirt||0;
  function litterLabel(){const n=dirt();return n<=0?'чисто':n===1?'нужно убрать':'не убирали '+n+' дн.';}
  function litterWhy(){
    const f=F();
    if(!f.catHome)return 'Кот живёт не дома';
    if(!G.isFree())return 'Лоток убирают дома, после смены';
    if(dirt()<=0)return 'Лоток чистый';
    if(G.s.t.hour+1>26)return 'Слишком поздно';
    return null;
  }
  G.litterDirt=dirt;
  // мини-игра: тапни комок (он в совке) → тапни унитаз, чтобы смыть. Пока совок полон, новый комок не взять.
  G.litterGame=function(){
    const w=litterWhy();if(w){G.toast(w,'warn');return;}
    const root=document.getElementById('app');if(!root)return;
    const N=Math.min(8,3+dirt());let flushed=0,carrying=false,time=16,fin=false;
    const ov=document.createElement('div');ov.className='gym-ov';const box=document.createElement('div');box.className='gym-box';ov.appendChild(box);root.appendChild(ov);
    box.innerHTML='<h3>🚽 УБРАТЬ ЛОТОК</h3><div class="gym-info">Тапни комок — он попадёт в совок. Потом тапни унитаз, чтобы смыть. Пока совок полон, новый комок не взять.</div><div id="lt-tray" style="position:relative;height:170px;background:#d9c79a;border:3px solid #6b5a3a;border-radius:8px;margin-bottom:8px;overflow:hidden"></div><div class="gym-rep" id="lt-st"></div><div class="fi-btns"><button class="btn big" id="lt-wc">🚽 Унитаз</button></div>';
    const tray=box.querySelector('#lt-tray'),st=box.querySelector('#lt-st'),wc=box.querySelector('#lt-wc');
    const cells=[];for(let r=0;r<2;r++)for(let c=0;c<4;c++)cells.push([c,r]);
    cells.sort(()=>Math.random()-0.5);
    cells.slice(0,N).forEach(cl=>{
      const b=document.createElement('button');b.textContent='💩';
      b.style.cssText='position:absolute;background:none;border:0;font-size:30px;line-height:1;padding:6px;left:'+(cl[0]*25+4+Math.random()*6)+'%;top:'+(cl[1]*50+8+Math.random()*14)+'%';
      b.onclick=()=>{
        if(fin)return;
        if(carrying){time=Math.max(0,time-1);st.textContent='Совок занят! Сначала в унитаз (−1 с)';st.className='gym-rep bad';return;}
        carrying=true;b.remove();show();
      };
      tray.appendChild(b);
    });
    function show(){st.className='gym-rep';st.textContent=(carrying?'🥄 В совке комок! Неси в унитаз. ':'🥄 Совок пуст. ')+'Осталось: '+(N-flushed)+' · '+Math.ceil(time)+' с';}
    wc.onclick=()=>{
      if(fin)return;
      if(!carrying){st.className='gym-rep bad';st.textContent='Совок пуст — смывать нечего';return;}
      carrying=false;flushed++;
      if(G.buzz)G.buzz('light');
      if(flushed>=N)finish();else show();
    };
    const timer=setInterval(()=>{if(fin)return clearInterval(timer);time-=0.1;if(time<=0){time=0;finish();}else show();},100);
    show();
    function finish(){
      if(fin)return;fin=true;clearInterval(timer);ov.remove();litterDone(flushed,N);
    }
  };
  function litterDone(flushed,N){
    const f=F(),p=petState('cat'),sc=flushed/N,day=G.s.t.day;let text,title;
    if(sc>=0.999){
      f.litterDirt=0;p.mood+=4;p.trust+=2;p.lastCare=day;G.fx({mood:1,neat:-3});
      title='Лоток чист';text='Все комки в унитазе, свежий наполнитель насыпан. Чугунок сразу проверил лоток и одобрительно прищурился.';
    }else if(sc>=0.5){
      f.litterDirt=Math.max(1,dirt()-1);p.mood+=1;G.fx({neat:-3});
      title='Убрано не всё';text='Основное убрано, но часть комков осталась. Лоток надо будет доделать — иначе запах вернётся.';
    }else{
      G.fx({neat:-3,mood:-1});
      title='Не успел(а)';text='Комки остались в лотке. Руки пахнут, толку мало. Попробуй ещё раз.';
    }
    clampPet(p);
    G.info('🚽 '+title,text+'<br>Убрано комков: <b>'+flushed+' из '+N+'</b>.'+(dirt()>0?'<br>Лоток: '+litterLabel()+'.':''));
    G.spend(1);
  }
  // за каждую ночь лоток пачкается; чем дольше не убирали, тем хуже последствия
  function litterNight(){
    const s=G.s,f=F(),p=petState('cat');
    f.litterDirt=dirt()+1;const n=f.litterDirt;
    if(n===1)G.toast('🚽 Лоток Чугунка нужно убрать — лучше сразу после смены.');
    else if(n===2){G.fx({mood:-2});p.mood-=3;G.toast('Из угла тянет лотком. Чугунок воротит нос.','warn');}
    else if(n===3){G.fx({mood:-4,neat:-8,coll:-1});p.mood-=6;p.trust-=3;p.health-=1;G.toast('Запах лотка въелся в одежду: на заводе морщат носы. Чугунок обижен.','bad');}
    else if(n===4){const c=Math.min(s.money,500);if(c>0)G.addMoney(-c);G.fx({mood:-6});p.mood-=8;p.trust-=5;G.toast('Чугунок не выдержал и пометил ботинки. Чистка и новая стелька: −'+G.rub(c)+'.','bad');}
    else if(n<7){p.health-=4;p.mood-=8;G.fx({mood:-5,health:-1});if(n===5){const c=Math.min(s.money,300);if(c>0)G.addMoney(-c);G.toast('Соседи пожаловались на запах коменданту: штраф '+G.rub(c)+'. Кот хандрит и болеет.','bad');}else G.toast('Чугунок хандрит и плохо ест: стресс от грязи.','bad');}
    else{
      f.catHome=0;f.litterDirt=0;p.trust-=20;p.mood-=10;
      G.modal({title:'Чугунок ушёл',face:'chugunok',vib:'warning',text:'Неделя без уборки — это было слишком. Кот ушёл обратно на завод и смотрит на тебя издалека без мурлыканья. Забрать его домой можно снова, но доверие придётся зарабатывать заново.',opts:[{t:'Понятно',fn:()=>{}}]});
    }
    clampPet(p);
  }
  G.litterNight=litterNight;
  G.petMenu=function(type){init();if(type==='cat')catMenu();else dogMenu();};
  const _daily=G.dailyTick;
  G.dailyTick=function(){
    const r=_daily.apply(this,arguments);init();const f=F(),day=G.s.t.day;
    ['cat','dog'].forEach(type=>{
      const p=petState(type);if(!p)return;
      p.satiety=C(p.satiety-(type==='cat'?12:14),0,100);
      p.energy=C(p.energy+15,0,100);
      if(day-(p.lastFed||0)>=2){p.mood=C(p.mood-5);p.health=C(p.health-2);}
      if(day-(p.lastCare||0)>=3){p.mood=C(p.mood-3);p.health=C(p.health-1);}
      if(type==='dog'&&day-(p.lastWalk||0)>=3){p.mood=C(p.mood-3);}
      if(p.satiety<15){p.health=C(p.health-4);p.mood=C(p.mood-5);}
      if(p.health<25)G.toast((type==='cat'?'Чугунок':'Чугун')+' выглядит нездоровым. Не забудь об уходе.', 'warn');
      clampPet(p);
    });
    if(f.catHome && f.petCat){try{litterNight();}catch(e){if(window.console)console.error(e);}}
    if(f.catHome && f.petCat){f.catLove=f.petCat.trust;f.catFed=f.petCat.lastFed;}
    return r;
  };
  const oldCatTake=G.ACT.cat_take;
  if(oldCatTake){
    oldCatTake.req=s=>s.flags.catHome?'Уже дома':s.car.shifts<8?'Пока не знакомы':s.money<500?'Нет денег':null;
    oldCatTake.fn=function(){
      G.addMoney(-500);F().cat=1;F().catHome=1;F().catLove=5;F().catFed=G.s.t.day;init();
      G.modal({title:'Чугунок переезжает',face:'chugunok',bg:'gate',text:'Чугунок осторожно осмотрел комнату, выбрал тёплый угол и свернулся клубком. На заводе появился новый хвостатый знакомый — добрый пёс Чугун.',opts:[{t:'Добро пожаловать домой',fn:()=>{F().dog=1;F().petDog=F().petDog||{satiety:70,mood:70,trust:25,health:95,energy:80,lastFed:G.s.t.day,lastCare:G.s.t.day,lastWalk:G.s.t.day};G.R('chugun').met=true;G.toast('Чугун теперь живёт во дворе завода.','good');}}]});
      G.spend(1); return 'custom';
    };
  }
  ['cat_feed','cat_play'].forEach(id=>{const a=G.ACT[id];if(a){a.once=null;a.fx=null;a.txt='';a.menu=true;a.fn=()=>{G.petMenu('cat');return 'custom';};}});
  if(G.ACT.cat_feed){G.ACT.cat_feed.n='Уход и общение с Чугунком';G.ACT.cat_feed.i='🐈';G.ACT.cat_feed.req=s=>!s.flags.cat?'Кот пока не дома':null;}
  if(G.ACT.cat_play)G.ACT.cat_play.ph=[];
  if(G.A)G.A('cat_litter',{ph:['free'],loc:'home',g:'Чугунок',n:'Убрать туалет Чугунка',i:'🚽',menu:true,noEvent:true,req:s=>!s.flags.catHome?'Кот живёт не дома':dirt()<=0?'Лоток чистый':null,fn:()=>{G.litterGame();return 'custom';}});
  const _npcMenu=G.npcMenu;
  G.npcMenu=function(id){if(id==='chugunok')return G.petMenu('cat');if(id==='chugun')return G.petMenu('dog');return _npcMenu.apply(this,arguments);};
  const _talk=G.talkTo;
  G.talkTo=function(id){if(id==='chugunok'||id==='chugun')return G.petMenu(id==='chugunok'?'cat':'dog');return _talk.apply(this,arguments);};
  const _special=G.npcSpecial;
  G.npcSpecial=function(id){const o=_special.apply(this,arguments);if(id==='chugunok')o.push({t:'🐈 Уход и общение с Чугунком',fn:()=>G.petMenu('cat')});if(id==='chugun')o.push({t:'🐕 Уход и общение с Чугуном',fn:()=>G.petMenu('dog')});return o;};
  const oldAt=G.npcLoc;
  G.npcLoc=function(id){
    const f=F();
    if(id==='chugunok'){
      if(f.catHome)return null;
      // Чугунок — постоянный заводской кот: не исчезает из-за случайного расписания NPC.
      if(G.s.phase==='work')return 'shop';
      if(G.s.phase==='lunch')return 'canteen';
      if(G.s.phase==='locker')return 'locker';
      if(G.s.phase==='morning')return null;
      if(G.s.phase==='checkpoint')return 'locker';
      return null;
    }
    if(id==='chugun')return f.dog?'yard':null;
    return oldAt.apply(this,arguments);
  };
  const oldPeople=G.peopleAt;
  G.peopleAt=loc=>oldPeople(loc).filter(id=>id!=='chugun'||!!F().dog);
  const oldJob=G.jobTitle;
  G.sanitizePet=function(){init();};
})();