import { NextResponse } from 'next/server';
import { getAllUsers, getCurrentUser, deleteUser, updateUserName } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const currentUser = getCurrentUser(req);
    const users = getAllUsers(currentUser);
    return NextResponse.json({ users, currentUser });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ users: [], currentUser: null });
    }
    return NextResponse.json({ error: error.message || 'Failed to list users' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = getCurrentUser(req);
    const body = await req.json();
    const { id, name } = body;

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: 'User id and name are required' }, { status: 400 });
    }

    // Authorization check: Verify profile ownership
    const db = getDb();
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentOwner = (currentUser.ownerEmail || currentUser.email).toLowerCase();
    const targetOwner = (targetUser.owner_email || targetUser.email).toLowerCase();

    if (currentOwner !== targetOwner && currentUser.id !== targetUser.id) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to modify this profile' }, { status: 403 });
    }

    const updatedUser = updateUserName(id, name.trim());
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    const status = error.message?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User id required' }, { status: 400 });

    // Authorization check: Verify profile ownership
    const db = getDb();
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentOwner = (currentUser.ownerEmail || currentUser.email).toLowerCase();
    const targetOwner = (targetUser.owner_email || targetUser.email).toLowerCase();

    if (currentOwner !== targetOwner && currentUser.id !== targetUser.id) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this profile' }, { status: 403 });
    }

    deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status });
  }
}

