/* ===== Питомцы: кот Чугунок и заводская собака Чугун ===== */
(function () {
  'use strict';
  const G=window.G,D=G.D;
  const clamp=(v)=>Math.max(0,Math.min(100,v));
  const CAT_DEFAULT={satiety:68,mood:66,trust:18,health:94,energy:82};
  const DOG_DEFAULT={satiety:72,mood:74,trust:30,health:96,energy:88};
  const dogSvg='<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M22 34 Q4 28 10 62 Q13 79 31 68Z" fill="#70452e"/><path d="M78 34 Q96 28 90 62 Q87 79 69 68Z" fill="#8b5a3c"/><ellipse cx="50" cy="56" rx="34" ry="31" fill="#c58a52"/><path d="M25 43 Q30 24 50 25 Q70 24 75 43 Q66 52 59 50 Q49 44 40 51Z" fill="#70452e"/><ellipse cx="38" cy="53" rx="5" ry="6" fill="#fff"/><ellipse cx="62" cy="53" rx="5" ry="6" fill="#fff"/><circle cx="39" cy="54" r="2.5" fill="#222"/><circle cx="61" cy="54" r="2.5" fill="#222"/><ellipse cx="50" cy="68" rx="9" ry="6" fill="#30231d"/><path d="M50 73 Q44 81 38 75 M50 73 Q56 81 62 75" stroke="#30231d" fill="none" stroke-width="2"/><path d="M22 82 Q50 90 78 82" stroke="#4b9ac0" stroke-width="7" fill="none"/><circle cx="50" cy="86" r="4" fill="#e8c44a"/></svg>';
  D.NPC.chugunok.animal=true; D.NPC.chugunok.talk=[];
  D.NPC.chugun={name:'Чугун',full:'Чугун — добрая заводская дворняга',age:4,role:'Добрая и милая заводская собака',color:'#b87b4d',animal:true,ap:{dog:true},at:{loc:'yard',days:[0,1,2,3,4],p:0.7},likes:[],dislikes:[],rel:0,talk:[]};
  if(D.NPC_ORDER.indexOf('chugun')<0)D.NPC_ORDER.push('chugun');

  const F=()=>G.s.flags;
  function catPet(){
    const f=F();
    if(!f.catPet)f.catPet=Object.assign({},CAT_DEFAULT,{trust:clamp(Math.max(CAT_DEFAULT.trust,Number(f.catLove)||0))});
    return f.catPet;
  }
  function dogPet(){
    const f=F();
    if(!f.dogPet)f.dogPet=Object.assign({},DOG_DEFAULT);
    return f.dogPet;
  }
  function stats(p){
    return '🍽 Сытость: <b>'+Math.round(p.satiety)+'/100</b><br>😊 Настроение: <b>'+Math.round(p.mood)+'/100</b><br>🤝 Доверие: <b>'+Math.round(p.trust)+'/100</b><br>❤ Здоровье: <b>'+Math.round(p.health)+'/100</b><br>⚡ Энергия: <b>'+Math.round(p.energy)+'/100</b>';
  }
  function spend(text){
    if(text)G.toast(text,'good');
    G.spend(1);
  }
  function observation(p,kind){
    if(kind==='cat'){
      const hunger=p.satiety<25?'Чугунок настойчиво заглядывает в пустую миску.':p.satiety>75?'Кот сыто умывается после еды.':'Кот неторопливо изучает заводскую жизнь.';
      const trust=p.trust<25?'На резкие движения он отвечает осторожным взглядом.':p.trust>70?'Он сам подходит, трётся о ноги и громко мурлычет.':'Он держится рядом, но сохраняет кошачью независимость.';
      const mood=p.mood<30?'Уши слегка прижаты — коту нужен покой.':p.mood>70?'Хвост трубой: настроение отличное.':'Чугунок наблюдает за происходящим с обычным достоинством.';
      return hunger+' '+trust+' '+mood;
    }
    const hunger=p.satiety<25?'Чугун обнюхивает пустую миску и тихо поскуливает.':p.satiety>85?'Пёс сыт и лениво виляет хвостом.':'Чугун внимательно следит за тобой.';
    const trust=p.trust<25?'Он пока держит дистанцию, но не проявляет агрессии.':p.trust>70?'Он радостно виляет хвостом и ищет твоего внимания.':'Он дружелюбен и ждёт приглашения поиграть.';
    const mood=p.mood<30?'Пёс выглядит скучающим — прогулка пойдёт на пользу.':p.mood>70?'Чугун полон радости и готов к игре.':'Чугун спокойно отдыхает у проходной.';
    return hunger+' '+trust+' '+mood;
  }
  function petModal(id){
    const p=id==='chugunok'?catPet():dogPet(),cat=id==='chugunok';
    const title=cat?'🐈 Чугунок — заводской кот':'🐕 Чугун — заводская дворняга';
    const opts=cat?[
      {t:'🐾 Погладить',fn:()=>{p.mood=clamp(p.mood+9);p.trust=clamp(p.trust+5);p.energy=clamp(p.energy-2);G.relAdd(id,3);spend('Чугунок довольно мурлычет и трётся о ладонь.');}},
      {t:'🤲 Взять на руки',fn:()=>{if(p.trust<12){p.mood=clamp(p.mood-2);G.toast('Чугунок мягко выскользнул и отошёл. Не торопи его.','warn');}else{p.mood=clamp(p.mood+6);p.trust=clamp(p.trust+3);p.energy=clamp(p.energy-7);G.relAdd(id,3);G.toast('Кот устроился на руках и довольно урчит.','good');}G.spend(1);}},
      {t:'🫂 Потискать',dis:p.trust<18?'Кот пока недостаточно доверяет — сначала дай ему привыкнуть':null,fn:()=>{p.mood=clamp(p.mood+12);p.trust=clamp(p.trust+6);p.energy=clamp(p.energy-8);G.relAdd(id,4);spend('Чугунок довольно жмурится и устраивается поудобнее.');}},
      {t:'🥫 Покормить (100 ₽)',dis:G.s.money<100?'Не хватает денег':p.satiety>=92?'Чугунок уже сыт — не нужно перекармливать':null,fn:()=>{G.addMoney(-100);p.satiety=clamp(p.satiety+32);p.mood=clamp(p.mood+4);p.trust=clamp(p.trust+3);G.relAdd(id,4);spend('Чугунок съел порцию и тщательно вылизал усы.');}},
      {t:'🧶 Поиграть',dis:p.energy<12?'Кот устал и хочет отдохнуть':null,fn:()=>{p.mood=clamp(p.mood+13);p.trust=clamp(p.trust+4);p.energy=clamp(p.energy-18);p.satiety=clamp(p.satiety-5);G.relAdd(id,4);spend('Чугунок охотится за верёвочкой, будто это главный враг завода.');}},
      {t:'🧼 Ухаживать',fn:()=>{p.health=clamp(p.health+5);p.mood=clamp(p.mood+5);p.trust=clamp(p.trust+3);p.energy=clamp(p.energy-3);G.relAdd(id,3);spend('Ты аккуратно вычистил шерсть и проверил лапы. Чугунок доволен.');}},
      {t:'👀 Наблюдать за поведением',fn:()=>G.modal({title:'Поведение Чугунка',face:id,text:observation(p,'cat')+'<br><br>'+stats(p),opts:[{t:'Назад к коту',fn:()=>petModal(id)}]})}
    ]:[
      {t:'🐾 Погладить',fn:()=>{p.mood=clamp(p.mood+8);p.trust=clamp(p.trust+4);p.energy=clamp(p.energy-1);G.relAdd(id,3);spend('Чугун радостно виляет хвостом и подставляет голову.');}},
      {t:'🫂 Потискать',dis:p.trust<12?'Пёс ещё не привык к тебе — начни с поглаживания':null,fn:()=>{const bite=maybeBite(p,'слишком настойчивые объятия',p.trust<18&&p.mood<25?16:0);p.mood=clamp(p.mood+6);p.trust=clamp(p.trust+4);p.energy=clamp(p.energy-5);G.relAdd(id,2);spend(bite?'Чугун отстранился после предупреждающего щелчка зубами.':'Чугун доверчиво прижался и довольно фыркнул.');}},
      {t:'🥣 Покормить (90 ₽)',dis:G.s.money<90?'Не хватает денег':null,fn:()=>{const over=p.satiety>=88;G.addMoney(-90);p.satiety=clamp(p.satiety+30);p.mood=clamp(p.mood+3);p.trust=clamp(p.trust+2);G.relAdd(id,3);const bite=over?maybeBite(p,'перекармливание',p.trust<45?22:10):false;spend(bite?'Чугун занервничал от лишней еды и слегка прихватил за рукав. Не перекармливай его.':'Чугун съел корм и благодарно ткнулся носом в ладонь.');}},
      {t:'🎾 Поиграть',dis:p.energy<15?'Чугун устал — дай ему отдохнуть':null,fn:()=>{const bite=maybeBite(p,'слишком резкая игра',p.trust<12&&p.mood<18?14:0);p.mood=clamp(p.mood+13);p.trust=clamp(p.trust+5);p.energy=clamp(p.energy-18);p.satiety=clamp(p.satiety-6);G.relAdd(id,4);spend(bite?'Чугун испугался резкого движения и предупредил щелчком зубов.':'Чугун весело гоняется за палкой и приносит её обратно.');}},
      {t:'🦮 Погулять',dis:!G.isFree()?'Гулять можно после смены или в выходной':p.energy<20?'Пёс слишком устал для прогулки':null,fn:()=>{p.mood=clamp(p.mood+17);p.trust=clamp(p.trust+9);p.energy=clamp(p.energy-20);p.satiety=clamp(p.satiety-8);p.health=clamp(p.health+2);G.relAdd(id,6);spend('Вы погуляли по заводскому двору. Чугун обнюхал каждый столб и счастлив.');}},
      {t:'🧽 Ухаживать',fn:()=>{p.health=clamp(p.health+9);p.mood=clamp(p.mood+4);p.trust=clamp(p.trust+3);p.energy=clamp(p.energy-3);G.relAdd(id,3);spend('Ты вычистил шерсть, проверил лапы и сменил воду. Чугун доволен.');}},
      {t:'👀 Наблюдать за поведением',fn:()=>G.modal({title:'Поведение Чугуна',face:id,text:observation(p,'dog')+'<br><br>'+stats(p),opts:[{t:'Назад к псу',fn:()=>petModal(id)}]})}
    ];
    opts.push({t:'Закрыть',fn:()=>{}});
    G.modal({title,face:id,wide:true,text:(cat?'Рыжий кот':'Добрая дворняга')+' · '+(cat&&F().cat?'Живёт у тебя дома':'Заводской питомец')+'<br><br>'+stats(p),opts});
  }
  function maybeBite(p,reason,chance){
    const f=F(),day=G.s.t.day;
    if(!chance|| (f.dogBiteDay!=null&&day-f.dogBiteDay<5))return false;
    if(!G.chance(chance))return false;
    f.dogBiteDay=day;p.trust=clamp(p.trust-9);p.mood=clamp(p.mood-8);
    G.fx({health:-5,mood:-3});G.toast('Чугун слегка укусил: '+reason+'. Больше спокойствия и аккуратности — и он снова будет доверять.','warn');
    return true;
  }

  const oldNpcMenu=G.npcMenu;
  G.npcMenu=function(id){if(id==='chugunok'||id==='chugun'){if(id==='chugun'&&!F().cat){G.toast('Чугун пока не появился на заводе.','warn');return;}G.R(id).met=true;return petModal(id);}return oldNpcMenu.apply(this,arguments);};
  const oldTalk=G.talkTo;
  G.talkTo=function(id){if(D.NPC[id]&&D.NPC[id].animal){G.toast('С животными лучше взаимодействовать через уход и игру.');return;}return oldTalk.apply(this,arguments);};
  const oldGift=G.giftMenu;
  G.giftMenu=function(id){if(D.NPC[id]&&D.NPC[id].animal){G.toast('Питомцам лучше давать подходящий корм, а не подарки.','warn');return;}return oldGift.apply(this,arguments);};
  const oldCall=G.callNpc;
  G.callNpc=function(id){if(D.NPC[id]&&D.NPC[id].animal){G.toast('Животным не звонят — их навещают.');return;}return oldCall.apply(this,arguments);};
  const oldFace=G.faceHTML;
  G.faceHTML=function(id,cls){if(id==='chugun')return '<div class="face '+(cls||'')+'" style="--fc:#b87b4d">'+dogSvg+'</div>';return oldFace.apply(this,arguments);};
  const oldNpcLoc=G.npcLoc;
  G.npcLoc=function(id){
    const s=G.s;if(!s)return null;
    if(id==='chugunok'&&s.flags.cat)return null;
    if(id==='chugun'){
      if(!s.flags.cat||!['work','lunch'].includes(s.phase)||G.weekday()>=5)return null;
      const v=G.hash(s.t.day,Math.floor(s.t.hour),777);
      return v<0.58?'yard':'shop';
    }
    return oldNpcLoc.apply(this,arguments);
  };
  const oldDaily=G.dailyTick;
  G.dailyTick=function(){
    const r=oldDaily.apply(this,arguments),f=F();
    if(f.cat){
      const p=catPet();p.satiety=clamp(p.satiety-10);p.energy=clamp(p.energy+20);
      if(p.satiety<18){p.mood=clamp(p.mood-5);p.health=clamp(p.health-3);}
      else if(p.trust>55)p.mood=clamp(p.mood+2);
      if(p.health<25)G.toast('Чугунок выглядит нездоровым. Ему нужен уход.','warn');
      f.catLove=p.trust;
    }
    if(f.cat){
      const p=dogPet();p.satiety=clamp(p.satiety-11);p.energy=clamp(p.energy+24);
      if(p.satiety<18){p.mood=clamp(p.mood-5);p.health=clamp(p.health-4);}
      else p.mood=clamp(p.mood-1);
      if(p.health<30)G.toast('Чугун выглядит вялым. Проверь его здоровье и дай отдохнуть.','warn');
    }
    return r;
  };
  const oldBase=G.baseState;
  G.baseState=function(){const s=oldBase.apply(this,arguments);s.flags.catPet=Object.assign({},CAT_DEFAULT);s.flags.dogPet=Object.assign({},DOG_DEFAULT);return s;};
  const oldLoad=G.load;
  G.load=function(){const r=oldLoad.apply(this,arguments);if(G.s&&G.s.flags){const f=G.s.flags;if(f.cat&&!f.catPet)f.catPet=Object.assign({},CAT_DEFAULT,{trust:clamp(Math.max(18,Number(f.catLove)||18))});if(f.cat&&!f.dogPet)f.dogPet=Object.assign({},DOG_DEFAULT);}return r;};
  const oldRun=G.runAction;
  G.runAction=function(id){if(id==='cat_feed'||id==='cat_play'){G.toast('Выбери действие с Чугунком во вкладке «Люди».');return;}return oldRun.apply(this,arguments);};
  G.petMenu=petModal;
  // Собака доступна только после того, как игрок приютил кота; знакомство происходит при первой встрече.
})();