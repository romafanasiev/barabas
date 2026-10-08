import { Client } from 'pg';

/* `0000000K-5eed-4000-8000-NNNNNNNNNNNN`: K is the table, N the row. The middle
   groups make seed rows recognisable in logs and keep the id a valid uuid v4. */
function seedId(table: number, row: number): string {
  return `0000000${table}-5eed-4000-8000-${String(row).padStart(12, '0')}`;
}

export const seedIds = {
  venue: seedId(1, 1),
  section: (n: number) => seedId(2, n),
  seat: (n: number) => seedId(3, n),
  event: seedId(4, 1),
  ticketType: (n: number) => seedId(5, n),
  eventSeat: (n: number) => seedId(6, n),
  allocation: (n: number) => seedId(7, n),
};

const currency = 'UAH';

/* `n` numbers the section together with its ticket type and quota: one ticket
   type per section, named after it. */
type Section = { n: number; label: string; price: string } & (
  | { type: 'numbered'; rows: number; seatsPerRow: number }
  | { type: 'standing'; capacity: number }
);

const sections: Section[] = [
  {
    n: 1,
    type: 'numbered',
    label: 'Parter',
    rows: 15,
    seatsPerRow: 20,
    price: '1500.00',
  },
  {
    n: 2,
    type: 'numbered',
    label: 'Balcony',
    rows: 10,
    seatsPerRow: 20,
    price: '900.00',
  },
  {
    n: 3,
    type: 'standing',
    label: 'Fan zone',
    capacity: 1000,
    price: '700.00',
  },
];

function capacityOf(section: Section): number {
  return section.type === 'numbered'
    ? section.rows * section.seatsPerRow
    : section.capacity;
}

/* Seats are numbered across the whole hall: seat N and event seat N are the
   same place. */
const seats = sections.flatMap((section) =>
  section.type === 'numbered'
    ? Array.from({ length: capacityOf(section) }, (_, i) => ({
        section: section.n,
        rowNo: Math.floor(i / section.seatsPerRow) + 1,
        seatNumber: (i % section.seatsPerRow) + 1,
      }))
    : [],
);

const standing = sections.filter((section) => section.type === 'standing');

/* A venue with two numbered sections (500 seats) and a standing floor, a concert
   in it, every seat on sale and a quota for the floor. Fixed ids plus
   `ON CONFLICT (id) DO NOTHING` make a rerun change nothing. One statement per
   table; runs inside the caller's transaction. */
export async function seed(client: Client): Promise<void> {
  await client.query(
    `INSERT INTO venue (id, name, city) VALUES ($1, 'Sky Arena', 'Kyiv')
     ON CONFLICT (id) DO NOTHING`,
    [seedIds.venue],
  );

  await client.query(
    `INSERT INTO section (id, venue_id, label, capacity, type)
     SELECT id, $5, label, capacity, type::section_type
     FROM unnest($1::uuid[], $2::text[], $3::int[], $4::text[]) AS s(id, label, capacity, type)
     ON CONFLICT (id) DO NOTHING`,
    [
      sections.map((s) => seedIds.section(s.n)),
      sections.map((s) => s.label),
      sections.map(capacityOf),
      sections.map((s) => s.type),
      seedIds.venue,
    ],
  );

  await client.query(
    `INSERT INTO seat (id, section_id, row_no, seat_number, section_type, venue_id)
     SELECT id, section_id, row_no, seat_number, 'numbered', $5
     FROM unnest($1::uuid[], $2::uuid[], $3::int[], $4::int[]) AS s(id, section_id, row_no, seat_number)
     ON CONFLICT (id) DO NOTHING`,
    [
      seats.map((_, i) => seedIds.seat(i + 1)),
      seats.map((s) => seedIds.section(s.section)),
      seats.map((s) => s.rowNo),
      seats.map((s) => s.seatNumber),
      seedIds.venue,
    ],
  );

  await client.query(
    `INSERT INTO event (id, venue_id, artist, starts_at, ends_at)
     VALUES ($1, $2, 'Northern Lights', '2027-06-19 19:00+03', '2027-06-19 22:00+03')
     ON CONFLICT (id) DO NOTHING`,
    [seedIds.event, seedIds.venue],
  );

  await client.query(
    `INSERT INTO ticket_type (id, event_id, type, price, currency)
     SELECT id, $4, type, price, $5
     FROM unnest($1::uuid[], $2::text[], $3::numeric[]) AS t(id, type, price)
     ON CONFLICT (id) DO NOTHING`,
    [
      sections.map((s) => seedIds.ticketType(s.n)),
      sections.map((s) => s.label),
      sections.map((s) => s.price),
      seedIds.event,
      currency,
    ],
  );

  await client.query(
    `INSERT INTO event_seat (id, event_id, seat_id, ticket_type_id, venue_id)
     SELECT id, $4, seat_id, ticket_type_id, $5
     FROM unnest($1::uuid[], $2::uuid[], $3::uuid[]) AS s(id, seat_id, ticket_type_id)
     ON CONFLICT (id) DO NOTHING`,
    [
      seats.map((_, i) => seedIds.eventSeat(i + 1)),
      seats.map((_, i) => seedIds.seat(i + 1)),
      seats.map((s) => seedIds.ticketType(s.section)),
      seedIds.event,
      seedIds.venue,
    ],
  );

  await client.query(
    `INSERT INTO ticket_allocation (id, event_id, section_id, ticket_type_id, venue_id,
                                    section_type, section_capacity, capacity)
     SELECT id, $5, section_id, ticket_type_id, $6, 'standing', capacity, capacity
     FROM unnest($1::uuid[], $2::uuid[], $3::uuid[], $4::int[]) AS a(id, section_id, ticket_type_id, capacity)
     ON CONFLICT (id) DO NOTHING`,
    [
      standing.map((s) => seedIds.allocation(s.n)),
      standing.map((s) => seedIds.section(s.n)),
      standing.map((s) => seedIds.ticketType(s.n)),
      standing.map(capacityOf),
      seedIds.event,
      seedIds.venue,
    ],
  );

  await verify(client);
}

/* `DO NOTHING` keeps whatever an older seed left under the same ids. If that
   no longer adds up to a hall where every seat is on sale, fail instead of
   reporting success over stale data. */
async function verify(client: Client): Promise<void> {
  const { rows } = await client.query<{
    label: string;
    capacity: number;
    seats: number;
  }>(
    `SELECT s.label, s.capacity,
            (SELECT count(*)::int FROM seat_live st WHERE st.section_id = s.id) AS seats
     FROM section_live s
     WHERE s.venue_id = $1 AND s.type = 'numbered'
     ORDER BY s.label`,
    [seedIds.venue],
  );

  const short = rows.find((section) => section.seats !== section.capacity);
  if (short) {
    throw new Error(
      `seed: section ${short.label} has ${short.seats} seats, capacity ${short.capacity}`,
    );
  }

  const hall = rows.reduce((sum, section) => sum + section.capacity, 0);
  const { rows: onSale } = await client.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM event_seat_live WHERE event_id = $1`,
    [seedIds.event],
  );

  if (onSale[0]?.count !== hall) {
    throw new Error(
      `seed: ${onSale[0]?.count} seats on sale, the hall has ${hall}`,
    );
  }
}

if (import.meta.main) {
  if (!process.env.POSTGRES_URL) {
    process.loadEnvFile('../../.env');
  }

  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();

  try {
    await client.query('BEGIN');
    await seed(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  process.stdout.write(
    `seeded venue ${seedIds.venue}, event ${seedIds.event}\n`,
  );
}
