-- DDL Migration for Atomium chemical reactions database

-- 1. Create the database version tracking table
create table if not exists reaction_database_version (
  version integer primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed database version 1
insert into reaction_database_version (version)
values (1)
on conflict (version) do nothing;

-- 2. Create the chemical reactions table
create table if not exists chemical_reactions (
  id uuid default gen_random_uuid() primary key,
  reaction_code text not null unique,
  name text not null,
  type text not null,
  reactants text[] not null,
  products jsonb not null,
  fact text,
  delta_h numeric,
  min_temp_k numeric,
  min_pressure_atm numeric,
  enabled boolean default true not null,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for human-readable reaction codes
create index if not exists idx_reaction_code on chemical_reactions(reaction_code);

-- 3. Seed initial reaction data matching reactionsSeed.js
insert into chemical_reactions (reaction_code, name, type, reactants, products, fact, delta_h, min_temp_k, min_pressure_atm)
values
  (
    'RXN_000001',
    'Barium sulfate precipitation',
    'double_displacement',
    array['BaCl2', 'Na2SO4'],
    '[{"formula": "BaSO4", "coefficient": 1}, {"formula": "NaCl", "coefficient": 2}]'::jsonb,
    'Barium sulfate is virtually insoluble in water, so it precipitates out of solution as a white solid.',
    -18,
    null,
    null
  ),
  (
    'RXN_000002',
    'Silver chloride precipitation',
    'double_displacement',
    array['AgNO3', 'NaCl'],
    '[{"formula": "AgCl", "coefficient": 1}, {"formula": "NaNO3", "coefficient": 1}]'::jsonb,
    'Silver chloride forms an insoluble white precipitate, a classic qualitative test for chloride ions.',
    -65,
    null,
    null
  ),
  (
    'RXN_000003',
    'Hydrochloric acid + sodium hydroxide',
    'neutralization',
    array['HCl', 'NaOH'],
    '[{"formula": "NaCl", "coefficient": 1}, {"formula": "H2O", "coefficient": 1}]'::jsonb,
    'A strong acid and strong base neutralize each other completely, producing a salt and water.',
    -57.3,
    null,
    null
  ),
  (
    'RXN_000004',
    'Methane combustion',
    'combustion',
    array['CH4', 'O2', 'O2'],
    '[{"formula": "CO2", "coefficient": 1}, {"formula": "H2O", "coefficient": 2}]'::jsonb,
    'Complete combustion of methane releases a large amount of energy — this is the reaction that powers gas stoves.',
    -890,
    null,
    null
  ),
  (
    'RXN_000005',
    'Calcium carbonate decomposition',
    'decomposition',
    array['CaCO3'],
    '[{"formula": "CaO", "coefficient": 1}, {"formula": "CO2", "coefficient": 1}]'::jsonb,
    'Heating limestone (calcium carbonate) drives off carbon dioxide gas, leaving quicklime behind.',
    178,
    1123,
    null
  ),
  (
    'RXN_000006',
    'Hydrogen chloride synthesis',
    'synthesis',
    array['H2', 'Cl2'],
    '[{"formula": "HCl", "coefficient": 2}]'::jsonb,
    'Hydrogen and chlorine gas combine directly to form hydrogen chloride, releasing heat.',
    -184.6,
    null,
    null
  ),
  (
    'RXN_000007',
    'Zinc + hydrochloric acid',
    'single_displacement',
    array['Zn', 'HCl', 'HCl'],
    '[{"formula": "ZnCl2", "coefficient": 1}, {"formula": "H2", "coefficient": 1}]'::jsonb,
    'Zinc is more reactive than hydrogen, so it displaces it from hydrochloric acid, releasing hydrogen gas.',
    -152,
    null,
    null
  )
on conflict (reaction_code) do update
set
  name = excluded.name,
  type = excluded.type,
  reactants = excluded.reactants,
  products = excluded.products,
  fact = excluded.fact,
  delta_h = excluded.delta_h,
  min_temp_k = excluded.min_temp_k,
  min_pressure_atm = excluded.min_pressure_atm,
  updated_at = now();
