# csv-reader-speed-01-run-20261121

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/adithyafarhan182-bot/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/adithyafarhan182-bot/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast, dependency-free reader for broken CSV files: `solve.js` returns exactly what csv-reader 1.0.0 returns for the same `{text, header}` — `{columns, rows, errors}` — by reading the text once, left to right, with `indexOf`-bounded scans and whole-slice field copies instead of one character at a time. No regular expressions, no per-character string building.

## Run it

```sh
node main.ts
```

`main.ts` reads every case from `/input/cases.json` (or `$MAKEFUN_INPUT_DIR`), answers each with `run()` from `solve.js`, and writes `/output/answers.json` (or `$MAKEFUN_OUTPUT_DIR`). Run the checks with `node test.mjs`, which compares the answers against csv-reader 1.0.0 on every edge case in the specification plus the practice set.

---

<sub>Entered on [make.fun](https://make.fun/?ref=mgwpv082&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
