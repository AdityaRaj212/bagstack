import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { rateLimiter } from '@/lib/rate-limiter';
import { askQuestion, checkDailyBudget, createProvider, resolveProviderName } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Lets the UI show which provider is active and whether PDFs/images are supported. */
export async function GET(req: Request) {
  try {
    getCurrentUser(req);
    const provider = resolveProviderName();
    return NextResponse.json({
      provider,
      model: provider === 'anthropic' ? process.env.AI_MODEL || 'claude-opus-5-5' : 'offline',
      supportsBinaryInput: provider === 'anthropic',
    });
  } catch (error: any) {
    return handleApiError(error, 'Failed to load AI status');
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const limit = rateLimiter.check(`ai:ask:${user.id}`, 20, 60_000);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many questions. Please wait a minute.' }, { status: 429 });
    const db = getDb();
    const budget = checkDailyBudget(db, user.id);
    if (budget) return NextResponse.json({ error: budget }, { status: 429 });

    const { question } = await req.json();
    if (typeof question !== 'string') return NextResponse.json({ error: 'question is required' }, { status: 400 });

    // userId comes only from the verified session; the model never sees or supplies it
    const result = await askQuestion(createProvider(db, user.id), db, user.id, question, today(), user.baseCurrency);
    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error, 'Question failed');
  }
}
