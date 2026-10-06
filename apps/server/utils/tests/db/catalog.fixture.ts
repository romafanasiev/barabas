import type { Client } from 'pg';

export const ids = {
  venue: '10000000-0000-0000-0000-000000000001',
  numberedSection: '20000000-0000-0000-0000-000000000001',
  standingSection: '20000000-0000-0000-0000-000000000002',
  seat: '30000000-0000-0000-0000-000000000001',
  event: '40000000-0000-0000-0000-000000000001',
  ticketType: '50000000-0000-0000-0000-000000000001',
  eventSeat: '60000000-0000-0000-0000-000000000001',
  user: 'u1',
  hold: '80000000-0000-0000-0000-000000000001',
  order: '90000000-0000-0000-0000-000000000001',
  payment: 'a0000000-0000-0000-0000-000000000001',
} as const;

/* A venue with one numbered and one standing section, an event with one seat on
   sale, and a paid order for that seat. No ticket yet and no quota: tests add those. */
export async function seedCatalog(client: Client): Promise<void> {
  await client.query(`
    INSERT INTO venue (id, name, city) VALUES ('${ids.venue}', 'Hall', 'Kyiv');
    INSERT INTO section (id, venue_id, label, capacity, type) VALUES
      ('${ids.numberedSection}', '${ids.venue}', 'Parter', 100, 'numbered'),
      ('${ids.standingSection}', '${ids.venue}', 'Fan', 100, 'standing');
    INSERT INTO seat (id, section_id, row_no, seat_number, section_type, venue_id) VALUES
      ('${ids.seat}', '${ids.numberedSection}', 1, 1, 'numbered', '${ids.venue}');
    INSERT INTO event (id, venue_id, artist, starts_at, ends_at) VALUES
      ('${ids.event}', '${ids.venue}', 'Band', now() + interval '30 days', now() + interval '30 days 3 hours');
    INSERT INTO ticket_type (id, event_id, type, price, currency) VALUES
      ('${ids.ticketType}', '${ids.event}', 'Standard', 100, 'UAH');
    INSERT INTO event_seat (id, event_id, seat_id, ticket_type_id, venue_id) VALUES
      ('${ids.eventSeat}', '${ids.event}', '${ids.seat}', '${ids.ticketType}', '${ids.venue}');
    INSERT INTO "user" (id, name, email) VALUES ('${ids.user}', 'Buyer', 'buyer@example.com');
    INSERT INTO hold (id, user_id, event_id, status, expires_at) VALUES
      ('${ids.hold}', '${ids.user}', '${ids.event}', 'confirmed', now() + interval '10 minutes');
    INSERT INTO hold_seat_item (hold_id, event_seat_id, event_id, status) VALUES
      ('${ids.hold}', '${ids.eventSeat}', '${ids.event}', 'active');
    INSERT INTO "order" (id, hold_id, status, currency, expires_at) VALUES
      ('${ids.order}', '${ids.hold}', 'paid', 'UAH', now() + interval '15 minutes');
    INSERT INTO order_item (order_id, event_seat_id, quantity, price, currency) VALUES
      ('${ids.order}', '${ids.eventSeat}', 1, 100, 'UAH');
    INSERT INTO payment (id, order_id, status, idempotency_key, price, currency) VALUES
      ('${ids.payment}', '${ids.order}', 'succeeded', 'k1', 100, 'UAH');
  `);
}
