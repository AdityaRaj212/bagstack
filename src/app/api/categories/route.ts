import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const service = new FinanceService();
    const result = service.getCategories(user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch categories');
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const service = new FinanceService();
    const category = service.createCategory(user.id, {
      name: body.name,
      type: body.type,
      parentId: body.parentId,
      isSubcategory: body.isSubcategory,
      icon: body.icon,
      color: body.color,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Failed to create category');
  }
}

export async function PUT(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Category id is required' }, { status: 400 });
    }

    const service = new FinanceService();
    const category = service.updateCategory(user.id, body.id, {
      name: body.name,
      parentId: body.parentId,
      icon: body.icon,
      color: body.color,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({ category });
  } catch (error: any) {
    return handleApiError(error, 'Failed to update category');
  }
}

export async function DELETE(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Category id is required' }, { status: 400 });
    }

    const service = new FinanceService();
    service.deleteCategory(user.id, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete category');
  }
}
