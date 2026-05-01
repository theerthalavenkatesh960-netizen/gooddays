-- =====================================================================
-- PHASE 4 & 5: SEED DATA FOR FINANCIAL LIFE TRACKER
-- =====================================================================
-- This script seeds buckets, tasks, and financial rules
-- Run this after the schema migration
-- =====================================================================

-- Clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM monthly_task_completions;
-- DELETE FROM monthly_tasks;
-- DELETE FROM investment_buckets;
-- DELETE FROM financial_rules WHERE sort_order > 10;

-- =====================================================================
-- PHASE 5: FINANCIAL RULES (Insert first to avoid conflicts)
-- =====================================================================

-- Clear default rules and insert custom ones
DELETE FROM financial_rules;

-- INVESTMENT RULES (1-4)
INSERT INTO financial_rules (id, title, description, category, display_style, is_active, sort_order, created_at) VALUES
(gen_random_uuid(), 
 'Never panic sell', 
 'Crashes are sales. Your SIP buys MORE units when market falls. That''s the whole magic!', 
 'INVESTMENT', 'BANNER', true, 1, NOW()),

(gen_random_uuid(), 
 'Increase SIP every salary hike', 
 '50% of every hike goes to investments immediately before lifestyle adjusts!', 
 'INVESTMENT', 'CARD', true, 2, NOW()),

(gen_random_uuid(), 
 'Boring consistency wins', 
 'Your SIP running for 6 years uninterrupted will beat every smart move you make trying to optimize it!', 
 'INVESTMENT', 'CARD', true, 3, NOW()),

(gen_random_uuid(), 
 'Deploy lump sums slowly', 
 'Never invest large amounts at once. Spread over 4-8 months minimum!', 
 'INVESTMENT', 'CARD', true, 4, NOW());

-- TRADING RULES (5-9)
INSERT INTO financial_rules (id, title, description, category, display_style, is_active, sort_order, created_at) VALUES
(gen_random_uuid(), 
 'Maximum 1 trade per day', 
 'More trades = more emotion = more losses. 1 trade. 1 setup. Walk away!', 
 'TRADING', 'BANNER', true, 5, NOW()),

(gen_random_uuid(), 
 'Never average down', 
 'If stop loss hits — EXIT. Never buy more of a losing trade!', 
 'TRADING', 'BANNER', true, 6, NOW()),

(gen_random_uuid(), 
 'No direction switching', 
 'If trade is wrong — EXIT. Wait for next day''s fresh setup. Never immediately switch direction!', 
 'TRADING', 'BANNER', true, 7, NOW()),

(gen_random_uuid(), 
 'Check higher timeframe first', 
 'Always check Weekly → Daily → Hourly before entering any trade. Trade in direction of bigger trend!', 
 'TRADING', 'CARD', true, 8, NOW()),

(gen_random_uuid(), 
 'Volume confirms everything', 
 'High volume = real move. Low volume = fake move. Always check volume!', 
 'TRADING', 'CARD', true, 9, NOW());

-- MINDSET RULES (10-12)
INSERT INTO financial_rules (id, title, description, category, display_style, is_active, sort_order, created_at) VALUES
(gen_random_uuid(), 
 'You are not the worst trader', 
 '₹1,745 was tuition fee — the cheapest lesson you''ll ever get about yourself!', 
 'MINDSET', 'CARD', true, 10, NOW()),

(gen_random_uuid(), 
 'The market will always be there', 
 'There is zero reason to rush. The right setup with confirmation is worth waiting for!', 
 'MINDSET', 'CARD', true, 11, NOW()),

(gen_random_uuid(), 
 'Protect capital like oxygen', 
 'You are a scuba diver. Capital is your oxygen tank. Manage it like your life depends on it — it does!', 
 'MINDSET', 'BANNER', true, 12, NOW());

-- LIFESTYLE RULES (13-15)
INSERT INTO financial_rules (id, title, description, category, display_style, is_active, sort_order, created_at) VALUES
(gen_random_uuid(), 
 'Emergency fund is sacred', 
 'Touch emergency fund only for genuine emergencies. Medical. Job loss. Nothing else!', 
 'LIFESTYLE', 'CARD', true, 13, NOW()),

