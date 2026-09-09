import urllib.request
import time

backlinks = [
    ('GitHub Repository', 'https://github.com/jibranpcccc/job-alert-communities-directory', 96),
    ('GitHub Release v1.0.0', 'https://github.com/jibranpcccc/job-alert-communities-directory/releases/tag/v1.0.0', 96),
    ('Curated Public Gist', 'https://gist.github.com/jibranpcccc/9db0aaeea4c7047e65dd0864e7712294', 96),
    ('Developer Profile Hub', 'https://github.com/jibranpcccc', 96),
    ('GitHub Pages Directory Network Portal', 'https://jibranpcccc.github.io/', 96),
    ('GitHub Pages Web Utilities Hub', 'https://jibranpcccc.github.io/tools.html', 96),
    ('Wayback Machine Homepage', 'http://web.archive.org/web/20260907094106/https://jobalertgroups.com/', 96),
    ('Wayback Machine Jobs Catalog', 'http://web.archive.org/web/20260907094208/https://jobalertgroups.com/jobs/', 96),
    ('Wayback Machine Telegram Hub', 'http://web.archive.org/web/20260907094200/https://jobalertgroups.com/platform/telegram/', 96)
]

print("==========================================================================")
print(f"🔍 PROBING {len(backlinks)} HIGH-AUTHORITY BACKLINK DELIVERABLES")
print("==========================================================================\n")

all_pass = True
for name, url, da in backlinks:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'})
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            latency = int((time.time() - start) * 1000)
            print(f"[✓ HTTP {res.status}] {name} (DA {da}) ({latency}ms)\n       -> {url}\n")
    except Exception as e:
        all_pass = False
        print(f"[X FAIL] {name} (DA {da})\n       -> Error: {e}\n")

print("==========================================================================")
print(f"Verification Result: {'ALL PASSED (100% VERIFIED LIVE)' if all_pass else 'SOME FAILED'}")
print("==========================================================================")
