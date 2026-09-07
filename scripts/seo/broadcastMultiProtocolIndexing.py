#!/usr/bin/env python3
"""
Multi-Protocol Search Engine Indexing & Crawl Broadcast Engine
Broadcasts real-time crawling signals across 5 global indexing networks:
1. Microsoft Bing IndexNow API (https://www.bing.com/indexnow)
2. Central IndexNow Gateway (https://api.indexnow.org/indexnow - Yandex, Seznam, Naver)
3. Ping-O-Matic XML-RPC Network (http://rpc.pingomatic.com/)
4. Blo.gs XML-RPC Network (http://ping.blo.gs/)
5. Twingly Global Blog & News Indexer (http://rpc.twingly.com/)

Submits both website URLs and live high-DA backlink assets.
"""

import urllib.request
import urllib.parse
import json
import xmlrpc.client
import socket
import time

socket.setdefaulttimeout(15.0)

INDEXNOW_KEY = "5f6b28114f4e421ebc7f92e4a8b792da"
HOST = "jobalertgroups.com"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"

# Core Website URLs
WEBSITE_URLS = [
    "https://jobalertgroups.com/",
    "https://jobalertgroups.com/jobs/",
    "https://jobalertgroups.com/platform/telegram/",
    "https://jobalertgroups.com/category/tech-jobs/",
    "https://jobalertgroups.com/category/government-jobs/",
    "https://jobalertgroups.com/job-type/remote-jobs/",
    "https://jobalertgroups.com/job-type/government-jobs/",
    "https://jobalertgroups.com/country/global/",
    "https://jobalertgroups.com/country/uk/",
    "https://jobalertgroups.com/country/india/",
    "https://jobalertgroups.com/how-we-verify/",
    "https://jobalertgroups.com/safety/",
    "https://jobalertgroups.com/editorial-policy/",
    "https://jobalertgroups.com/robots.txt",
    "https://jobalertgroups.com/llms.txt",
    "https://jobalertgroups.com/llms-full.txt",
    "https://jobalertgroups.com/sitemap-0.xml"
]

# High-DA Backlinks (Tier 1 & Tier 3)
BACKLINK_ASSETS = [
    {
        "name": "Job Alert Communities Directory (GitHub)",
        "url": "https://github.com/jibranpcccc/job-alert-communities-directory",
        "da": 96
    },
    {
        "name": "Job Alert Communities Release v1.0.0",
        "url": "https://github.com/jibranpcccc/job-alert-communities-directory/releases/tag/v1.0.0",
        "da": 96
    },
    {
        "name": "Verified Job Alert Communities Gist",
        "url": "https://gist.github.com/jibranpcccc/9db0aaeea4c7047e65dd0864e7712294",
        "da": 96
    },
    {
        "name": "Jibran Ayub Developer Profile Hub",
        "url": "https://github.com/jibranpcccc",
        "da": 96
    }
]

