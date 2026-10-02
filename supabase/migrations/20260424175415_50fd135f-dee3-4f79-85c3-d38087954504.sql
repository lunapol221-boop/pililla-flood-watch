
-- Roles enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  agency TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile + default 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Domain tables (admin write, public read)
CREATE TABLE public.barangays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  population INTEGER,
  elevation_m NUMERIC,
  lat NUMERIC,
  lng NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.barangays ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sensor_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  status TEXT DEFAULT 'online',
  lat NUMERIC,
  lng NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sensor_stations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.flood_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES public.sensor_stations(id) ON DELETE CASCADE,
  rainfall_mm NUMERIC,
  water_level_m NUMERIC,
  soil_moisture_percent NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flood_readings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.evacuation_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  capacity INTEGER,
  occupancy INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available',
  lat NUMERIC,
  lng NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evacuation_centers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL,
  title TEXT NOT NULL,
  area TEXT,
  message TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.weather_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_for TIMESTAMPTZ NOT NULL,
  rain_mm NUMERIC,
  rain_chance INTEGER,
  temp_c NUMERIC,
  wind_kph NUMERIC,
  condition TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weather_forecasts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- profiles: user reads/updates own; admin reads all
CREATE POLICY "own profile readable" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile updatable" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- user_roles: user reads own; admin manages
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manages roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read, admin write for reference + telemetry tables
CREATE POLICY "public read" ON public.barangays FOR SELECT USING (true);
CREATE POLICY "admin write" ON public.barangays FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public read" ON public.sensor_stations FOR SELECT USING (true);
CREATE POLICY "admin write" ON public.sensor_stations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public read" ON public.flood_readings FOR SELECT USING (true);
CREATE POLICY "admin write" ON public.flood_readings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public read" ON public.evacuation_centers FOR SELECT USING (true);
CREATE POLICY "admin write" ON public.evacuation_centers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public read" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "admin write" ON public.alerts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public read" ON public.weather_forecasts FOR SELECT USING (true);
CREATE POLICY "admin write" ON public.weather_forecasts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- audit_logs: admin only
CREATE POLICY "admin read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
