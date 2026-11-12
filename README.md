# Windsor Keepers Pick Ledger

The official record of who owns every future draft pick in the Windsor Keepers league, plus the trade log, dues, and each year's draft order. Yahoo only handles players.

## Files

- `data.json` holds all the data. It's the ledger itself.
- `index.html`, `app.js` and `style.css` draw the page. No build step and no dependencies.

## Editing

There are two ways, and both just change `data.json`:

1. **On the page (commissioner mode).** Open the site, tap **Commissioner sign-in** at the bottom (or add `#commish` to the URL), and paste a token (see below). The edit tools then appear, and every save is a commit to `data.json`. GitHub Pages takes about a minute to redeploy.
2. **By hand.** Edit `data.json` in any editor, or in GitHub's web editor, and commit.

### data.json format

- `teams`: team names, in display order
- `years`: draft years that are open for trading (keep two)
- `rounds`: rounds per draft (15 roster minus 8 keepers = 7)
- `linear`: linear rounds before snaking (7 = fully linear)
- `owner`: only picks that have changed hands, as `"YEAR|ROUND|ORIGINAL_TEAM": "CURRENT_OWNER"`. A pick that isn't listed belongs to its original team.
- `trades`: the log, oldest first. Each entry is `{date, a, b, moves:[{pick, from, to}], players:{team: "names"}, note}`
- `dues`: `{"2027": {"Joban": true, ...}}`
- `results`: final standings, champion first, keyed by the draft year they set, e.g. `"2027": [...]` for the 2026–27 season
- `updated`: date of the last save from the page

## Token for commissioner mode

GitHub → Settings → Developer settings → Fine-grained tokens → Generate:

- Repository access: **only this repo**
- Permissions: **Contents → Read and write**
- Expiry: up to a year, then make a new one

The token is stored only in your browser (localStorage) and is only sent to api.github.com. Anyone without it sees a view-only page.

## Yearly

After the playoffs and consolation bracket finish, enter the standings in **Season results**. After the draft, use **Drop [year]** and **Add [year]** so two future drafts are always open.
