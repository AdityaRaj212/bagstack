import { NextResponse } from 'next/server';
import { getAllUsers, getCurrentUser, deleteUser, updateUserName } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const currentUser = getCurrentUser(req);
    const users = getAllUsers(currentUser);
    return NextResponse.json({ users, currentUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list users' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name } = body;

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: 'User id and name are required' }, { status: 400 });
    }

    const updatedUser = updateUserName(id, name.trim());
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User id required' }, { status: 400 });

    deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}

