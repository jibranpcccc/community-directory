import dns from "dns";
import { promisify } from "util";

const resolve4 = promisify(dns.resolve4);
const resolveNs = promisify(dns.resolveNs);

const nameserversToTest = [
  { label: "p01 NS1", ip: "198.51.44.1" }, // dns1.p01.nsone.net
  { label: "p01 NS2", ip: "198.51.45.1" }, // dns2.p01.nsone.net
  { label: "p02 NS1", ip: "198.51.44.2" }, // dns1.p02.nsone.net
  { label: "p02 NS2", ip: "198.51.45.2" }, // dns2.p02.nsone.net
  { label: "p03 NS1", ip: "198.51.44.3" }, // dns1.p03.nsone.net
  { label: "p04 NS1", ip: "198.51.44.4" }, // dns1.p04.nsone.net
  { label: "p05 NS1", ip: "198.51.44.5" }, // dns1.p05.nsone.net
  { label: "p06 NS1", ip: "198.51.44.6" }, // dns1.p06.nsone.net
  { label: "p07 NS1", ip: "198.51.44.7" }, // dns1.p07.nsone.net
  { label: "p08 NS1", ip: "198.51.44.8" }, // dns1.p08.nsone.net
];

async function main() {
  console.log("Checking which Netlify NameServer pool hosts jobalertgroups.com...\n");
  for (const ns of nameserversToTest) {
    dns.setServers([ns.ip]);
    try {
      const ips = await resolve4("jobalertgroups.com");
      console.log(`✅ [${ns.label} (${ns.ip})]: AUTHORITATIVE! Resolved -> ${ips.join(", ")}`);
    } catch (err) {
      console.log(`❌ [${ns.label} (${ns.ip})]: ${err.code || err.message}`);
    }
  }
}

main();
