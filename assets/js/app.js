/* ──────────────────────────────────────────────────────────────────
   The White Lotus · TCG
   Lecteur plein écran : une carte à la fois, glisser pour changer,
   toucher pour retourner, reflet holographique qui suit le doigt.
   Vanilla, aucune dépendance.
   ────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var grid = document.getElementById('grid');
  if (!grid) return;

  var BACK = document.body.dataset.back || '';

  /* Les cartes viennent du DOM : la grille reste l'unique source. */
  var CARDS = Array.prototype.map.call(
    grid.querySelectorAll('.tile'),
    function (t) { return { src: t.dataset.src, name: t.dataset.name }; }
  );
  if (!CARDS.length) return;

  var BOOSTER_SIZE = Math.min(5, CARDS.length);

  /* ── Construction du lecteur ─────────────────────────────────── */

  var viewer = document.createElement('div');
  viewer.className = 'viewer';
  viewer.id = 'viewer';
  viewer.hidden = true;
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', 'Carte en plein écran');
  viewer.innerHTML =
    '<div class="v-top">' +
      '<span class="v-count" id="vCount"></span>' +
      '<button class="v-close" id="vClose" type="button" aria-label="Fermer">&#10005;</button>' +
    '</div>' +
    '<div class="deck-wrap"><div class="deck" id="deck"></div></div>' +
    '<div class="v-bottom">' +
      '<div class="v-name" id="vName"></div>' +
      '<div class="v-hint" id="vHint"></div>' +
      '<div class="v-dots" id="vDots"></div>' +
    '</div>' +
    '<div class="booster-done" id="vDone">' +
      '<button type="button" data-act="again">Un autre booster</button>' +
      '<button type="button" data-act="close">Voir la collection</button>' +
    '</div>';
  document.body.appendChild(viewer);

  var deck    = viewer.querySelector('#deck');
  var elCount = viewer.querySelector('#vCount');
  var elName  = viewer.querySelector('#vName');
  var elHint  = viewer.querySelector('#vHint');
  var elDots  = viewer.querySelector('#vDots');
  var elDone  = viewer.querySelector('#vDone');

  /* ── État ────────────────────────────────────────────────────── */

  var list = [];          // cartes affichées dans le lecteur
  var index = 0;          // carte courante
  var booster = false;    // mode booster ?
  var revealed = [];      // cartes déjà révélées (mode booster)
  var open = false;
  var pushedState = false;

  /* ── Fabrique d'une carte ────────────────────────────────────── */

  function holoLayers() {
    return '<div class="holo holo-bands"></div>' +
           '<div class="holo holo-sparkle"></div>' +
           '<div class="holo holo-edge"></div>' +
           '<div class="holo holo-glare"></div>';
  }

  function makeSlide(card, faceDown) {
    var slide = document.createElement('div');
    slide.className = 'slide';
    slide.innerHTML =
      '<div class="card3d">' +
        '<div class="tilt">' +
          '<div class="flipper' + (faceDown ? ' flipped' : '') + '">' +
            '<div class="face front">' +
              '<img alt="' + escapeAttr(card.name) + '" decoding="async">' +
              holoLayers() +
            '</div>' +
            '<div class="face back">' +
              '<img src="' + escapeAttr(BACK) + '" alt="Dos de carte" decoding="async">' +
              holoLayers() +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    slide.querySelector('.face.front img').dataset.src = card.src;
    return slide;
  }

  function escapeAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Ne charge que la carte courante et ses voisines. */
  function loadAround(i) {
    var slides = deck.children;
    for (var k = Math.max(0, i - 1); k <= Math.min(slides.length - 1, i + 1); k++) {
      var img = slides[k].querySelector('.face.front img');
      if (img && !img.src && img.dataset.src) img.src = img.dataset.src;
    }
  }

  /* ── Ouverture / fermeture ───────────────────────────────────── */

  function build(cards, faceDown) {
    deck.innerHTML = '';
    var frag = document.createDocumentFragment();
    cards.forEach(function (c) { frag.appendChild(makeSlide(c, faceDown)); });
    deck.appendChild(frag);
  }

  function openViewer(cards, start, isBooster) {
    list = cards;
    booster = !!isBooster;
    revealed = list.map(function () { return !booster; });
    index = start || 0;

    build(list, booster);
    viewer.classList.toggle('booster', booster);
    elDone.classList.remove('show');

    // Points de progression : uniquement en booster.
    elDots.innerHTML = '';
    if (booster) {
      list.forEach(function () { elDots.appendChild(document.createElement('span')); });
    }

    viewer.hidden = false;
    document.body.classList.add('is-locked');
    open = true;
    // reflow puis fondu
    void viewer.offsetWidth;
    viewer.classList.add('is-open');

    sizeDeck();
    goTo(index, false);
    elHint.classList.remove('fade');

    if (!pushedState) {
      try { history.pushState({ wlViewer: true }, ''); pushedState = true; } catch (e) {}
    }
    viewer.querySelector('#vClose').focus({ preventScroll: true });
  }

  function closeViewer(fromPop) {
    if (!open) return;
    open = false;
    viewer.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    setTimeout(function () {
      if (!open) { viewer.hidden = true; deck.innerHTML = ''; }
    }, 280);
    if (pushedState && !fromPop) {
      pushedState = false;
      try { history.back(); } catch (e) {}
    } else if (fromPop) {
      pushedState = false;
    }
  }

  /* ── Dimensionnement ─────────────────────────────────────────── */
  /* La plus grande carte qui tienne entièrement à l'écran : on borne
     par la largeur ET par la hauteur disponibles.                    */

  var RATIO = 1000 / 1400;
  var wrap = viewer.querySelector('.deck-wrap');

  function sizeDeck() {
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    if (!w || !h) return;
    var cw = Math.min(w - 26, (h - 14) * RATIO);
    deck.style.setProperty('--cw', Math.max(120, Math.floor(cw)) + 'px');
  }

  /* ── Navigation ──────────────────────────────────────────────── */

  function goTo(i, animate) {
    index = Math.max(0, Math.min(list.length - 1, i));
    deck.classList.toggle('animate', animate !== false);
    deck.style.setProperty('--i', index);
    deck.style.setProperty('--dx', 0);
    loadAround(index);
    paint();
    resetTilt();
  }

  function paint() {
    var card = list[index];
    var shown = !booster || revealed[index];

    elName.textContent = shown ? card.name : ' ';
    elCount.innerHTML = booster
      ? 'Booster <em>&middot;</em> ' + (index + 1) + ' <em>/</em> ' + list.length
      : (index + 1) + ' <em>/</em> ' + list.length;

    if (booster) {
      elHint.textContent = shown ? 'Glissez pour la suivante' : 'Touchez pour révéler';
      Array.prototype.forEach.call(elDots.children, function (d, k) {
        d.className = k === index ? 'on' : (revealed[k] ? 'seen' : '');
      });
    } else {
      elHint.textContent = 'Touchez pour retourner · glissez pour changer';
    }

    // Le reflet n'est vivant que sur la carte à l'écran.
    Array.prototype.forEach.call(deck.children, function (s, k) {
      s.querySelector('.card3d').style.setProperty('--holo', k === index ? 0.32 : 0);
    });
  }

  function currentCard3d() {
    var s = deck.children[index];
    return s ? s.querySelector('.card3d') : null;
  }
  function currentTilt() {
    var s = deck.children[index];
    return s ? s.querySelector('.tilt') : null;
  }
  function currentFlipper() {
    var s = deck.children[index];
    return s ? s.querySelector('.flipper') : null;
  }

  /* ── Retournement / révélation ───────────────────────────────── */

  function flip() {
    var f = currentFlipper();
    if (!f) return;

    if (booster && !revealed[index]) {
      revealed[index] = true;
      f.classList.remove('flipped');
      flash();
      paint();
      if (revealed.every(Boolean)) {
        setTimeout(function () { elDone.classList.add('show'); }, 700);
      }
      return;
    }
    f.classList.toggle('flipped');
  }

  function flash() {
    var holder = currentCard3d();
    if (!holder) return;
    var el = document.createElement('div');
    el.className = 'flash';
    holder.appendChild(el);
    setTimeout(function () { el.remove(); }, 820);
  }

  /* ── Inclinaison + reflet ────────────────────────────────────── */

  var MAX_TILT = 11;

  function applyTilt(clientX, clientY, live) {
    var c3 = currentCard3d();
    var t = currentTilt();
    if (!c3 || !t) return;
    var r = c3.getBoundingClientRect();
    var px = (clientX - r.left) / r.width;
    var py = (clientY - r.top) / r.height;
    px = Math.max(0, Math.min(1, px));
    py = Math.max(0, Math.min(1, py));

    t.classList.toggle('live', !!live);
    t.style.setProperty('--ry', ((px - 0.5) * 2 * MAX_TILT).toFixed(2) + 'deg');
    t.style.setProperty('--rx', ((0.5 - py) * 2 * MAX_TILT).toFixed(2) + 'deg');
    t.style.setProperty('--sc', live ? 1.02 : 1);

    c3.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    c3.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    c3.style.setProperty('--holo', 1);
  }

  function resetTilt() {
    Array.prototype.forEach.call(deck.children, function (s, k) {
      var t = s.querySelector('.tilt');
      var c3 = s.querySelector('.card3d');
      t.classList.remove('live');
      t.style.setProperty('--rx', '0deg');
      t.style.setProperty('--ry', '0deg');
      t.style.setProperty('--sc', 1);
      c3.style.setProperty('--mx', '50%');
      c3.style.setProperty('--my', '50%');
      c3.style.setProperty('--holo', k === index ? 0.32 : 0);
    });
  }

  /* ── Gestes ──────────────────────────────────────────────────── */

  var pt = null;   // geste en cours

  deck.addEventListener('pointerdown', function (e) {
    if (!open || e.button > 0) return;
    pt = {
      id: e.pointerId,
      x0: e.clientX, y0: e.clientY,
      x: e.clientX, y: e.clientY,
      t0: Date.now(),
      axis: null,
      moved: 0
    };
    deck.classList.remove('animate');
    try { deck.setPointerCapture(e.pointerId); } catch (err) {}
    applyTilt(e.clientX, e.clientY, true);
  });

  deck.addEventListener('pointermove', function (e) {
    if (!open) return;

    // Survol souris : la carte suit le curseur.
    if (!pt) {
      if (e.pointerType === 'mouse') applyTilt(e.clientX, e.clientY, true);
      return;
    }
    if (e.pointerId !== pt.id) return;

    var dx = e.clientX - pt.x0;
    var dy = e.clientY - pt.y0;
    pt.x = e.clientX; pt.y = e.clientY;
    pt.moved = Math.max(pt.moved, Math.hypot(dx, dy));

    if (!pt.axis) {
      if (Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy) * 1.15) pt.axis = 'x';
      else if (Math.abs(dy) > 14) pt.axis = 'y';
    }

    if (pt.axis === 'x') {
      // On glisse la pile : la carte revient à plat.
      var lim = dx;
      if ((index === 0 && dx > 0) || (index === list.length - 1 && dx < 0)) lim = dx * 0.32;
      deck.style.setProperty('--dx', lim.toFixed(1));
      var t = currentTilt();
      if (t) {
        t.classList.add('live');
        t.style.setProperty('--rx', '0deg');
        t.style.setProperty('--ry', (lim / 26).toFixed(2) + 'deg');
        t.style.setProperty('--sc', 1);
      }
      elHint.classList.add('fade');
    } else if (pt.axis !== 'y') {
      applyTilt(e.clientX, e.clientY, true);
    }
  });

  function endGesture(e) {
    if (!pt || (e && e.pointerId !== pt.id)) return;
    var g = pt; pt = null;
    try { deck.releasePointerCapture(g.id); } catch (err) {}

    var dx = g.x - g.x0;
    var dt = Date.now() - g.t0;
    var vx = dx / Math.max(1, dt);          // px / ms
    var w = deck.getBoundingClientRect().width || window.innerWidth;

    if (g.axis === 'x') {
      var step = 0;
      if (dx < -w * 0.2 || vx < -0.45) step = 1;
      else if (dx > w * 0.2 || vx > 0.45) step = -1;
      deck.classList.add('animate');
      goTo(index + step, true);
      return;
    }

    // Tap franc : on retourne la carte.
    if (g.moved < 12 && dt < 400) {
      flip();
      elHint.classList.add('fade');
    }
    deck.classList.add('animate');
    deck.style.setProperty('--dx', 0);
    resetTilt();
  }

  deck.addEventListener('pointerup', endGesture);
  deck.addEventListener('pointercancel', endGesture);
  deck.addEventListener('pointerleave', function (e) {
    if (!pt && e.pointerType === 'mouse') resetTilt();
  });
  deck.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  deck.addEventListener('dragstart', function (e) { e.preventDefault(); });

  /* ── Commandes ───────────────────────────────────────────────── */

  grid.addEventListener('click', function (e) {
    var tile = e.target.closest('.tile');
    if (!tile) return;
    openViewer(CARDS.slice(), parseInt(tile.dataset.index, 10) || 0, false);
  });

  viewer.querySelector('#vClose').addEventListener('click', function () { closeViewer(); });

  elDone.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'again') openBooster();
    else closeViewer();
  });

  var boosterBtn = document.getElementById('boosterBtn');
  if (boosterBtn) boosterBtn.addEventListener('click', openBooster);

  function openBooster() {
    var pool = CARDS.slice();
    for (var i = pool.length - 1; i > 0; i--) {         // Fisher–Yates
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    openViewer(pool.slice(0, BOOSTER_SIZE), 0, true);
  }

  document.addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'Escape') { closeViewer(); }
    else if (e.key === 'ArrowRight') { deck.classList.add('animate'); goTo(index + 1, true); }
    else if (e.key === 'ArrowLeft')  { deck.classList.add('animate'); goTo(index - 1, true); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
  });

  window.addEventListener('popstate', function () {
    if (open) closeViewer(true);
  });

  function onResize() {
    if (!open) return;
    deck.classList.remove('animate');
    deck.style.setProperty('--dx', 0);
    sizeDeck();
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () { setTimeout(onResize, 120); });
})();
