import urllib.request
import json
import time

urls = [
    "https://jobalertgroups.com/",
    "https://jobalertgroups.com/jobs/",
    "https://jobalertgroups.com/platform/telegram/",
    "https://jobalertgroups.com/category/tech-jobs/",
    "https://jobalertgroups.com/country/india/",
    "https://jobalertgroups.com/country/global/",
    "https://jobalertgroups.com/country/uk/",
    "https://jobalertgroups.com/llms.txt"
]

print("=== SUBMITTING TO WAYBACK MACHINE (ARCHIVE.ORG DA 96) ===")
results = []
for u in urls:
    save_url = f"https://web.archive.org/save/{u}"
    req = urllib.request.Request(save_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"})
    try:
        with urllib.request.urlopen(req, timeout=25) as res:
            print(f"[OK] {u} -> HTTP {res.status}")
            results.append({"url": u, "status": res.status})
    except urllib.error.HTTPError as e:
        print(f"[STATUS {e.code}] {u} -> {e.reason}")
        results.append({"url": u, "status": e.code})
    except Exception as e:
        print(f"[NOTE] {u} -> {e}")
        results.append({"url": u, "status": str(e)})
    time.sleep(2)

print("\nFinished Wayback Archiving!")