(gen_random_uuid(), 
 'Travel fund is guilt-free', 
 '₹7,000 goes in every month. When you travel — enjoy fully! It''s already paid for!', 
 'LIFESTYLE', 'CARD', true, 14, NOW()),

(gen_random_uuid(), 
 'Salary is your superpower', 
 'Focus on growing income. 1% more on investments = small. 20% more salary = massive!', 
 'LIFESTYLE', 'CARD', true, 15, NOW());

-- =====================================================================
-- PHASE 4: BUCKETS AND TASKS
-- =====================================================================

-- 1. EMERGENCY FUND BUCKET
DO $$
DECLARE
    bucket_id UUID;
BEGIN
    INSERT INTO investment_buckets (id, name, category, monthly_target, color_hex, icon, is_active, sort_order, created_at)
    VALUES (gen_random_uuid(), 'Emergency Fund', 'EMERGENCY_FUND', 20000, '#4a7acc', '🛡️', true, 1, NOW())
    RETURNING id INTO bucket_id;

    -- Task: Transfer to liquid fund
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Transfer ₹20,000 to liquid fund', 'Monthly emergency fund contribution', 'EMERGENCY_FUND_CHECK', 20000, true, 1, true, NOW());
END $$;

-- 2. HEALTH BUCKET
DO $$
DECLARE
    bucket_id UUID;
BEGIN
    INSERT INTO investment_buckets (id, name, category, monthly_target, color_hex, icon, is_active, sort_order, created_at)
    VALUES (gen_random_uuid(), 'Health', 'HEALTH', 700, '#e05050', '❤️', true, 2, NOW())
    RETURNING id INTO bucket_id;

    -- Task 1: Insurance premium
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Pay health insurance premium', '₹6,000 annually = ~₹500/month', 'INSURANCE_REVIEW', 500, true, 5, true, NOW());

    -- Task 2: Health check-in
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Monthly health check-in', 'Are you eating well, sleeping well?', 'CUSTOM', 0, true, 15, true, NOW());
END $$;

-- 3. TRAVEL FUND BUCKET
DO $$
DECLARE
    bucket_id UUID;
BEGIN
    INSERT INTO investment_buckets (id, name, category, monthly_target, color_hex, icon, is_active, sort_order, created_at)
    VALUES (gen_random_uuid(), 'Travel Fund', 'TRAVEL', 7000, '#26a65b', '✈️', true, 3, NOW())
    RETURNING id INTO bucket_id;

    -- Task: Transfer to travel savings
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Transfer ₹7,000 to travel savings', 'Monthly travel fund contribution', 'TRAVEL_FUND_CHECK', 7000, true, 1, true, NOW());
END $$;

-- 4. INVESTMENTS — WEALTH BUCKET
DO $$
DECLARE
    bucket_id UUID;
BEGIN
    INSERT INTO investment_buckets (id, name, category, monthly_target, color_hex, icon, is_active, sort_order, created_at)
    VALUES (gen_random_uuid(), 'Investments — Wealth', 'WEALTH', 101000, '#f0c040', '📈', true, 4, NOW())
    RETURNING id INTO bucket_id;

    -- Task 1: Nifty 50 Index Fund SIP
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Nifty 50 Index Fund SIP ₹35,000', 'Large cap index investment', 'SIP_PAYMENT', 35000, true, 5, true, NOW());

    -- Task 2: Midcap Fund SIP
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Midcap Fund SIP ₹25,000', 'Mid cap growth investment', 'SIP_PAYMENT', 25000, true, 5, true, NOW());

    -- Task 3: Flexicap Fund SIP
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Flexicap Fund SIP ₹20,000', 'Flexible cap investment', 'SIP_PAYMENT', 20000, true, 5, true, NOW());

    -- Task 4: US ETF
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'US ETF ₹13,000', 'International diversification', 'SIP_PAYMENT', 13000, true, 7, true, NOW());

    -- Task 5: Gold Fund SIP
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Gold Fund SIP ₹8,000', 'Gold investment for stability', 'SIP_PAYMENT', 8000, true, 5, true, NOW());
END $$;

