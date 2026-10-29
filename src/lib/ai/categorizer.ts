import type { LlmProvider } from './provider';
import { CategorizationSchema } from './schemas';
import { CATEGORIZE_SYSTEM } from './prompts';

export interface CategoryOption {
  id: string;
  name: string;
  type: 'expense' | 'income' | string;
  parent_id?: string | null;
}

export interface CategorizeRow {
  index: number;
  merchant: string;
  direction: 'debit' | 'credit';
}

/**
 * Asks the model for a category per row, then keeps only answers that name a
 * category from the user's own list with the right income/expense type.
 * Anything else becomes "uncategorised" rather than an invented category.
 */
export async function categorizeWithLlm(
  provider: LlmProvider,
  categories: CategoryOption[],
  rows: CategorizeRow[]
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  if (rows.length === 0 || categories.length === 0) return result;

  const byId = new Map(categories.map(c => [c.id, c]));
  const nameOf = (id?: string | null) => (id ? byId.get(id)?.name ?? null : null);
  const payload = {
    categories: categories.map(c => ({ id: c.id, name: c.name, parent: nameOf(c.parent_id), type: c.type })),
    rows,
  };

  const response = await provider.generateStructured({
    task: 'categorize',
    system: CATEGORIZE_SYSTEM,
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    schema: CategorizationSchema,
  });

  const rowByIndex = new Map(rows.map(r => [r.index, r]));
  for (const a of CategorizationSchema.parse(response.data).assignments) {
    const row = rowByIndex.get(a.index);
    const cat = a.category_id ? byId.get(a.category_id) : undefined;
    if (!row || !cat) continue;
    const expected = row.direction === 'credit' ? 'income' : 'expense';
    if (cat.type !== expected) continue;
    result.set(a.index, cat.id);
  }
  return result;
}
