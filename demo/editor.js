/* Titan demo editor: песочница. Правки живут в localStorage этого браузера, на сервер ничего не уходит. */
(() => {
  const g = window.gsap; if (!g) return;
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INL = new Set(['SMALL', 'B', 'I', 'EM', 'STRONG', 'SPAN', 'BR', 'A', 'SUP', 'SUB', 'SVG']);
  const SKIP = 'svg,script,style,select,textarea,input,.demo-badge,[data-live]';
  // «телефонный» режим: палец или узкое окно. Читается в момент открытия, а не при загрузке (в симуляторах режим переключают на лету)
  const isCoarse = () => matchMedia('(pointer: coarse)').matches || innerWidth <= 900;
  const wins = new Map(); let docks = null;
  const T = (t, row, f) => ({ t, row, f }), F = (l, s, w, o = {}) => ({ l, s, w, ...o });
  const DAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
  const LVL = ['для новичков', 'для всей семьи', 'для продвинутых', 'средняя сложность', 'для компаний', 'для школьников'];
  const STG = ['Принято в работу', 'Мастер в пути', 'Направлен сантехник', 'Диагностика', 'Ожидает запчасти', 'Выполнено'];
  // Явные схемы: каждая группа данных живёт в своей таблице
  const TABLES = {
    furniture: [T('Каталог мебели', '.product', [F('Категория', 'h3', 1.3), F('Описание', '.desc', 3), F('Цена', '.chip', 1)])],
    bistro: [
      T('Кухня', '.menu-cols > div:nth-child(1) .menu-row', [F('Блюдо', '.name', 2), F('Описание', '.desc', 2), F('Цена', '.price', 1)]),
      T('Бар', '.menu-cols > div:nth-child(2) .menu-row', [F('Напиток', '.name', 2), F('Описание', '.desc', 2), F('Цена', '.price', 1)]),
      T('Афиша недели', '.event', [F('Число', '.date', .6), F('День', '.date span', 1.2, { opts: DAYS }), F('Событие', 'h3', 2), F('Описание', 'p', 3), F('Вход / цена', '.tag', 1.5)])],
    uk: [
      T('Мастера: кто куда едет и на каком этапе', '.ticket-row', [F('Заявка', '.ticket-issue', 2), F('Адрес', '.ticket-house', 1.4), F('Этап', '.status', 1.6, { opts: STG }), F('Когда произошло', '.ticket-time', 1.7, { type: 'time' })]),
      T('Что сделали за месяц', '.work-card', [F('Работа', 'h3', 2), F('Тип', '.work-type', 1.4), F('Адрес', '.work-meta span:nth-child(1)', 1.2), F('Дата', '.work-meta span:nth-child(2)', 1)])],
    skate: [T('Каталог фигур', '.fig', [F('Фигура', 'h3', 1.6), F('Цена', '.price', 1.2), F('Материал', '.tag.mat', 1), F('Площадь', '.tag:not(.mat)', 1)]),
      T('Частые вопросы', 'details', [F('Вопрос', 'summary', 2), F('Ответ', 'p', 4)])],
    tours: [T('Туры и цены', '.tour', [F('Тур', 'h3', 2), F('Цена', '.price', 1), F('Длительность', '.tour-meta span:nth-child(1)', 1.2, { full: true }), F('Для кого', '.tour-meta span:nth-child(2)', 1.4, { opts: LVL }), F('Дни', '.tour-meta span:nth-child(3)', 1.1), F('Описание', '.tour-in p', 3)])],
  };
  const P = { x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', min: '<path d="M5 12h14"/>', undo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', pen: '<path d="M12 20h9"/><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z"/>', ok: '<path d="M20 6 9 17l-5-5"/>' };
  const ico = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const own = el => [...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
  const getV = el => { const n = own(el); return (n ? n.nodeValue : el.textContent).trim(); };
  const setV = (el, v) => { const n = own(el); if (n) n.nodeValue = n.nodeValue.replace(/\S[\s\S]*\S|\S/, () => v); else el.textContent = v; };

  const css = document.createElement('style');
  css.textContent = `
:where(.ed,.ed *,.ed-docks,.ed-docks *){box-sizing:border-box}
:where(.ed button,.ed-chip){background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer}
:where(.ed input){font:inherit}
.ed{position:fixed;inset:0;z-index:100;font-family:Inter,system-ui,sans-serif;color:#e2e8f0}
.ed-bd{position:absolute;inset:0;background:rgba(8,10,14,.82)}
.ed-win{position:absolute;inset:3.5vh 3vw;display:flex;flex-direction:column;background:#13161c;border:1px solid color-mix(in srgb,var(--acc) 30%,rgba(255,255,255,.08));border-radius:16px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.75)}
.ed-hd{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#181c24;border-bottom:1px solid rgba(255,255,255,.08);cursor:grab;user-select:none;touch-action:none}
.ed-hd:active{cursor:grabbing}
.ed-ttl{font:700 14px 'Space Grotesk',sans-serif;display:flex;align-items:center;gap:8px;white-space:nowrap}
.ed-ttl i{width:8px;height:8px;border-radius:50%;background:var(--acc)}
.ed-tabs{display:flex;gap:2px;padding:3px;background:#0f1217;border-radius:10px;margin:0 auto}
.ed-tabs button{padding:6px 14px;border-radius:8px;font-size:13px;color:#94a3b8;transition:background .2s,color .2s}
.ed-tabs button.on{background:#2f6df2;color:#fff}
.ed-act{display:flex;gap:6px}
.ed-b{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:8px;font-size:13px;color:#cbd5e1;border:1px solid rgba(255,255,255,.1);transition:background .2s}
.ed-b:hover{background:rgba(255,255,255,.08)}.ed-b.on,.ed-b.pri{background:var(--acc);color:#111;border-color:transparent}
.ed-b svg{width:16px;height:16px;flex:none}
.ed-main{flex:1;min-height:0;display:grid;grid-template-columns:1fr 420px}
.m-table .ed-main{grid-template-columns:1fr}.m-table .ed-site{display:none}
.ed-site{position:relative;background:#0b0e13;min-width:0}
.ed-site::before{content:"Загружаем демо…";position:absolute;inset:0;display:grid;place-items:center;font-size:13px;color:#64748b}
.ed-site iframe{position:relative;width:100%;height:100%;border:0;background:#fff;display:block;opacity:0;transition:opacity .3s}.ed-site iframe.rdy{opacity:1}
.ed-tb{border-left:1px solid rgba(255,255,255,.08);background:#181c24;display:flex;flex-direction:column;min-height:0;min-width:0}
.ed-th{padding:14px 16px 8px;font:700 13px 'Space Grotesk',sans-serif}.ed-th p{font:400 12px Inter,sans-serif;color:#64748b;margin-top:4px}
.ed-rows{flex:1;min-width:0;overflow:auto;padding:4px 0 12px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.ed-tbl{min-width:var(--min,500px);padding:0 12px}
.ed-tbl h4{position:sticky;left:12px;width:max-content;max-width:calc(100vw - 48px)}
.ed-row>:first-child,.ed-hr>:first-child{position:sticky;left:12px;z-index:1;box-shadow:-12px 0 0 #181c24}
.ed-hr>:first-child{background:#181c24}
.ed-tbl{margin-bottom:18px}.ed-tbl h4{font:700 13px 'Space Grotesk',sans-serif;margin:8px 0;display:flex;gap:8px;align-items:center}
.ed-tbl h4 span{font:400 11px Inter,sans-serif;color:#64748b;background:#0f1217;padding:1px 7px;border-radius:99px}
.ed-hr,.ed-row{display:grid;grid-template-columns:var(--cols);gap:6px}.ed-hr{font:600 11px Inter,sans-serif;color:#64748b;padding:0 2px 4px}.ed-row{margin-bottom:6px}
.ed-row input{width:100%;min-width:0;padding:8px 10px;border-radius:8px;background:#0f1217;border:1px solid rgba(255,255,255,.08);color:#e2e8f0;font-size:13px;outline:0}
.ed-row input:focus{border-color:#2f6df2}.ed-row input[readonly]:not([data-lock]){opacity:.55}
.ed-cell{min-width:0}
.ed-empty{padding:12px;font-size:13px;color:#94a3b8}
.ed-ft{padding:8px 14px;font-size:12px;color:#64748b;background:#181c24;border-top:1px solid rgba(255,255,255,.08)}
.ed-dlg{position:absolute;inset:0;z-index:5;display:none;place-items:center;background:rgba(8,10,14,.65)}.ed-dlg.on{display:grid}
.ed-dlgb{background:#181c24;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:22px;width:min(400px,90%)}
.ed-dlgb h4{font:700 16px 'Space Grotesk',sans-serif}.ed-dlgb p{font-size:13px;color:#94a3b8;margin:8px 0 16px}.ed-dlgb div{display:flex;gap:8px;flex-wrap:wrap}
.ed-docks{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:101;display:flex;gap:8px}
.ed-chip{display:none;padding:9px 16px;border-radius:999px;background:#181c24;border:1px solid var(--acc);color:#e2e8f0;font-size:13px}
.ed-row input{color-scheme:dark}
.ed-time{display:flex;gap:6px;min-width:0}.ed-time input{flex:1}.ed-time button{padding:0 10px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#0f1217;color:#cbd5e1;font-size:12px;white-space:nowrap}.ed-time button:hover{border-color:#2f6df2}
@media(max-width:900px){.ed-win{inset:0;border-radius:0}.m-split .ed-tb{display:none}.m-split .ed-main{grid-template-columns:1fr}.ed-b span{display:none}
.ed-hd{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 8px;padding:10px 12px;cursor:default}
.ed-ttl{grid-column:1/-1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.ed-tabs{margin:0;justify-self:start}.ed-act{justify-self:end}}
@media(max-width:400px){.ed-tabs button{padding:6px 9px;font-size:12.5px}.ed-b{padding:7px 8px}.ed-act{gap:4px}}
@media(pointer:coarse),(max-width:900px){.ed-row>:first-child,.ed-hr>:first-child{box-shadow:-12px 0 0 #181c24,7px 0 10px -4px rgba(0,0,0,.6)}.ed-row input{font-size:16px}.ed-rows,.ed-rows *{touch-action:pan-x pan-y}}`;
  document.head.appendChild(css);

  const lock = () => {
    const op = [...wins.values()].some(s => !s.min);
    document.documentElement.style.overflow = op ? 'hidden' : '';
    window.__edOpen = op; window.dmPause && window.dmPause(op);
  };
  // Свёрнутые окна запоминаются на вкладку браузера и видны на любой странице сайта
  const ghosts = new Map(), SK = 'titan-docks';
  const readDocks = () => { try { return JSON.parse(sessionStorage.getItem(SK) || '[]'); } catch (_) { return []; } };
  const writeDocks = l => { try { sessionStorage.setItem(SK, JSON.stringify(l)); } catch (_) {} };
  const dropDock = id => { writeDocks(readDocks().filter(x => x.id !== id)); const c = ghosts.get(id); if (c) { c.remove(); ghosts.delete(id); } };
  const mkDocks = () => { if (!docks) { docks = document.createElement('div'); docks.className = 'ed-docks'; document.body.appendChild(docks); } return docks; };
  function persist(S) {
    writeDocks(readDocks().filter(x => x.id !== S.id).concat({ id: S.id, title: S.title, acc: S.acc, draft: S.draft, tdraft: S.tdraft, dirty: S.dirty }));
    if (S.imgDraft && Object.keys(S.imgDraft).length) idbPut('draft:' + S.id, { v: S.imgDraft });
  }
  function ghost(en) {
    if (ghosts.has(en.id) || wins.has(en.id)) return;
    const c = document.createElement('button'); c.className = 'ed-chip'; c.style.display = 'block'; c.style.setProperty('--acc', en.acc); c.textContent = en.title + ' · редактор';
    c.onclick = () => {
      const b = document.querySelector(`[data-open="${en.id}"]`);
      if (b) open(b, en); else { try { sessionStorage.setItem('titan-reopen', en.id); } catch (_) {} location.href = '/demo/#' + en.id; }
    };
    mkDocks().appendChild(c); ghosts.set(en.id, c);
  }

  // Окно летит как лёгкая оболочка: тяжёлый контент скрыт, iframe грузится после полёта
  const fly = (S, r, o) => {
    const b = S.base;
    const to = r ? { x: r.left + r.width / 2 - (b.left + b.width / 2), y: r.top + r.height / 2 - (b.top + b.height / 2), scaleX: r.width / b.width, scaleY: r.height / b.height } : { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    S.win.style.willChange = 'transform';
    return g.to(S.win, { ...to, force3D: true, ...o, onComplete: () => { S.win.style.willChange = ''; o.onComplete && o.onComplete(); } });
  };
  const label = S => {
    const on = S.editing || S.dirty; S.btnE.classList.toggle('on', on);
    S.btnE.innerHTML = ico(on ? 'ok' : 'pen') + '<span>' + (on ? 'Сохранить' : 'Править') + '</span>';
  };

  function open(btn, en) {
    const id = btn.dataset.open, ex = wins.get(id);
    if (ex) { if (ex.min) restore(ex); return; }
    const title = btn.dataset.title, cs = btn.closest('.dm-case'), cover = cs.querySelector('.dm-cover');
    const acc = getComputedStyle(cs).getPropertyValue('--acc').trim();
    const root = document.createElement('div'); root.className = 'ed'; root.style.setProperty('--acc', acc);
    const bt = (a, n, t) => `<button class="ed-b" data-a="${a}" title="${t}" aria-label="${t}">${ico(n)}</button>`;
    root.innerHTML = `<div class="ed-bd"></div>
<section class="ed-win m-split" role="dialog" aria-label="Редактор: ${esc(title)}">
<header class="ed-hd"><div class="ed-ttl"><i></i>${esc(title)} · редактор</div>
<div class="ed-tabs"><button data-m="split" class="on">Редактор</button><button data-m="table">Таблицы</button></div>
<div class="ed-act"><button class="ed-b" data-a="edit"></button>${bt('reset', 'undo', 'Сбросить правки')}${bt('min', 'min', 'Свернуть')}${bt('close', 'x', 'Закрыть')}</div></header>
<div class="ed-main"><div class="ed-site"><iframe title="Демо ${esc(title)}"></iframe></div>
<aside class="ed-tb"><div class="ed-th">Таблицы<p>Правьте здесь или прямо на сайте: данные общие.</p></div><div class="ed-rows"></div></aside></div>
<footer class="ed-ft">Песочница: правки видны только вам и хранятся в этом браузере. На сервер ничего не отправляется.</footer>
<div class="ed-dlg"><div class="ed-dlgb"><h4>Сохранить изменения?</h4><p>Несохранённые правки пропадут. Сохранённые останутся в этом браузере.</p><div><button class="ed-b pri" data-d="save">Сохранить</button><button class="ed-b" data-d="drop">Не сохранять</button><button class="ed-b" data-d="cancel">Отмена</button></div></div></div></section>`;
    const chip = document.createElement('button'); chip.className = 'ed-chip'; chip.style.setProperty('--acc', acc); chip.textContent = title + ' · редактор';
    if (!docks) { docks = document.createElement('div'); docks.className = 'ed-docks'; document.body.appendChild(docks); }
    docks.appendChild(chip); document.body.appendChild(root);
    const q = s => root.querySelector(s), win = q('.ed-win'), fr = q('iframe');
    const S = { id, title, acc, root, win, fr, chip, cover, bd: q('.ed-bd'), rows: q('.ed-rows'), btnE: q('[data-a=edit]'), dlg: q('.ed-dlg'), kids: [q('.ed-hd'), q('.ed-main'), q('.ed-ft')], els: [], refs: [], store: { n: 0, v: {} }, draft: {}, tdraft: {}, dirty: false, editing: false, min: false, base: win.getBoundingClientRect() };
    const pick = S.pick = document.createElement('input'); pick.type = 'file'; pick.accept = 'image/*'; pick.hidden = true; root.appendChild(pick);
    pick.onchange = async () => {
      const f = pick.files[0], el = S.curImg; pick.value = ''; if (!f || !el) return;
      try { const u = await shrink(f); setImg(el, u); S.imgDraft[S.imgs.indexOf(el)] = u; S.dirty = true; label(S); } catch (_) {}
    };
    if (en) { S.pending = en; dropDock(id); }
    if (isCoarse()) q('.ed-th p').textContent = 'Листайте таблицу пальцем, нажмите на ячейку, чтобы изменить.';
    // мышь в узком окне (симулятор): тянешь таблицу «рукой», как пальцем; простое нажатие по-прежнему включает правку ячейки
    { const rw = S.rows; let dn = null;
      rw.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && !e.button && isCoarse()) dn = { x: e.clientX, y: e.clientY, sl: rw.scrollLeft, st: rw.scrollTop, mv: false }; });
      rw.addEventListener('pointermove', e => {
        if (!dn) return; const dx = e.clientX - dn.x, dy = e.clientY - dn.y;
        if (!dn.mv && Math.hypot(dx, dy) > 6) { dn.mv = true; rw.setPointerCapture(e.pointerId); rw.style.cursor = 'grabbing'; }
        if (dn.mv) { rw.scrollLeft = dn.sl - dx; rw.scrollTop = dn.st - dy; }
      });
      const end = () => { if (dn && dn.mv) { const h = ev => ev.stopPropagation(); rw.addEventListener('click', h, true); setTimeout(() => rw.removeEventListener('click', h, true), 60); } rw.style.cursor = ''; dn = null; };
      rw.addEventListener('pointerup', end); rw.addEventListener('pointercancel', end); }
    wins.set(id, S); lock(); label(S);

    const act = { edit: () => (S.editing || S.dirty) ? save(S) : startEdit(S), reset: () => reset(S), min: () => minimize(S), close: () => closeReq(S) };
    root.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act[b.dataset.a]());
    root.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { S.dlg.classList.remove('on'); if (b.dataset.d === 'save') { save(S); doClose(S); } else if (b.dataset.d === 'drop') doClose(S); });
    root.querySelectorAll('.ed-tabs button').forEach(b => b.onclick = () => { win.className = 'ed-win m-' + b.dataset.m; root.querySelectorAll('.ed-tabs button').forEach(x => x.classList.toggle('on', x === b)); });
    chip.onclick = () => restore(S);
    fr.addEventListener('load', () => init(S));

    const hd = q('.ed-hd');   // перетаскивание за заголовок
    hd.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || innerWidth < 900) return;
      const sx = e.clientX - g.getProperty(win, 'x'), sy = e.clientY - g.getProperty(win, 'y'); hd.setPointerCapture(e.pointerId);
      const mv = ev => g.set(win, { x: ev.clientX - sx, y: ev.clientY - sy }), up = () => { hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', up); };
      hd.addEventListener('pointermove', mv); hd.addEventListener('pointerup', up);
    });

    const src = () => { fr.src = `/demo/${id}/`; };
    if (rm) return src();
    const r = cover.getBoundingClientRect(), b = S.base;
    g.set(win, { x: r.left + r.width / 2 - (b.left + b.width / 2), y: r.top + r.height / 2 - (b.top + b.height / 2), scaleX: r.width / b.width, scaleY: r.height / b.height, force3D: true });
    g.set(S.kids, { autoAlpha: 0 }); g.set(S.bd, { autoAlpha: 0 });
    g.to(S.bd, { autoAlpha: 1, duration: .35, ease: 'power2.out' });
    g.to(S.kids, { autoAlpha: 1, duration: .3, ease: 'power2.out', delay: .5 });
    g.fromTo([...root.querySelectorAll('.ed-hd > *, .ed-act > *')], { y: -10 }, { y: 0, duration: .45, stagger: .04, ease: 'power3.out', delay: .5 });
    fly(S, null, { duration: .8, ease: 'expo.out', onComplete: src });
  }

  function init(S) {
    let doc; try { doc = S.fr.contentDocument; doc.body.nodeType; } catch (_) { S.rows.innerHTML = '<p class="ed-empty">Редактор работает на опубликованном сайте. Откройте витрину по адресу сайта, а не как файл.</p>'; return; }
    if (!doc || !doc.body) return;
    S.doc = doc; S.fr.classList.add('rdy'); S.editing = false; S.dirty = false; S.draft = {}; S.tdraft = {};
    const all = [...doc.body.querySelectorAll('*')].filter(e => !e.closest(SKIP) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && [...e.children].every(k => INL.has(k.tagName.toUpperCase())));
    S.els = all.filter(e => !all.some(o => o !== e && o.contains(e)));
    S.store = { n: S.els.length, v: {}, t: {} };
    try { const s = JSON.parse(localStorage.getItem('titan-demo:' + S.id) || 'null'); if (s) { S.store.t = s.t || {}; if (s.n === S.els.length) { S.store = Object.assign(s, { t: S.store.t }); Object.entries(s.v).forEach(([i, h]) => S.els[i].innerHTML = h); } } } catch (_) {}
    applyTimes(S, S.store.t);
    const st = doc.createElement('style');
    st.textContent = '[data-ed]{outline:1px dashed rgba(47,109,242,.7)!important;outline-offset:2px;cursor:text!important;-webkit-user-select:text!important;user-select:text!important}[data-ed]:hover,[data-ed]:focus{outline:2px solid ' + S.acc + '!important}';
    doc.head.appendChild(st);
    // в режиме правки листалки и ссылки не перехватывают курсор
    const stop = e => { if (S.editing && e.target.closest && e.target.closest('[data-ed]')) e.stopPropagation(); };
    ['pointerdown', 'mousedown', 'touchstart'].forEach(t => doc.addEventListener(t, stop, true));
    doc.addEventListener('dragstart', e => { if (S.editing) e.preventDefault(); }, true);
    doc.addEventListener('click', e => { if (S.editing && e.target.closest('a,button,summary,label')) e.preventDefault(); }, true);
    doc.addEventListener('keydown', e => { if (S.editing && e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
    doc.addEventListener('input', e => { const i = S.els.indexOf(e.target.closest('[data-ed]')); if (i < 0) return; mark(S, i); sync(S); });
    applyPending(S); buildTables(S); initImages(S); label(S);   // черновик применяется до таблиц, чтобы они показали его значения
  }
  function applyPending(S) {   // правки, которые остались в свёрнутом окне до ухода со страницы
    const en = S.pending; if (!en) return; S.pending = null;
    Object.entries(en.draft || {}).forEach(([i, h]) => { if (S.els[i]) S.els[i].innerHTML = h; });
    S.draft = en.draft || {}; S.tdraft = en.tdraft || {}; applyTimes(S, S.tdraft); S.dirty = !!en.dirty;
    idbGet('draft:' + S.id).then(r => { if (r && r.v) { S.imgDraft = r.v; Object.entries(r.v).forEach(([i, u]) => S.imgs[i] && setImg(S.imgs[i], u)); idbPut('draft:' + S.id, null); } });
  }
  const mark = (S, i) => { S.draft[i] = S.els[i].innerHTML; S.dirty = true; label(S); };
  function startEdit(S) {
    if (!S.doc) return; S.editing = true; S.det = [...S.doc.querySelectorAll('details')].map(d => [d, d.open]); S.det.forEach(([d]) => { d.open = true; });
    S.els.forEach(e => { e.setAttribute('data-ed', ''); e.contentEditable = 'plaintext-only'; if (e.contentEditable !== 'plaintext-only') e.contentEditable = 'true'; });
    label(S);
  }
  const stopEdit = S => { S.editing = false; if (S.imgHide) S.imgHide(); (S.det || []).forEach(([d, o]) => { d.open = o; }); S.det = null; S.els.forEach(e => { e.removeAttribute('data-ed'); e.removeAttribute('contenteditable'); }); };
  function save(S) {
    Object.assign(S.store.v, S.draft); S.store.t = Object.assign(S.store.t || {}, S.tdraft); S.draft = {}; S.tdraft = {}; S.dirty = false;
    try { localStorage.setItem('titan-demo:' + S.id, JSON.stringify(S.store)); } catch (_) {}
    if (S.imgDraft && Object.keys(S.imgDraft).length) { Object.assign(S.imgStore.v, S.imgDraft); S.imgDraft = {}; idbPut(S.id, S.imgStore); }
    stopEdit(S); label(S);
  }
  function reset(S) {
    idbPut(S.id, null);
    try { localStorage.removeItem('titan-demo:' + S.id); } catch (_) {}
    S.draft = {}; S.tdraft = {}; S.dirty = false; stopEdit(S); label(S); S.fr.contentWindow.location.reload();
  }

  // ---- фото: замена картинок. Хранится в IndexedDB этого браузера ----
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('titan-demo', 1); r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const idbGet = async k => { try { const d = await idb(); return await new Promise(res => { const q = d.transaction('img').objectStore('img').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); } catch (_) { return null; } };
  const idbPut = async (k, v) => { try { const d = await idb(); const t = d.transaction('img', 'readwrite'); v == null ? t.objectStore('img').delete(k) : t.objectStore('img').put(v, k); } catch (_) {} };
  const splitLayers = v => { const out = []; let d = 0, cur = ''; for (const ch of v) { if (ch === '(') d++; else if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
  const isImgLayer = l => /^url\(/.test(l) && !/^url\(["']?data:image\/svg/.test(l);
  const setImg = (el, url) => {
    if (el.tagName === 'IMG') { el.removeAttribute('srcset'); el.removeAttribute('sizes'); el.src = url; const pc = el.closest('picture'); if (pc) pc.querySelectorAll('source').forEach(x => x.remove()); return; }
    let hit = false; const ls = splitLayers(el.ownerDocument.defaultView.getComputedStyle(el).backgroundImage).map(l => isImgLayer(l) ? (hit = true, `url("${url}")`) : l);
    el.style.setProperty('background-image', (hit ? ls : [`url("${url}")`]).join(', '), 'important');
  };
  const shrink = file => new Promise((res, rej) => {
    const im = new Image(), u = URL.createObjectURL(file);
    im.onload = () => { const k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); let d = c.toDataURL('image/webp', .82); if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/jpeg', .85); res(d); };
    im.onerror = rej; im.src = u;
  });
  function initImages(S) {
    const doc = S.doc, w = doc.defaultView;
    S.imgs = [...doc.body.querySelectorAll('*')].filter(e => !e.closest('.demo-badge,svg') && (e.tagName === 'IMG' || splitLayers(w.getComputedStyle(e).backgroundImage).some(isImgLayer)));
    const clips = S.imgs.map(c => { const l = []; for (let q = c.parentElement; q && q !== doc.body; q = q.parentElement) { const o = w.getComputedStyle(q); if (o.overflowX !== 'visible' || o.overflowY !== 'visible') l.push(q); } return l; });
    S.imgStore = { n: S.imgs.length, v: {} }; S.imgDraft = {};
    idbGet(S.id).then(rec => { if (rec && rec.n === S.imgs.length) { S.imgStore = rec; Object.entries(rec.v).forEach(([i, u]) => setImg(S.imgs[i], u)); } });
    const btn = S.imgBtn = doc.createElement('button'); btn.type = 'button'; btn.textContent = 'Заменить фото';
    btn.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;padding:8px 12px;border-radius:8px;border:0;cursor:pointer;background:' + S.acc + ';color:#111;font:600 13px Inter,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4)';
    doc.body.appendChild(btn); g.set(btn, { autoAlpha: 0, x: 0, y: 0, force3D: true });
    const BW = btn.offsetWidth || 126, BH = btn.offsetHeight || 34;

    // геометрия считается пакетом (сначала все чтения) и кэшируется в координатах документа:
    // поиск под курсором дальше не обращается к DOM
    let geo = null, sx = 0, sy = 0;   // смещение прокрутки кэшируется: чтение scrollX/Y на каждое движение мыши принудительно проверяет раскладку
    const recalc = () => {
      sx = w.scrollX; sy = w.scrollY;
      geo = S.imgs.map((c, i) => {
        const q = c.getBoundingClientRect(); let l = q.left + sx, t = q.top + sy, r = q.right + sx, b = q.bottom + sy;
        clips[i].forEach(p => { const k = p.getBoundingClientRect(); l = Math.max(l, k.left + sx); t = Math.max(t, k.top + sy); r = Math.min(r, k.right + sx); b = Math.min(b, k.bottom + sy); });
        return [l, t, r, b];
      });
    };
    const pickAt = (cx, cy) => {
      if (!geo) recalc();
      const x = cx + sx, y = cy + sy; let best = -1, area = Infinity;
      for (let i = 0; i < geo.length; i++) {
        const q = geo[i], gw = q[2] - q[0], gh = q[3] - q[1];
        if (gw < 60 || gh < 48 || x < q[0] || x > q[2] || y < q[1] || y > q[3]) continue;
        if (gw * gh < area) { area = gw * gh; best = i; }
      }
      return best < 0 ? null : S.imgs[best];
    };
    const stale = () => { geo = null; };
    w.addEventListener('resize', stale); doc.addEventListener('load', stale, true);
    if (w.ResizeObserver) new w.ResizeObserver(stale).observe(doc.documentElement);

    // кнопка двигается только через transform (gsap.quickTo), прячется через autoAlpha
    const xTo = g.quickTo(btn, 'x', { duration: .2, ease: 'power3' }), yTo = g.quickTo(btn, 'y', { duration: .2, ease: 'power3' });
    let shown = false, tx = 0, ty = 0, ht = 0, st = 0, raf = 0, scrolling = false, last = null;
    const show = on => { if (shown === on) return; shown = on; g.set(btn, { autoAlpha: on ? 1 : 0 }); };
    S.imgHide = () => show(false);
    const update = ev => {
      if (!S.editing || S.ptype === 'touch' || scrolling) return;
      const c = pickAt(ev.clientX, ev.clientY);
      if (!c) { if (!ht) ht = setTimeout(() => { ht = 0; show(false); }, 250); return; }
      clearTimeout(ht); ht = 0; S.curImg = c;
      const dx = Math.max(tx - ev.clientX, 0, ev.clientX - (tx + BW)), dy = Math.max(ty - ev.clientY, 0, ev.clientY - (ty + BH));
      if (!shown || Math.hypot(dx, dy) > 36) {   // кнопка рядом с курсором; приближаешься к ней, она не убегает
        tx = Math.max(8, Math.min(ev.clientX + 10, w.innerWidth - BW - 8)); ty = Math.max(8, Math.min(ev.clientY + 10, w.innerHeight - BH - 8));
        if (!shown) { g.set(btn, { x: tx, y: ty }); show(true); } else { xTo(tx); yTo(ty); }
      }
    };
    doc.addEventListener('mousemove', e => { last = e; if (raf) return; raf = w.requestAnimationFrame(() => { raf = 0; if (last.target !== btn) update(last); }); }, { passive: true });
    // на время прокрутки кнопка прячется, после остановки возвращается к курсору
    doc.addEventListener('scroll', () => {
      sx = w.scrollX; sy = w.scrollY;
      if (!scrolling) { scrolling = true; show(false); }
      clearTimeout(st); st = setTimeout(() => { scrolling = false; geo = null; if (S.editing && last) update(last); }, 140);
    }, { capture: true, passive: true });
    btn.addEventListener('mouseenter', () => { clearTimeout(ht); ht = 0; });
    doc.addEventListener('mouseleave', () => show(false));
    // телефон: нажатие по фото (не по тексту) сразу открывает выбор файла
    doc.addEventListener('pointerdown', e => { S.ptype = e.pointerType; }, true);
    doc.addEventListener('click', e => {
      if (!S.editing || S.ptype !== 'touch' || e.target === btn || e.target.closest('[data-ed]')) return;
      const c = pickAt(e.clientX, e.clientY); if (c) { S.curImg = c; S.pick.click(); }
    }, true);
    btn.onclick = e => { e.preventDefault(); e.stopPropagation(); S.pick.click(); };
  }

  const setFull = (el, v) => {
    const m = v.match(/^([^\/]*?)\s*(\/.*)?$/), b = el.firstElementChild && el.firstElementChild.tagName === 'B';
    el.innerHTML = b ? '<b>' + esc(m[1]) + '</b>' + (m[2] ? ' ' + esc(m[2]) : '') : esc(v);
  };
  const flash = (S, el) => { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.animate([{ outline: '3px solid ' + S.acc, outlineOffset: '6px' }, { outline: '3px solid transparent', outlineOffset: '6px' }], { duration: 1100 }); };
  const applyTimes = (S, t) => { const els = [...S.doc.querySelectorAll('.ticket-time')]; Object.entries(t || {}).forEach(([i, ts]) => { if (els[i]) els[i].dataset.ts = ts; }); const w = S.doc.defaultView; if (w.__tick) w.__tick(); };
  // поле «когда произошло»: время события + кнопка «Сейчас» (время устройства), на сайте идёт счёт
  function timeCell(S, el, idx) {
    const wrap = document.createElement('div'); wrap.className = 'ed-time';
    const inp = document.createElement('input'); inp.type = 'time'; inp.setAttribute('aria-label', 'Когда произошло');
    const nb = document.createElement('button'); nb.type = 'button'; nb.textContent = 'Сейчас';
    const hm = ts => { const d = new Date(+ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    const setTs = ts => { el.dataset.ts = ts; S.tdraft[idx] = ts; S.dirty = true; label(S); const w = S.doc.defaultView; if (w.__tick) w.__tick(); };
    inp.value = el ? hm(el.dataset.ts) : ''; inp.disabled = !el; nb.disabled = !el;
    inp.onchange = () => { const [h, m] = inp.value.split(':').map(Number); if (isNaN(h)) return; const d = new Date(); d.setHours(h, m, 0, 0); let ts = d.getTime(); if (ts > Date.now()) ts -= 864e5; setTs(ts); };
    nb.onclick = () => { const ts = Date.now(); inp.value = hm(ts); setTs(ts); };
    inp.onfocus = () => el && flash(S, el);
    wrap.append(inp, nb);
    if (isCoarse() && el) {   // телефон: поле времени тоже не должно «красть» свайп; нажатие открывает выбор времени
      inp.style.pointerEvents = 'none';
      wrap.addEventListener('click', e => { if (e.target.closest('button')) return; inp.style.pointerEvents = ''; inp.focus(); try { inp.showPicker && inp.showPicker(); } catch (_) {} });
      inp.addEventListener('blur', () => { inp.style.pointerEvents = 'none'; });
    }
    return wrap;
  }
  function buildTables(S) {
    S.rows.innerHTML = ''; S.refs = []; const touchy = isCoarse();
    const times = [...S.doc.querySelectorAll('.ticket-time')];
    // все таблицы одной ширины (по самой широкой): общая прокрутка заканчивается там же, где каждая таблица,
    // и закреплённый столбец не «уезжает» у более узких
    const present = (TABLES[S.id] || []).filter(t => S.doc.querySelector(t.row));
    const minW = Math.max(0, ...present.map(t => t.f.length)) * (touchy ? 150 : 125) + 24 + 'px';
    (TABLES[S.id] || []).forEach((t, ti) => {
      const roots = [...S.doc.querySelectorAll(t.row)]; if (!roots.length) return;
      const box = document.createElement('section'); box.className = 'ed-tbl';
      // на телефоне закреплённый столбец узкий, остальным остаётся место
      box.style.setProperty('--cols', t.f.map((f, i) => (i === 0 && touchy) ? 'min(150px,38vw)' : `minmax(0,${f.w}fr)`).join(' '));
      box.style.setProperty('--min', minW);
      box.innerHTML = `<h4>${esc(t.t)} <span>${roots.length}</span></h4><div class="ed-hr">${t.f.map(f => `<b>${esc(f.l)}</b>`).join('')}</div>`;
      roots.forEach(r => {
        const row = document.createElement('div'); row.className = 'ed-row';
        t.f.forEach((f, fi) => {
          const el = r.querySelector(f.s);
          if (f.type === 'time') { row.appendChild(timeCell(S, el, times.indexOf(el))); return; }
          const inp = document.createElement('input'), host = el && S.els.find(x => x === el || x.contains(el));
          const rd = () => f.full ? el.textContent.trim() : getV(el);
          inp.setAttribute('aria-label', f.l); inp.readOnly = !host; inp.value = el ? rd() : '';
          if (f.opts) {
            const id = `ed-dl-${S.id}-${ti}-${fi}`;
            if (!box.querySelector('#' + id)) { const dl = document.createElement('datalist'); dl.id = id; dl.innerHTML = f.opts.map(o => `<option value="${esc(o)}">`).join(''); box.appendChild(dl); }
            inp.setAttribute('list', id);
          }
          if (host) {
            inp.oninput = () => { f.full ? setFull(el, inp.value) : setV(el, inp.value); mark(S, S.els.indexOf(host)); };
            inp.onfocus = () => flash(S, el); S.refs.push({ rd, inp });
          }
          if (touchy) {
            // телефон: поле прокручивает свой текст и «крадёт» свайп у таблицы. Пока ячейка не выбрана,
            // она заперта (pointer-events:none), жест идёт сквозь неё; нажатие на обёртку включает правку
            const cell = document.createElement('div'); cell.className = 'ed-cell'; inp.style.pointerEvents = 'none'; cell.appendChild(inp);
            if (host) {
              inp.readOnly = true; inp.dataset.lock = '1';
              cell.addEventListener('click', () => { if (inp.readOnly) { inp.style.pointerEvents = ''; inp.readOnly = false; inp.focus(); } });
              inp.addEventListener('blur', () => { inp.readOnly = true; inp.style.pointerEvents = 'none'; });
            }
            row.appendChild(cell);
          } else row.appendChild(inp);
        });
        box.appendChild(row);
      });
      S.rows.appendChild(box);
    });
    if (!S.rows.children.length) S.rows.innerHTML = '<p class="ed-empty">В этом демо нет таблиц.</p>';
  }
  const sync = S => S.refs.forEach(({ rd, inp }) => { if (inp !== document.activeElement) inp.value = rd(); });

  function minimize(S) {
    S.pos = { x: g.getProperty(S.win, 'x'), y: g.getProperty(S.win, 'y') };
    S.min = true; S.chip.style.display = 'block'; S.root.style.pointerEvents = 'none'; lock(); persist(S);
    if (rm) return g.set([S.win, S.bd], { autoAlpha: 0 });
    g.to(S.kids, { autoAlpha: 0, duration: .15 }); g.to(S.bd, { autoAlpha: 0, duration: .35 });
    fly(S, S.chip.getBoundingClientRect(), { duration: .5, ease: 'power3.in', delay: .1, onComplete: () => g.set(S.win, { autoAlpha: 0 }) });
  }
  function restore(S) {
    S.min = false; S.chip.style.display = 'none'; S.root.style.pointerEvents = ''; lock(); dropDock(S.id); g.set(S.win, { autoAlpha: 1 });
    if (rm) return g.set([S.win, S.bd, S.kids], { autoAlpha: 1 });
    g.to(S.bd, { autoAlpha: 1, duration: .3 }); g.to(S.kids, { autoAlpha: 1, duration: .3, delay: .35 });
    S.win.style.willChange = 'transform';
    g.to(S.win, { x: S.pos.x, y: S.pos.y, scaleX: 1, scaleY: 1, force3D: true, duration: .6, ease: 'expo.out', onComplete: () => { S.win.style.willChange = ''; } });
  }
  const closeReq = S => { if (S.dirty) S.dlg.classList.add('on'); else doClose(S); };
  function doClose(S) {
    if (S.closing) return; S.closing = true;
    const fin = () => { S.root.remove(); S.chip.remove(); wins.delete(S.id); dropDock(S.id); lock(); };
    if (rm || S.min) return fin();
    // 1) контент гаснет, 2) тяжёлый iframe удаляется до полёта, 3) лёгкая оболочка летит обратно в обложку
    g.to(S.kids, { autoAlpha: 0, duration: .18, ease: 'power1.in', onComplete: () => {
      S.fr.remove(); g.to(S.bd, { autoAlpha: 0, duration: .45, delay: .1 });
      const r = document.contains(S.cover) ? S.cover.getBoundingClientRect() : null;
      r ? fly(S, r, { duration: .55, ease: 'power3.inOut', onComplete: fin }) : g.to(S.win, { autoAlpha: 0, duration: .3, onComplete: fin });
    } });
  }
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const S = [...wins.values()].reverse().find(s => !s.min); if (!S) return;
    S.dlg.classList.contains('on') ? S.dlg.classList.remove('on') : closeReq(S);
  });
  document.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) open(b); });
  const ro = (() => { try { const v = sessionStorage.getItem('titan-reopen'); sessionStorage.removeItem('titan-reopen'); return v; } catch (_) { return null; } })();
  readDocks().forEach(ghost);
  if (ro) { const en = readDocks().find(x => x.id === ro), b = document.querySelector(`[data-open="${ro}"]`); if (en && b) setTimeout(() => open(b, en), 500); }
})();
