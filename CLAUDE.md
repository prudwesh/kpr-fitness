# Rules for this repo

## Always raise the version

Every change to the app raises its version, the same way KPR Finance and
kprapps do. No exceptions, however small the change.

The version is `a.b.c`:
- `major` (a): breaking change or rearchitecture
- `minor` (b): new feature
- `patch` (c): small change or bug fix

It lives in `appVersion: "x.y.z"` passed to `KPR.init` in `app.js`
(kpr-core shows it in the account menu and About). Don't edit it by hand.
Run:

```
python3 tools/bump-version.py patch   # or minor / major
```

That updates the version and gives every local `.js` / `.css` link in
`index.html` `?v=<version>`, so browsers and the service worker fetch the
new files instead of a cached copy. New local scripts or stylesheets get
the `?v=` the same way.

End the commit message with the new version in brackets, like
`Fix the rest timer on iPhone (1.0.1)`.

Docs, CI and tooling changes (`*.md`, `.github/`, `tools/`, `CNAME`) don't
need a bump. The **Version check** workflow fails a change that forgot to
raise it; fix it by running the script and committing.

## Database rules live in kprapps

The data is Firestore `users/{uid}/fitness/*`. Its rules are
`validFitness` and the `users/{uid}/fitness/{docId}` block in
**prudwesh/kprapps `firestore.rules`**. A change here that adds a field,
a new `kind` or a bigger limit needs the matching change there (and
kprapps' `tools/fitness-rules/test.mjs`), or the write is refused.

## Exercises

`exercises.js` is the library. An exercise's id is its name slugged
(`Barbell Bench Press` → `barbell-bench-press`) and saved workouts point at
it, so never rename or remove a built-in exercise; add new ones instead.
