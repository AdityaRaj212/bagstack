import { describe, it, expect } from 'vitest';
import { runEval } from './eval/run-eval';

/**
 * CI guard over the labelled eval set, using the offline provider (no API key).
 * The headline invariant: no posting that fails to match a labelled, postable
 * row may reach the ledger, even with simulated model errors injected.
 */
describe('AI import eval (offline provider)', () => {
  it('posts nothing unreconciled on the clean eval set and answers every NL question', async () => {
    const { summary } = await runEval({ provider: 'offline', faults: false });
    expect(summary.samples).toBeGreaterThanOrEqual(30);
    expect(summary.errors).toBe(0);
    expect(summary.unreconciledPostings).toBe(0);
    expect(summary.nl.questions).toBe(20);
    expect(summary.nl.resultAccuracy).toBe('100.0%');
  }, 60_000);

  it('posts nothing unreconciled when model errors are injected', async () => {
    const { summary } = await runEval({ provider: 'offline', faults: true, skipNl: true });
    expect(summary.faultsInjected).toBeGreaterThan(40);
    expect(summary.unreconciledPostings).toBe(0);
  }, 60_000);
});
