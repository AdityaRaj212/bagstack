import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const db = getDb();

    const categories = db.prepare(`
      SELECT * FROM categories 
      WHERE (user_id = ? OR id LIKE 'cat-%') AND archived = 0
      ORDER BY sort_order ASC, name ASC
    `).all(user.id) as any[];

    // Structure into parent and subcategories
    const parents = categories.filter(c => !c.parent_id);
    const tree = parents.map(p => ({
      ...p,
      subcategories: categories.filter(c => c.parent_id === p.id),
    }));

    return NextResponse.json({ categories, tree });
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch categories');
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();
    const db = getDb();

    if (!body.name || !body.type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO categories (id, user_id, parent_id, name, type, icon, color, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      user.id,
      body.parentId || null,
      body.name,
      body.type,
      body.icon || 'tag',
      body.color || '#6B7280',
      body.sortOrder || 99
    );

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Failed to create category');
  }
}
