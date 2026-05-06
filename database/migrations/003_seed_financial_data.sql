-- ===================================================================
-- GoodDays Application - Seed Financial Data
-- Migration: 003_seed_financial_data.sql
-- Description: Populates financial module with initial data
-- Run: psql -U postgres -d gooddays -f 003_seed_financial_data.sql
-- ===================================================================

BEGIN;

-- ===================================================================
-- FINANCIAL GOALS
-- ===================================================================

INSERT INTO financial_goals (name, target_amount, target_date, is_active)
VALUES
  ('Emergency Fund (6 months)', 180000.00, '2025-12-31', TRUE),
  ('Travel Fund', 50000.00, '2025-06-30', TRUE),
  ('Health Insurance Premium', 25000.00, '2025-03-31', TRUE),
  ('Investment Portfolio', 500000.00, '2026-12-31', TRUE),
  ('Education & Upskilling', 75000.00, '2025-09-30', TRUE)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- INVESTMENT BUCKETS
-- ===================================================================

INSERT INTO investment_buckets (name, category, monthly_target, color_hex, icon, is_active, sort_order)
VALUES
  ('Emergency Fund', 'EMERGENCY_FUND', 15000.00, '#EF4444', 'shield', TRUE, 1),
  ('Health Insurance', 'HEALTH', 5000.00, '#EC4899', 'heart', TRUE, 2),
  ('Travel Fund', 'TRAVEL', 8000.00, '#06B6D4', 'plane', TRUE, 3),
  ('Wealth Building', 'WEALTH', 20000.00, '#10B981', 'trending-up', TRUE, 4),
  ('Trading Account', 'TRADING', 10000.00, '#F59E0B', 'bar-chart-3', TRUE, 5),
  ('Miscellaneous', 'MISCELLANEOUS', 5000.00, '#8B5CF6', 'more-horizontal', TRUE, 6)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- MONTHLY TASKS - EMERGENCY FUND BUCKET
-- ===================================================================

INSERT INTO monthly_tasks (bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active)
SELECT id, 'Emergency Fund Contribution', 'Monthly allocation to emergency fund', 'SIP_PAYMENT', 15000.00, TRUE, 1, TRUE
FROM investment_buckets
WHERE category = 'EMERGENCY_FUND'
ON CONFLICT DO NOTHING;

-- ===================================================================
-- MONTHLY TASKS - HEALTH BUCKET
-- ===================================================================

INSERT INTO monthly_tasks (bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active)
SELECT id, 'Health Insurance Premium', 'Review and pay health insurance', 'INSURANCE_REVIEW', 5000.00, TRUE, 5, TRUE
FROM investment_buckets
WHERE category = 'HEALTH'
ON CONFLICT DO NOTHING;

-- ===================================================================
-- MONTHLY TASKS - TRAVEL BUCKET
-- ===================================================================

INSERT INTO monthly_tasks (bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active)
SELECT id, 'Travel Fund Allocation', 'Monthly savings for travel', 'SIP_PAYMENT', 8000.00, TRUE, 10, TRUE
FROM investment_buckets
WHERE category = 'TRAVEL'
ON CONFLICT DO NOTHING;

-- ===================================================================
-- MONTHLY TASKS - WEALTH BUCKET
-- ===================================================================

INSERT INTO monthly_tasks (bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active)
VALUES
  (
    (SELECT id FROM investment_buckets WHERE category = 'WEALTH'),
    'SIP to Mutual Funds',
    'Systematic Investment Plan - Equity & Debt',
    'SIP_PAYMENT',
    15000.00,
    TRUE,
    1,
    TRUE
  ),
  (
    (SELECT id FROM investment_buckets WHERE category = 'WEALTH'),
    'Portfolio Review',
    'Monthly portfolio performance check',
    'PORTFOLIO_REVIEW',
    0.00,
    TRUE,
    20,
    TRUE
  ),
  (
    (SELECT id FROM investment_buckets WHERE category = 'WEALTH'),
    'Tax Planning Review',
    'Review tax-saving investments',
    'CUSTOM',
    5000.00,
    FALSE,
    NULL,
    TRUE
  )
