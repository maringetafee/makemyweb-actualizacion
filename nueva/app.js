// MakeMyWeb — nueva web. Sin dependencias. Reveals, parallax y una animación propia por producto.
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer:fine)").matches;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  function track(event, params) {
    try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: event }, params || {})); } catch (e) {}
  }

  /* ---------- utilidades ---------- */
  function onVisible(el, cb, opts) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { cb(es[0].isIntersecting); }, opts || { threshold: 0.3 }).observe(el);
  }

  // Reproductor de guion en bucle: start()/stop() sin fugas de timers.
  function player(script) {
    var tok = 0, timers = [];
    function sleep(my) {
      return function (ms) {
        return new Promise(function (res, rej) {
          var t = setTimeout(function () { my === tok ? res() : rej(0); }, ms);
          timers.push(t);
        });
      };
    }
    return {
      start: function () {
        var my = ++tok;
        (async function () {
          try { while (my === tok) await script(sleep(my)); } catch (e) {}
        })();
      },
      stop: function () { tok++; timers.forEach(clearTimeout); timers = []; }
    };
  }

  /* ---------- palabras que suben ---------- */
  function splitWords(el) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var s = document.createElement("span");
            s.className = "w"; s.style.setProperty("--i", n++); s.textContent = part;
            frag.appendChild(s);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(el);
  }
  $$("[data-split]").forEach(function (el) {
    splitWords(el);
    if (el.getAttribute("data-split") === "load") {
      el.style.setProperty("--base", ".1s");
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("in"); }); });
    }
  });

  /* ---------- reveal ---------- */
  $$(".rv").forEach(function (el) {
    var sibs = $$(".rv", el.parentElement).filter(function (x) { return x.parentElement === el.parentElement; });
    if (sibs.length > 1) el.style.transitionDelay = (sibs.indexOf(el) % 4) * 80 + "ms";
  });
  var revealEls = $$(".rv, [data-split]:not([data-split=load])");
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (e) { e.classList.add("in"); });
  } else {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (e) { rio.observe(e); });
  }

  /* ---------- nav, menú, progreso, luz ---------- */
  var nav = $("#nav"), burger = $(".nav__burger"), menu = $("#menu");
  function setMenu(open) {
    menu.classList.toggle("open", open);
    menu.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { setMenu(!menu.classList.contains("open")); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("open")) { setMenu(false); burger.focus(); } });

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      nav.classList.toggle("scrolled", scrollY > 20);
      ticking = false;
    });
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  var links = $$(".nav__links a");
  if ("IntersectionObserver" in window) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = "#" + e.target.id;
        links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    ["soluciones", "webs", "proceso", "precios", "faq"].forEach(function (id) { var s = document.getElementById(id); if (s) sio.observe(s); });
  }

  /* ---------- parallax del hero ---------- */
  var hero = $(".hero"), stage = $(".hero__stage");
  $$(".hcard", stage).forEach(function (c) { c.style.setProperty("--d", c.getAttribute("data-depth") || 10); });
  if (fine && !reduced && hero && stage) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    var loop = function () {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      stage.style.setProperty("--ox", cx.toFixed(3)); stage.style.setProperty("--oy", cy.toFixed(3));
      raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002) ? requestAnimationFrame(loop) : 0;
    };
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    hero.addEventListener("pointerleave", function () { tx = ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
  }

  /* ---------- contadores ---------- */
  $$("[data-count]").forEach(function (el) {
    var target = +el.getAttribute("data-count"), suf = el.getAttribute("data-suffix") || "";
    if (reduced) { el.textContent = target + suf; return; }
    el.textContent = "0" + suf;
    onVisible(el, function (v) {
      if (!v || el._done) return; el._done = true;
      var t0 = performance.now();
      (function step(t) {
        var p = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e) + suf;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }, { threshold: 0.6 });
  });

  /* ---------- ondas de voz ---------- */
  function wave(el, n) {
    var bars = [];
    for (var i = 0; i < n; i++) { var b = document.createElement("i"); el.appendChild(b); bars.push(b); }
    return {
      tick: function (t, amp) {
        for (var i = 0; i < n; i++) {
          var v = Math.abs(Math.sin(t * 3.1 + i * 0.55)) * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + i * 1.7)));
          bars[i].style.height = (14 + 86 * v * amp) + "%";
        }
      },
      flat: function () { bars.forEach(function (b, i) { b.style.height = (24 + 55 * Math.abs(Math.sin(i * 0.6))) + "%"; }); }
    };
  }
  var heroWave = $("[data-wave=hero]") && wave($("[data-wave=hero]"), 16);
  var callWaveEl = $("[data-wave=call]");
  var callWave = callWaveEl && wave(callWaveEl, 46);
  if (heroWave) {
    if (reduced) heroWave.flat();
    else {
      var hw = null;
      onVisible(hero, function (v) {
        clearInterval(hw);
        if (v) { var t0 = performance.now(); hw = setInterval(function () { heroWave.tick((performance.now() - t0) / 1000, 1); }, 110); }
      }, { threshold: 0.05 });
    }
  }

  /* =======================================================
     DEMOS (cada una arranca al verse y para al salir)
     ======================================================= */
  var demos = {};

  /* 01 · automatizaciones: disparador → IA → 4 acciones */
  demos.flow = function (root) {
    var flow = $(".flow", root), nodes = $$(".node", flow);
    var trig = nodes[0], ia = nodes[1], outs = nodes.slice(2);
    function reset() {
      flow.classList.remove("s1", "s2");
      nodes.forEach(function (n) { n.classList.remove("hit"); });
      void flow.offsetWidth;
    }
    return {
      final: function () { nodes.forEach(function (n) { n.classList.add("hit"); }); },
      p: player(async function (w) {
        reset(); await w(700);
        trig.classList.add("hit"); await w(500);
        flow.classList.add("s1"); await w(850);
        ia.classList.add("hit"); await w(450);
        flow.classList.add("s2"); await w(750);
        for (var i = 0; i < outs.length; i++) { outs[i].classList.add("hit"); await w(260); }
        await w(3200);
      })
    };
  };

  /* 02 · chatbot de WhatsApp */
  demos.chat = function (root) {
    var body = $("[data-chat]", root), chip = $(".chip-float", root);
    var script = [
      ["out", "Hola 👋 ¿Tenéis mesa para 2 mañana a las 10:30?"],
      ["in", "¡Hola! Sí, mañana a las 10:30 hay mesa libre ☕ ¿A nombre de quién la reservo?"],
      ["out", "Lucía"],
      ["in", "Hecho, Lucía ✅ Mesa para 2, mañana 10:30. Te aviso por aquí un rato antes."]
    ];
    function clock() { var d = new Date(); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
    function add(who, text) {
      var m = document.createElement("div");
      m.className = "msg msg--" + who;
      m.innerHTML = "";
      m.appendChild(document.createTextNode(text));
      var s = document.createElement("small"); s.textContent = clock(); m.appendChild(s);
      body.appendChild(m);
      return m;
    }
    function typing() {
      var t = document.createElement("div");
      t.className = "msg msg--in typing"; t.innerHTML = "<span></span><span></span><span></span>";
      body.appendChild(t); return t;
    }
    return {
      final: function () { script.forEach(function (s) { add(s[0], s[1]); }); chip.classList.add("show"); },
      p: player(async function (w) {
        body.innerHTML = ""; chip.classList.remove("show");
        await w(900);
        for (var i = 0; i < script.length; i++) {
          var s = script[i];
          if (s[0] === "in") { var t = typing(); await w(1300); t.remove(); }
          else await w(600);
          add(s[0], s[1]);
          await w(s[0] === "out" ? 700 : 900);
        }
        chip.classList.add("show");
        await w(4200);
      })
    };
  };

  /* 03 · IA en llamadas */
  demos.call = function (root) {
    var timeEl = $("[data-call-time]", root), tr = $("[data-transcript]", root), done = $("[data-call-done]", root);
    var lines = [
      ["c", "Cliente", "Hola, quería reservar mesa para el jueves por la tarde."],
      ["ai", "Asistente IA", "¡Claro! El jueves tengo libre a las 17:30 y a las 19:00. ¿Cuál prefieres?"],
      ["c", "Cliente", "A las 17:30, somos tres."],
      ["ai", "Asistente IA", "Perfecto: mesa para tres, jueves a las 17:30. Te llega la confirmación por WhatsApp."]
    ];
    var t0 = 0, iv = null;
    function fmt(s) { return "0" + Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
    function addLine(l) {
      var li = document.createElement("li"); li.className = l[0];
      li.innerHTML = "<b></b><span></span>"; li.firstChild.textContent = l[1]; li.lastChild.textContent = l[2];
      tr.appendChild(li);
    }
    return {
      final: function () { lines.forEach(addLine); done.classList.add("show"); timeEl.textContent = "00:14"; callWave && callWave.flat(); },
      p: (function () {
        var pl = player(async function (w) {
          tr.innerHTML = ""; done.classList.remove("show");
          t0 = performance.now(); timeEl.textContent = "00:00";
          await w(800);
          for (var i = 0; i < lines.length; i++) { addLine(lines[i]); await w(2300); }
          done.classList.add("show");
          await w(4300);
        });
        return {
          start: function () {
            pl.start(); clearInterval(iv);
            iv = setInterval(function () {
              var s = (performance.now() - t0) / 1000;
              callWave && callWave.tick(s, 1);
              timeEl.textContent = fmt(Math.min(59, Math.floor(s)));
            }, 110);
          },
          stop: function () { pl.stop(); clearInterval(iv); }
        };
      })()
    };
  };

  /* 04 · sistema de reservas */
  demos.book = function (root) {
    var grid = $("[data-cal]", root), count = $("[data-cal-count]", root), toast = $("[data-cal-toast]", root);
    var names = ["Lucía", "Carlos", "Ana", "Marta", "Pablo", "Sara", "Iván", "Noe", "Paula", "Dani", "Eva", "Leo"];
    var slots = [];
    for (var i = 0; i < 20; i++) { var s = document.createElement("div"); s.className = "slot"; grid.appendChild(s); slots.push(s); }
    var order = [1, 4, 6, 7, 9, 10, 12, 13, 15, 17, 18, 3];
    function fill(k, i) { var s = slots[order[k]]; s.className = "slot full v" + (k % 4); s.textContent = names[i % names.length]; }
    function setCount(n) { count.textContent = n + (n === 1 ? " reserva" : " reservas"); }
    return {
      final: function () { order.forEach(function (_, k) { fill(k, k); }); setCount(order.length); },
      p: player(async function (w) {
        slots.forEach(function (s) { s.className = "slot"; s.textContent = ""; });
        toast.classList.remove("show"); setCount(0);
        await w(800);
        for (var k = 0; k < order.length; k++) {
          fill(k, k); setCount(k + 1); await w(420);
          if (k === 8) { toast.classList.add("show"); }
          if (k === 10) { toast.classList.remove("show"); }
        }
        await w(3800);
      })
    };
  };

  /* 05 · panel de gestión */
  demos.dash = function (root) {
    var dash = $(".dash", root), bars = $("[data-bars]", root), feed = $("[data-feed]", root);
    var ks = $$("[data-k]", root);
    var events = ["Nueva reserva · Lucía", "Pago recibido · 38 €", "Cliente nuevo · Carlos", "Reseña 5★ en Google", "Nueva reserva · Marta"];
    function setK(el, v) { el.textContent = (el.getAttribute("data-pre") || "") + Math.round(v) + (el.getAttribute("data-suf") || ""); }
    function countUp(dur) {
      var t0 = performance.now();
      return new Promise(function (res) {
        (function step(t) {
          var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
          ks.forEach(function (el) { setK(el, +el.getAttribute("data-k") * e); });
          if (p < 1 && dash._on) requestAnimationFrame(step); else res();
        })(t0);
      });
    }
    function addFeed(text, when) {
      var li = document.createElement("li");
      li.innerHTML = "<i></i><span></span><time></time>";
      li.children[1].textContent = text; li.children[2].textContent = when;
      feed.insertBefore(li, feed.firstChild);
      while (feed.children.length > 3) feed.removeChild(feed.lastChild);
    }
    return {
      final: function () { ks.forEach(function (el) { setK(el, +el.getAttribute("data-k")); }); bars.classList.add("go"); dash.classList.add("go"); events.slice(0, 3).forEach(function (e) { addFeed(e, "hoy"); }); },
      p: (function () {
        var pl = player(async function (w) {
          bars.classList.remove("go"); dash.classList.remove("go"); feed.innerHTML = "";
          ks.forEach(function (el) { setK(el, 0); });
          void dash.offsetWidth;
          await w(500);
          bars.classList.add("go"); dash.classList.add("go");
          countUp(1500);
          await w(1700);
          for (var i = 0; i < events.length; i++) { addFeed(events[i], "ahora"); await w(1500); }
          await w(2500);
        });
        return { start: function () { dash._on = true; pl.start(); }, stop: function () { dash._on = false; pl.stop(); } };
      })()
    };
  };

  /* 06 · base de datos */
  demos.db = function (root) {
    var tb = $("[data-db]", root), cnt = $("[data-db-count]", root), box = $(".db", root);
    var people = [["Lucía G.", "Corte y color"], ["Carlos R.", "Masaje"], ["Ana M.", "Manicura"], ["Marta P.", "Revisión"], ["Pablo S.", "Corte"], ["Sara L.", "Facial"], ["Iván T.", "Barba"]];
    var next = 0, total = 124, id = 101;
    function row(p, state) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td></td><td></td><td></td>";
      tr.children[0].textContent = "#" + id++; tr.children[1].textContent = p[0]; tr.children[2].textContent = p[1];
      setState(tr, state);
      return tr;
    }
    function setState(tr, ok) {
      tr.children[3].innerHTML = ok ? '<span class="st st--c">Confirmada</span>' : '<span class="st st--p">Pendiente</span>';
    }
    function setCount() { cnt.textContent = total + " filas"; }
    return {
      final: function () { tb.innerHTML = ""; for (var i = 0; i < 4; i++) tb.insertBefore(row(people[i], true), tb.firstChild); setCount(); box.classList.add("sync"); },
      p: player(async function (w) {
        if (!tb.children.length) { for (var i = 0; i < 3; i++) tb.insertBefore(row(people[(next++) % people.length], true), tb.firstChild); setCount(); }
        await w(1200);
        var tr = row(people[(next++) % people.length], false);
        tr.className = "new"; tb.insertBefore(tr, tb.firstChild);
        while (tb.children.length > 4) tb.removeChild(tb.lastChild);
        total++; setCount();
        await w(1100);
        setState(tr, true); box.classList.add("sync");
        await w(1400);
        box.classList.remove("sync");
        await w(900);
      })
    };
  };

  /* 07 · app móvil */
  demos.app = function (root) {
    var screens = $$(".scr", root), tabs = $$("[data-tabs] button", root), chip = $(".chip-float", root);
    var cur = 0, pausedUntil = 0;
    function go(i, tap) {
      if (i === cur && screens[i].classList.contains("on")) return;
      screens.forEach(function (s, k) {
        if (k === cur) { s.classList.remove("on"); s.classList.add("out"); }
        else if (k !== i) s.classList.remove("on", "out");
      });
      screens[i].classList.remove("out"); screens[i].classList.add("on");
      tabs.forEach(function (t, k) { t.classList.toggle("on", k === i); });
      if (tap) { tabs[i].classList.remove("tap"); void tabs[i].offsetWidth; tabs[i].classList.add("tap"); }
      chip.classList.toggle("show", i === 0 && !tap);
      cur = i;
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { pausedUntil = Date.now() + 7000; go(i, true); });
    });
    return {
      final: function () { go(0, false); },
      p: player(async function (w) {
        await w(1000);
        if (cur === 0) chip.classList.add("show");
        await w(2000);
        if (Date.now() < pausedUntil) return;
        var nx = (cur + 1) % screens.length;
        go(nx, true);
        await w(2300);
      })
    };
  };

  $$("[data-demo]").forEach(function (root) {
    var make = demos[root.getAttribute("data-demo")];
    if (!make) return;
    var d = make(root);
    if (reduced) { d.final(); return; }
    var p = d.p;
    onVisible(root, function (v) { v ? p.start() : p.stop(); }, { threshold: 0.35 });
  });

  /* ---------- formulario de contacto (mismo contrato que producción) ---------- */
  var ENDPOINT = "/.netlify/functions/notify-lead";
  function getRef() {
    try {
      var r = new URLSearchParams(location.search).get("ref");
      if (r) sessionStorage.setItem("mmw_ref", r.slice(0, 120));
      return sessionStorage.getItem("mmw_ref") || undefined;
    } catch (e) { return undefined; }
  }
  getRef();
  $$("[data-cta-form]").forEach(function (form) {
    var wrap = form.closest("[data-cta-form-wrap]") || form.parentElement;
    var button = $('button[type="submit"]', form);
    var label = button && $("[data-cta-form-label]", button);
    var note = $("[data-cta-form-note]", wrap), success = $("[data-cta-form-success]", wrap);
    var defaultLabel = label ? label.textContent : "", defaultNote = note ? note.innerHTML : "", sending = false;
    function val(n) { var el = form.elements[n]; return el && el.value ? el.value : undefined; }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      sending = true;
      if (label) label.textContent = "Enviando…";
      if (button) button.disabled = true;
      if (note) { note.classList.remove("form__error"); note.innerHTML = defaultNote; }
      fetch(ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: val("name"), business: val("business"), project: val("project"),
          contact: val("contact") || val("email") || val("phone"), message: val("message"),
          kind: form.getAttribute("data-kind") || undefined,
          phone: val("phone"), email: val("email"), ref: getRef()
        })
      }).then(function (res) {
        if (!res.ok) throw new Error("request failed");
        form.hidden = true;
        if (success) { success.hidden = false; success.focus(); }
        track("generate_lead", { form: form.getAttribute("data-kind") || "contacto", project: val("project") || "" });
      }).catch(function () {
        sending = false;
        if (label) label.textContent = defaultLabel;
        if (button) button.disabled = false;
        if (note) {
          note.classList.add("form__error");
          note.innerHTML = 'No se ha podido enviar. Escríbenos por <a href="https://wa.me/34689872320">WhatsApp</a> o a <a href="mailto:makemyweb.info@gmail.com">makemyweb.info@gmail.com</a>.';
        }
      });
    });
  });

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href");
    if (h.indexOf("wa.me") > -1) track("contact_whatsapp");
    else if (h.indexOf("tel:") === 0) track("contact_phone");
    else if (h.indexOf("mailto:") === 0) track("contact_email");
  });

  $$("[data-year]").forEach(function (e) { e.textContent = new Date().getFullYear(); });
})();
