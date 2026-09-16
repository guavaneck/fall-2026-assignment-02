import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrendAnalysisStrategy } from '../src/strategies/TrendAnalysisStrategy.js';
import { HistoricalDataService } from '../src/services/HistoricalDataService.js';
import { Transaction } from '../src/models.js';

describe('TrendAnalysisStrategy (Feature 3)', () => {
  let strategy: TrendAnalysisStrategy;

  beforeEach(() => {
    strategy = new TrendAnalysisStrategy();
    vi.restoreAllMocks();
  });

  it('groups expenses, excludes income, and calculates variance percentages', async () => {
    const spy = vi
      .spyOn(HistoricalDataService, 'getHistoricalAverages')
      .mockResolvedValue({ Food: 200, Rent: 1000 });
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -150,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -100,
        category: 'Food',
        description: 'Takeout',
        status: 'completed',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: 500,
        category: 'Food',
        description: 'Paycheck',
        status: 'completed',
      },
      {
        id: '4',
        date: '2026-05-04',
        amount: -1000,
        category: 'Rent',
        description: 'Apartment',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(transactions);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toContain('Food | $250.00 | $200.00 | +25.0%');
    expect(result).toContain('Rent | $1000.00 | $1000.00 | 0.0%');
    expect(result).not.toContain('$750.00');
  });

  it('highlights growth and savings only when variance exceeds 20 percent', async () => {
    vi.spyOn(HistoricalDataService, 'getHistoricalAverages').mockResolvedValue({
      Food: 100,
      Shopping: 100,
      Rent: 1000,
    });
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -125,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -70,
        category: 'Shopping',
        description: 'Clothes',
        status: 'completed',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: -1250,
        category: 'Rent',
        description: 'Apartment',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(transactions);

    expect(result).toContain('Significant Growth Categories');
    expect(result).toContain('- Food: +25.0%');
    expect(result).toContain('- Rent: +25.0%');
    expect(result).toContain('Significant Savings Categories');
    expect(result).toContain('- Shopping: -30.0%');
  });

  it('handles empty expenses and missing or zero historical benchmarks', async () => {
    vi.spyOn(HistoricalDataService, 'getHistoricalAverages').mockResolvedValue({
      Food: 0,
    });
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -25,
        category: 'Travel',
        description: 'Train',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: 100,
        category: 'Income',
        description: 'Paycheck',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(transactions);

    expect(result).toContain('Travel | $25.00 | N/A | N/A');
    expect(result).not.toContain('Income');
    expect(result).toContain('Significant Growth Categories\nNone');
    expect(result).toContain('Significant Savings Categories\nNone');
  });
});