-- 5. EMIS BUCKET
DO $$
DECLARE
    bucket_id UUID;
BEGIN
    INSERT INTO investment_buckets (id, name, category, monthly_target, color_hex, icon, is_active, sort_order, created_at)
    VALUES (gen_random_uuid(), 'EMIs', 'MISCELLANEOUS', 49000, '#8899bb', '🏦', true, 5, NOW())
    RETURNING id INTO bucket_id;

    -- Task 1: Car EMI (till Oct 2026)
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Car EMI ₹35,000', 'Ends Oct 2026', 'EMI_PAYMENT', 35000, true, 3, true, NOW());

    -- Task 2: Other EMI (till Mar 2027)
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Other EMI ₹14,000', 'Ends Mar 2027', 'EMI_PAYMENT', 14000, true, 3, true, NOW());

    -- Task 3: Chitti
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Chitti ₹12,000', 'Matures at month 25', 'CUSTOM', 12000, true, 1, true, NOW());
END $$;

-- 6. BUFFER BUCKET
DO $$
DECLARE
    bucket_id UUID;
BEGIN
    INSERT INTO investment_buckets (id, name, category, monthly_target, color_hex, icon, is_active, sort_order, created_at)
    VALUES (gen_random_uuid(), 'Buffer', 'MISCELLANEOUS', 10000, '#c8a020', '🎯', true, 6, NOW())
    RETURNING id INTO bucket_id;

    -- Task 1: Set aside buffer
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Set aside buffer ₹10,000', 'Monthly buffer allocation', 'CUSTOM', 10000, true, 1, true, NOW());

    -- Task 2: Transfer unspent buffer
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Transfer unspent buffer to investments', 'End of month reallocation', 'CUSTOM', 0, true, 28, true, NOW());
END $$;

-- 7. TRADING BUCKET (INACTIVE until Oct 2026)
DO $$
DECLARE
    bucket_id UUID;
BEGIN
    INSERT INTO investment_buckets (id, name, category, monthly_target, color_hex, icon, is_active, sort_order, created_at)
    VALUES (gen_random_uuid(), 'Trading', 'TRADING', 0, '#e05050', '📊', false, 7, NOW())
    RETURNING id INTO bucket_id;

    -- Task 1: Complete trading course section
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Complete current section of trading course', 'Learning task', 'CUSTOM', 0, true, 10, true, NOW());

    -- Task 2: Paper trade this week
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Paper trade this week', 'Practice trading', 'CUSTOM', 0, true, 15, true, NOW());

    -- Task 3: Review paper trades
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES (gen_random_uuid(), bucket_id, 'Review last week''s paper trades', 'Learning from practice', 'CUSTOM', 0, true, 22, true, NOW());
END $$;

-- =====================================================================
-- FUTURE MILESTONES (As non-recurring tasks with future dates)
-- =====================================================================

-- Milestone Bucket for Future Planning
DO $$
DECLARE
    milestone_bucket_id UUID;
