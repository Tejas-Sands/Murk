// Generative SVG logic for Murk Settlement Receipt NFTs

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function getTier(createdMs: number, deadlineMs: number, settledMs: number) {
  const delta = deadlineMs - settledMs;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  if (delta > ONE_DAY) return { name: 'PLATINUM', colors: ['#e2e8f0', '#94a3b8', '#f8fafc'], accent: '#818cf8' }; // early
  if (delta >= 0) return { name: 'GOLD', colors: ['#fef08a', '#eab308', '#ca8a04'], accent: '#fbbf24' }; // on time
  if (delta > -ONE_DAY) return { name: 'SILVER', colors: ['#cbd5e1', '#64748b', '#475569'], accent: '#94a3b8' }; // slightly late
  return { name: 'BRONZE', colors: ['#fed7aa', '#ea580c', '#c2410c'], accent: '#f97316' }; // late
}

export function generateReceiptSVG(params: {
  invoiceId: string;
  payer: string;
  payee: string;
  createdMs: number;
  deadlineMs: number;
  settledMs: number;
}): string {
  const { invoiceId, payer, payee, createdMs, deadlineMs, settledMs } = params;
  
  const tier = getTier(createdMs, deadlineMs, settledMs);
  const seed = hashString(invoiceId + payer + payee);
  
  // Deterministic values based on seed
  const p1x = 20 + (seed % 60);
  const p1y = 20 + ((seed >> 2) % 60);
  const p2x = 80 - (seed % 40);
  const p2y = 80 - ((seed >> 4) % 40);
  
  // Color palette generated from addresses
  const bg1 = `hsl(${hashString(payer) % 360}, 40%, 12%)`;
  const bg2 = `hsl(${hashString(payee) % 360}, 50%, 8%)`;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}" />
      <stop offset="100%" stop-color="${bg2}" />
    </linearGradient>
    <linearGradient id="tierGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${tier.colors[0]}" />
      <stop offset="50%" stop-color="${tier.colors[1]}" />
      <stop offset="100%" stop-color="${tier.colors[2]}" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="400" height="500" fill="url(#bg)" rx="24" />

  <!-- Abstract Generative Pattern -->
  <g opacity="0.15">
    <circle cx="200" cy="250" r="150" fill="none" stroke="${tier.accent}" stroke-width="2" />
    <circle cx="200" cy="250" r="120" fill="none" stroke="${tier.accent}" stroke-width="1" stroke-dasharray="4 4" />
    <path d="M 50 ${p1y * 2} Q 200 ${p2y * 2} 350 ${p1x * 2}" fill="none" stroke="${tier.accent}" stroke-width="3" />
    <path d="M 50 ${p2x * 2} Q 200 ${p1x * 2} 350 ${p2y * 2}" fill="none" stroke="${tier.accent}" stroke-width="1" />
  </g>

  <!-- Header -->
  <text x="30" y="50" font-family="monospace" font-size="12" fill="#94a3b8" letter-spacing="2">MURK PROTOCOL</text>
  <text x="370" y="50" font-family="monospace" font-size="12" fill="${tier.accent}" font-weight="bold" text-anchor="end" filter="url(#glow)">${tier.name} RECEIPT</text>
  
  <line x1="30" y1="70" x2="370" y2="70" stroke="#334155" stroke-width="1" />

  <!-- Main Content -->
  <text x="30" y="120" font-family="sans-serif" font-size="14" fill="#64748b">Settlement ID</text>
  <text x="30" y="145" font-family="monospace" font-size="16" fill="#f8fafc">${invoiceId.slice(0, 10)}...${invoiceId.slice(-8)}</text>

  <g transform="translate(0, 200)">
    <rect x="30" y="0" width="340" height="120" rx="12" fill="#0f172a" stroke="#1e293b" />
    
    <text x="50" y="30" font-family="sans-serif" font-size="12" fill="#64748b">Payer</text>
    <text x="50" y="50" font-family="monospace" font-size="14" fill="#cbd5e1">${payer.slice(0, 8)}...${payer.slice(-6)}</text>
    
    <text x="50" y="80" font-family="sans-serif" font-size="12" fill="#64748b">Payee</text>
    <text x="50" y="100" font-family="monospace" font-size="14" fill="#cbd5e1">${payee.slice(0, 8)}...${payee.slice(-6)}</text>

    <!-- Connection Line -->
    <path d="M 280 40 Q 310 60 280 90" fill="none" stroke="url(#tierGrad)" stroke-width="3" stroke-linecap="round" />
    <circle cx="280" cy="40" r="4" fill="${tier.colors[0]}" />
    <circle cx="280" cy="90" r="4" fill="${tier.colors[2]}" />
  </g>

  <!-- Confidentiality Banner -->
  <rect x="30" y="350" width="340" height="40" rx="8" fill="#1e1b4b" />
  <text x="200" y="375" font-family="sans-serif" font-size="12" fill="#a5b4fc" text-anchor="middle" font-weight="bold" letter-spacing="1">ZERO-KNOWLEDGE COMMITMENT VERIFIED</text>

  <!-- Footer -->
  <line x1="30" y1="430" x2="370" y2="430" stroke="#334155" stroke-width="1" />
  
  <text x="30" y="460" font-family="monospace" font-size="10" fill="#64748b">SETTLED: ${new Date(settledMs).toISOString().split('T')[0]}</text>
  <text x="370" y="460" font-family="monospace" font-size="10" fill="#64748b" text-anchor="end">ON-CHAIN PRIVACY</text>
</svg>
  `.trim();

  // Return base64 encoded SVG ready to be used as an image src
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
