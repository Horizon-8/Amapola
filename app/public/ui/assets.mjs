export function createAssetsUI() {
  const icons = {
   calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2"/>',
   users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
   plan:'<rect x="5" y="4" width="15" height="18" rx="2"/><path d="M9 2h7v4H9zM9 11h7m-7 5h7"/>',
   chart:'<path d="M4 3v17h17M8 16v-5m5 5V7m5 9V4"/>',
   settings:'<path d="m9 3-.5 2-2 .9-1.9-.6-2 3.4L4 10v2l-1.4 1.3 2 3.4 1.9-.5 2 .9.5 2h4l.5-2 2-.9 1.9.5 2-3.4L20 12v-2l1.4-1.3-2-3.4-1.9.6-2-.9-.5-2z"/><circle cx="12" cy="11" r="3"/>',
   plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
   question:'<path d="M8 7a4 4 0 0 1 8 0c0 3-4 3-4 6m0 5v.1"/>',
   cancel:'<path d="m4 4 16 16M4 20 20 4"/>',
   checks:'<path d="m2 12 4 4L16 6m-5 10L21 6"/>',
   dollar:'<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6m6-17v20"/>',
   left:'<path d="m14 6-6 6 6 6"/>', right:'<path d="m10 6 6 6-6 6"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>',
   edit:'<path d="m16 3 5 5-12 12-6 1 1-6zM14 5l5 5"/>', trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
   online:'<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M12 16v5m-5 0h10M8 12h8"/>',
   home:'<path d="m3 11 9-8 9 8M5 10v11h14V10m-10 11v-7h6v7"/>',
   travel:'<path d="m5 7 2-4h10l2 4m-16 3 2-3h14l2 3v8H3zm2 8v3m14-3v3M7 13h1m8 0h1"/>',
   clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', money:'<rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
   moon:'<path d="M20.8 13a9 9 0 0 1-9.8-9.8A9 9 0 1 0 20.8 13Z"/>',
   sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
   system:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4m-4 0h8"/>',
   download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>', cloud:'<path d="M7 18a5 5 0 1 1 0-10 6 6 0 0 1 11-2 5 5 0 0 1 0 12m-6 3V11m-4 4 4-4 4 4"/>',
   info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>', check:'<path d="m5 12 4 4L19 6"/>',
   repeat:'<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
   power:'<path d="M12 2v10M5 5a9 9 0 1 0 14 0"/>', mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
   whatsapp:'<path d="M21 11.5a9 9 0 0 1-13.5 7.8L3 21l1.6-5A9 9 0 1 1 21 11.5Z"/><path d="M8 7c0 5 4 8 8 8l1-2-3-1-1 1-3-3 1-1-1-3Z"/>',
   messenger:'<path d="M21 11a9 8 0 0 1-13 7l-4 2 .5-4A9 8 0 1 1 21 11Z"/><path d="m7 13 4-4 3 3 3-3"/>',
   instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7"/>',
   phone:'<path d="m6 3 4 1-1 5 6 6 5-1 1 4c-3 7-21-11-15-15Z"/>', other:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.info}</svg>`;
  return { icon };
}
