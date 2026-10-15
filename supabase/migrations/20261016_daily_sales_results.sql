-- Migration: Daily Sales Results by Seller
CREATE TABLE IF NOT EXISTS daily_sales_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  collaborator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seller_name TEXT,
  sales_amount NUMERIC NOT NULL DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  store TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, collaborator_id)
);

-- Index for speedy lookups by date and month
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales_results(date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_collaborator ON daily_sales_results(collaborator_id);

-- Enable RLS
ALTER TABLE daily_sales_results ENABLE ROW LEVEL SECURITY;

-- Allow read/write access
CREATE POLICY "Allow all on daily_sales_results" ON daily_sales_results FOR ALL USING (true) WITH CHECK (true);
