/* Huisartsenpraktijk Smits & Canoy — interactie */
(function () {
  "use strict";

  var BASE = window.SITE_BASE || "";

  function opslaan(sleutel, waarde) {
    try { localStorage.setItem(sleutel, waarde); } catch (e) { /* opslag niet beschikbaar */ }
  }
  function ophalen(sleutel) {
    try { return localStorage.getItem(sleutel); } catch (e) { return null; }
  }

  /* ---------- Mobiel menu ---------- */
  var header = document.querySelector(".site-header");
  var menuKnop = document.querySelector(".menu-toggle");
  if (menuKnop && header) {
    menuKnop.addEventListener("click", function () {
      var open = header.classList.toggle("menu-open");
      menuKnop.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  document.querySelectorAll(".sub-toggle").forEach(function (knop) {
    knop.addEventListener("click", function () {
      var li = knop.closest("li");
      var open = li.classList.toggle("sub-open");
      knop.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ---------- Tekst vergroten ---------- */
  var html = document.documentElement;
  var stappen = ["0", "1", "2"];
  function zetGrootte(stap) {
    if (stap === "0") html.removeAttribute("data-tekstgrootte");
    else html.setAttribute("data-tekstgrootte", stap);
    document.querySelectorAll("[data-vergroten-tekst]").forEach(function (el) {
      el.textContent = stap === "2" ? "Tekst normaal maken" : "Deze tekst vergroten";
    });
  }
  var bewaard = ophalen("tekstgrootte");
  if (bewaard && stappen.indexOf(bewaard) > -1) zetGrootte(bewaard);
  document.querySelectorAll("[data-vergroten]").forEach(function (knop) {
    knop.addEventListener("click", function () {
      var huidig = html.getAttribute("data-tekstgrootte") || "0";
      var volgende = stappen[(stappen.indexOf(huidig) + 1) % stappen.length];
      zetGrootte(volgende);
      opslaan("tekstgrootte", volgende);
    });
  });

  /* ---------- Voorlezen (spraak van de browser, geen externe dienst) ---------- */
  var spraak = window.speechSynthesis;
  var voorleesKnoppen = document.querySelectorAll("[data-voorlezen]");
  function zetVoorleesStatus(aan) {
    voorleesKnoppen.forEach(function (knop) {
      knop.setAttribute("aria-pressed", aan ? "true" : "false");
      var t = knop.querySelector("[data-voorlezen-tekst]");
      if (t) t.textContent = aan ? "Stop met voorlezen" : "Deze tekst voorlezen";
    });
  }
  // Geeft de tekst terug als lijst van regels (koppen, alinea's, lijstitems)
  function voorleesRegels() {
    var delen = document.querySelectorAll("[data-voorleestekst]");
    if (!delen.length) delen = [document.querySelector("main")];
    var regels = [];
    delen.forEach(function (deel) {
      var kopie = deel.cloneNode(true);
      kopie.querySelectorAll("script, style, .geen-voorlezen, .sr-only").forEach(function (el) { el.remove(); });
      kopie.innerText.split(/\n+/).forEach(function (r) {
        r = r.replace(/\s+/g, " ").trim();
        if (r) regels.push(r);
      });
    });
    return regels;
  }
  // Lange regels in stukjes, anders stoppen sommige browsers halverwege
  // (online stemmen in Chrome stoppen na ca. 15 seconden)
  function knipRegel(regel) {
    var zinnen = regel.match(/[^.!?]+[.!?]*/g) || [regel];
    var stukken = [], huidig = "";
    zinnen.forEach(function (z) {
      if ((huidig + z).length > 160) { if (huidig) stukken.push(huidig.trim()); huidig = z; }
      else huidig += z;
    });
    if (huidig.trim()) stukken.push(huidig.trim());
    return stukken;
  }
  // Nederlandse stem (nl-NL), nooit Vlaams (nl-BE).
  // Stemmen die op het apparaat zelf staan gaan voor online stemmen (zoals
  // "Google Nederlands"): valt een online stem weg, dan schakelt de browser
  // ongemerkt over op de standaardstem, en dat is vaak Engels.
  var VOORKEURSTEMMEN = /xander|claire|fleur|colette|maarten|hanna|frank|fenna/i;
  function nederlandseStemmen(taal) {
    return spraak.getVoices().filter(function (v) { return taal.test(v.lang); });
  }
  function kiesStem() {
    var stemmen = nederlandseStemmen(/^nl[-_]NL$/i);
    // Alleen als er geen stem uit Nederland is: dan liever Vlaams dan Engels
    if (!stemmen.length) stemmen = nederlandseStemmen(/^nl/i);
    function score(v) {
      return (v.localService ? 2 : 0) + (VOORKEURSTEMMEN.test(v.name) ? 1 : 0);
    }
    stemmen.sort(function (a, b) { return score(b) - score(a); });
    return stemmen[0] || null;
  }
  // Chrome geeft na het opstarten eerst alleen zijn online stemmen (zoals
  // "Google Nederlands") en pas enkele seconden later de stemmen van het
  // apparaat zelf. Daarom wachten tot die er zijn (max. 10 seconden), zodat
  // Chrome dezelfde stem gebruikt als Safari. De gekozen stem blijft tijdens
  // het hele voorlezen hetzelfde.
  function wachtOpStem() {
    return new Promise(function (klaar) {
      var start = Date.now();
      (function probeer() {
        var apparaatStemmenGeladen = spraak.getVoices().some(function (v) { return v.localService; });
        if (apparaatStemmenGeladen || Date.now() - start > 10000) return klaar(kiesStem());
        setTimeout(probeer, 100);
      })();
    });
  }
  // Dezelfde stem opnieuw opzoeken (de browser kan zijn lijst verversen)
  function zelfdeStem(stem) {
    return spraak.getVoices().filter(function (v) { return v.voiceURI === stem.voiceURI; })[0] || stem;
  }
  var PAUZE_TUSSEN_REGELS = 1000; // milliseconden
  var SPREEKTEMPO = 0.85;         // 1 = normaal
  var voorleesRonde = 0, bezigMetVoorlezen = false, pauzeTimer = null;
  var huidigeUitspraak = null; // referentie bewaren, anders slaat Chrome soms het einde-signaal over
  function stopVoorlezen() {
    voorleesRonde++;
    bezigMetVoorlezen = false;
    clearTimeout(pauzeTimer);
    spraak.cancel();
    zetVoorleesStatus(false);
  }
  if (!spraak) {
    voorleesKnoppen.forEach(function (knop) { knop.hidden = true; });
  } else {
    spraak.getVoices(); // laat de browser de stemmen alvast laden
    voorleesKnoppen.forEach(function (knop) {
      knop.addEventListener("click", function () {
        if (bezigMetVoorlezen) { stopVoorlezen(); return; }
        spraak.cancel();
        var ronde = ++voorleesRonde;
        bezigMetVoorlezen = true;
        zetVoorleesStatus(true);

        // Alle stukjes op een rij; na het laatste stukje van een regel volgt een pauze
        var stukken = [];
        voorleesRegels().forEach(function (regel) {
          var delen = knipRegel(regel);
          delen.forEach(function (tekst, i) {
            stukken.push({ tekst: tekst, pauzeNa: i === delen.length - 1 });
          });
        });

        // Eén stukje tegelijk; de stem wordt per stukje opnieuw gekozen, zodat
        // hij niet wegvalt als de browser halverwege zijn stemmenlijst ververst
        function spreek(n, stem) {
          if (ronde !== voorleesRonde) return;
          if (n >= stukken.length) { stopVoorlezen(); return; }
          var u = new SpeechSynthesisUtterance(stukken[n].tekst);
          // Tijdens het voorlezen steeds dezelfde stem, nooit halverwege wisselen
          stem = zelfdeStem(stem);
          u.voice = stem;
          u.lang = stem.lang;
          u.rate = SPREEKTEMPO;
          u.onend = function () {
            if (ronde !== voorleesRonde) return;
            if (stukken[n].pauzeNa) pauzeTimer = setTimeout(function () { spreek(n + 1, stem); }, PAUZE_TUSSEN_REGELS);
            else spreek(n + 1, stem);
          };
          u.onerror = u.onend;
          huidigeUitspraak = u;
          spraak.speak(u);
        }
        wachtOpStem().then(function (stem) {
          if (ronde !== voorleesRonde) return;
          if (!stem) {
            stopVoorlezen();
            alert("Voorlezen lukt niet: op dit apparaat is geen Nederlandse stem gevonden. " +
              "U kunt een Nederlandse stem toevoegen in de instellingen van uw computer of telefoon.");
            return;
          }
          // Korte pauze na cancel(), anders vergeet Chrome op de Mac soms de gekozen stem
          pauzeTimer = setTimeout(function () { spreek(0, stem); }, 150);
        });
      });
    });
    window.addEventListener("beforeunload", function () { spraak.cancel(); });
  }

  /* ---------- Zoeken ---------- */
  var index = null;
  function laadIndex() {
    if (index) return Promise.resolve(index);
    return fetch(BASE + "/zoekindex.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { index = data; return data; });
  }
  function normaliseer(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function zoek(vraag) {
    var woorden = normaliseer(vraag).split(/\s+/).filter(Boolean);
    if (!woorden.length) return [];
    return index.map(function (item) {
      var titel = normaliseer(item.titel), tekst = normaliseer(item.tekst);
      var score = 0;
      for (var i = 0; i < woorden.length; i++) {
        var w = woorden[i];
        var inTitel = titel.indexOf(w) > -1, inTekst = tekst.indexOf(w) > -1;
        if (!inTitel && !inTekst) return null;
        score += (inTitel ? 10 : 0) + (inTekst ? 1 : 0);
      }
      return { item: item, score: score };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).map(function (r) { return r.item; });
  }
  function fragment(tekst, vraag) {
    var w = normaliseer(vraag).split(/\s+/)[0] || "";
    var pos = normaliseer(tekst).indexOf(w);
    var start = Math.max(0, pos - 60);
    return (start > 0 ? "… " : "") + tekst.substr(start, 180) + "…";
  }
  function escape(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var zoekveld = document.getElementById("zoekveld");
  var suggesties = document.querySelector(".zoek-suggesties");
  if (zoekveld && suggesties) {
    var timer;
    zoekveld.addEventListener("input", function () {
      clearTimeout(timer);
      var vraag = zoekveld.value.trim();
      if (vraag.length < 2) { suggesties.hidden = true; return; }
      timer = setTimeout(function () {
        laadIndex().then(function () {
          var res = zoek(vraag).slice(0, 6);
          suggesties.innerHTML = res.length
            ? res.map(function (r) { return '<a href="' + BASE + r.url + '">' + escape(r.titel) + "<small>" + escape(r.sectie || "") + "</small></a>"; }).join("")
            : '<p class="leeg">Geen resultaten gevonden.</p>';
          suggesties.hidden = false;
        });
      }, 150);
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".zoekformulier")) suggesties.hidden = true;
    });
    zoekveld.addEventListener("keydown", function (e) {
      if (e.key === "Escape") suggesties.hidden = true;
    });
  }

  var resultatenLijst = document.querySelector("[data-zoekresultaten]");
  if (resultatenLijst) {
    var vraag = new URLSearchParams(location.search).get("q") || "";
    var kop = document.querySelector("[data-zoekvraag]");
    if (kop) kop.textContent = vraag ? "Resultaten voor “" + vraag + "”" : "Typ een zoekterm in het zoekveld bovenaan.";
    if (zoekveld) zoekveld.value = vraag;
    if (vraag) {
      laadIndex().then(function () {
        var res = zoek(vraag);
        resultatenLijst.innerHTML = res.length
          ? res.map(function (r) { return '<li><a href="' + BASE + r.url + '">' + escape(r.titel) + "</a><p>" + escape(fragment(r.tekst, vraag)) + "</p></li>"; }).join("")
          : "<li>Er zijn geen pagina’s gevonden. Probeer een ander woord, of bel ons op 0184 – 61 22 68.</li>";
      });
    }
  }

  /* ---------- Zelftests ---------- */
  function getal(id) {
    var el = document.getElementById(id);
    return el ? parseFloat(String(el.value).replace(",", ".")) : NaN;
  }
  function toon(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  var bmiForm = document.getElementById("test-bmi");
  if (bmiForm) {
    bmiForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var kg = getal("bmi-gewicht"), cm = getal("bmi-lengte");
      if (!(kg > 0) || !(cm > 0)) { document.getElementById("uitslag-bmi").className = "uitslag"; toon("uitslag-bmi", "Vul uw gewicht en lengte in."); return; }
      var bmi = kg / Math.pow(cm / 100, 2);
      var groep, advies;
      if (bmi < 18.5) { groep = ["onder", "Ondergewicht"]; advies = "Met een BMI lager dan 18,5 behoort u tot de groep mensen met een mogelijk verhoogd gezondheidsrisico door ondergewicht. Zorg ervoor dat uw gewicht niet verder afneemt. Probeer uw eetpatroon aan te passen. U kunt natuurlijk altijd uw huisarts raadplegen voor advies."; }
      else if (bmi < 25) { groep = ["normaal", "Normaal gewicht"]; advies = "Uw BMI is tussen 18,5 en 25. U heeft geen overgewicht. Er zijn geen medische redenen om af te vallen. Eet gezond en beweeg regelmatig om het zo te houden!"; }
      else if (bmi < 30) { groep = ["over", "Overgewicht"]; advies = "Met een BMI tussen de 25 en 30 bent u eigenlijk iets te zwaar en dat zorgt voor een licht verhoogd gezondheidsrisico. Zorg ervoor dat uw gewicht niet verder toeneemt. Probeer door uw eetpatroon aan te passen en regelmatig te bewegen wat gewicht te verliezen."; }
      else {
        groep = bmi < 35 ? ["obesitas", "Obesitas"] : ["ernstig", "Ernstig obesitas"];
        advies = "Met een BMI boven de 30 behoort u tot de groep mensen met een duidelijk verhoogd gezondheidsrisico. De kans op hoge bloeddruk, suikerziekte, hart- en vaatziekten en gewrichtsslijtage is bij mensen met een hoge BMI verhoogd. Probeer door uw eetpatroon aan te passen en regelmatig te bewegen wat gewicht te verliezen.";
      }
      // Kleur van de uitslag volgens de BMI-kaart (ondergewicht t/m ernstig obesitas)
      document.getElementById("uitslag-bmi").className = "uitslag uitslag--bmi-" + groep[0];
      toon("uitslag-bmi", "<strong>Uw Body Mass Index: " + bmi.toFixed(1).replace(".", ",") + " (" + groep[1].toLowerCase() + ")</strong><br>" + advies);
    });
  }

  /* ---------- Printknop ---------- */
  document.querySelectorAll("[data-print]").forEach(function (knop) {
    knop.addEventListener("click", function () { window.print(); });
  });

  /* ---------- Inschrijfformulier: controle verplichte velden vóór printen ---------- */
  var formulier = document.querySelector(".formulier");
  var controleKnoppen = document.querySelectorAll("[data-print-controle]");
  if (formulier && controleKnoppen.length) {
    var verplichteVelden = Array.prototype.filter.call(formulier.querySelectorAll(".veld"), function (veld) {
      return veld.querySelector(".verplicht");
    });
    var foutTeller = 0;
    verplichteVelden.forEach(function (veld) {
      veld.querySelectorAll("input, textarea").forEach(function (el) { el.setAttribute("aria-required", "true"); });
    });

    function isIngevuld(veld) {
      var keuzes = veld.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      if (keuzes.length) return Array.prototype.some.call(keuzes, function (k) { return k.checked; });
      var invoer = veld.querySelector("input, textarea");
      return !!invoer && invoer.value.trim() !== "";
    }
    function naamVan(veld) {
      if (veld.dataset.naam) return veld.dataset.naam;
      var label = veld.querySelector("label, .label").cloneNode(true);
      label.querySelectorAll(".verplicht").forEach(function (el) { el.remove(); });
      return label.textContent.replace(/\s+/g, " ").trim();
    }
    function eersteInvoer(veld) { return veld.querySelector("input, textarea"); }
    function zetFout(veld, fout) {
      var melding = veld.querySelector(".veld-melding");
      veld.classList.toggle("veld--fout", fout);
      veld.querySelectorAll("input, textarea").forEach(function (el) {
        if (fout) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
      });
      if (fout && !melding) {
        melding = document.createElement("p");
        melding.className = "veld-melding";
        melding.id = "fout-" + (++foutTeller);
        melding.textContent = "Dit veld bent u vergeten in te vullen.";
        veld.appendChild(melding);
        veld.querySelectorAll("input, textarea").forEach(function (el) { el.setAttribute("aria-describedby", melding.id); });
      } else if (!fout && melding) {
        melding.remove();
        veld.querySelectorAll("input, textarea").forEach(function (el) { el.removeAttribute("aria-describedby"); });
      }
    }
    function verwijderOverzicht() {
      document.querySelectorAll(".formulier-fouten").forEach(function (el) { el.remove(); });
    }
    function toonOverzicht(missend, knop) {
      verwijderOverzicht();
      var kader = document.createElement("div");
      kader.className = "formulier-fouten geen-print";
      kader.setAttribute("role", "alert");
      var titel = missend.length === 1
        ? "U bent 1 verplicht veld vergeten in te vullen"
        : "U bent " + missend.length + " verplichte velden vergeten in te vullen";
      kader.innerHTML = "<h2>" + titel + "</h2><p>Vul deze eerst in. Daarna kunt u het formulier printen.</p><ul></ul>";
      var lijst = kader.querySelector("ul");
      missend.forEach(function (veld) {
        var li = document.createElement("li"), link = document.createElement("a");
        link.href = "#";
        link.textContent = naamVan(veld);
        link.addEventListener("click", function (e) { e.preventDefault(); gaNaarVeld(veld); });
        li.appendChild(link);
        lijst.appendChild(li);
      });
      knop.closest(".knoppenrij").before(kader);
    }
    function gaNaarVeld(veld) {
      veld.scrollIntoView({ behavior: "smooth", block: "center" });
      var el = eersteInvoer(veld);
      if (el) el.focus({ preventScroll: true });
    }
    function vraagBevestiging() {
      var dialoog = document.getElementById("print-controle");
      if (dialoog && typeof dialoog.showModal === "function") {
        dialoog.returnValue = "";
        dialoog.showModal();
      } else if (window.confirm("Alle verplichte velden zijn ingevuld. Heeft u gecontroleerd of al uw gegevens kloppen? Klik op OK om te printen.")) {
        window.print();
      }
    }
    var dialoogEl = document.getElementById("print-controle");
    if (dialoogEl) {
      dialoogEl.addEventListener("close", function () {
        if (dialoogEl.returnValue === "printen") setTimeout(function () { window.print(); }, 50);
      });
    }

    controleKnoppen.forEach(function (knop) {
      knop.addEventListener("click", function () {
        var missend = verplichteVelden.filter(function (veld) { return !isIngevuld(veld); });
        verplichteVelden.forEach(function (veld) { zetFout(veld, missend.indexOf(veld) !== -1); });
        if (missend.length) {
          toonOverzicht(missend, knop);
          gaNaarVeld(missend[0]);
        } else {
          verwijderOverzicht();
          vraagBevestiging();
        }
      });
    });

    // Foutmelding verdwijnt zodra het veld alsnog is ingevuld
    formulier.addEventListener("input", werkBij);
    formulier.addEventListener("change", werkBij);
    function werkBij(e) {
      var veld = e.target.closest(".veld");
      if (!veld || !veld.classList.contains("veld--fout") || !isIngevuld(veld)) return;
      zetFout(veld, false);
      document.querySelectorAll(".formulier-fouten li a").forEach(function (link) {
        if (link.textContent === naamVan(veld)) link.parentNode.remove();
      });
      document.querySelectorAll(".formulier-fouten").forEach(function (kader) {
        var over = kader.querySelectorAll("li").length;
        if (!over) kader.remove();
        else kader.querySelector("h2").textContent = over === 1
          ? "U bent nog 1 verplicht veld vergeten in te vullen"
          : "U bent nog " + over + " verplichte velden vergeten in te vullen";
      });
    }

    // Leeg formulier printen: ingevulde gegevens tijdelijk weghalen en daarna terugzetten
    document.querySelectorAll("[data-print-leeg]").forEach(function (knop) {
      knop.addEventListener("click", function () {
        var velden = formulier.querySelectorAll("input, textarea");
        var bewaard = Array.prototype.map.call(velden, function (el) {
          return /radio|checkbox/.test(el.type) ? el.checked : el.value;
        });
        velden.forEach(function (el) { if (/radio|checkbox/.test(el.type)) el.checked = false; else el.value = ""; });
        verplichteVelden.forEach(function (veld) { zetFout(veld, false); });
        verwijderOverzicht();
        function herstel() {
          velden.forEach(function (el, i) { if (/radio|checkbox/.test(el.type)) el.checked = bewaard[i]; else el.value = bewaard[i]; });
          window.removeEventListener("afterprint", herstel);
        }
        window.addEventListener("afterprint", herstel);
        window.print();
      });
    });
  }
})();
