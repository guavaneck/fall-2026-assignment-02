import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnomalyDetectionStrategy } from '../src/strategies/AnomalyDetectionStrategy.js';
import { AnomalyRulesService } from '../src/services/AnomalyRulesService.js';
import { AnomalyRules, Transaction } from '../src/models.js';

describe('AnomalyDetectionStrategy (Feature 2)', () => {
  let strategy: AnomalyDetectionStrategy;

  beforeEach(() => {
    strategy = new AnomalyDetectionStrategy();
    vi.restoreAllMocks();

  });

  // Example of how to write and mock in your tests:
  //
  // it('should detect outlier transactions exceeding threshold', async () => {
  //   const mockRules = { maxTransactionAmount: 500.00, flaggedStatuses: ['flagged'] };
  //   const spy = vi.spyOn(AnomalyRulesService, 'getRules').mockResolvedValue(mockRules);
  //
    const testTransactions: Transaction[] = [
      //Normal
      { id: '0', date: '2026-05-01', amount: -50.0, category: 'Food', description: 'Grocery', status: 'completed' },
            
      //Outliters
      { id: '2', date: '2026-05-01', amount: -1200.0, category: 'Housing', description: 'Rent', status: 'completed' },
      { id: '1', date: '2026-05-01', amount: -600.00, category: 'Shopping', description: 'Laptop', status: 'completed' }, // Outlier

        // Duplicate set 1 (pair)
      { id: '5', date: '2026-05-03', amount: -5.0, category: 'Food', description: 'Coffee', status: 'completed' },
      { id: '6', date: '2026-05-03', amount: -5.0, category: 'Food', description: 'Coffee', status: 'completed' },

       // Duplicate set 2 (three of the same)
      { id: '7', date: '2026-05-04', amount: -15.99, category: 'Entertainment', description: 'Netflix', status: 'completed' },
      { id: '8', date: '2026-05-04', amount: -15.99, category: 'Entertainment', description: 'Netflix', status: 'completed' },
      { id: '9', date: '2026-05-04', amount: -15.99, category: 'Entertainment', description: 'Netflix', status: 'completed' },

      // Flagged by status
      { id: '10', date: '2026-05-05', amount: -50.0, category: 'Misc', description: 'Unknown Charge', status: 'flagged' },
      { id: '11', date: '2026-05-05', amount: -75.0, category: 'Misc', description: 'Gift Card', status: 'flagged' },
    ];
  
  //
  //   const result = await strategy.execute(testTransactions);
  //
  //   expect(spy).toHaveBeenCalled();
  //   expect(result).toContain('Laptop');
  //   expect(result).toContain('Outlier');
  // });


it('should detect outlier transactions exceeding threshold', async () => {
  const mockRules = { maxTransactionAmount: 500.0, flaggedStatuses: ['flagged'] };
  const spy = vi.spyOn(AnomalyRulesService, 'getRules').mockResolvedValue(mockRules);

  const result = await strategy.execute(testTransactions);

  expect(spy).toHaveBeenCalled();
  expect(result).toContain('Laptop');   // the outlier shows up
  expect(result).not.toContain('Grocery'); // the normal one doesn't
});

  it('should identify duplicate transactions sharing identical date, amount, category, and description',
    async () => {
      const mockRules = { maxTransactionAmount: 500.0, flaggedStatuses: ['flagged'] };
      const spy = vi.spyOn(AnomalyRulesService, 'getRules').mockResolvedValue(mockRules);

      const result = await strategy.execute(testTransactions);

      expect(result).toContain('Coffee');
      expect(result).toContain('Netflix');
    });

  it('should flag transactions matching standard flagged statuses in the rules',
    async () => {
      const mockRules = { maxTransactionAmount: 500.0, flaggedStatuses: ['flagged'] };
      const spy = vi.spyOn(AnomalyRulesService, 'getRules').mockResolvedValue(mockRules);

      const result = await strategy.execute(testTransactions);

      expect(result).toContain('Unknown Charge');
      expect(result).toContain('Gift Card');
    });

  it('should calculate correct transaction anomaly rates and total flagged valuation',
    async () => {
      const mockRules = { maxTransactionAmount: 500.0, flaggedStatuses: ['flagged'] };
      const spy = vi.spyOn(AnomalyRulesService, 'getRules').mockResolvedValue(mockRules);

      const result = await strategy.execute(testTransactions);
      
      // Assuming the report includes these metrics in a specific format
      expect(result).toContain('Anomaly Rate: 90%'); // Example expected output
      expect(result).toContain('Total Flagged Value: $-125'); // Example expected output
    }
  );

  it('should output a clean, readable text audit report detailing warnings',
    async () => {
      const mockRules = { maxTransactionAmount: 500.0, flaggedStatuses: ['flagged'] };
      const spy = vi.spyOn(AnomalyRulesService, 'getRules').mockResolvedValue(mockRules);

      const result = await strategy.execute(testTransactions);

      expect(result).toContain('Anomaly Detection Report');
      expect(result).toContain('Outliers (over $500):');
      expect(result).toContain('Duplicate Transactions:');
      expect(result).toContain('Flagged Transactions:');
    }
  );

  it('should handle empty transaction lists gracefully', async () => {
    const result = await strategy.execute([]);
    const mockRules = { maxTransactionAmount: 500.0, flaggedStatuses: ['flagged'] };
    const spy = vi.spyOn(AnomalyRulesService, 'getRules').mockResolvedValue(mockRules);

    expect(result).toContain('Total Transactions: 0');
    expect(result).toContain('Total Anomalies: 0');
    expect(result).toContain('Anomaly Rate: 0%');
  }
  );
});
