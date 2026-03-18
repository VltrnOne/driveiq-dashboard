import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Suggestion {
  name: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  menuItemId?: string;
}

export interface SuggestionResult {
  suggestions: Suggestion[];
  usualOrder: { items: string[]; frequency: string } | null;
  greeting: string;
}

interface OrderHistory {
  items: string[];
  total: number;
  createdAt: string;
}

export async function getOrderSuggestions(
  customerName: string,
  orderHistory: OrderHistory[],
  availableItems: string[],
  visitCount: number
): Promise<SuggestionResult> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.SUGGESTIONS_ENABLED === 'false') {
    return { suggestions: [], usualOrder: null, greeting: `Welcome back, ${customerName}!` };
  }

  // Detect "usual order" — most frequent exact item combo
  const fingerprints: Record<string, number> = {};
  for (const order of orderHistory.slice(0, 20)) {
    const fp = [...order.items].sort().join('|');
    fingerprints[fp] = (fingerprints[fp] ?? 0) + 1;
  }
  const topFp = Object.entries(fingerprints).sort((a, b) => b[1] - a[1])[0];
  const threshold = parseFloat(process.env.USUAL_ORDER_THRESHOLD ?? '0.70');
  const usualOrder =
    topFp && topFp[1] / orderHistory.length >= threshold
      ? { items: topFp[0].split('|'), frequency: `${Math.round((topFp[1] / orderHistory.length) * 100)}%` }
      : null;

  const recentItems = orderHistory
    .slice(0, 10)
    .flatMap(o => o.items)
    .join(', ');

  const prompt = `You are a helpful barista assistant at a coffee shop drive-thru.

Customer: ${customerName}
Total visits: ${visitCount}
Recent orders (last 10): ${recentItems || 'none yet'}
${usualOrder ? `Usual order (ordered ${usualOrder.frequency} of the time): ${usualOrder.items.join(', ')}` : ''}
Available menu items: ${availableItems.join(', ')}
Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
Day: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}

Based on this customer's history and the time of day, suggest 3 menu items they might want today.
${usualOrder ? 'Include their usual order as the first suggestion if appropriate.' : ''}

Respond with JSON only, no markdown:
{
  "greeting": "short personalized greeting (1 sentence)",
  "suggestions": [
    { "name": "item name from available items", "reason": "brief reason why", "confidence": "high|medium|low" },
    { "name": "...", "reason": "...", "confidence": "..." },
    { "name": "...", "reason": "...", "confidence": "..." }
  ]
}`;

  try {
    const msg = await client.messages.create({
      model: process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: parseInt(process.env.SUGGESTIONS_MAX_TOKENS ?? '512'),
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());

    return {
      suggestions: parsed.suggestions ?? [],
      usualOrder,
      greeting: parsed.greeting ?? `Welcome back, ${customerName}!`,
    };
  } catch (err) {
    console.error('[suggestions] Claude API error:', err);
    return {
      suggestions: [],
      usualOrder,
      greeting: `Welcome back, ${customerName}!`,
    };
  }
}
