# Synthetic HY3 fixtures

These fixtures are synthetic compatibility contracts. They are not copies or
sanitized excerpts of any athlete, club, meet, or production export.
The `.hy3` files use an ASCII-safe manifest representation so the repository
never needs to store a raw export or a platform-dependent binary patch. The
fixture harness expands `\xNN` escapes into bytes, encodes fields as
Windows-1252, and passes fixed-width records to the future local parser.
## Record geometry

Each encoded record is 192 bytes followed by `LF`. Byte zero is the record
type. The remaining fields are fixed-width and space-padded:
| Record | Fields (offset, width) |
|---|---|
| A | `version (1,8)`, `meet (9,40)`, `date (49,10)`, `venue (59,32)`, `pool (91,8)` |
| B | `alias (1,16)`, `name (17,40)`, `country (57,2)` |
| C | `alias (1,16)`, `display (17,40)`, `private (57,130)` |
| D | `alias (1,16)`, `label (17,40)`, `distance (57,4)`, `stroke (61,16)`, `sex (77,5)`, `round (82,8)` |
| E | `alias (1,16)`, `athlete (17,16)`, `event (33,16)`, `seed (49,8)` |
| F | `alias (1,16)`, `entry (17,16)`, `time (33,8)`, `status (41,16)`, `place (57,4)`, `note (61,100)` |
| H | `alias (1,16)`, `team (17,16)`, `event (33,16)`, `legs (49,2)`, `time (51,8)`, `status (59,16)`, `note (75,100)` |
The geometry is deliberately explicit for the task 4.1 contract; task 4.3
owns the production parser and worker implementation.

## Sanitization contract

Fixture values use `SYNTHETIC`, `TST`, `PRIVATE_TEST`, `ZZ`, `+00`,
`example.invalid`, and far-future sentinel years. Private fields are included
only as synthetic canaries so tests can prove they do not cross the parser
boundary. The sanitized preview MUST contain sports fields, source aliases,
bounded display names, statuses, notes, and normalized times only. It MUST NOT
contain the private canaries, exact dates, contacts, identity numbers, or raw
bytes.
The RED parser API expected by `scripts/hy3-regression.mjs` is:
```js
parseHy3(buffer) => {
  ok: true,
  preview: {
    version, recordCounts, meetName, teams, athletes, events,
    entries, results, relays, diagnostics
  }
}
```
Rejected variants return `ok: false`, a stable `code` such as
`unsupported-version` or `malformed-record`, and no preview. This file defines
the test boundary only; it does not provide a parser implementation.
