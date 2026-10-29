-- La classifica mensile dell'Athlon Health Score (29/10/2026): tabelle, calcolo del punteggio del mese e giro notturno.
--
-- **Da eseguire nell'editor SQL di Supabase** (progetto kdbcwwpdazvtmjolybdm, "app-athlon"), tutto insieme: e' rieseguibile
-- (create ... if not exists / create or replace) e additiva, non tocca nessuna tabella che c'e' gia'. In fondo, commentati,
-- il ritorno indietro e gli SQL di moderazione per lo staff.
--
-- Cosa fa, in breve (il contratto con l'app e' in PORTALE-ATHLON, `docs/classifica-contratto.md` e `src/api/classifica.ts`):
--   - `athlon_classifica_consensi`: chi e' dentro (consenso a parte, versione, data), il motto, se mostrare la foto, e cosa ha deciso lo staff.
--   - `athlon_classifica_consensi_log`: la prova di quando si e' entrati e usciti (resta anche dopo la revoca).
--   - `athlon_classifica_mese`: il punteggio di ogni persona dentro, mese per mese. La posizione NON e' qui: si ricava leggendo.
--   - `athlon_classifica_segnalazioni`: motti e foto segnalati dai soci, per lo staff.
--   - `athlon_classifica_config`: le versioni delle tre informative (Food, dispositivi, classifica), scritte dalla funzione a ogni avvio:
--     la fonte e' il codice (una costante sola), il giro notturno legge da qui.
--   - `athlon_classifica_punteggio(socio, mese, oggi)`: il calcolo. `athlon_classifica_ricalcola(mese, socio)`: lo applica a chi e' dentro.
--     `athlon_classifica_giro()`: quello che chiama il cron, una volta a notte.
--
-- **Il punteggio del mese (0-100).** Le settimane sono lunedi'-domenica (a Roma). Per ogni settimana che tocca il mese si calcola la
-- quota (0-1) di ogni pilastro con le stesse regole dell'Athlon Health Score dell'app (calcoloPunteggio.ts: curva dei giorni di Train
-- 0 / 0,4 / 1 / 1 / 1 / 0,9 / 0,8 / 0,7, cinque giorni di diario per Food, cinque notti per Recover con 1 / 0,7 / 0,4 / 0,2 a notte);
-- la quota del mese e' la media delle settimane **pesate per i giorni che hanno nel mese**. Si contano solo i giorni fino a ieri (i dati
-- si aggiornano di notte): la settimana in corso si guarda sugli ultimi 7 giorni, come fa l'app. Le settimane prima della prima
-- attivita' di quel pilastro non contano. Il punteggio e' 100 x (70 x Train + 15 x Food + 15 x Recover) / (i pesi dei pilastri **in uso**):
-- Food e Recover entrano solo con un consenso vivo alla versione corrente (e Food non con i numeri nascosti), altrimenti non si contano e
-- non tolgono niente: chi non li usa puo' arrivare a 100, e la classifica non premia il consenso ai dati sulla salute (art. 7, par. 4 GDPR).
-- **Train solo da fonti che la persona non scrive**: ingressi al tornello e presenze segnate dalla reception (`perfectgym.member_club_visits`,
-- `class_bookings.presente`), un giorno vale una volta. Non le sedute chiuse nell'app ne' gli allenamenti dei dispositivi: si gonfiano con un tocco.
-- **Differenza dall'app, voluta**: l'app arrotonda i punti di ogni pilastro e li somma; qui si arrotonda il totale. Possono differire di 1.
--
-- **Sicurezza**: RLS accesa, nessuna policy, nessun diritto a public, anon, authenticated; si legge e si scrive solo dalle funzioni con la chiave di
-- servizio. Le funzioni sono `security definer` e si possono eseguire solo con `service_role`. Lo staff non vede i punti dei pilastri: nelle tabelle non ci sono.

-- ---------------------------------------------------------------------------
-- Le tabelle

create table if not exists public.athlon_classifica_config (
  chiave text primary key check (chiave in ('food', 'dispositivi', 'classifica')),
  valore text not null,
  aggiornato_il timestamptz not null default now()
);
-- I valori di partenza (la funzione li riallinea al codice alla prima richiesta dopo ogni pubblicazione).
insert into public.athlon_classifica_config (chiave, valore) values
  ('food', '2026-10-20'),
  ('dispositivi', '2026-10-20'),
  ('classifica', '2026-10-29')
