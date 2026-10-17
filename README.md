# NYHL Kraken — Shift Tracker

An 8U house league coach's bench tool: check in who's at the game, pick how
many skaters go out at a time (3v3, 4v4, 5v5…), and tap **Next Shift** to see
who's on the ice and who's up next, with a fair round-robin rotation. Data is
stored in a Google Sheet via a small Apps Script web app — no database to
manage. The app is a static export, deployed to GitHub Pages, the same way as
[exposure-tristar](https://github.com/nvastano/exposure-tristar).

Live at: https://nvastano.github.io/nyhl-kraken/

## Setup

1. Create a new Google Sheet.
2. Open **Extensions > Apps Script**, delete the default code, and paste in
   the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
3. Click **Deploy > New deployment**, choose type **Web app**, set:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
4. Deploy and copy the resulting web app URL.
5. In the GitHub repo, go to **Settings > Secrets and variables > Actions >
   Variables** and add `NEXT_PUBLIC_SHEETS_WEBAPP_URL` set to that URL (the
   deploy workflow reads it at build time).
6. In **Settings > Pages**, set Source to **GitHub Actions**.
7. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and
   publishes to GitHub Pages automatically.

For local development: copy `.env.local.example` to `.env.local`, set
`NEXT_PUBLIC_SHEETS_WEBAPP_URL`, then `npm install && npm run dev`.

The script auto-creates `Players`, `Games`, and `Shifts` tabs in the sheet on
first use.

## Using it

1. Go to **Roster** once and add your 6 skaters plus a goalie.
2. On game day, go to the home page, check off who showed up, pick skaters
   per shift (3, 4, 5…), and tap **Start Game**.
3. Tap **Next Shift** each time you're ready to rotate. Whoever's sat out the
   longest goes out next. Tap **Sit out** on a bench player if they need a
   break or are hurt — they'll skip future rotations until toggled back on.
4. The current game is saved to your phone's browser as you go, so a refresh
   mid-game won't lose anything. Each shift is also logged to the `Shifts`
   tab in your Google Sheet as a record, best-effort (the tracker keeps
   working locally even if that sync is slow or fails, which matters on rink
   wifi).
5. Tap **End Game** (twice, to confirm) when the game's over.

## Pages

- `/` — game day: attendance check-in, shift size, and the live shift
  tracker.
- `/roster` — manage the skaters and goalie on the team.
