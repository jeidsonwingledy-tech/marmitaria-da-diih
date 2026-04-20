-- Habilitar a extensão uuid-ossp se ainda não estiver habilitada
create extension if not exists "uuid-ossp";

-- Tabela de Categorias
create table if not exists categorias (
  id text primary key default uuid_generate_v4(),
  name text not null,
  image text,
  active boolean default true
);

-- Tabela de Itens do Menu
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

-- Tabela de Configurações (Singleton - ID fixo 'info')
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

-- Tabela de Pedidos
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

-- Habilitar Realtime para todas as tabelas
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table categorias, "menuItems", settings, orders;
  else
    create publication supabase_realtime for table categorias, "menuItems", settings, orders;
  end if;
end $$;

-- Políticas de Segurança (RLS) - Permitir acesso público para simplificar o início
alter table categorias enable row level security;
create policy "Public Access Categorias" on categorias for all using (true) with check (true);

alter table "menuItems" enable row level security;
create policy "Public Access MenuItems" on "menuItems" for all using (true) with check (true);

alter table settings enable row level security;
create policy "Public Access Settings" on settings for all using (true) with check (true);

alter table orders enable row level security;
create policy "Public Access Orders" on orders for all using (true) with check (true);

-- Dados Iniciais - Settings
insert into settings (id, name, phone, "whatsappNumber", address, logo, banner, "instagramUrl", "facebookUrl", "adminPassword", "pixKey", "pixKeyType", "pixName", "pixCity", "businessHours", delivery, style, notice)
values (
  'info',
  'Marmitaria da Diih',
  '(19) 95330-7669',
  '5519953307669',
  'Rua Exemplo, 123 - Centro',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80',
  'https://instagram.com',
  'https://facebook.com',
  'admin123',
  '',
  'email',
  'Marmitaria da Diih',
  'Amparo-SP',
  'Segunda a Sábado: 10:30 às 14:30',
  '{"freeShippingThreshold": 150, "standardFee": 5.00, "neighborhoods": [{"name": "Centro", "price": 5.00}, {"name": "Jardim das Flores", "price": 7.00}, {"name": "Vila Nova", "price": 8.00}]}'::jsonb,
  '{"primaryColor": "#EA1D2C", "priceColor": "#EA1D2C", "backgroundColor": "#FFFFFF", "cardColor": "#FFFFFF", "textColor": "#404040"}'::jsonb,
  '{"active": true, "text": "Estamos atendendo normalmente!"}'::jsonb
)
on conflict (id) do nothing;

-- Dados Iniciais - Categorias
insert into categorias (id, name, image, active)
values
  ('pratododia', 'Prato do Dia', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&h=300&q=80', true),
  ('marmitas', 'Marmitas', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=300&h=300&q=80', true),
  ('fit', 'Linha Fit', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=300&h=300&q=80', true),
  ('drinks', 'Bebidas', 'https://images.unsplash.com/photo-1544145945-f904253d0c7b?auto=format&fit=crop&w=300&h=300&q=80', true),
  ('desserts', 'Sobremesas', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=300&h=300&q=80', true)
on conflict (id) do nothing;

-- Dados Iniciais - Produtos de exemplo
insert into "menuItems" (id, "categoryId", name, description, price, images, "optionGroups", available)
values
  ('1', 'marmitas', 'Bife Acebolado', 'Arroz branco soltinho, feijão carioca, bife de alcatra acebolado, fritas e farofa da casa.', 22.90,
   ARRAY['https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'],
   '[{"id": "size", "title": "Tamanho", "required": true, "min": 1, "max": 1, "options": [{"id": "p", "name": "Pequena", "price": 0, "available": true}, {"id": "m", "name": "Média", "price": 4.00, "available": true}, {"id": "g", "name": "Grande", "price": 7.00, "available": true}]}]'::jsonb,
   true),
  ('4', 'fit', 'Frango Grelhado', 'Arroz integral, mix de legumes no vapor (brócolis, cenoura, vagem) e filé de frango grelhado.', 19.90,
   ARRAY['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'],
   '[{"id": "size", "title": "Tamanho", "required": true, "min": 1, "max": 1, "options": [{"id": "p", "name": "Pequena", "price": 0, "available": true}, {"id": "m", "name": "Média", "price": 4.00, "available": true}, {"id": "g", "name": "Grande", "price": 7.00, "available": true}]}]'::jsonb,
   true)
on conflict (id) do nothing;
