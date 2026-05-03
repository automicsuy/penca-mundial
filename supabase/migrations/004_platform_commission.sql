-- Migration 004: Platform commission + group admin permissions

-- % comisión de plataforma por grupo (default 5%)
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS platform_fee_pct integer NOT NULL DEFAULT 5;

-- El superadmin puede habilitar a un usuario para crear grupos de pago
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS can_create_groups boolean NOT NULL DEFAULT false;

-- Guardar comisión de plataforma por pago
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS platform_commission numeric DEFAULT 0;

-- El superadmin siempre puede crear grupos
UPDATE profiles SET can_create_groups = true WHERE is_superadmin = true;
