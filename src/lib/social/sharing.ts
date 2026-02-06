/**
 * Social Sharing Service
 * 
 * Twitter/X integration for market sharing.
 */

export interface ShareParams {
  marketId: string;
  question: string;
  price: number;
  position?: 'yes' | 'no';
  pnl?: number;
}

/**
 * Generate share URL for a market
 */
export function getMarketShareUrl(marketId: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chronos.markets';
  return `${baseUrl}/#/market/${marketId}`;
}

/**
 * Generate Twitter/X share text
 */
export function generateShareText(params: ShareParams): string {
  const { question, price, position, pnl } = params;
  const priceDisplay = (price * 100).toFixed(0);
  
  let text = `🔮 ${question}\n\n`;
  text += `📊 Current: ${priceDisplay}¢ YES\n`;
  
  if (position) {
    text += `📈 My position: ${position.toUpperCase()}\n`;
  }
  
  if (pnl !== undefined) {
    const pnlSign = pnl >= 0 ? '+' : '';
    text += `💰 P&L: ${pnlSign}${pnl.toFixed(2)}%\n`;
  }
  
  text += '\nTrade on @ChronosMarkets 🚀';
  
  return text;
}

/**
 * Share to Twitter/X
 */
export function shareToTwitter(params: ShareParams): void {
  const text = generateShareText(params);
  const url = getMarketShareUrl(params.marketId);
  
  const twitterUrl = new URL('https://twitter.com/intent/tweet');
  twitterUrl.searchParams.set('text', text);
  twitterUrl.searchParams.set('url', url);
  
  window.open(twitterUrl.toString(), '_blank', 'width=550,height=420');
}

/**
 * Share via native share API if available
 */
export async function shareNative(params: ShareParams): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }
  
  try {
    await navigator.share({
      title: 'Chronos Markets',
      text: generateShareText(params),
      url: getMarketShareUrl(params.marketId),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy share link to clipboard
 */
export async function copyShareLink(marketId: string): Promise<boolean> {
  try {
    const url = getMarketShareUrl(marketId);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share component for embedding
 */
export function getEmbedCode(marketId: string): string {
  const url = getMarketShareUrl(marketId);
  return `<iframe src="${url}?embed=true" width="400" height="300" frameborder="0"></iframe>`;
}

/**
 * Generate Open Graph meta tags for a market
 */
export function generateOGTags(params: ShareParams): Record<string, string> {
  const url = getMarketShareUrl(params.marketId);
  const priceDisplay = (params.price * 100).toFixed(0);
  
  return {
    'og:title': params.question,
    'og:description': `Current price: ${priceDisplay}¢ YES - Trade on Chronos Markets`,
    'og:url': url,
    'og:type': 'website',
    'og:image': `${url}/og-image.png`, // Would need to generate
    'twitter:card': 'summary_large_image',
    'twitter:site': '@ChronosMarkets',
    'twitter:title': params.question,
    'twitter:description': `${priceDisplay}¢ YES - Trade predictions on Linera blockchain`,
  };
}
