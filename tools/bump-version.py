#!/usr/bin/env python3
"""Version bump for KPR apps (same scheme as KPR Finance).

Every change to the app raises the version, a.b.c:
  major  a  breaking change / rearchitecture
  minor  b  new feature
  patch  c  small change / bug fix

    python3 tools/bump-version.py patch     # 1.4.2 -> 1.4.3   (default)
    python3 tools/bump-version.py minor     # 1.4.2 -> 1.5.0
    python3 tools/bump-version.py major     # 1.4.2 -> 2.0.0
    python3 tools/bump-version.py --check   # everything agrees?
    python3 tools/bump-version.py --sync    # stamp the current version everywhere, no raise
    python3 tools/bump-version.py --since <commit>   # (CI) app changed => version raised?

The version lives in the code itself: every `appVersion: "x.y.z"` (the
KPR.init option kpr-core shows in About), `APP_VERSION = "x.y.z"` and
`KPR_VERSION = "x.y.z"`. A bump rewrites all of them, and gives every
local .js / .css link in the HTML pages `?v=x.y.z` so browsers and the
service worker fetch the new files instead of a cached copy.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", ".github", ".claude", "node_modules", "vendor", "platform", "supabase", "tools", "test-env"}
# Changes to these don't need a version bump (docs, CI, backend, rules).
NO_BUMP = re.compile(r"(^|/)(README|CLAUDE|INTEGRATION)[^/]*$|\.md$|\.bat$|^\.github/|^\.claude/|^tools/"
                     r"|^platform/|^supabase/|^firestore\.rules$|^storage\.rules$|^\.gitignore$|^CNAME$")

VERSION_SITES = re.compile(
    r"""(?P<pre>\bappVersion\s*:\s*["']|\b(?:APP|KPR)_VERSION\s*=\s*["'])(?P<v>\d+\.\d+\.\d+)(?P<post>["'])""")
LOCAL_ASSET = re.compile(
    r"""(?P<pre>\b(?:src|href)\s*=\s*["'])(?P<url>(?!https?:|//|data:)[^"'?#]+\.(?:js|css))(?:\?v=[^"'#]*)?(?P<post>["'#])""")


def files(exts):
    for p in sorted(ROOT.rglob("*")):
        rel = p.relative_to(ROOT)
        if p.is_file() and p.suffix in exts and not (set(rel.parts[:-1]) & SKIP_DIRS):
            yield p


def read(p):
    return p.read_text(encoding="utf-8", errors="surrogateescape")


def current(text_by_file=None):
    found = {}
    for p in files({".html", ".js"}):
        s = text_by_file(p) if text_by_file else read(p)
        if s is None:
            continue
        for m in VERSION_SITES.finditer(s):
            found.setdefault(m.group("v"), []).append(str(p.relative_to(ROOT)))
    return found


def single(found, where="the code"):
    if not found:
        sys.exit(f"No version found in {where} (appVersion: \"x.y.z\" / APP_VERSION = \"x.y.z\").")
    if len(found) > 1:
        lines = "\n".join(f"  {v}: {', '.join(sorted(set(fs)))}" for v, fs in found.items())
        sys.exit(f"Versions disagree in {where}:\n{lines}\nRun: python3 tools/bump-version.py patch")
    return next(iter(found))


def key(v):
    return tuple(int(x) for x in v.split("."))


def stale_assets(version):
    bad = []
    for p in files({".html"}):
        for m in LOCAL_ASSET.finditer(read(p)):
            if f"?v={version}" not in m.group(0):
                bad.append(f"{p.relative_to(ROOT)}: {m.group('url')}")
    return bad


def write_version(new):
    for p in files({".html", ".js"}):
        s = read(p)
        o = VERSION_SITES.sub(lambda m: m.group("pre") + new + m.group("post"), s)
        if p.suffix == ".html":
            o = LOCAL_ASSET.sub(lambda m: f"{m.group('pre')}{m.group('url')}?v={new}{m.group('post')}", o)
        if o != s:
            p.write_text(o, encoding="utf-8", errors="surrogateescape")
            print(f"  updated {p.relative_to(ROOT)}")


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, text=True, capture_output=True)


def since(base):
    if not base or set(base) == {"0"} or git("cat-file", "-e", f"{base}^{{commit}}").returncode:
        print("No earlier commit to compare with; checking consistency only.")
        return check()
    changed = [f for f in git("diff", "--name-only", base, "HEAD").stdout.split() if not NO_BUMP.search(f)]
    if not changed:
        print("Only docs / CI / backend files changed; no version bump needed.")
        return check()

    def at_base(p):
        r = git("show", f"{base}:{p.relative_to(ROOT).as_posix()}")
        return r.stdout if r.returncode == 0 else None

    old = single(current(at_base), "the earlier commit") if current(at_base) else "0.0.0"
    new = check()
    if key(new) <= key(old):
        print("App files changed:\n  " + "\n  ".join(changed[:20]))
        sys.exit(f"\nThe version is still {new}. Every change must raise it:\n"
                 "  python3 tools/bump-version.py patch   (fix)  | minor (feature) | major (breaking)")
    print(f"Version raised {old} -> {new}.")


def check():
    v = single(current())
    bad = stale_assets(v)
    if bad:
        sys.exit(f"These links don't carry ?v={v} (run tools/bump-version.py):\n  " + "\n  ".join(bad))
    print(f"Version {v}: all version numbers and ?v= links agree.")
    return v


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "patch"
    if arg == "--check":
        return check()
    if arg == "--sync":
        v = single(current())
        write_version(v)
        return check()
    if arg == "--since":
        return since(sys.argv[2] if len(sys.argv) > 2 else "")
    if arg not in ("major", "minor", "patch"):
        sys.exit(__doc__)
    old = single(current())
    a, b, c = key(old)
    new = {"major": f"{a + 1}.0.0", "minor": f"{a}.{b + 1}.0", "patch": f"{a}.{b}.{c + 1}"}[arg]
    write_version(new)
    print(f"{old} -> {new}\nCommit message should end with ({new}).")


if __name__ == "__main__":
    main()
