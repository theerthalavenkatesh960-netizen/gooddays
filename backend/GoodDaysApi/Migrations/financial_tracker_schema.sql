-- =====================================================================
-- FINANCIAL LIFE TRACKER - DATABASE SCHEMA
-- =====================================================================
-- PostgreSQL Schema for Financial Planning Module
-- Run this script FIRST before seeding data
-- =====================================================================

-- 1. financial_goals table
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    target_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. investment_buckets table
CREATE TABLE IF NOT EXISTS investment_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'EMERGENCY_FUND',
        'HEALTH',
        'TRAVEL',
        'MISCELLANEOUS',
        'WEALTH',
        'TRADING'
    )),
    monthly_target DECIMAL(10,2) NOT NULL DEFAULT 0,
    color_hex VARCHAR(7),
    icon VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. monthly_tasks table
CREATE TABLE IF NOT EXISTS monthly_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id UUID NOT NULL REFERENCES investment_buckets(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
        'SIP_PAYMENT',
        'EMI_PAYMENT',
        'INSURANCE_REVIEW',
        'PORTFOLIO_REVIEW',
        'EMERGENCY_FUND_CHECK',
        'TRAVEL_FUND_CHECK',
        'CUSTOM'
    )) DEFAULT 'CUSTOM',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_day INT CHECK (recurrence_day BETWEEN 1 AND 31),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. monthly_task_completions table
CREATE TABLE IF NOT EXISTS monthly_task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES monthly_tasks(id) ON DELETE CASCADE,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2024),
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    actual_amount DECIMAL(10,2),
    notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_task_month_year UNIQUE (task_id, month, year)
);

-- 5. financial_rules table
CREATE TABLE IF NOT EXISTS financial_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'INVESTMENT',
        'TRADING',
        'MINDSET',
        'LIFESTYLE'
    )) DEFAULT 'MINDSET',
    display_style VARCHAR(50) NOT NULL CHECK (display_style IN (
        'BANNER',
        'CARD',
        'POPUP',
        'SIDEBAR'
    )) DEFAULT 'CARD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. monthly_snapshots table
CREATE TABLE IF NOT EXISTS monthly_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2024),
    total_income DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_invested DECIMAL(10,2) NOT NULL DEFAULT 0,
    emergency_fund_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    travel_fund_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    portfolio_estimated_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_month_year UNIQUE (month, year)
);

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_monthly_tasks_bucket_id ON monthly_tasks(bucket_id);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_is_active ON monthly_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON monthly_task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_month_year ON monthly_task_completions(month, year);
CREATE INDEX IF NOT EXISTS idx_investment_buckets_is_active ON investment_buckets(is_active);
CREATE INDEX IF NOT EXISTS idx_financial_rules_category ON financial_rules(category);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_year_month ON monthly_snapshots(year DESC, month DESC);

-- =====================================================================
-- DEFAULT SEED DATA (10 Basic Rules)
-- =====================================================================

INSERT INTO financial_rules (id, title, description, category, display_style, is_active, sort_order, created_at) VALUES
(gen_random_uuid(), 
 'Never panic sell — crashes are buying opportunities', 
 'Market downturns are opportunities to buy quality assets at discount prices.', 
 'INVESTMENT', 'BANNER', true, 1, NOW()),

(gen_random_uuid(), 
 'Increase SIP by 10% every salary hike', 
 'Commit a portion of every raise to long-term wealth building before lifestyle inflation sets in.', 
 'INVESTMENT', 'CARD', true, 2, NOW()),

(gen_random_uuid(), 
 'Stay invested through market volatility', 
 'Time in the market beats timing the market. Stay disciplined during ups and downs.', 
 'INVESTMENT', 'CARD', true, 3, NOW()),

(gen_random_uuid(), 
 'Emergency fund first — always!', 
 'Build 6-12 months of expenses in liquid funds before aggressive investing.', 
 'LIFESTYLE', 'BANNER', true, 4, NOW()),

(gen_random_uuid(), 
 'Never touch investment money for lifestyle', 
 'Keep your investment corpus sacred. Only lifestyle inflation should come from income growth.', 
 'LIFESTYLE', 'CARD', true, 5, NOW()),

(gen_random_uuid(), 
 'Trading money is separate — max ₹15,000/month', 
 'Maintain strict segregation between investment capital and trading capital.', 
 'TRADING', 'BANNER', true, 6, NOW()),

(gen_random_uuid(), 
 'Check portfolio max once a week', 
 'Frequent monitoring leads to emotional decisions. Weekly review is sufficient.', 
 'MINDSET', 'CARD', true, 7, NOW()),

(gen_random_uuid(), 
 'Every unspent buffer goes to investments', 
 'Convert savings into investments immediately to avoid lifestyle creep.', 
 'INVESTMENT', 'CARD', true, 8, NOW()),

(gen_random_uuid(), 
 '50% of every salary hike goes to investments', 
 'Split raises between lifestyle improvement and wealth acceleration.', 
 'INVESTMENT', 'CARD', true, 9, NOW()),

(gen_random_uuid(), 
 'Boring consistency beats smart moves every time', 
 'Automated discipline compounds better than tactical brilliance over time.', 
 'MINDSET', 'BANNER', true, 10, NOW())
ON CONFLICT DO NOTHING;

-- =====================================================================
-- TABLE COMMENTS (Documentation)
-- =====================================================================

COMMENT ON TABLE financial_goals IS 'Long-term financial goals with target amounts and dates';
COMMENT ON TABLE investment_buckets IS 'Investment categories with monthly targets (Emergency Fund, Health, Travel, Wealth, Trading)';
COMMENT ON TABLE monthly_tasks IS 'Recurring and one-time financial tasks (SIPs, EMIs, reviews)';
COMMENT ON TABLE monthly_task_completions IS 'Monthly completion tracking for tasks';
COMMENT ON TABLE financial_rules IS 'Personal financial rules and guidelines with display preferences';
COMMENT ON TABLE monthly_snapshots IS 'Monthly financial summary snapshots (income, expenses, investments, portfolio value)';

-- =====================================================================
-- VERIFICATION
-- =====================================================================

SELECT 'Schema created successfully!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('financial_goals', 'investment_buckets', 'monthly_tasks', 'monthly_task_completions', 'financial_rules', 'monthly_snapshots');