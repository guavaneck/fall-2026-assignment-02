import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BudgetLimitStrategy } from '../src/strategies/BudgetLimitStrategy.js';
import { BudgetService } from '../src/services/BudgetService.js';
import { Transaction } from '../src/models.js';

describe('BudgetLimitStrategy (Feature 1)', () => {
  let strategy: BudgetLimitStrategy;

  beforeEach(() => {
    strategy = new BudgetLimitStrategy();
    vi.restoreAllMocks();
  });

  it('should group expenses correctly by category and sum them', async () => {
    vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue({
      Food: 500,
      Rent: 1000,
    });
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -75,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -25,
        category: 'Food',
        description: 'Lunch',
        status: 'completed',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: 200,
        category: 'Food',
        description: 'Refund',
        status: 'completed',
      },
      {
        id: '4',
        date: '2026-05-04',
        amount: -900,
        category: 'Rent',
        description: 'Apartment',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(transactions);

    expect(result).toContain('Food: Budget $500.00 | Actual $100.00');
    expect(result).toContain('Rent: Budget $1000.00 | Actual $900.00');
  });

  it('should calculate absolute overage amounts and percentage exceeded', async () => {
    vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue({
      Food: 100,
    });
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -150,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(transactions);

    expect(result).toContain('Food: OVER BUDGET by $50.00 (150.0% of budget)');
  });

  it('should list the specific transactions contributing to categories that are over budget', async () => {
    vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue({
      Food: 100,
      Rent: 1000,
    });
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -80,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -40,
        category: 'Food',
        description: 'Dinner',
        status: 'pending',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: -900,
        category: 'Rent',
        description: 'Apartment',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(transactions);

    expect(result).toContain('- 2026-05-01 | Groceries | $80.00 | completed');
    expect(result).toContain('- 2026-05-02 | Dinner | $40.00 | pending');
    expect(result).not.toContain('- 2026-05-03 | Apartment');
  });

  it('should handle scenarios where no categories are over budget', async () => {
    vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue({
      Food: 100,
    });
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -50,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(transactions);

    expect(result).toContain('No categories are over budget.');
    expect(result).toContain('No over-budget transactions.');
  });

  it('should handle empty transaction list gracefully', async () => {
    const spy = vi
      .spyOn(BudgetService, 'getCategoryBudgets')
      .mockResolvedValue({ Food: 100 });

    const result = await strategy.execute([]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toContain('Food: Budget $100.00 | Actual $0.00');
    expect(result).toContain('No categories are over budget.');
  });
});
