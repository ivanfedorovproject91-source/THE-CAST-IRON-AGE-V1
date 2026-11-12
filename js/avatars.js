/* ===== Аватары: SVG-лица персонажей и игрока ===== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D;

  G.AV_OPTS = {
    skin: ['#f6dccb', '#ecc3a5', '#d9a77f', '#a8714d'],
    hc: ['#2b2420', '#6b4a30', '#a0643c', '#d4b070', '#8a8a8a', '#c04a22'],
    hair: ['short', 'comb', 'curls', 'buzz', 'spiky', 'long', 'bald', 'messy'],
    shape: ['round', 'oval', 'square', 'long'],
    stache: ['none', 'brush', 'thin', 'walrus'],
    beard: ['none', 'stubble', 'full'],
    glasses: ['none', 'round', 'square'],
    cloth: ['#4a5c78', '#6a4a3a', '#3f5a48', '#555a60', '#8a3a30']
  };
  G.defaultAv = () => ({ skin: '#ecc3a5', hc: '#6b4a30', hair: 'short', shape: 'oval', stache: 'none', beard: 'none', glasses: 'none', cloth: '#4a5c78', brow: 'thick' });

  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const c = v => Math.max(0, Math.min(255, Math.round(v * f))); return '#' + [c(r), c(g), c(b)].map(x => x.toString(16).padStart(2, '0')).join(''); };

  function cat(ap) {
    const c = ap.skin;
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M20 30 L30 8 L44 24Z M80 30 L70 8 L56 24Z" fill="' + c + '"/><ellipse cx="50" cy="56" rx="34" ry="30" fill="' + c + '"/><path d="M36 34 q4 6 0 12 M64 34 q-4 6 0 12 M50 28 v10" stroke="' + shade(c, 0.7) + '" stroke-width="3" fill="none"/><ellipse cx="38" cy="54" rx="5" ry="6" fill="#ffe27a"/><ellipse cx="62" cy="54" rx="5" ry="6" fill="#ffe27a"/><ellipse cx="38" cy="55" rx="1.6" ry="5" fill="#222"/><ellipse cx="62" cy="55" rx="1.6" ry="5" fill="#222"/><path d="M46 66 h8 l-4 5z" fill="#e8808a"/><path d="M50 71 q-6 6 -12 2 M50 71 q6 6 12 2" stroke="#222" fill="none" stroke-width="1.6"/><path d="M14 64 h14 M14 70 h14 M86 64 h-14 M86 70 h-14" stroke="#fff" stroke-width="1" opacity=".8"/></svg>';
  }
  function dog(ap) {
    const c=ap.skin||'#b8895b';
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M22 34 Q4 20 10 56 Q14 76 34 64Z" fill="'+shade(c,0.78)+'"/><path d="M78 34 Q96 20 90 56 Q86 76 66 64Z" fill="'+shade(c,0.78)+'"/><ellipse cx="50" cy="56" rx="34" ry="31" fill="'+c+'"/><ellipse cx="50" cy="70" rx="17" ry="12" fill="#ead5bd"/><circle cx="38" cy="52" r="5" fill="#fff"/><circle cx="62" cy="52" r="5" fill="#fff"/><circle cx="39" cy="52" r="2.3" fill="#222"/><circle cx="61" cy="52" r="2.3" fill="#222"/><ellipse cx="50" cy="66" rx="5" ry="3.5" fill="#292421"/><path d="M50 69 q-6 7 -12 1 M50 69 q6 7 12 1" stroke="#51382b" fill="none" stroke-width="1.8"/><path d="M28 82 Q50 92 72 82" stroke="#ead5bd" stroke-width="4" fill="none"/></svg>';
  }
  function squirrel(ap) {
    const c = ap.skin;
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="30" r="9" fill="' + c + '"/><circle cx="76" cy="30" r="9" fill="' + c + '"/><ellipse cx="50" cy="58" rx="30" ry="28" fill="' + c + '"/><ellipse cx="50" cy="66" rx="16" ry="14" fill="#f3d9b8"/><circle cx="39" cy="52" r="5" fill="#fff"/><circle cx="61" cy="52" r="5" fill="#fff"/><circle cx="40" cy="53" r="2.4" fill="#111"/><circle cx="60" cy="53" r="2.4" fill="#111"/><ellipse cx="50" cy="63" rx="3.5" ry="2.5" fill="#333"/><path d="M50 66 q-4 6 -8 3 M50 66 q4 6 8 3" stroke="#222" fill="none" stroke-width="1.5"/><rect x="45" y="68" width="4" height="7" fill="#fff" stroke="#999" stroke-width=".6"/><rect x="51" y="68" width="4" height="7" fill="#fff" stroke="#999" stroke-width=".6"/><path d="M22 36 Q50 -2 78 36 Z" fill="#f2c200"/><rect x="18" y="34" width="64" height="6" rx="3" fill="#d9a900"/></svg>';
  }

  G.avatar = function (ap, o) {
    o = o || {};
    if (ap.cat) return cat(ap);
    if (ap.dog) return dog(ap);
    if (ap.squirrel) return squirrel(ap);
    let skin = ap.skin;
    if (o.pale) skin = shade(skin, 0.9);
    const dark = shade(skin, 0.82), hc = ap.hc || '#444', hl = shade(hc, 1.35);
    const shape = ap.shape || 'oval';
    let h = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">';
    const hair = ap.hair || 'short';
    // задние волосы
    if (hair === 'long' || hair === 'braids') h += '<path d="M20 40 Q18 14 50 12 Q82 14 80 40 L84 92 L68 92 L66 60 L34 60 L32 92 L16 92Z" fill="' + hc + '"/>';
    if (hair === 'bob') h += '<path d="M19 42 Q17 12 50 11 Q83 12 81 42 L80 66 L64 62 L36 62 L20 66Z" fill="' + hc + '"/>';
    if (hair === 'ponytail') h += '<path d="M72 28 Q92 36 88 66 Q80 52 70 44Z" fill="' + hc + '"/>';
    // тело
    h += '<path d="M10 100 Q12 78 50 76 Q88 78 90 100Z" fill="' + (ap.cloth || '#556') + '"/>';
    h += '<rect x="43" y="68" width="14" height="14" fill="' + dark + '"/>';
    if (ap.collar === 'tie') h += '<path d="M46 78 L54 78 L56 100 L44 100Z" fill="#8a2c2c"/><path d="M44 78 h12 l-3 4 h-6z" fill="#7a2020"/>';
    if (ap.collar === 'bowtie') h += '<path d="M40 80 l10 4 l10 -4 v8 l-10 -4 l-10 4z" fill="#222"/>';
    if (ap.collar === 'chain') h += '<path d="M34 80 Q50 98 66 80" stroke="#e8c030" stroke-width="2.6" fill="none"/>';
    if (ap.collar === 'brooch') h += '<circle cx="50" cy="84" r="4" fill="#e8c030"/>';
    if (ap.collar === 'coat') h += '<path d="M30 78 L50 100 L70 78 L58 76 L50 90 L42 76Z" fill="#fff" opacity=".9"/>';
    if (ap.extra && ap.extra.indexOf('tattoo') >= 0) h += '<path d="M36 76 q6 -4 8 2 M60 76 q4 -4 6 2" stroke="#2a4a7a" stroke-width="2" fill="none"/>';
    // уши
    h += '<ellipse cx="22.5" cy="48" rx="4" ry="6" fill="' + dark + '"/><ellipse cx="77.5" cy="48" rx="4" ry="6" fill="' + dark + '"/>';
    if (ap.extra && ap.extra.indexOf('earrings') >= 0) h += '<circle cx="22" cy="56" r="2.4" fill="#e8c030"/><circle cx="78" cy="56" r="2.4" fill="#e8c030"/>';
    // голова
    if (shape === 'square') h += '<rect x="23" y="16" width="54" height="62" rx="16" fill="' + skin + '"/>';
    else if (shape === 'long') h += '<ellipse cx="50" cy="47" rx="25" ry="34" fill="' + skin + '"/>';
    else if (shape === 'round') h += '<ellipse cx="50" cy="47" rx="29" ry="30" fill="' + skin + '"/>';
    else h += '<ellipse cx="50" cy="46" rx="26" ry="32" fill="' + skin + '"/>';
    // щёки/румянец
    if (ap.extra && (ap.extra.indexOf('flush') >= 0)) h += '<circle cx="34" cy="58" r="6" fill="#e0605a" opacity=".35"/><circle cx="66" cy="58" r="6" fill="#e0605a" opacity=".35"/>';
    if (ap.extra && ap.extra.indexOf('blush') >= 0) h += '<circle cx="34" cy="58" r="5" fill="#f08080" opacity=".35"/><circle cx="66" cy="58" r="5" fill="#f08080" opacity=".35"/>';
    if (ap.extra && ap.extra.indexOf('cheeks') >= 0) h += '<circle cx="30" cy="60" r="9" fill="' + skin + '" stroke="' + dark + '" stroke-width=".6"/><circle cx="70" cy="60" r="9" fill="' + skin + '" stroke="' + dark + '" stroke-width=".6"/>';
    if (ap.extra && ap.extra.indexOf('freckles') >= 0) h += '<g fill="#b87850"><circle cx="38" cy="54" r="1"/><circle cx="42" cy="56" r="1"/><circle cx="36" cy="58" r="1"/><circle cx="62" cy="54" r="1"/><circle cx="58" cy="56" r="1"/><circle cx="64" cy="58" r="1"/></g>';
    if (ap.extra && ap.extra.indexOf('wrinkles') >= 0) h += '<path d="M32 30 h36 M34 34 h32 M30 52 q3 6 6 10 M70 52 q-3 6 -6 10" stroke="' + dark + '" stroke-width="1" fill="none" opacity=".7"/>';
    // волосы спереди
    const topHair = () => {
      switch (hair) {
        case 'none': case 'bald': return '<path d="M25 36 Q27 30 30 30 M75 36 Q73 30 70 30" stroke="' + hc + '" stroke-width="3" fill="none"/>';
        case 'buzz': return '<path d="M24 38 Q24 14 50 14 Q76 14 76 38 Q70 24 50 24 Q30 24 24 38Z" fill="' + hc + '" opacity=".6"/>';
        case 'curls': return [30, 40, 50, 60, 70].map((x, i) => '<circle cx="' + x + '" cy="' + (i % 2 ? 17 : 21) + '" r="9" fill="' + hc + '"/>').join('') + '<circle cx="24" cy="30" r="7" fill="' + hc + '"/><circle cx="76" cy="30" r="7" fill="' + hc + '"/>';
        case 'dandelion': return [28, 38, 50, 62, 72, 22, 78].map((x, i) => '<circle cx="' + x + '" cy="' + (16 + (i > 4 ? 14 : (i % 2) * 3)) + '" r="10" fill="' + hc + '"/>').join('');
        case 'spiky': return '<path d="M24 38 L26 18 L36 28 L42 10 L50 26 L58 10 L64 28 L74 18 L76 38 Q70 26 50 26 Q30 26 24 38Z" fill="' + hc + '"/>';
        case 'messy': return '<path d="M23 40 Q20 12 50 10 Q80 12 77 40 Q72 28 62 30 Q58 22 50 30 Q42 22 36 30 Q28 28 23 40Z" fill="' + hc + '"/>';
        case 'bangs': return '<path d="M24 40 Q22 12 50 12 Q78 12 76 40 L72 34 L64 28 L56 34 L48 26 L40 34 L30 30Z" fill="' + hc + '"/>';
        case 'slick': return '<path d="M25 38 Q26 14 50 13 Q74 14 75 38 Q68 24 50 22 Q32 24 25 38Z" fill="' + hc + '"/><path d="M34 22 Q48 16 62 22" stroke="' + hl + '" stroke-width="2" fill="none" opacity=".6"/>';
        case 'comb': return '<path d="M24 40 Q22 12 50 12 Q78 12 76 40 Q70 26 60 24 L46 24 Q32 28 24 40Z" fill="' + hc + '"/><path d="M60 24 Q44 20 32 30" stroke="' + shade(hc, .6) + '" stroke-width="1.4" fill="none"/>';
        case 'bob': case 'long': case 'braids': case 'ponytail': return '<path d="M22 44 Q20 12 50 11 Q80 12 78 44 Q74 26 62 24 Q52 30 40 24 Q28 28 22 44Z" fill="' + hc + '"/>' + (hair === 'braids' ? '<path d="M28 50 Q24 70 30 90 M72 50 Q76 70 70 90" stroke="' + hc + '" stroke-width="7" fill="none"/>' : '');
        case 'bun': return '<circle cx="50" cy="10" r="9" fill="' + hc + '"/><path d="M24 40 Q22 14 50 14 Q78 14 76 40 Q70 26 50 24 Q30 26 24 40Z" fill="' + hc + '"/>';
        case 'cap': case 'kosynka': return '';
        default: return '<path d="M24 40 Q22 12 50 12 Q78 12 76 40 Q70 26 50 24 Q30 26 24 40Z" fill="' + hc + '"/>';
      }
    };
    h += topHair();
    // брови
    const bc = shade(hc, 0.8);
    const brow = ap.brow || 'thin';
    if (o.sad) h += '<path d="M33 40 L45 37 M67 40 L55 37" stroke="' + bc + '" stroke-width="2.6" stroke-linecap="round"/>';
    else if (brow === 'thick') h += '<path d="M32 38 Q38 34 46 38 M54 38 Q62 34 68 38" stroke="' + bc + '" stroke-width="3.6" stroke-linecap="round" fill="none"/>';
    else if (brow === 'angry') h += '<path d="M32 36 L46 40 M68 36 L54 40" stroke="' + bc + '" stroke-width="3" stroke-linecap="round"/>';
    else if (brow === 'light') h += '<path d="M33 38 Q39 36 45 38 M55 38 Q61 36 67 38" stroke="' + shade(skin, 0.7) + '" stroke-width="1.8" stroke-linecap="round" fill="none"/>';
    else h += '<path d="M33 38 Q39 34 45 38 M55 38 Q61 34 67 38" stroke="' + bc + '" stroke-width="1.6" stroke-linecap="round" fill="none"/>';
    // глаза
    const eyes = ap.eyes || 'norm';
    const ey = (cx) => {
      let rx = 4.4, ry = 3.2;
      if (eyes === 'big') { rx = 5.6; ry = 4.8; } if (eyes === 'small') { rx = 4; ry = 2.2; } if (eyes === 'tired') { ry = 2.4; }
      if (o.droop) ry *= 0.55;
      return '<ellipse cx="' + cx + '" cy="46" rx="' + rx + '" ry="' + ry + '" fill="#fff"/><circle cx="' + cx + '" cy="46.4" r="' + (ry > 3 ? 2.4 : 1.8) + '" fill="#2b2118"/>' + (o.drunk ? '<ellipse cx="' + cx + '" cy="46" rx="' + rx + '" ry="' + ry + '" fill="#e04a4a" opacity=".18"/>' : '');
    };
    h += ey(39) + ey(61);
    if (eyes === 'tired' || (ap.extra && ap.extra.indexOf('bags') >= 0) || o.bags) h += '<path d="M33 51 q6 3 12 0 M55 51 q6 3 12 0" stroke="' + shade(skin, 0.6) + '" stroke-width="1.6" fill="none"/>';
    if (ap.extra && ap.extra.indexOf('lashes') >= 0) h += '<path d="M34 43 l-3 -2 M44 43 l3 -2 M56 43 l-3 -2 M66 43 l3 -2" stroke="#222" stroke-width="1.2"/>';
    // нос
    const nose = ap.nose || 'small';
    if (nose === 'big') h += '<path d="M50 46 Q44 58 49 60 Q53 61 56 58" stroke="' + dark + '" stroke-width="2" fill="none"/>';
    else if (nose === 'red') h += '<ellipse cx="50" cy="57" rx="6" ry="5" fill="#e07a6a" stroke="' + dark + '" stroke-width="1"/>';
    else if (nose === 'pointy') h += '<path d="M50 46 L45 60 L52 60" stroke="' + dark + '" stroke-width="1.8" fill="none"/>';
    else h += '<path d="M48 54 Q50 59 53 56" stroke="' + dark + '" stroke-width="1.6" fill="none"/>';
    // борода и усы
    if (ap.beard === 'full') h += '<path d="M25 56 Q27 82 50 84 Q73 82 75 56 Q68 70 50 70 Q32 70 25 56Z" fill="' + hc + '"/>';
    if (ap.beard === 'stubble') h += '<path d="M26 58 Q28 78 50 80 Q72 78 74 58 Q66 68 50 68 Q34 68 26 58Z" fill="#000" opacity=".16"/>';
    if (ap.stache === 'brush') h += '<path d="M40 62 Q50 58 60 62 L58 66 Q50 63 42 66Z" fill="' + bc + '"/>';
    if (ap.stache === 'walrus') h += '<path d="M36 62 Q50 56 64 62 Q66 70 60 70 Q54 64 50 64 Q46 64 40 70 Q34 70 36 62Z" fill="' + (hc === '#aaa' || hc === '#cfcfcf' ? '#bbb' : bc) + '"/>';
    if (ap.stache === 'thin') h += '<path d="M42 62 Q50 60 58 62" stroke="' + bc + '" stroke-width="1.8" fill="none"/>';
    // рот
    const mo = o.mouth || ap.mouth || 'smile';
    if (mo === 'smile') h += '<path d="M41 66 Q50 74 59 66" stroke="#7a3028" stroke-width="2" fill="none" stroke-linecap="round"/>';
    else if (mo === 'flat') h += '<path d="M43 68 H57" stroke="#7a3028" stroke-width="2" stroke-linecap="round"/>';
    else if (mo === 'frown') h += '<path d="M42 70 Q50 63 58 70" stroke="#7a3028" stroke-width="2" fill="none" stroke-linecap="round"/>';
    else if (mo === 'lips') h += '<path d="M41 67 Q50 63 59 67 Q50 75 41 67Z" fill="#c8384a"/>';
    else if (mo === 'smirk') h += '<path d="M42 68 Q52 70 60 63" stroke="#7a3028" stroke-width="2" fill="none" stroke-linecap="round"/>';
    else if (mo === 'open') h += '<ellipse cx="50" cy="69" rx="6" ry="5" fill="#5a1a18"/>';
    if (ap.extra && ap.extra.indexOf('teeth') >= 0) h += '<path d="M42 66 Q50 72 58 66 L58 68 Q50 74 42 68Z" fill="#fff"/>';
    if (ap.extra && ap.extra.indexOf('wart') >= 0) h += '<circle cx="62" cy="64" r="2" fill="#a06a50"/>';
    if (ap.extra && ap.extra.indexOf('scar') >= 0) h += '<path d="M64 36 L70 52" stroke="#a05a50" stroke-width="1.6"/><path d="M63 42 h4 M65 47 h4" stroke="#a05a50" stroke-width="1"/>';
    if (ap.extra && ap.extra.indexOf('oil') >= 0) h += '<path d="M60 34 q6 2 8 8" stroke="#222" stroke-width="3" opacity=".35" fill="none"/>';
    if (ap.extra && ap.extra.indexOf('sheen') >= 0) h += '<ellipse cx="50" cy="26" rx="8" ry="3" fill="#fff" opacity=".35"/>';
    // очки
    const gl = ap.glasses;
    if (gl && gl !== 'none') {
      const col = gl === 'gold' ? '#d8b030' : '#2a2a2a';
      if (gl === 'round') h += '<circle cx="39" cy="46" r="8" fill="none" stroke="' + col + '" stroke-width="1.8"/><circle cx="61" cy="46" r="8" fill="none" stroke="' + col + '" stroke-width="1.8"/><path d="M47 46 H53" stroke="' + col + '" stroke-width="1.8"/>';
      else h += '<rect x="30" y="40" width="17" height="12" rx="3" fill="none" stroke="' + col + '" stroke-width="1.8"/><rect x="53" y="40" width="17" height="12" rx="3" fill="none" stroke="' + col + '" stroke-width="1.8"/><path d="M47 45 H53" stroke="' + col + '" stroke-width="1.8"/>';
    }
    // головной убор
    const hat = ap.hat;
    if (hat === 'helmet') h += '<path d="M22 36 Q22 8 50 8 Q78 8 78 36Z" fill="#f2c200"/><rect x="18" y="33" width="64" height="6" rx="3" fill="#d9a900"/><rect x="47" y="8" width="6" height="14" fill="#d9a900" opacity=".6"/>';
    if (hat === 'cap') h += '<path d="M24 34 Q24 10 50 10 Q76 10 76 34Z" fill="' + (ap.cloth || '#445') + '"/><path d="M24 34 Q50 40 82 34 L80 30 Q50 34 24 30Z" fill="' + shade(ap.cloth || '#445', 0.7) + '"/>';
    if (hat === 'kosynka') h += '<path d="M22 40 Q20 10 50 9 Q80 10 78 40 Q72 26 50 24 Q28 26 22 40Z" fill="' + (ap.cloth || '#a55') + '"/><g fill="#fff" opacity=".6"><circle cx="34" cy="20" r="1.8"/><circle cx="50" cy="15" r="1.8"/><circle cx="66" cy="20" r="1.8"/></g><path d="M70 30 L84 42 L72 42Z" fill="' + (ap.cloth || '#a55') + '"/>';
    if (hat === 'beanie') h += '<path d="M22 36 Q22 8 50 8 Q78 8 78 36Z" fill="#8a3a50"/><rect x="21" y="30" width="58" height="8" rx="3" fill="#6e2c40"/><circle cx="50" cy="7" r="4" fill="#6e2c40"/>';
    // динамика игрока
    if (o.bruise) h += '<ellipse cx="66" cy="50" rx="6" ry="5" fill="#6a4a8a" opacity=".5"/>';
    if (o.dirt) h += '<path d="M30 52 q4 2 8 -1 M60 60 q4 3 9 0" stroke="#3a2a1a" stroke-width="3" opacity=".3" fill="none"/>';
    if (o.sick) h += '<rect x="0" y="0" width="100" height="100" fill="#7ac070" opacity=".15"/>';
    h += '</svg>';
    return h;
  };

  // Лицо игрока, меняющееся от состояния
  G.playerAp = function () {
    const s = G.s, av = s.av || G.defaultAv();
    return Object.assign({ eyes: 'norm', nose: 'small', mouth: 'smile', extra: [], collar: 'none', hat: s.car && s.car.job && s.phase !== 'new' ? 'helmet' : undefined }, av, { cloth: av.cloth });
  };
  G.playerFace = function () {
    const s = G.s, st = s.st;
    const ap = G.playerAp();
    if (s.phase === 'evening' || s.phase === 'weekend' || s.phase === 'morning') ap.hat = undefined;
    const o = { mouth: st.mood < 30 ? 'frown' : st.mood > 70 ? 'smile' : 'flat', sad: st.mood < 30, droop: st.energy < 25 || st.drunk > 15, drunk: st.drunk > 10, bags: st.energy < 30, dirt: st.neat < 35, pale: st.health < 40, sick: s.hang > 0 || st.health < 25, bruise: s.flags.bruise > G.week() };
    if (st.drunk > 30) { o.mouth = 'open'; ap.extra = ap.extra.concat(['flush']); }
    return G.avatar(ap, o);
  };
  G.faceHTML = function (id, cls) {
    const n = D.NPC[id]; if (!n) return '';
    return '<div class="face ' + (cls || '') + '" style="--fc:' + (n.color || '#888') + '">' + G.avatar(n.ap) + '</div>';
  };
})();