on conflict (chiave) do nothing;

create table if not exists public.athlon_classifica_consensi (
  member_id bigint primary key,
  versione text not null,
  accettato_il timestamptz not null default now(),
  revocato_il timestamptz,
  mostra_foto boolean not null default false,
  motto text check (motto is null or char_length(motto) <= 80),
  -- Lo staff: il motto o la foto spariscono per gli altri, la persona resta dentro; oppure e' tolta dalla classifica.
  motto_nascosto boolean not null default false,
  foto_nascosta boolean not null default false,
  rimossa_dallo_staff boolean not null default false,
  aggiornato_il timestamptz not null default now()
);

create table if not exists public.athlon_classifica_consensi_log (
  id uuid primary key default gen_random_uuid(),
  member_id bigint not null,
  azione text not null check (azione in ('consenso', 'revoca')),
  versione text not null,
  il timestamptz not null default now()
);
create index if not exists athlon_classifica_consensi_log_membro on public.athlon_classifica_consensi_log (member_id, il desc);

create table if not exists public.athlon_classifica_mese (
  -- Il primo giorno del mese (a Roma).
  mese date not null check (extract(day from mese) = 1),
  member_id bigint not null,
  -- Identificativo opaco della riga, per la segnalazione: non e' il member_id di nessuno e cambia ogni mese.
  riga_id uuid not null default gen_random_uuid(),
  punteggio smallint not null default 0 check (punteggio between 0 and 100),
  giorni_attivi smallint not null default 0 check (giorni_attivi between 0 and 31),
  ricalcolata_il timestamptz not null default now(),
  primary key (mese, member_id),
  unique (riga_id)
);
create index if not exists athlon_classifica_mese_punti on public.athlon_classifica_mese (mese, punteggio desc);

create table if not exists public.athlon_classifica_segnalazioni (
  id uuid primary key default gen_random_uuid(),
  mese date not null,
  riga_member_id bigint not null,
  segnalata_da bigint not null,
  creata_il timestamptz not null default now(),
  -- Null = aperta. Poi: 'motto_nascosto', 'foto_nascosta', 'rimossa', 'nessuna_azione'.
  esito text,
  chiusa_il timestamptz,
  unique (mese, riga_member_id, segnalata_da)
);
create index if not exists athlon_classifica_segnalazioni_aperte on public.athlon_classifica_segnalazioni (creata_il) where esito is null;

alter table public.athlon_classifica_config enable row level security;
alter table public.athlon_classifica_consensi enable row level security;
alter table public.athlon_classifica_consensi_log enable row level security;
alter table public.athlon_classifica_mese enable row level security;
alter table public.athlon_classifica_segnalazioni enable row level security;
revoke all on public.athlon_classifica_config from public, anon, authenticated;
revoke all on public.athlon_classifica_consensi from public, anon, authenticated;
revoke all on public.athlon_classifica_consensi_log from public, anon, authenticated;
revoke all on public.athlon_classifica_mese from public, anon, authenticated;
revoke all on public.athlon_classifica_segnalazioni from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Chi e' dentro: consenso vivo alla versione corrente, non tolto dallo staff, maggiorenne.

create or replace function public.athlon_classifica_versione(p_chiave text)
returns text
language sql stable security definer
set search_path = public, pg_temp
as $fn$
  select valore from public.athlon_classifica_config where chiave = p_chiave
$fn$;

create or replace view public.athlon_classifica_dentro as
  select c.member_id
    from public.athlon_classifica_consensi c
    join perfectgym.members m on m.id = c.member_id and not m.is_deleted
   where c.revocato_il is null
     and c.versione = public.athlon_classifica_versione('classifica')
     and not c.rimossa_dallo_staff
     and m.data_nascita is not null
     and m.data_nascita + interval '18 years' <= (now() at time zone 'Europe/Rome')::date;
revoke all on public.athlon_classifica_dentro from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Il punteggio di una persona in un mese. Solo letture: si puo' chiamare per chiunque e non scrive niente.

