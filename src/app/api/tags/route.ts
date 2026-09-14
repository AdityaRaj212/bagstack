import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const service = new FinanceService();
    const tags = service.getTags(user.id);
    return NextResponse.json({ tags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    const service = new FinanceService();
    const tag = service.createTag(user.id, body.name, body.color);
    return NextResponse.json({ success: true, tag }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create tag' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Tag id is required' }, { status: 400 });
    }

    const service = new FinanceService();
    service.deleteTag(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete tag' }, { status: 500 });
  }
}
