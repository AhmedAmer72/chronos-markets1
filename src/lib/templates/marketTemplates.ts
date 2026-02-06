/**
 * Market Templates
 * 
 * Pre-built templates for common prediction market types.
 * Helps users quickly create markets for elections, sports, crypto, etc.
 */

export interface MarketTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  questionTemplate: string;
  defaultDuration: number; // Days
  suggestedLiquidity: string;
  examples: string[];
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  placeholder: string;
  type: 'text' | 'date' | 'number' | 'select';
  options?: string[]; // For select type
  required: boolean;
}

export const MARKET_TEMPLATES: MarketTemplate[] = [
  // Politics
  {
    id: 'election-winner',
    name: 'Election Winner',
    description: 'Predict the winner of an election',
    icon: '🗳️',
    category: 'Politics',
    questionTemplate: 'Will {candidate} win the {election} election?',
    defaultDuration: 365,
    suggestedLiquidity: '1000',
    examples: [
      'Will Biden win the 2024 US Presidential election?',
      'Will Labour win the UK General Election?',
    ],
    variables: [
      { name: 'candidate', placeholder: 'Candidate name', type: 'text', required: true },
      { name: 'election', placeholder: 'Election name', type: 'text', required: true },
    ],
  },
  {
    id: 'policy-pass',
    name: 'Policy/Bill Pass',
    description: 'Will a specific policy or bill pass?',
    icon: '📜',
    category: 'Politics',
    questionTemplate: 'Will {bill} pass by {date}?',
    defaultDuration: 180,
    suggestedLiquidity: '500',
    examples: [
      'Will the Infrastructure Bill pass by December 2024?',
      'Will the EU AI Act be approved by Q2 2024?',
    ],
    variables: [
      { name: 'bill', placeholder: 'Bill/Policy name', type: 'text', required: true },
      { name: 'date', placeholder: 'Target date', type: 'text', required: true },
    ],
  },
  
  // Sports
  {
    id: 'match-winner',
    name: 'Match Winner',
    description: 'Predict the winner of a sports match',
    icon: '🏆',
    category: 'Sports',
    questionTemplate: 'Will {team} beat {opponent} in {event}?',
    defaultDuration: 7,
    suggestedLiquidity: '500',
    examples: [
      'Will Manchester United beat Liverpool in the Premier League?',
      'Will Lakers beat Celtics in the NBA Finals?',
    ],
    variables: [
      { name: 'team', placeholder: 'Team 1', type: 'text', required: true },
      { name: 'opponent', placeholder: 'Team 2', type: 'text', required: true },
      { name: 'event', placeholder: 'Event/League', type: 'text', required: true },
    ],
  },
  {
    id: 'championship',
    name: 'Championship Winner',
    description: 'Who will win the championship?',
    icon: '🥇',
    category: 'Sports',
    questionTemplate: 'Will {team} win the {championship}?',
    defaultDuration: 365,
    suggestedLiquidity: '1000',
    examples: [
      'Will Real Madrid win the Champions League 2024?',
      'Will Chiefs win Super Bowl LIX?',
    ],
    variables: [
      { name: 'team', placeholder: 'Team name', type: 'text', required: true },
      { name: 'championship', placeholder: 'Championship name', type: 'text', required: true },
    ],
  },
  {
    id: 'player-stat',
    name: 'Player Statistics',
    description: 'Will a player achieve a statistical milestone?',
    icon: '📊',
    category: 'Sports',
    questionTemplate: 'Will {player} score {stat} in {event}?',
    defaultDuration: 30,
    suggestedLiquidity: '300',
    examples: [
      'Will Haaland score 30+ Premier League goals this season?',
      'Will Curry make 400+ three-pointers this season?',
    ],
    variables: [
      { name: 'player', placeholder: 'Player name', type: 'text', required: true },
      { name: 'stat', placeholder: 'Statistic target', type: 'text', required: true },
      { name: 'event', placeholder: 'Season/Event', type: 'text', required: true },
    ],
  },
  
  // Crypto
  {
    id: 'price-above',
    name: 'Price Above',
    description: 'Will a crypto asset be above a price?',
    icon: '📈',
    category: 'Crypto',
    questionTemplate: 'Will {asset} be above ${price} by {date}?',
    defaultDuration: 30,
    suggestedLiquidity: '1000',
    examples: [
      'Will BTC be above $100k by December 2024?',
      'Will ETH be above $5,000 by Q1 2025?',
    ],
    variables: [
      { name: 'asset', placeholder: 'Asset (BTC, ETH, etc.)', type: 'text', required: true },
      { name: 'price', placeholder: 'Target price', type: 'number', required: true },
      { name: 'date', placeholder: 'Target date', type: 'text', required: true },
    ],
  },
  {
    id: 'etf-approval',
    name: 'ETF Approval',
    description: 'Will a crypto ETF be approved?',
    icon: '📋',
    category: 'Crypto',
    questionTemplate: 'Will {asset} spot ETF be approved by {date}?',
    defaultDuration: 180,
    suggestedLiquidity: '2000',
    examples: [
      'Will Ethereum spot ETF be approved by July 2024?',
      'Will Solana ETF be approved in 2025?',
    ],
    variables: [
      { name: 'asset', placeholder: 'Asset name', type: 'text', required: true },
      { name: 'date', placeholder: 'Target date', type: 'text', required: true },
    ],
  },
  {
    id: 'market-cap',
    name: 'Market Cap',
    description: 'Will an asset reach a market cap milestone?',
    icon: '💰',
    category: 'Crypto',
    questionTemplate: 'Will {asset} reach ${marketCap} market cap by {date}?',
    defaultDuration: 90,
    suggestedLiquidity: '500',
    examples: [
      'Will Bitcoin reach $2T market cap by 2025?',
      'Will Solana reach $100B market cap?',
    ],
    variables: [
      { name: 'asset', placeholder: 'Asset name', type: 'text', required: true },
      { name: 'marketCap', placeholder: 'Target market cap', type: 'text', required: true },
      { name: 'date', placeholder: 'Target date', type: 'text', required: true },
    ],
  },
  
  // Technology
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Will a product launch by a date?',
    icon: '🚀',
    category: 'Technology',
    questionTemplate: 'Will {company} launch {product} by {date}?',
    defaultDuration: 180,
    suggestedLiquidity: '500',
    examples: [
      'Will Apple launch Apple Car by 2026?',
      'Will Tesla launch Robotaxi by 2025?',
    ],
    variables: [
      { name: 'company', placeholder: 'Company name', type: 'text', required: true },
      { name: 'product', placeholder: 'Product name', type: 'text', required: true },
      { name: 'date', placeholder: 'Target date', type: 'text', required: true },
    ],
  },
  {
    id: 'ai-milestone',
    name: 'AI Milestone',
    description: 'Will an AI milestone be achieved?',
    icon: '🤖',
    category: 'Technology',
    questionTemplate: 'Will {milestone} be achieved by {date}?',
    defaultDuration: 365,
    suggestedLiquidity: '1000',
    examples: [
      'Will GPT-5 be released in 2024?',
      'Will AGI be achieved by 2030?',
    ],
    variables: [
      { name: 'milestone', placeholder: 'AI milestone', type: 'text', required: true },
      { name: 'date', placeholder: 'Target date', type: 'text', required: true },
    ],
  },
  
  // Entertainment
  {
    id: 'award-winner',
    name: 'Award Winner',
    description: 'Who will win an award?',
    icon: '🏆',
    category: 'Entertainment',
    questionTemplate: 'Will {nominee} win {award}?',
    defaultDuration: 365,
    suggestedLiquidity: '500',
    examples: [
      'Will Oppenheimer win Best Picture at the Oscars?',
      'Will Taylor Swift win Grammy Album of the Year?',
    ],
    variables: [
      { name: 'nominee', placeholder: 'Nominee name', type: 'text', required: true },
      { name: 'award', placeholder: 'Award name', type: 'text', required: true },
    ],
  },
  {
    id: 'box-office',
    name: 'Box Office',
    description: 'Will a movie hit a box office target?',
    icon: '🎬',
    category: 'Entertainment',
    questionTemplate: 'Will {movie} gross ${amount} at the box office?',
    defaultDuration: 90,
    suggestedLiquidity: '500',
    examples: [
      'Will Avatar 3 gross $2B at the box office?',
      'Will Deadpool 3 gross $1B worldwide?',
    ],
    variables: [
      { name: 'movie', placeholder: 'Movie name', type: 'text', required: true },
      { name: 'amount', placeholder: 'Box office target', type: 'text', required: true },
    ],
  },
  
  // Custom
  {
    id: 'yes-no-custom',
    name: 'Custom Yes/No',
    description: 'Create any yes/no prediction market',
    icon: '✨',
    category: 'Other',
    questionTemplate: '{question}',
    defaultDuration: 30,
    suggestedLiquidity: '100',
    examples: [
      'Will it rain in NYC on July 4th 2024?',
      'Will the new iPhone have a USB-C port?',
    ],
    variables: [
      { name: 'question', placeholder: 'Your question (must end with ?)', type: 'text', required: true },
    ],
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): MarketTemplate | undefined {
  return MARKET_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): MarketTemplate[] {
  return MARKET_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all unique categories
 */
export function getTemplateCategories(): string[] {
  return [...new Set(MARKET_TEMPLATES.map(t => t.category))];
}

/**
 * Fill template with variables
 */
export function fillTemplate(template: MarketTemplate, variables: Record<string, string>): string {
  let question = template.questionTemplate;
  for (const [key, value] of Object.entries(variables)) {
    question = question.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return question;
}

/**
 * Calculate end date from duration
 */
export function calculateEndDate(durationDays: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + durationDays);
  return date;
}