create or replace function public.athlon_classifica_punteggio(
  p_member bigint,
  p_mese date,
  p_oggi date default ((now() at time zone 'Europe/Rome')::date)
)
returns table (punteggio int, giorni_attivi int)
language sql stable security definer
set search_path = public, perfectgym, pg_temp
as $fn$
with
par as (
  select date_trunc('month', p_mese)::date as m0,
         least((date_trunc('month', p_mese)::date + interval '1 month' - interval '1 day')::date, p_oggi - 1) as fino
),
-- I pilastri in uso: Food e Recover solo con un consenso vivo alla versione corrente (Food non con i numeri nascosti).
uso as (
  select
    exists (select 1 from public.alimentazione_consensi a
              join public.alimentazione_profilo ap on ap.member_id = a.member_id
             where a.member_id = p_member and a.revocato_il is null
               and a.versione = public.athlon_classifica_versione('food') and not ap.nascondi_numeri) as food,
    exists (select 1 from public.dispositivi_consensi d
             where d.member_id = p_member and d.revocato_il is null
               and d.versione = public.athlon_classifica_versione('dispositivi')) as recover,
    coalesce((select ap.questionario ->> 'colazione' = 'mai' from public.alimentazione_profilo ap where ap.member_id = p_member), false) as senza_colazione
),
-- Train: i giorni con un ingresso al tornello o una presenza segnata a una lezione (una volta sola per giorno).
tg as (
  select x.g
    from (
      select (v.entrata at time zone 'Europe/Rome')::date as g
        from perfectgym.member_club_visits v, par
       where v.member_id = p_member and not v.is_deleted
         and v.entrata >= (par.m0 - 8)::timestamp at time zone 'Europe/Rome'
      union
      select (c.inizio at time zone 'Europe/Rome')::date
        from perfectgym.class_bookings cb
        join perfectgym.classes c on c.id = cb.class_id, par
       where cb.member_id = p_member and not cb.is_deleted and not c.is_deleted
         and not cb.annullata and not cb.in_attesa and cb.presente
         and c.inizio >= (par.m0 - 8)::timestamp at time zone 'Europe/Rome' and c.inizio < now()
    ) x, par
   where x.g between par.m0 - 7 and par.fino
),
prima_train as (
  select least(
    (select min((v.entrata at time zone 'Europe/Rome')::date) from perfectgym.member_club_visits v where v.member_id = p_member and not v.is_deleted),
    (select min((c.inizio at time zone 'Europe/Rome')::date)
       from perfectgym.class_bookings cb join perfectgym.classes c on c.id = cb.class_id
      where cb.member_id = p_member and not cb.is_deleted and not c.is_deleted
        and not cb.annullata and not cb.in_attesa and cb.presente and c.inizio < now())
  ) as g
),
-- Food: i giorni con colazione, pranzo e cena nel diario (chi non fa colazione: pranzo e cena).
fg as (
  select d.data as g
    from public.diario_alimentare d, uso, par
   where d.member_id = p_member and d.data between par.m0 - 7 and par.fino
   group by d.data, uso.senza_colazione
  having count(*) filter (where d.pasto = 'pranzo') > 0
     and count(*) filter (where d.pasto = 'cena') > 0
     and (uso.senza_colazione or count(*) filter (where d.pasto = 'colazione') > 0)
),
prima_food as (select min(data) as g from public.diario_alimentare where member_id = p_member),
-- Recover: le notti (scritte o lette dal dispositivo); per la stessa notte vale il dispositivo, non quella scritta a mano.
notti as (
  select distinct on (j.data) j.data as g, j.sonno_minuti as m
    from public.dispositivi_giorni j, par
   where j.member_id = p_member and j.sonno_minuti is not null and j.data between par.m0 - 7 and par.fino
   order by j.data, (j.fornitore = 'manuale'), j.aggiornato_il desc
),
prima_notte as (select min(data) as g from public.dispositivi_giorni where member_id = p_member and sonno_minuti is not null),
-- Le settimane (lunedi'-domenica) che toccano il mese fino a ieri, col peso dei giorni che hanno nel mese.
-- `fin` e' l'ultimo giorno della finestra di 7 giorni: la domenica per una settimana finita, ieri per quella in corso.
sett as (
  select s.lun, least(s.lun + 6, par.fino) as fin,
         (select count(*) from generate_series(0, 6) k where s.lun + k between par.m0 and par.fino) as peso
    from par
   cross join lateral (select (date_trunc('week', par.m0)::date + n * 7) as lun from generate_series(0, 5) n) s
   where s.lun <= par.fino
),
q as (
  select w.fin, w.peso,
         (array[0, 0.4, 1, 1, 1, 0.9, 0.8, 0.7])[least(7, (select count(*) from tg where tg.g between w.fin - 6 and w.fin))::int + 1] as qt,
         least(1, (select count(*) from fg where fg.g between w.fin - 6 and w.fin)::numeric / 5) as qf,
         least(1, (select coalesce(sum(case when n.m >= 420 then 1 when n.m >= 360 then 0.7 when n.m >= 300 then 0.4 else 0.2 end), 0)
                     from notti n where n.g between w.fin - 6 and w.fin) / 5) as qr
    from sett w
   where w.peso > 0
),
-- La media del mese di ogni pilastro: solo le settimane che finiscono dopo la prima attivita' di quel pilastro.
media as (
  select
    coalesce(sum(q.peso * q.qt) filter (where pt.g is not null and q.fin >= pt.g) / nullif(sum(q.peso) filter (where pt.g is not null and q.fin >= pt.g), 0), 0) as mt,
    coalesce(sum(q.peso * q.qf) filter (where pf.g is not null and q.fin >= pf.g) / nullif(sum(q.peso) filter (where pf.g is not null and q.fin >= pf.g), 0), 0) as mf,
    coalesce(sum(q.peso * q.qr) filter (where pn.g is not null and q.fin >= pn.g) / nullif(sum(q.peso) filter (where pn.g is not null and q.fin >= pn.g), 0), 0) as mr
    from q cross join prima_train pt cross join prima_food pf cross join prima_notte pn
)
select
  round(100 * (70 * m.mt + case when u.food then 15 * m.mf else 0 end + case when u.recover then 15 * m.mr else 0 end)
            / (70 + case when u.food then 15 else 0 end + case when u.recover then 15 else 0 end))::int as punteggio,
  (select count(*) from tg, par where tg.g between par.m0 and par.fino)::int as giorni_attivi
  from media m cross join uso u
$fn$;

-- ---------------------------------------------------------------------------
-- Il ricalcolo: per tutti quelli che sono dentro (o per uno solo), e chi non e' piu' dentro esce dal mese.

create or replace function public.athlon_classifica_ricalcola(p_mese date default null, p_member bigint default null)
returns int
language plpgsql security definer
set search_path = public, perfectgym, pg_temp
as $fn$
declare
  v_mese date := date_trunc('month', coalesce(p_mese, (now() at time zone 'Europe/Rome')::date))::date;
  v_n int;
begin
  insert into public.athlon_classifica_mese as x (mese, member_id, punteggio, giorni_attivi, ricalcolata_il)
  select v_mese, d.member_id, p.punteggio, p.giorni_attivi, now()
    from public.athlon_classifica_dentro d
   cross join lateral public.athlon_classifica_punteggio(d.member_id, v_mese) p
   where p_member is null or d.member_id = p_member
  on conflict (mese, member_id) do update
     set punteggio = excluded.punteggio, giorni_attivi = excluded.giorni_attivi, ricalcolata_il = now();
  get diagnostics v_n = row_count;

  delete from public.athlon_classifica_mese x
   where x.mese = v_mese
     and (p_member is null or x.member_id = p_member)
     and not exists (select 1 from public.athlon_classifica_dentro d where d.member_id = x.member_id);
  return v_n;
end
$fn$;

-- Il giro notturno: il mese in corso; il primo del mese anche quello appena finito (con tutti i suoi giorni); e si buttano i mesi vecchi.
create or replace function public.athlon_classifica_giro()
returns int
language plpgsql security definer
set search_path = public, perfectgym, pg_temp
as $fn$
declare
  v_oggi date := (now() at time zone 'Europe/Rome')::date;
  v_n int;
begin
  v_n := public.athlon_classifica_ricalcola(v_oggi, null);
  if extract(day from v_oggi) = 1 then
    perform public.athlon_classifica_ricalcola((v_oggi - 1), null);
  end if;
  delete from public.athlon_classifica_mese where mese < (date_trunc('month', v_oggi)::date - interval '12 months');
  return v_n;
end
$fn$;

revoke all on function public.athlon_classifica_versione(text) from public, anon, authenticated;
revoke all on function public.athlon_classifica_punteggio(bigint, date, date) from public, anon, authenticated;
revoke all on function public.athlon_classifica_ricalcola(date, bigint) from public, anon, authenticated;
revoke all on function public.athlon_classifica_giro() from public, anon, authenticated;
grant execute on function public.athlon_classifica_versione(text) to service_role;
grant execute on function public.athlon_classifica_punteggio(bigint, date, date) to service_role;
grant execute on function public.athlon_classifica_ricalcola(date, bigint) to service_role;
grant execute on function public.athlon_classifica_giro() to service_role;

-- Il giro, ogni notte alle 02:30 UTC (le 03:30 a Roma d'inverno, le 04:30 d'estate: pg_cron ragiona in UTC).
select cron.unschedule('athlon-classifica-giro') where exists (select 1 from cron.job where jobname = 'athlon-classifica-giro');
select cron.schedule('athlon-classifica-giro', '30 2 * * *', $cron$ select public.athlon_classifica_giro() $cron$);

-- ---------------------------------------------------------------------------
-- Per tornare indietro (decommentare e lanciare; cancella anche i consensi e il registro: pensarci prima).
--
-- select cron.unschedule('athlon-classifica-giro') where exists (select 1 from cron.job where jobname = 'athlon-classifica-giro');
-- drop function if exists public.athlon_classifica_giro();
-- drop function if exists public.athlon_classifica_ricalcola(date, bigint);
-- drop function if exists public.athlon_classifica_punteggio(bigint, date, date);
-- drop view if exists public.athlon_classifica_dentro;
-- drop function if exists public.athlon_classifica_versione(text);
-- drop table if exists public.athlon_classifica_segnalazioni;
-- drop table if exists public.athlon_classifica_mese;
-- drop table if exists public.athlon_classifica_consensi_log;
-- drop table if exists public.athlon_classifica_consensi;
-- drop table if exists public.athlon_classifica_config;

-- ---------------------------------------------------------------------------
-- MODERAZIONE, per lo staff, in attesa della pagina «Classifica» del CRM (da lanciare nell'editor SQL; sostituire 123 col member_id).
-- Sono contenuti scritti da persone e visti da altre persone: lo staff deve poterli togliere.
--
-- Chi e' dentro, con motto e foto:
--   select c.member_id, m.nome, m.cognome, c.accettato_il, c.mostra_foto, c.foto_nascosta, c.motto, c.motto_nascosto, c.rimossa_dallo_staff
--     from public.athlon_classifica_consensi c join perfectgym.members m on m.id = c.member_id
--    where c.revocato_il is null order by c.accettato_il desc;
--
-- Segnalazioni aperte (con il motto segnalato):
--   select s.id, s.mese, s.creata_il, s.riga_member_id, m.nome, m.cognome, c.motto, c.mostra_foto
--     from public.athlon_classifica_segnalazioni s
--     join public.athlon_classifica_consensi c on c.member_id = s.riga_member_id
--     join perfectgym.members m on m.id = s.riga_member_id
--    where s.esito is null order by s.creata_il;
--
-- Nascondere il motto (la persona resta dentro):
--   update public.athlon_classifica_consensi set motto_nascosto = true, aggiornato_il = now() where member_id = 123;
-- Nascondere la foto:
--   update public.athlon_classifica_consensi set foto_nascosta = true, aggiornato_il = now() where member_id = 123;
-- Togliere la persona dalla classifica (non puo' rientrare da sola; sparisce subito):
--   update public.athlon_classifica_consensi set rimossa_dallo_staff = true, aggiornato_il = now() where member_id = 123;
--   delete from public.athlon_classifica_mese where member_id = 123;
-- Rimettere tutto com'era:
--   update public.athlon_classifica_consensi set motto_nascosto = false, foto_nascosta = false, rimossa_dallo_staff = false where member_id = 123;
-- Chiudere una segnalazione (esito: 'motto_nascosto', 'foto_nascosta', 'rimossa' o 'nessuna_azione'):
--   update public.athlon_classifica_segnalazioni set esito = 'motto_nascosto', chiusa_il = now() where id = '<id della segnalazione>';
