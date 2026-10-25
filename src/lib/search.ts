export interface SearchEntry {
  title: string;
  description: string;
  category: string;
  tags: string[];
  date: string;
  url: string;
  body: string;
}
export function tokenize(query: string): string[] {
  return [...new Set(query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean))].slice(0, 12);
}
const normalize = (s: string) => s.normalize('NFKC').toLocaleLowerCase();
export function searchEntries(entries: SearchEntry[], query: string): SearchEntry[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  return entries.map((entry, index) => {
    const fields = [entry.title, entry.description, `${entry.category} ${entry.tags.join(' ')}`, entry.body].map(normalize);
    let score = 0;
    for (const token of tokens) {
      const matches = fields.map(field => field.includes(token));
      if (!matches.some(Boolean)) return { entry, index, score: 0 };
      score += (matches[0] ? 20 : 0) + (matches[1] ? 8 : 0) + (matches[2] ? 5 : 0) + (matches[3] ? 1 : 0);
    }
    return { entry, index, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.entry);
}
export function excerpt(body: string, query: string, size = 150): string {
  const tokens = tokenize(query);
  const normalized = normalize(body);
  const positions = tokens.map(token => normalized.indexOf(token)).filter(n => n >= 0);
  const start = positions.length ? Math.max(0, Math.min(...positions) - 35) : 0;
  return `${start ? '…' : ''}${body.slice(start, start + size)}${body.length > start + size ? '…' : ''}`;
}
