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
    if(!f.petCat)f.petCat={satiety:75,mood:70,trust:Math.max(15,f.catLove||10),health:90,energy:75,lastFed:f.catFed||G.s.t.day,lastCare:G.s.t.day};
    if(f.dog&&!f.petDog)f.petDog={satiety:70,mood:70,trust:25,health:95,energy:80,lastFed:G.s.t.day,lastCare:G.s.t.day,lastWalk:G.s.t.day};
    if(f.petCat)f.cat=1;
    if(f.petDog)f.dog=1;
  }
  function petState(type){init();return F()[SPEC[type].key];}
  function clampPet(p){['satiety','mood','trust','health','energy'].forEach(k=>p[k]=C(Math.round(p[k]),0,100));}
  function bars(p){
    return ['satiety','mood','trust','health','energy'].map((k)=>'<div class="kv"><span>'+({satiety:'Сытость',mood:'Настроение',trust:'Доверие',health:'Здоровье',energy:'Энергия'}[k])+'</span><b>'+Math.round(p[k])+'/100</b></div>').join('');
  }
  function result(type,title,text,fx,delta){
    const p=petState(type);Object.keys(delta||{}).forEach(k=>p[k]+=delta[k]);clampPet(p);
    if(fx)G.fx(fx);
    G.modal({title,face:type==='cat'?'chugunok':'chugun',bg:'checkpoint',text:text+'<br><br>'+bars(p),opts:[{t:'Хорошо',fn:()=>{}}]});
  }
  function catMenu(){
    const p=petState('cat'),s=G.s;
    const opts=[
      {t:'🐾 Погладить',fn:()=>result('cat','Чугунок мурлычет','Кот прищурился, подставил голову под ладонь и довольно замурлыкал.',{mood:2},{mood:9,trust:5,energy:-2})},
      {t:'🤲 Взять на руки',fn:()=>result('cat','На руках','Чугунок устроился поудобнее. Если не тянуть за лапы и не удерживать силой, он спокойно мурлычет.',{mood:2},{mood:7,trust:4,energy:-5})},
      {t:'🧡 Потискать',fn:()=>{if(p.trust<35)return result('cat','Чугунок не в настроении','Кот мягко вывернулся и отошёл. Он пока не настолько доверяет тесным объятиям.',{mood:-1},{mood:-3,trust:-2,energy:-2});result('cat','Мягкий рыжий комок','Чугунок терпеливо принимает ласку, потом довольно потягивается.',{mood:3},{mood:10,trust:4,energy:-5});}},
      {t:'🥫 Покормить (100 ₽)',dis:s.money<100?'Нет денег':p.satiety>92?'Кот пока сыт':null,fn:()=>{G.addMoney(-100);p.lastFed=s.t.day;result('cat','Миска Чугунка','Чугунок съел порцию и тщательно умылся.',{mood:2},{satiety:32,mood:5,trust:3,energy:4});}},
      {t:'🧶 Поиграть',dis:p.energy<15?'Кот устал':null,fn:()=>result('cat','Охота на верёвочку','Чугунок крадётся, прыгает за игрушкой и в конце победно валится на бок.',{mood:3},{mood:12,trust:5,energy:-18,satiety:-7})},
      {t:'👀 Наблюдать за поведением',fn:()=>{const mood=p.mood>70?'довольно мурлычет и ищет компанию':p.mood<30?'прячется и просит оставить его в покое':'умывается и внимательно следит за происходящим';G.modal({title:'Наблюдение за Чугунком',face:'chugunok',text:'Чугунок '+mood+'.<br><br>'+bars(p),opts:[{t:'Продолжить',fn:()=>{}}]});}},
      {t:'🧼 Ухаживать',fn:()=>result('cat','Уход за котом','Ты проверил воду, чистоту места отдыха и шерсть. Чугунок доволен спокойным уходом.',{mood:2},{health:5,mood:5,trust:4,energy:3})},
      {t:'🏠 Забрать домой (500 ₽)',dis:!G.isFree()?'Забрать домой можно после смены':F().cat?'Уже дома':s.money<500?'Нет денег':null,fn:()=>{G.addMoney(-500);F().cat=1;F().petCat=p;G.fx({mood:8});G.modal({title:'Чугунок переезжает',face:'chugunok',bg:'gate',text:'Чугунок осмотрел комнату, выбрал самое тёплое место и улёгся. На заводе теперь появится новый хвостатый знакомый — пёс Чугун.',opts:[{t:'Добро пожаловать домой',fn:()=>{F().dog=1;F().petDog=F().petDog||{satiety:70,mood:70,trust:25,health:95,energy:80,lastFed:s.t.day,lastCare:s.t.day,lastWalk:s.t.day};G.R('chugun').met=true;}}]});}}
    ];
    G.modal({title:'🐈 Чугунок — заводской кот',face:'chugunok',text:'Рыжий кот — самостоятельное животное. Не разговаривает как человек, а отвечает позой, мурлыканьем и поведением.<br><br>'+bars(p),opts:opts.concat([{t:'Закрыть',fn:()=>{}}]),wide:true});
  }
  function dogBite(p,reason){
    p.mood=C(p.mood-12);p.trust=C(p.trust-16);
    const hurt=G.chance(12);
    if(hurt){G.fx({health:-3,mood:-3});G.modal({title:'Чугун прихватил зубами',face:'chugun',vib:'warning',text:'Пёс предупредительно прихватил за руку. Это редкая защитная реакция, а не случайная агрессия. '+reason+'<br>Нужно дать ему пространство и не навязывать контакт.',opts:[{t:'Отойти и успокоиться',fn:()=>{}}]});}
    else G.modal({title:'Чугун предупредил',face:'chugun',text:'Пёс отстранился и тихо рыкнул. '+reason+' Он не хочет продолжать контакт. Дай ему пространство.',opts:[{t:'Понял',fn:()=>{}}]});
  }
  function dogMenu(){
    const p=petState('dog'),s=G.s;
    const opts=[
      {t:'🐾 Погладить',fn:()=>{if(p.trust<15&&G.chance(10))return dogBite(p,'Ты подошёл слишком резко.');result('dog','Чугун рад','Добрый дворняга виляет хвостом и с удовольствием подставляет бок.',{mood:2},{mood:9,trust:5,energy:-2});}},
      {t:'🧡 Потискать',fn:()=>{if(p.trust<40||p.mood<25)return dogBite(p,'Псу не понравилось, что его крепко удерживают.');result('dog','Чугун обнимается','Чугун радостно прижимается и лижет руку.',{mood:3},{mood:11,trust:5,energy:-5});}},
      {t:'🥣 Покормить (150 ₽)',dis:s.money<150?'Нет денег':p.satiety>98?'Пёс совсем сыт':null,fn:()=>{if(p.satiety>90&&G.chance(8))return dogBite(p,'Ты снова предлагаешь еду, хотя Чугун уже наелся.');G.addMoney(-150);p.lastFed=s.t.day;if(p.satiety>85){result('dog','Чугун переел','Пёс съел лишнее и теперь тяжело вздыхает. Лучше соблюдать режим кормления.',{mood:-2},{satiety:15,mood:-3,health:-2,trust:-1});return;}G.addMoney(0);result('dog','Миска Чугуна','Пёс съел свою порцию. Кормление по режиму помогает ему чувствовать себя хорошо.',{mood:2},{satiety:35,mood:5,trust:3,energy:3});}},
      {t:'🎾 Поиграть',dis:p.energy<20?'Чугун устал':null,fn:()=>result('dog','Игра с Чугуном','Чугун носится за мячом и возвращает его, гордо виляя хвостом.',{mood:3},{mood:13,trust:5,energy:-22,satiety:-8})},
      {t:'🦮 Погулять',dis:!G.isFree()?'Прогулка возможна после смены':p.energy<15?'Пёс слишком устал':null,fn:()=>{p.lastWalk=s.t.day;result('dog','Прогулка','Вы прошлись по двору. Чугун обнюхал кусты, познакомился с запахами и вернулся довольным.',{mood:4},{mood:12,trust:6,energy:-16,satiety:-9,health:2});}},
      {t:'🧼 Ухаживать',fn:()=>result('dog','Уход за Чугуном','Ты проверил воду, лапы и шерсть, устроил ему чистое место отдыха.',{mood:2},{health:6,mood:5,trust:4,energy:3})},
      {t:'👀 Наблюдать за поведением',fn:()=>{const mood=p.mood>70?'радостно виляет хвостом и ищет игру':p.mood<30?'держится в стороне и выглядит подавленным':'спокойно лежит рядом и прислушивается';G.modal({title:'Наблюдение за Чугуном',face:'chugun',text:'Чугун '+mood+'.<br><br>'+bars(p),opts:[{t:'Продолжить',fn:()=>{}}]});}}
    ];
    G.modal({title:'🐕 Чугун — добрая дворняга',face:'chugun',text:'Чугун — ласковый пёс, который любит внимание, прогулки и спокойное обращение.<br><br>'+bars(p),opts:opts.concat([{t:'Закрыть',fn:()=>{}}]),wide:true});
  }
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
    if(f.cat){f.catLove=f.petCat.trust;f.catFed=f.petCat.lastFed;}
    return r;
  };
  const oldCatTake=G.ACT.cat_take;
  if(oldCatTake){
    oldCatTake.req=s=>s.flags.cat?'Уже дома':s.car.shifts<8?'Пока не знакомы':s.money<500?'Нет денег':null;
    oldCatTake.fn=function(){
      G.addMoney(-500);F().cat=1;F().catLove=5;F().catFed=G.s.t.day;init();
      G.modal({title:'Чугунок переезжает',face:'chugunok',bg:'gate',text:'Чугунок осторожно осмотрел комнату, выбрал тёплый угол и свернулся клубком. На заводе появился новый хвостатый знакомый — добрый пёс Чугун.',opts:[{t:'Добро пожаловать домой',fn:()=>{F().dog=1;F().petDog=F().petDog||{satiety:70,mood:70,trust:25,health:95,energy:80,lastFed:G.s.t.day,lastCare:G.s.t.day,lastWalk:G.s.t.day};G.R('chugun').met=true;G.toast('Чугун теперь живёт во дворе завода.','good');}}]});
      return 'custom';
    };
  }
  ['cat_feed','cat_play'].forEach(id=>{const a=G.ACT[id];if(a){a.once=null;a.fx=null;a.txt='';a.menu=true;a.fn=()=>{G.petMenu('cat');return 'custom';};}});
  if(G.ACT.cat_feed){G.ACT.cat_feed.n='Уход и общение с Чугунком';G.ACT.cat_feed.i='🐈';G.ACT.cat_feed.req=s=>!s.flags.cat?'Кот пока не дома':null;}
  if(G.ACT.cat_play)G.ACT.cat_play.ph=[];
  const _npcMenu=G.npcMenu;
  G.npcMenu=function(id){if(id==='chugunok')return G.petMenu('cat');if(id==='chugun')return G.petMenu('dog');return _npcMenu.apply(this,arguments);};
  const _talk=G.talkTo;
  G.talkTo=function(id){if(id==='chugunok'||id==='chugun')return G.petMenu(id==='chugunok'?'cat':'dog');return _talk.apply(this,arguments);};
  const _special=G.npcSpecial;
  G.npcSpecial=function(id){const o=_special.apply(this,arguments);if(id==='chugunok')o.push({t:'🐈 Уход и общение с Чугунком',fn:()=>G.petMenu('cat')});if(id==='chugun')o.push({t:'🐕 Уход и общение с Чугуном',fn:()=>G.petMenu('dog')});return o;};
  const oldAt=G.npcLoc;
  G.npcLoc=function(id){const f=F();if(id==='chugunok'&&f.cat)return null;if(id==='chugun'&&f.dog)return 'yard';return oldAt.apply(this,arguments);};
  const oldPeople=G.peopleAt;
  G.peopleAt=loc=>{const ids=oldPeople(loc);if(F().dog&&loc==='yard'&&ids.indexOf('chugun')<0)ids.push('chugun');return ids;};
  const oldJob=G.jobTitle;
  G.sanitizePet=function(){init();};
})();