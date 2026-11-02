# TrustMyChef · Instant Booking Workshop Prototype

**Live:** https://sdf.seonukkim.com · **Repo:** https://github.com/seonukkim/sdf-workshop · SDF26F Team B (Service Design Fundamentals, UNIST)

A Wizard-of-Oz prototype for the co-design workshop. Today is your anniversary, you forgot to book, your first choice in Ulsan is full and you can only walk. Pick nearby restaurants (who recommended them is shown), ask them all at once by Instagram DM or AI call, and **the first one to say Yes gets your booking**. Sending requests comes with **TrustMyChef Pass (₩2,500/month)**; the info and the map stay free. The test asks “Would you subscribe?” after booking, when people move on to the rating, and nothing is charged. All owner replies are simulated in the browser. No restaurant is contacted and no payment happens.

## Pages

| URL | What it is |
|---|---|
| `/` | The prototype: 0 Situation → 1 Choose & send → 2 Wait → 3 Booked. Phones get the mobile app; wide screens (≥ 1100px) get the **presenter split view**: phone on the left, live “how it works” diagram + QR on the right. |
| `/rate` | Phone survey (quantitative, 3–5 min with the prototype): consent + group (1, 2, 3, 4, Teaching) → about you → place 4 items on **one 2×2**: “How convenient is it?” × “Would you pay for it?” (1–10). Items: screen 1, screen 2, screen 3, the whole service with the Pass. Every question is required. |
| `/results/` | Team dashboard (needs the results key every time the page loads). It re-reads the answers every 10 seconds (“Live”). It opens with **At a glance** (answers over time, subscribe after booking, average per screen, would-pay spread, time taken) and **Compare by** group, gender, age, affiliation, meals out and apps. Every answer is listed with the time it was recorded (KST) and can be ticked and deleted (for test runs): the quadrant chart, means ± SD, share per quadrant, subscribe answers after booking (yes / maybe / no), profile breakdown, prototype behaviour, CSV export, delete all. Open as `/results/#key=YOUR_KEY` (the key is removed from the address bar after loading). |
| `/board/` | Design board: research (Tabelog, Baemin, Coupang Eats), principles, tokens, grid, components, live screens, Wizard-of-Oz setup, validation plan, copy guide. |

## Running the workshop (no slides, just the big screen)

Open **https://sdf.seonukkim.com/?fac=1** on the 16:9 big screen (the presenter PC). `?fac=1` makes that tab the facilitator: it stays on through reloads, and `?fac=0` turns it off. Wide screens show a fixed 16:9 canvas that scales to fill the screen: the phone on the left, the explanation on the right, a QR code, and **six step buttons** you can click at any time:

| Step | What the big screen shows | Where answers come from |
|---|---|---|
| 0 Situation | Forgot the anniversary · first choice full · walking only, and the idea | – |
| 1 Choose · 2 Wait · 3 Booked | The 3 main features, with a live diagram of who we asked, what each owner sees and who said Yes first | – |
| 4 Quant | Big QR + “try it, answer ‘Would you subscribe? ₩2,500/month’, rate each screen on one 2×2”. When a phone finishes, it says “Now look at the big screen”. | **Online**: each person’s phone (saved) |
| 5 Qual | Guided paper part with a timer: ① ideas for each feature, with the Choose · Wait · Booked screens shown (7 min) → ② two “what if” questions (3 min) → ③ place the post-its on the A3 2×2, deciding together with your group (8 min) | **Offline**: A3 + post-its → photos → affinity diagram |

Only the facilitator tab shows the **floating toolbar** (below the canvas): **Next screen** (walks everything without answers), Start over, **Results** (hidden until you click it; asks for the results key), **Results page ↗**, and the facilitator menu (What-if modes, speed, agenda, links). There is no delete button on the big screen. **Nothing done in facilitator mode is saved.** Every other device, including laptops and tablets, is a participant: required answers are checked and saved.

On a phone, the facilitator settings open by **pressing and holding the TEST badge**. URL switches also work: `?outcome=bad|none|normal`, `?speed=fast`, `?lang=en|ko`, `?at=guyeong|samsan`.

