/* Nuvole Di Pelo — script del sito (nessun cookie, nessun tracciamento) */
(function () {
  'use strict';

  var WA_NUMBER = '393280636405';
  var GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var GIORNI_BREVI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto',
    'settembre', 'ottobre', 'novembre', 'dicembre'];

  // Orari in minuti dalla mezzanotte (fonte: scheda Google, ottobre 2026)
  var CONTINUATO = [540, 1140]; // 9:00-19:00
  var ORARI = {
    0: [],
    1: [CONTINUATO],
    2: [CONTINUATO],
    3: [CONTINUATO],
    4: [CONTINUATO],
    5: [CONTINUATO],
    6: [CONTINUATO]
  };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- ora italiana (Europe/Rome) ---------- */
  function oraDiRoma() {
    var d = new Date();
    try {
      var parti = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Rome', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23'
      }).formatToParts(d);
      var p = {};
      parti.forEach(function (x) { p[x.type] = x.value; });
      var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
      var h = parseInt(p.hour, 10) % 24;
      if (wd >= 0) {
        return { y: +p.year, m: +p.month, d: +p.day, h: h, min: +p.minute, wd: wd };
      }
    } catch (e) { /* browser senza fusi orari: uso l'ora del dispositivo */ }
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), min: d.getMinutes(), wd: d.getDay() };
  }

  /* ---------- festività (orari da verificare col titolare) ---------- */
  function pasqua(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mese = Math.floor((h + l - 7 * m + 114) / 31), giorno = ((h + l - 7 * m + 114) % 31) + 1;
    return { m: mese, d: giorno };
  }

  // 4 ottobre: festa nazionale dal 2026 (legge 151/2025). 4 settembre: Santa Rosa, patrona di Viterbo.
  var FESTE = {
    '1-1': 'Capodanno', '1-6': 'Epifania', '4-25': 'Festa della Liberazione', '5-1': 'Festa del lavoro',
    '6-2': 'Festa della Repubblica', '8-15': 'Ferragosto', '9-4': 'Santa Rosa, patrona di Viterbo',
    '10-4': 'San Francesco, patrono d’Italia', '11-1': 'Ognissanti', '12-8': 'Immacolata',
    '12-25': 'Natale', '12-26': 'Santo Stefano'
  };

  function festa(y, m, d) {
    if (FESTE[m + '-' + d]) return FESTE[m + '-' + d];
    var p = pasqua(y);
    var lunedi = new Date(Date.UTC(y, p.m - 1, p.d + 1));
    if (lunedi.getUTCMonth() + 1 === m && lunedi.getUTCDate() === d) return 'Lunedì dell’Angelo';
    return null;
  }

  function hhmm(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* giorno di calendario k giorni dopo "now" */
  function dopo(now, k) {
    var dt = new Date(Date.UTC(now.y, now.m - 1, now.d + k));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
  }

  /* ---------- aperto / chiuso ---------- */
  function statoApertura(now) {
    var t = now.h * 60 + now.min;
    var nomeFesta = festa(now.y, now.m, now.d);
    if (nomeFesta) {
      return {
        state: 'holiday', short: 'Oggi festivo', title: 'Oggi è festivo',
        sub: nomeFesta + ': gli orari possono variare, meglio chiamare prima.',
        line: 'Oggi è festivo: meglio chiamare prima'
      };
    }
    var oggi = ORARI[now.wd];
    for (var i = 0; i < oggi.length; i++) {
      if (t >= oggi[i][0] && t < oggi[i][1]) {
        var resta = oggi[i][1] - t;
        var sub = resta <= 30
          ? 'Chiude tra ' + resta + (resta === 1 ? ' minuto' : ' minuti') + ', alle ' + hhmm(oggi[i][1]) + '.'
          : 'Chiude alle ' + hhmm(oggi[i][1]) + '.';
        return { state: 'open', short: 'Aperto ora', title: 'Aperto ora', sub: sub, line: 'Aperto ora · ' + sub.replace(/\.$/, '').replace(/^C/, 'c') };
      }
    }
    var quando = null;
    for (var j = 0; j < oggi.length; j++) {
      if (oggi[j][0] > t) { quando = 'oggi alle ' + hhmm(oggi[j][0]); break; }
    }
    if (!quando) {
      for (var k = 1; k <= 9; k++) {
        var g = dopo(now, k);
        if (festa(g.y, g.m, g.d)) continue;
        if (ORARI[g.wd].length) {
          quando = (k === 1 ? 'domani' : GIORNI[g.wd]) + ' alle ' + hhmm(ORARI[g.wd][0][0]);
          break;
        }
      }
    }
    var testo = 'Riapre ' + (quando || 'presto') + '.';
    return { state: 'closed', short: 'Chiuso ora', title: 'Chiuso ora', sub: testo, line: 'Chiuso ora · riapre ' + (quando || 'presto') };
  }

  function aggiornaStato() {
    var now = oraDiRoma();
    var s = statoApertura(now);
    $$('[data-status]').forEach(function (el) {
      el.setAttribute('data-state', s.state);
      var a = $('[data-status-short]', el); if (a) a.textContent = s.short;
      var b = $('[data-status-title]', el); if (b) b.textContent = s.title;
      var c = $('[data-status-line]', el); if (c) c.textContent = s.line;
    });
    var pill = $('.status-pill');
    if (pill) pill.setAttribute('aria-label', s.title + '. ' + s.sub + ' Vai agli orari.');
    var sub = $('[data-status-sub]'); if (sub) sub.textContent = s.sub;
    $$('.hours tr').forEach(function (tr) {
      tr.classList.toggle('is-today', +tr.getAttribute('data-day') === now.wd);
    });
    return now;
  }

  /* ---------- consiglio di stagione ---------- */
  function aggiornaStagione(now) {
    var box = $('[data-season]');
    if (!box) return;
    var md = now.m * 100 + now.d;
    var fase;
    if (md >= 1201 && md <= 1224) fase = 'feste';
    else if (md >= 921 && md <= 1130) fase = 'autunno';
    else if (md >= 321 && md <= 620) fase = 'primavera';
    else if (md >= 621 && md <= 920) fase = 'estate';
    else fase = 'inverno';

    var t = {
      autunno: {
        label: 'Consiglio d’autunno',
        tip: 'In autunno molti cani cambiano il pelo: spazzolarli con regolarità aiuta a togliere quello morto e a prevenire i nodi.',
        cta: 'Prenota una spazzolatura', preset: 'spazzolatura'
      },
      primavera: {
        label: 'Consiglio di primavera',
        tip: 'In primavera molti cani cambiano il pelo: spazzolarli con regolarità aiuta a togliere quello morto e a prevenire i nodi.',
        cta: 'Prenota una spazzolatura', preset: 'spazzolatura'
      },
      estate: {
        label: 'Consiglio d’estate',
        tip: 'Prima delle vacanze, un bagno e una sistemata al pelo: prenota per tempo se ti serve un giorno preciso.',
        cta: 'Prenota bagno e taglio', preset: 'bagno,taglio'
      },
      feste: {
        label: 'In vista delle feste',
        tip: 'Vuoi il tuo cane in ordine per le feste? Se ti serve un giorno preciso, prenota con un po’ di anticipo.',
        cta: 'Prenota la toelettatura', preset: 'bagno'
      },
      inverno: {
        label: 'Consiglio d’inverno',
        tip: 'Tra pioggia e fango, un bagno con asciugatura completa rimette in ordine il pelo.',
        cta: 'Prenota un bagno', preset: 'bagno'
      }
    }[fase];

    var l = $('[data-season-label]', box); if (l) l.textContent = t.label;
    var p = $('[data-season-tip]', box); if (p) p.textContent = t.tip;
    var c = $('[data-season-cta]', box); if (c) c.textContent = t.cta;
    var a = $('[data-season-link]', box); if (a) a.setAttribute('data-preset', t.preset);
  }

  /* ---------- messaggio WhatsApp ---------- */
  function pulisci(s) {
    return String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* i prossimi giorni di apertura al posto dei nomi dei giorni */
  function preparaGiorni(now) {
    var box = $('[data-days]');
    if (!box) return;
    var t = now.h * 60 + now.min;
    var html = '<label class="chip"><input type="radio" name="giorno" value="" checked><span>Indifferente</span></label>';
    var n = 0;
    for (var k = 0; k <= 14 && n < 6; k++) {
      var g = dopo(now, k);
      if (!ORARI[g.wd].length || festa(g.y, g.m, g.d)) continue;
      if (k === 0 && t > ORARI[g.wd][0][1] - 120) continue; // oggi solo se mancano almeno 2 ore alla chiusura
      var esteso = GIORNI[g.wd] + ' ' + g.d + ' ' + MESI[g.m - 1];
      var etichetta = k === 0 ? 'Oggi' : k === 1 ? 'Domani' : GIORNI_BREVI[g.wd] + ' ' + g.d;
      var valore = (k === 0 ? 'oggi, ' : k === 1 ? 'domani, ' : '') + esteso;
      html += '<label class="chip"><input type="radio" name="giorno" value="' + valore + '"><span>' + etichetta + '</span></label>';
      n++;
    }
    box.innerHTML = html;
  }

  var builder = null;

  function initBuilder() {
    var box = $('[data-builder]');
    if (!box) return;
    var preview = $('[data-preview]', box);
    var link = $('[data-wa-link]', box);
    var tagliaBox = $('[data-taglia]', box);
    var hint = $('[data-hint-animale]', box);
    var razza = $('#razza', box);
    var razzaLabel = $('[data-razza-label]', box);
    var altro = $('#altro', box);

    function valore(name, def) {
      var el = $('input[name="' + name + '"]:checked', box);
      return el ? el.value : def;
    }
    function valori(name) {
      return $$('input[name="' + name + '"]:checked', box).map(function (el) { return el.value; });
    }

    function componi() {
      var animale = valore('animale', 'cane');
      var isCane = animale === 'cane';
      tagliaBox.hidden = !isCane;
      hint.hidden = isCane;
      razzaLabel.firstChild.nodeValue = animale === 'altro' ? 'Che animale è? ' : 'Razza ';
      razza.placeholder = animale === 'altro' ? 'es. coniglio' : animale === 'gatto' ? 'es. persiano, europeo' : 'es. barboncino, lagotto, meticcio';

      var righe = [];
      if (isCane) righe.push('Ciao! Vorrei prenotare una toelettatura per il mio cane.');
      else if (animale === 'gatto') righe.push('Ciao! Vorrei sapere se è possibile prenotare una toelettatura per il mio gatto.');
      else righe.push('Ciao! Vorrei sapere se è possibile prenotare una toelettatura per il mio animale.');

      var taglia = isCane ? valore('taglia', '') : '';
      var r = pulisci(razza.value);
      var dettagli = [];
      if (taglia) dettagli.push('taglia ' + taglia);
      if (r) dettagli.push((animale === 'altro' ? 'è un ' : 'razza ') + r);
      if (dettagli.length) righe.push(dettagli.join(', ').replace(/^./, function (c) { return c.toUpperCase(); }) + '.');

      var servizi = valori('servizio');
      var consiglio = servizi.indexOf('consiglio') !== -1;
      servizi = servizi.filter(function (s) { return s !== 'consiglio'; });
      if (servizi.length) righe.push((servizi.length > 1 ? 'Servizi: ' : 'Servizio: ') + servizi.join(', ') + '.');
      if (consiglio) righe.push(servizi.length ? 'Mi serve anche un consiglio.' : 'Vorrei un consiglio su cosa fare.');

      var giorno = valore('giorno', '');
      var fascia = valore('fascia', '');
      if (giorno && fascia) righe.push('Giorno preferito: ' + giorno + ', ' + fascia + '.');
      else if (giorno) righe.push('Giorno preferito: ' + giorno + '.');
      else if (fascia) righe.push('Preferirei passare ' + fascia + '.');

      var note = valori('nota');
      var testoNote = pulisci(altro.value);
      if (note.length || testoNote) {
        var n = note.length ? note.join(', ') + '.' : '';
        if (testoNote && !/[.!?]$/.test(testoNote)) testoNote += '.';
        righe.push('Note: ' + (n ? n + (testoNote ? ' ' : '') : '') + testoNote);
      }
      righe.push('Grazie!');

      var testo = righe.join('\n');
      preview.textContent = testo;
      link.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(testo);
    }

    function preset(lista) {
      var vuoi = String(lista || '').split(',');
      $$('input[name="servizio"]', box).forEach(function (el) {
        el.checked = vuoi.some(function (v) { return v && el.value.indexOf(v) === 0; });
      });
      componi();
    }

    box.addEventListener('input', componi);
    box.addEventListener('change', componi);
    componi();
    builder = { preset: preset, componi: componi };

    $$('[data-preset]').forEach(function (a) {
      a.addEventListener('click', function () { preset(a.getAttribute('data-preset')); });
    });
  }

  /* ---------- menu del telefono ---------- */
  function initMenu() {
    var dlg = $('#menu');
    var apri = $('[data-menu-open]');
    if (!dlg || !apri) return;
    if (typeof dlg.showModal !== 'function') {
      apri.addEventListener('click', function () { location.hash = '#orari'; });
      return;
    }
    apri.addEventListener('click', function () {
      dlg.showModal();
      apri.setAttribute('aria-expanded', 'true');
    });
    dlg.addEventListener('close', function () { apri.setAttribute('aria-expanded', 'false'); });
    $('[data-menu-close]', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
    $$('a[href^="#"]', dlg).forEach(function (a) {
      a.addEventListener('click', function () { dlg.close(); });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1000 && dlg.open) dlg.close();
    });
  }

  /* ---------- intestazione al primo scorrimento ---------- */
  function initHeader() {
    var header = $('[data-header]');
    if (!header) return;
    var ticking = false;
    function check() {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(check); }
    }, { passive: true });
    check();
  }

  /* ---------- comparsa dei blocchi ---------- */
  function initReveal() {
    var items = $$('[data-reveal]');
    var ridotto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ridotto || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  }

  function init() {
    var now = aggiornaStato();
    aggiornaStagione(now);
    preparaGiorni(now);
    var anno = $('[data-year]'); if (anno) anno.textContent = String(now.y);
    initBuilder();
    initMenu();
    initHeader();
    initReveal();
    window.setInterval(function () { aggiornaStagione(aggiornaStato()); }, 60000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) aggiornaStagione(aggiornaStato());
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