ON CONFLICT DO NOTHING;

-- ===================================================================
-- MONTHLY TASKS - TRADING BUCKET
-- ===================================================================

INSERT INTO monthly_tasks (bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active)
VALUES
  (
    (SELECT id FROM investment_buckets WHERE category = 'TRADING'),
    'Trading Account Review',
    'Review open positions and P&L',
    'CUSTOM',
    0.00,
    TRUE,
    1,
    TRUE
  ),
  (
    (SELECT id FROM investment_buckets WHERE category = 'TRADING'),
    'Risk Management Check',
    'Check stop-losses and position sizing',
    'CUSTOM',
    0.00,
    TRUE,
    15,
    TRUE
  )
ON CONFLICT DO NOTHING;

-- ===================================================================
-- FINANCIAL RULES - INVESTMENT MINDSET
-- ===================================================================

INSERT INTO financial_rules (title, description, category, display_style, is_active, sort_order)
VALUES
  (
    'Pay Yourself First',
    'Allocate percentages of your income to investment buckets BEFORE spending',
    'INVESTMENT',
    'BANNER',
    TRUE,
    1
  ),
  (
    'Build Emergency Fund First',
    'Maintain 6 months of expenses in emergency fund before aggressive investing',
    'INVESTMENT',
    'CARD',
    TRUE,
    2
  ),
  (
    'Diversification is Key',
    'Spread investments across multiple asset classes: equity, debt, gold, real estate',
    'INVESTMENT',
    'CARD',
    TRUE,
    3
  ),
  (
    'Long-term Focus',
    'Focus on 3-5+ year investment horizon. Ignore short-term market volatility',
    'MINDSET',
    'POPUP',
    TRUE,
    4
  ),
  (
    'Document Your Decisions',
    'Keep records of why you made each investment. Track rationale and results',
    'MINDSET',
    'CARD',
    TRUE,
    5
  ),
  (
    'No Emotional Trading',
    'Never trade based on emotion. Follow your system and rules consistently',
    'TRADING',
    'BANNER',
    TRUE,
    6
  ),
  (
    'Risk Management First',
    'Define stop-losses BEFORE entering any trade. Protect capital first',
    'TRADING',
    'SIDEBAR',
    TRUE,
    7
  ),
  (
    'Spend Less Than You Earn',
    'Basic principle: Track expenses, cut wasteful spending, increase income',
    'LIFESTYLE',
    'CARD',
    TRUE,
    8
  ),
  (
    'Insurance is Risk Transfer',
    'Health, life, and income protection insurance is not an expense, it''s peace of mind',
    'MINDSET',
    'CARD',
    TRUE,
    9
  ),
  (
    'Review Monthly',
    'Spend 30 minutes monthly reviewing progress on all financial goals and buckets',
    'INVESTMENT',
    'POPUP',
    TRUE,
    10
  )
ON CONFLICT DO NOTHING;

-- ===================================================================
-- MONTHLY SNAPSHOTS - SAMPLE DATA (with realistic progression)
-- ===================================================================

INSERT INTO monthly_snapshots (month, year, total_income, total_expenses, total_invested, emergency_fund_balance, travel_fund_balance, portfolio_estimated_value, notes)
VALUES
  (
    1,
    2025,
    200000.00,
    120000.00,
    50000.00,
    50000.00,
    18000.00,
    150000.00,
    'Started emergency fund. Good month overall.'
  ),
  (
    2,
    2025,
    205000.00,
    118000.00,
    52000.00,
    102000.00,
    26000.00,
    165000.00,
    'Doubled emergency fund contributions. Markets performing well.'
  ),
  (
    3,
    2025,
    210000.00,
    125000.00,
    55000.00,
    157000.00,
    34000.00,
    182000.00,
    'On track with all financial goals. Travel fund growing.'
  )
ON CONFLICT (month, year) DO NOTHING;

COMMIT;
