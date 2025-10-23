-- Database Schema for The AI Qualifier

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth, this is for additional data)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT,
  description TEXT,
  industry TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

-- Ideal Customer Profiles (ICPs)
CREATE TABLE icps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  company_size_min INTEGER,
  company_size_max INTEGER,
  revenue_range_min BIGINT,
  revenue_range_max BIGINT,
  industries TEXT[], -- Array of target industries
  geographic_regions TEXT[], -- Array of regions
  funding_stages TEXT[], -- Array of funding stages
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buyer Personas (linked to ICPs)
CREATE TABLE buyer_personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  icp_id UUID NOT NULL REFERENCES icps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  seniority_level TEXT,
  pain_points TEXT[],
  goals TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prospect companies to qualify
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  icp_id UUID NOT NULL REFERENCES icps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT,
  description TEXT,
  industry TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Qualification results
CREATE TABLE qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  icp_id UUID NOT NULL REFERENCES icps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  fit_level TEXT NOT NULL CHECK (fit_level IN ('excellent', 'good', 'moderate', 'poor')),
  reasoning TEXT NOT NULL,
  strengths TEXT[],
  weaknesses TEXT[],
  recommendation TEXT,
  metadata JSONB, -- Store additional analysis data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_icps_company_id ON icps(company_id);
CREATE INDEX idx_icps_user_id ON icps(user_id);
CREATE INDEX idx_buyer_personas_icp_id ON buyer_personas(icp_id);
CREATE INDEX idx_prospects_icp_id ON prospects(icp_id);
CREATE INDEX idx_prospects_user_id ON prospects(user_id);
CREATE INDEX idx_qualifications_prospect_id ON qualifications(prospect_id);
CREATE INDEX idx_qualifications_icp_id ON qualifications(icp_id);
CREATE INDEX idx_qualifications_user_id ON qualifications(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE icps ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualifications ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for companies
CREATE POLICY "Users can view own companies" ON companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own companies" ON companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own companies" ON companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own companies" ON companies FOR DELETE USING (auth.uid() = user_id);

-- Policies for ICPs
CREATE POLICY "Users can view own ICPs" ON icps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ICPs" ON icps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ICPs" ON icps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ICPs" ON icps FOR DELETE USING (auth.uid() = user_id);

-- Policies for buyer_personas (via ICP)
CREATE POLICY "Users can view personas for their ICPs" ON buyer_personas FOR SELECT 
  USING (EXISTS (SELECT 1 FROM icps WHERE icps.id = buyer_personas.icp_id AND icps.user_id = auth.uid()));
CREATE POLICY "Users can insert personas for their ICPs" ON buyer_personas FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM icps WHERE icps.id = buyer_personas.icp_id AND icps.user_id = auth.uid()));
CREATE POLICY "Users can update personas for their ICPs" ON buyer_personas FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM icps WHERE icps.id = buyer_personas.icp_id AND icps.user_id = auth.uid()));
CREATE POLICY "Users can delete personas for their ICPs" ON buyer_personas FOR DELETE 
  USING (EXISTS (SELECT 1 FROM icps WHERE icps.id = buyer_personas.icp_id AND icps.user_id = auth.uid()));

-- Policies for prospects
CREATE POLICY "Users can view own prospects" ON prospects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prospects" ON prospects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prospects" ON prospects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prospects" ON prospects FOR DELETE USING (auth.uid() = user_id);

-- Policies for qualifications
CREATE POLICY "Users can view own qualifications" ON qualifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own qualifications" ON qualifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own qualifications" ON qualifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own qualifications" ON qualifications FOR DELETE USING (auth.uid() = user_id);

-- Trigger to auto-create user_profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
