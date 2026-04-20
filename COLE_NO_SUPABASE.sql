-- =============================================
-- MIGRATION COMPLETA - MARMITARIA DA DIIH
-- Cole tudo isso no SQL Editor do Supabase
-- e clique em "Run" (ou Ctrl+Enter)
-- =============================================

-- 1. Extensão UUID
create extension if not exists "uuid-ossp";

-- 2. Tabela de Categorias
create table if not exists categorias (
  id text primary key default uuid_generate_v4(),
  name text not null,
  image text,
  active boolean default true
);

-- 3. Tabela de Itens do Menu
create table if not exists "menuItems" (
  id text primary key default uuid_generate_v4(),
  "categoryId" text references categorias(id),
  name text not null,
  description text,
  price numeric,
  images text[],
  "optionGroups" jsonb,
  available boolean default true
);

-- 4. Tabela de Configurações
create table if not exists settings (
  id text primary key,
  name text,
  phone text,
  "whatsappNumber" text,
  address text,
  logo text,
  banner text,
  "instagramUrl" text,
  "facebookUrl" text,
  "adminPassword" text,
  "adminUsername" text,
  "pixKey" text,
  "pixKeyType" text,
  "pixName" text,
  "pixCity" text,
  "businessHours" text,
  delivery jsonb,
  style jsonb,
  notice jsonb
);

-- 5. Tabela de Pedidos
create table if not exists orders (
  id text primary key default uuid_generate_v4(),
  "customerName" text,
  items jsonb,
  total numeric,
  status text,
  "createdAt" timestamptz default now(),
  "paymentMethod" text,
  address text,
  neighborhood text,
  number text,
  "changeFor" text,
  notes text,
  "needCutlery" text,
  "deliveryFee" numeric
);

-- 6. RLS (Row Level Security)
alter table categorias enable row level security;
alter table "menuItems" enable row level security;
alter table settings enable row level security;
alter table orders enable row level security;

create policy "Public Access Categorias" on categorias for all using (true) with check (true);
create policy "Public Access MenuItems" on "menuItems" for all using (true) with check (true);
create policy "Public Access Settings" on settings for all using (true) with check (true);
create policy "Public Access Orders" on orders for all using (true) with check (true);

-- 7. Dados Iniciais - Settings
insert into settings (id, name, phone, "whatsappNumber", address, "adminPassword", "pixKeyType", "pixName", "pixCity", "businessHours", delivery, style, notice)
values (
  'info', 'Marmitaria da Diih', '(19) 95330-7669', '5519953307669', 'Rua Exemplo, 123 - Centro', 'admin123', 'email', 'Marmitaria da Diih', 'Amparo-SP', 'Segunda a Sábado: 10:30 às 14:30',
  '{"freeShippingThreshold": 150, "standardFee": 5, "neighborhoods": [{"name": "Centro", "price": 5}, {"name": "Jardim das Flores", "price": 7}, {"name": "Vila Nova", "price": 8}]}'::jsonb,
  '{"primaryColor": "#EA1D2C", "priceColor": "#EA1D2C", "backgroundColor": "#FFFFFF", "cardColor": "#FFFFFF", "textColor": "#404040"}'::jsonb,
  '{"active": true, "text": "Estamos atendendo normalmente!"}'::jsonb
) on conflict (id) do nothing;

-- 8. Dados Iniciais - Categorias
insert into categorias (id, name, image, active) values
  ('pratododia', 'Prato do Dia', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&h=300&q=80', true),
  ('marmitas', 'Marmitas', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=300&h=300&q=80', true),
  ('fit', 'Linha Fit', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=300&h=300&q=80', true),
  ('drinks', 'Bebidas', 'https://images.unsplash.com/photo-1544145945-f904253d0c7b?auto=format&fit=crop&w=300&h=300&q=80', true),
  ('desserts', 'Sobremesas', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=300&h=300&q=80', true)
on conflict (id) do nothing;

-- 9. Dados Iniciais - Produtos
insert into "menuItems" (id, "categoryId", name, description, price, images, "optionGroups", available) values
  ('1', 'marmitas', 'Bife Acebolado', 'Arroz branco soltinho, feijão carioca, bife de alcatra acebolado, fritas e farofa da casa.', 22.90,
   ARRAY['https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'],
   '[{"id":"size","title":"Tamanho","required":true,"min":1,"max":1,"options":[{"id":"p","name":"Pequena","price":0,"available":true},{"id":"m","name":"Média","price":4,"available":true},{"id":"g","name":"Grande","price":7,"available":true}]}]'::jsonb, true),
  ('4', 'fit', 'Frango Grelhado', 'Arroz integral, mix de legumes no vapor e filé de frango grelhado.', 19.90,
   ARRAY['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'],
   '[{"id":"size","title":"Tamanho","required":true,"min":1,"max":1,"options":[{"id":"p","name":"Pequena","price":0,"available":true},{"id":"m","name":"Média","price":4,"available":true},{"id":"g","name":"Grande","price":7,"available":true}]}]'::jsonb, true)
on conflict (id) do nothing;

-- 10. Storage para imagens
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict (id) do nothing;
