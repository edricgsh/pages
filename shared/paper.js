/* ═══════════════════════════════════════════════════════════════════════════
   paper.js — companion to paper.css.

   Builds the left contents rail from the page's own sections, so an artifact
   never hand-writes nav markup. Also runs scrollspy, the small-screen rail
   toggle, and the ⛶ fullscreen button on every .figure.

   Authoring contract — the rail is generated from this:

     <body class="paper" data-title="AI VIDEO BOOTCAMP"
                         data-meta="FIELD HANDBOOK · AI VIDEOS TRACK
                                    11 MODULES · 9 LESSON GUIDES">
       <section class="mod" id="input-ladder" data-group="Foundations">
         <div class="mod-head">
           <span class="mod-num">01</span>
           <h2>The input ladder</h2>
           <span class="mod-source">AI Video Basics</span>
         </div>
         ...

   data-group starts a new rail group when it changes; sections without one
   land in a single ungrouped list. The number comes from .mod-num, or is
   assigned 01, 02, 03… in document order if absent. Rail label comes from
   data-nav on the section, else the <h2> text.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var body = document.body;
    if (!body.classList.contains('paper')) return;

    var sections = Array.prototype.slice.call(document.querySelectorAll('section.mod'));

    // ─── Contents rail ───────────────────────────────────────────────────
    if (sections.length) {
      var rail = document.createElement('nav');
      rail.className = 'rail';
      rail.setAttribute('aria-label', 'Contents');

      if (body.dataset.title) {
        var brand = document.createElement('p');
        brand.className = 'rail-brand';
        brand.textContent = body.dataset.title;
        rail.appendChild(brand);
      }
      if (body.dataset.meta) {
        var meta = document.createElement('p');
        meta.className = 'rail-meta';
        // Newlines in the attribute become line breaks in the rail.
        body.dataset.meta.split('\n').forEach(function (line, i) {
          if (i) meta.appendChild(document.createElement('br'));
          meta.appendChild(document.createTextNode(line.trim()));
        });
        rail.appendChild(meta);
      }

      var group = null, groupName = null, links = [];

      sections.forEach(function (sec, i) {
        if (!sec.id) sec.id = 'mod-' + (i + 1);

        var name = sec.dataset.group || '';
        if (!group || name !== groupName) {
          groupName = name;
          group = document.createElement('div');
          group.className = 'rail-group';
          if (name) {
            var label = document.createElement('p');
            label.className = 'rail-group-label';
            label.textContent = name;
            group.appendChild(label);
          }
          rail.appendChild(group);
        }

        var numEl = sec.querySelector('.mod-num');
        var num = numEl ? numEl.textContent.trim() : String(i + 1).padStart(2, '0');
        var h2 = sec.querySelector('.mod-head h2, h2');

        var a = document.createElement('a');
        a.className = 'rail-link';
        a.href = '#' + sec.id;
        a.innerHTML = '<span class="rail-num"></span><span class="rail-text"></span>';
        a.querySelector('.rail-num').textContent = num;
        a.querySelector('.rail-text').textContent =
          sec.dataset.nav || (h2 ? h2.textContent.trim() : 'Section ' + num);

        group.appendChild(a);
        links.push({ a: a, id: sec.id });
      });

      body.insertBefore(rail, body.firstChild);

      var scrim = document.createElement('div');
      scrim.className = 'rail-scrim';
      rail.parentNode.insertBefore(scrim, rail.nextSibling);

      var toggle = document.createElement('button');
      toggle.className = 'rail-toggle';
      toggle.type = 'button';
      toggle.textContent = 'Contents';
      body.appendChild(toggle);

      function closeRail() { rail.classList.remove('is-open'); }
      toggle.addEventListener('click', function () { rail.classList.toggle('is-open'); });
      scrim.addEventListener('click', closeRail);
      rail.addEventListener('click', function (e) {
        if (e.target.closest('.rail-link')) closeRail();
      });

      // ─── Scrollspy ─────────────────────────────────────────────────────
      // Track every section's position and light up the last one whose top
      // has passed the reading line — steadier than reacting to lone
      // intersection events when sections are shorter than the viewport.
      var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab[href^="#"]'));
      var current = null;

      function spy() {
        var line = window.innerHeight * 0.28;
        var active = links[0] && links[0].id;
        for (var i = 0; i < links.length; i++) {
          var el = document.getElementById(links[i].id);
          if (el && el.getBoundingClientRect().top <= line) active = links[i].id;
        }
        if (active === current) return;
        current = active;

        links.forEach(function (l) { l.a.classList.toggle('is-active', l.id === active); });
        tabs.forEach(function (t) {
          t.classList.toggle('is-active', t.getAttribute('href') === '#' + active);
        });

        var on = rail.querySelector('.rail-link.is-active');
        if (on && rail.scrollHeight > rail.clientHeight) {
          var top = on.offsetTop, bottom = top + on.offsetHeight;
          if (top < rail.scrollTop || bottom > rail.scrollTop + rail.clientHeight) {
            rail.scrollTop = top - rail.clientHeight / 2;
          }
        }
      }

      var queued = false;
      function onScroll() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () { queued = false; spy(); });
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      spy();
    }

    // ─── Fullscreen toggle on figures ────────────────────────────────────
    document.querySelectorAll('.figure').forEach(function (fig) {
      if (fig.querySelector('.figure-fs')) return;
      var btn = document.createElement('button');
      btn.className = 'figure-fs';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Toggle fullscreen');
      btn.textContent = '⛶';
      btn.addEventListener('click', function () { fig.classList.toggle('fullscreen'); });
      fig.appendChild(btn);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = document.querySelector('.figure.fullscreen');
      if (open) open.classList.remove('fullscreen');
    });
  });
})();