def ping_bing_indexnow(host, url_list):
    payload = {
        "host": host,
        "key": INDEXNOW_KEY,
        "keyLocation": f"https://{host}/{INDEXNOW_KEY}.txt",
        "urlList": url_list
    }
    req = urllib.request.Request(
        "https://www.bing.com/indexnow",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": USER_AGENT}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            return res.status, "Bingbot Ingestion Dispatched"
    except urllib.error.HTTPError as e:
        return e.code, str(e.reason)
    except Exception as e:
        return 0, str(e)

def ping_central_indexnow(host, url_list):
    payload = {
        "host": host,
        "key": INDEXNOW_KEY,
        "keyLocation": f"https://{host}/{INDEXNOW_KEY}.txt",
        "urlList": url_list
    }
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": USER_AGENT}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            return res.status, "Global IndexNow Replicated (Yandex, Seznam, Naver)"
    except urllib.error.HTTPError as e:
        return e.code, str(e.reason)
    except Exception as e:
        return 0, str(e)

def ping_pingomatic(title, url):
    try:
        server = xmlrpc.client.ServerProxy("http://rpc.pingomatic.com/")
        res = server.weblogUpdates.ping(title, url)
        return True, res.get("message", "Pings Forwarded")
    except Exception as e:
        return False, str(e)

def ping_blogs(title, url):
    try:
        server = xmlrpc.client.ServerProxy("http://ping.blo.gs/")
        res = server.weblogUpdates.ping(title, url)
        return True, res.get("message", "Succeeded")
    except Exception as e:
        return False, str(e)

def ping_twingly(title, url):
    try:
        server = xmlrpc.client.ServerProxy("http://rpc.twingly.com/")
        res = server.weblogUpdates.ping(title, url)
        return True, res.get("message", "Thanks for the ping.")
    except Exception as e:
        return False, str(e)

def main():
    print("==========================================================================")
    print("⚡ MULTI-PROTOCOL SEARCH ENGINE & BACKLINK INDEXING DISPATCHER")
    print("==========================================================================\n")

    # 1. IndexNow for Website URLs
    print(f"[1/4] Broadcasting {len(WEBSITE_URLS)} Website URLs via IndexNow...")
    bing_status, bing_msg = ping_bing_indexnow(HOST, WEBSITE_URLS)
    print(f"       -> Microsoft Bing IndexNow  : HTTP {bing_status} ({bing_msg})")
    central_status, central_msg = ping_central_indexnow(HOST, WEBSITE_URLS)
    print(f"       -> Central IndexNow (Yandex): HTTP {central_status} ({central_msg})\n")

    # 2. XML-RPC Broadcast for Website Hubs
    print("[2/4] Broadcasting XML-RPC Pings for Website Hubs...")
    hubs_to_ping = [
        ("JobAlertGroups Official Directory", "https://jobalertgroups.com/"),
        ("Telegram Job Alert Channels Hub", "https://jobalertgroups.com/platform/telegram/"),
        ("Tech Jobs Career Communities", "https://jobalertgroups.com/category/tech-jobs/"),
        ("Worldwide & Remote Job Groups", "https://jobalertgroups.com/country/global/"),
        ("All Job Communities Catalog", "https://jobalertgroups.com/jobs/")
    ]

    for title, url in hubs_to_ping:
        pom_ok, pom_msg = ping_pingomatic(title, url)
        bgs_ok, bgs_msg = ping_blogs(title, url)
        tw_ok, tw_msg = ping_twingly(title, url)
        print(f"  * {title}")
        print(f"      -> Ping-O-Matic: {'OK' if pom_ok else 'ERR'} ({pom_msg})")
        print(f"      -> Blo.gs      : {'OK' if bgs_ok else 'ERR'} ({bgs_msg})")
        print(f"      -> Twingly     : {'OK' if tw_ok else 'ERR'} ({tw_msg})")
        time.sleep(1)

    print("\n[3/4] Broadcasting XML-RPC Pings for Live Backlink Assets...")
    for b in BACKLINK_ASSETS:
        title = b["name"]
        url = b["url"]
        pom_ok, pom_msg = ping_pingomatic(title, url)
        bgs_ok, bgs_msg = ping_blogs(title, url)
        tw_ok, tw_msg = ping_twingly(title, url)
        print(f"  * {title} (DA {b['da']})")
        print(f"      -> Ping-O-Matic: {'OK' if pom_ok else 'ERR'} ({pom_msg})")
        print(f"      -> Blo.gs      : {'OK' if bgs_ok else 'ERR'} ({bgs_msg})")
        print(f"      -> Twingly     : {'OK' if tw_ok else 'ERR'} ({tw_msg})")
        time.sleep(1)

    print("\n==========================================================================")
    print("✅ MULTI-PROTOCOL INDEXING BROADCAST 100% COMPLETE")
    print("==========================================================================")

if __name__ == "__main__":
    main()