BEGIN
    INSERT INTO investment_buckets (id, name, category, monthly_target, color_hex, icon, is_active, sort_order, created_at)
    VALUES (gen_random_uuid(), 'Milestones & Goals', 'MISCELLANEOUS', 0, '#9b59b6', '🎯', true, 8, NOW())
    RETURNING id INTO milestone_bucket_id;

    -- Oct 2026 Milestones
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES 
    (gen_random_uuid(), milestone_bucket_id, 'Car EMI ends — reallocate ₹35,000', 'Plan reallocation strategy', 'CUSTOM', 35000, false, NULL, true, NOW()),
    (gen_random_uuid(), milestone_bucket_id, 'Activate trading bucket', 'Start active trading after Oct 2026', 'CUSTOM', 0, false, NULL, true, NOW()),
    (gen_random_uuid(), milestone_bucket_id, 'Increase Midcap SIP by ₹15,000', 'Boost midcap allocation', 'SIP_PAYMENT', 15000, false, NULL, true, NOW());

    -- Month 25 Milestones
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES 
    (gen_random_uuid(), milestone_bucket_id, 'Chitti matures — ₹3,60,000 arrives!', 'Lump sum received', 'CUSTOM', 360000, false, NULL, true, NOW()),
    (gen_random_uuid(), milestone_bucket_id, 'Deploy ₹2,00,000 to index/midcap STP', 'Systematic transfer plan', 'SIP_PAYMENT', 200000, false, NULL, true, NOW()),
    (gen_random_uuid(), milestone_bucket_id, 'Top up emergency fund to ₹3,00,000', 'Strengthen safety net', 'EMERGENCY_FUND_CHECK', 300000, false, NULL, true, NOW()),
    (gen_random_uuid(), milestone_bucket_id, 'Book a trip! ₹60,000 travel fund 😄', 'Enjoy the fruits of discipline', 'TRAVEL_FUND_CHECK', 60000, false, NULL, true, NOW());

    -- Mar 2027 Milestones
    INSERT INTO monthly_tasks (id, bucket_id, title, description, task_type, amount, is_recurring, recurrence_day, is_active, created_at)
    VALUES 
    (gen_random_uuid(), milestone_bucket_id, 'Second EMI ends — reallocate ₹14,000', 'Free up monthly cash flow', 'EMI_PAYMENT', 14000, false, NULL, true, NOW()),
    (gen_random_uuid(), milestone_bucket_id, 'Increase investments by ₹10,000', 'Boost monthly SIPs', 'SIP_PAYMENT', 10000, false, NULL, true, NOW());
END $$;

-- =====================================================================
-- GENERATE INITIAL TASK COMPLETIONS FOR CURRENT MONTH
-- =====================================================================

DO $$
DECLARE
    current_month INT := EXTRACT(MONTH FROM CURRENT_DATE);
    current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    task_record RECORD;
BEGIN
    FOR task_record IN 
        SELECT id FROM monthly_tasks WHERE is_recurring = true AND is_active = true
    LOOP
        INSERT INTO monthly_task_completions (id, task_id, month, year, is_completed, created_at)
        VALUES (gen_random_uuid(), task_record.id, current_month, current_year, false, NOW())
        ON CONFLICT (task_id, month, year) DO NOTHING;
    END LOOP;
END $$;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Count buckets
SELECT 'Buckets Created' as item, COUNT(*) as count FROM investment_buckets;

-- Count tasks
SELECT 'Tasks Created' as item, COUNT(*) as count FROM monthly_tasks;

-- Count rules
SELECT 'Rules Created' as item, COUNT(*) as count FROM financial_rules;

-- Count task completions for current month
SELECT 'Task Completions for Current Month' as item, COUNT(*) as count 
FROM monthly_task_completions 
WHERE month = EXTRACT(MONTH FROM CURRENT_DATE) 
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Summary by bucket
SELECT 
    b.name as bucket_name,
    b.category,
    b.monthly_target,
    b.is_active,
    COUNT(t.id) as task_count
FROM investment_buckets b
LEFT JOIN monthly_tasks t ON b.id = t.bucket_id
GROUP BY b.id, b.name, b.category, b.monthly_target, b.is_active, b.sort_order
ORDER BY b.sort_order;

-- Rules summary
SELECT 
    category,
    COUNT(*) as rule_count
FROM financial_rules
GROUP BY category
ORDER BY category;

COMMENT ON TABLE investment_buckets IS 'Seeded with 8 buckets: Emergency Fund, Health, Travel, Wealth, EMIs, Buffer, Trading (inactive), and Milestones';
COMMENT ON TABLE monthly_tasks IS 'Seeded with all recurring monthly tasks and future milestone tasks';
COMMENT ON TABLE financial_rules IS 'Seeded with 15 personalized financial rules across 4 categories';