**Language:** each phone or laptop starts in its own device language (Korean when the device’s first language is Korean, English for every other language), not by location. The big screen starts in English for the whole room. A tap on the language button is remembered on that device; a `?lang=en|ko` link applies to that page only. The results page follows the same rule but remembers its own choice, so it never changes the big screen.

Before the real session, clear rehearsal answers on the results page (tick the top box, then **Delete selected**).

## What is real and what is simulated

- **Real:** 38 walkable restaurants in Guyeong-ri and Samsan from the HeXA Ulsan Info catalog (`info.seonukkim.com/api/catalog`): names, photos, addresses and categories. “Who recommended it” comes from Gourmet notes (gourmet.seonukkim.com) and other source lists. Walking minutes and routes come from OSRM foot routing on OpenStreetMap.
- **Simulated:** the first choice being full, owner replies and their timing, DMs, AI calls, the subscription (₩2,500/month, asked but never charged), the 10-minute table hold. Every simulated reply is labeled in the UI.

The **subscribe question** comes when someone taps **Next: Rate this test** on their booking (not as a sudden pop-up): “One quick question before you rate · Would you subscribe to this? ₩2,500/month”. It says it is only a test (nothing is charged) and asks them to answer as if it were real. The answer (yes / not sure / no) is saved and they go straight on to the rating; “Back to my booking” closes it without an answer. Going back from the rating to the booking (the survey’s back button or the browser’s) asks again with their current answer marked, so a wrong tap can be changed. The facilitator toolbar’s Next skips it so demos stay fast.

## Data collected

The survey collects only fields from our interview forms: gender, age (in full years), affiliation, meals out last month and apps used. It also stores the 1–10 ratings, the group (1, 2, 3, 4, Teaching), and what the person did in the prototype (places picked, DM vs AI call, subscribe answer after booking, result). Post-it ideas are not collected digitally. It stores no name, phone number or e-mail. Answers go to Cloudflare D1 (`trustmychef-sdf`) the moment a phone sends them, so nothing depends on the facilitator’s laptop staying open. If the internet drops, they wait on the phone and are sent later. On the results page, save a copy with **CSV** or **XLSX**, and clear test answers by ticking them (or the top box for all) and pressing **Delete selected**; a pop-up asks again first.

## Files

```
public/            static site (served by Workers Static Assets)
  index.html       app shell (phone + presenter panel)
  js/              app.js (router) · screens.js (screens 0–3) · sim.js (owner simulation)
                   stage.js (presenter view) · survey.js · results.js · map.js · i18n.js (EN/KO copy)
  css/             app.css (tokens + components) · results.css · board.css
  data/places.json built dataset (do not edit by hand)
  img/p/           restaurant photos (from HeXA Ulsan Info / Gourmet)
  _headers         security + cache headers
src/worker.js      /api/responses (save, list with key, delete with key)
migrations/        D1 schema
tools/             gourmet_notes.py + build_data.py (rebuild places.json, photos and routes)
docs/screens/      phone screenshots (Choose, Wait, Booked, pop-up, what-if) for printing
```

## Deploy

Pushes to `main` are deployed by **Cloudflare Workers Builds** once the repo is connected (Cloudflare dashboard → Workers & Pages → `trustmychef-sdf` → Settings → Build → Connect: repo `seonukkim/sdf-workshop`, branch `main`, deploy command `npx -y wrangler@4 deploy`). The results key stays a Worker secret and is never in this repo.

## Commands

```bash
npx wrangler@4 dev                      # local preview at http://localhost:8787 (needs .dev.vars with RESULTS_KEY=…)
npx wrangler@4 deploy                   # publish to sdf.seonukkim.com by hand
npx wrangler@4 secret put RESULTS_KEY   # change the results key
npx wrangler@4 d1 migrations apply trustmychef-sdf --remote
```

Rebuild the dataset (only if the catalog changes):

```bash
curl -s https://info.seonukkim.com/api/catalog -o /tmp/catalog.json
python3 tools/gourmet_notes.py /tmp/catalog.json /tmp/gourmet_notes.json
python3 tools/build_data.py /tmp/catalog.json /tmp/gourmet_notes.json public
```

Credits: map data © OpenStreetMap contributors · font Pretendard (OFL) · icons adapted from Lucide (ISC).
