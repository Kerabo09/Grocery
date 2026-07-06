
-- ============================================
-- PROFILES
-- ============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null default '',
  role text check (role in ('owner','cashier')) not null default 'cashier',
  created_at timestamptz default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "users view own profile" on public.profiles for select to authenticated
  using (auth.uid() = id);
create policy "users update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id);

-- has_role helper (security definer to avoid recursion)
create or replace function public.has_role(_user_id uuid, _role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and role = _role)
$$;

create policy "owners view all profiles" on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'owner'));
create policy "owners update all profiles" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'owner'));

-- Auto-create profile on signup; first user becomes owner
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_count int;
begin
  select count(*) into user_count from public.profiles;
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    case when user_count = 0 then 'owner' else 'cashier' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================
-- CATEGORIES
-- ============================================
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);
grant select on public.categories to authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;

create policy "auth view categories" on public.categories for select to authenticated using (true);
create policy "owner manages categories" on public.categories for all to authenticated
  using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

-- ============================================
-- PRODUCTS
-- ============================================
create table public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  price numeric not null default 0,
  cost numeric,
  stock_quantity int not null default 0,
  reorder_level int default 5,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;

create policy "authenticated can view products" on public.products for select to authenticated using (true);
create policy "owner manages products" on public.products for all to authenticated
  using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger products_touch before update on public.products
for each row execute function public.touch_updated_at();

-- ============================================
-- SALES
-- ============================================
create table public.sales (
  id uuid default gen_random_uuid() primary key,
  cashier_id uuid references public.profiles(id) not null,
  subtotal numeric not null,
  tax numeric default 0,
  discount numeric default 0,
  total numeric not null,
  payment_method text check (payment_method in ('cash','card','gcash','other')),
  created_at timestamptz default now()
);
grant select, insert on public.sales to authenticated;
grant all on public.sales to service_role;
alter table public.sales enable row level security;

create policy "cashier inserts own sales" on public.sales for insert to authenticated
  with check (auth.uid() = cashier_id);
create policy "cashier views own sales" on public.sales for select to authenticated
  using (auth.uid() = cashier_id);
create policy "owner views all sales" on public.sales for select to authenticated
  using (public.has_role(auth.uid(),'owner'));

-- SALE ITEMS
create table public.sale_items (
  id uuid default gen_random_uuid() primary key,
  sale_id uuid references public.sales(id) on delete cascade,
  product_id uuid references public.products(id),
  quantity int not null,
  unit_price numeric not null,
  line_total numeric not null
);
grant select, insert on public.sale_items to authenticated;
grant all on public.sale_items to service_role;
alter table public.sale_items enable row level security;

create policy "sale items follow sales access" on public.sale_items for select to authenticated
  using (
    exists (select 1 from public.sales s where s.id = sale_items.sale_id
      and (s.cashier_id = auth.uid() or public.has_role(auth.uid(),'owner')))
  );
create policy "cashier inserts sale items" on public.sale_items for insert to authenticated
  with check (true);

-- process_sale RPC
create or replace function public.process_sale(
  cashier uuid,
  cart jsonb,
  tax_amount numeric,
  discount_amount numeric,
  method text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_sale_id uuid;
  item jsonb;
  subtotal numeric := 0;
begin
  for item in select * from jsonb_array_elements(cart) loop
    subtotal := subtotal + (item->>'unit_price')::numeric * (item->>'quantity')::int;
  end loop;

  insert into public.sales (cashier_id, subtotal, tax, discount, total, payment_method)
  values (cashier, subtotal, tax_amount, discount_amount,
          subtotal + tax_amount - discount_amount, method)
  returning id into new_sale_id;

  for item in select * from jsonb_array_elements(cart) loop
    insert into public.sale_items (sale_id, product_id, quantity, unit_price, line_total)
    values (new_sale_id, (item->>'product_id')::uuid, (item->>'quantity')::int,
            (item->>'unit_price')::numeric,
            (item->>'unit_price')::numeric * (item->>'quantity')::int);

    update public.products
      set stock_quantity = stock_quantity - (item->>'quantity')::int
      where id = (item->>'product_id')::uuid;

    insert into public.stock_logs (product_id, change_qty, reason, changed_by)
    values ((item->>'product_id')::uuid, -(item->>'quantity')::int, 'sale', cashier);
  end loop;

  return new_sale_id;
end;
$$;

-- ============================================
-- EXPENSES
-- ============================================
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  description text,
  amount numeric not null,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;

create policy "owner only expenses" on public.expenses for all to authenticated
  using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

-- ============================================
-- STOCK LOGS
-- ============================================
create table public.stock_logs (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id),
  change_qty int not null,
  reason text,
  changed_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
grant select, insert on public.stock_logs to authenticated;
grant all on public.stock_logs to service_role;
alter table public.stock_logs enable row level security;

create policy "owner views stock logs" on public.stock_logs for select to authenticated
  using (public.has_role(auth.uid(),'owner'));
create policy "system inserts stock logs" on public.stock_logs for insert to authenticated
  with check (true);

-- ============================================
-- REALTIME
-- ============================================
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.sales;
alter publication supabase_realtime add table public.sale_items;
alter publication supabase_realtime add table public.stock_logs;

-- ============================================
-- SEED
-- ============================================
insert into public.categories (name) values
  ('Beverages'),('Snacks'),('Bakery'),('Dairy'),('Produce'),('Household');

insert into public.products (name, category_id, price, cost, stock_quantity, reorder_level, image_url)
select p.name, c.id, p.price, p.cost, p.stock, 5, p.img
from (values
  ('Coca-Cola 500ml','Beverages',35,20,80,'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400'),
  ('Bottled Water 1L','Beverages',25,10,120,'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400'),
  ('Iced Tea','Beverages',30,15,60,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'),
  ('Potato Chips','Snacks',55,30,45,'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=400'),
  ('Chocolate Bar','Snacks',45,22,70,'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400'),
  ('Whole Wheat Bread','Bakery',85,50,20,'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'),
  ('Croissant','Bakery',60,30,15,'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400'),
  ('Fresh Milk 1L','Dairy',95,65,25,'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400'),
  ('Cheddar Cheese','Dairy',180,120,12,'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400'),
  ('Bananas','Produce',12,6,90,'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400'),
  ('Red Apples','Produce',20,12,60,'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400'),
  ('Dish Soap','Household',75,45,30,'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=400')
) as p(name,catname,price,cost,stock,img)
join public.categories c on c.name = p.catname;
