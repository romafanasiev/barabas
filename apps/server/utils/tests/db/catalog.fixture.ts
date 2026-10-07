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
  allocation: '70000000-0000-0000-0000-000000000001',
  ticket: 'b0000000-0000-0000-0000-000000000001',
  failedPayment: 'a0000000-0000-0000-0000-000000000002',
  otherVenue: '10000000-0000-0000-0000-000000000002',
  otherVenueSection: '20000000-0000-0000-0000-000000000003',
  otherVenueStanding: '20000000-0000-0000-0000-000000000004',
  otherVenueSeat: '30000000-0000-0000-0000-000000000002',
  spareSeat: '30000000-0000-0000-0000-000000000003',
  otherEvent: '40000000-0000-0000-0000-000000000002',
  otherTicketType: '50000000-0000-0000-0000-000000000002',
  otherEventSeat: '60000000-0000-0000-0000-000000000002',
  otherAllocation: '70000000-0000-0000-0000-000000000002',
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

/* The catalog plus everything a sale leaves behind: a quota held and ordered, a
   ticket for the seat and its check-in, and a failed payment next to the good
   one. After this every domain table has at least one row. */
export async function seedSale(client: Client): Promise<void> {
  await seedCatalog(client);
  await client.query(`
    INSERT INTO ticket_allocation (id, event_id, section_id, ticket_type_id, venue_id,
                                   section_type, section_capacity, capacity, held, sold)
    VALUES ('${ids.allocation}', '${ids.event}', '${ids.standingSection}', '${ids.ticketType}',
            '${ids.venue}', 'standing', 100, 50, 2, 0);
    INSERT INTO hold_allocated_item (hold_id, allocation_id, event_id, quantity, status) VALUES
      ('${ids.hold}', '${ids.allocation}', '${ids.event}', 2, 'active');
    INSERT INTO order_item (order_id, allocation_id, quantity, price, currency) VALUES
      ('${ids.order}', '${ids.allocation}', 2, 100, 'UAH');
    INSERT INTO payment (id, order_id, status, idempotency_key, price, currency) VALUES
      ('${ids.failedPayment}', '${ids.order}', 'failed', 'k0', 300, 'UAH');
    INSERT INTO ticket (id, payment_id, payment_status, event_seat_id, ticket_type_id,
                        ticket_price, currency, code)
    VALUES ('${ids.ticket}', '${ids.payment}', 'succeeded', '${ids.eventSeat}',
            '${ids.ticketType}', 100, 'UAH', 'C1');
    INSERT INTO check_in (ticket_id) VALUES ('${ids.ticket}');
  `);
}

/* Rows that are valid on their own but belong to someone else: a second venue,
   a second event in the first venue. Composite foreign keys are tested by
   pointing a child at one of these while every other key stays correct. */
export async function seedNeighbours(client: Client): Promise<void> {
  await client.query(`
    INSERT INTO venue (id, name, city) VALUES ('${ids.otherVenue}', 'Club', 'Lviv');
    INSERT INTO section (id, venue_id, label, capacity, type) VALUES
      ('${ids.otherVenueSection}', '${ids.otherVenue}', 'Hall', 50, 'numbered'),
      ('${ids.otherVenueStanding}', '${ids.otherVenue}', 'Floor', 50, 'standing');
    INSERT INTO seat (id, section_id, row_no, seat_number, section_type, venue_id) VALUES
      ('${ids.otherVenueSeat}', '${ids.otherVenueSection}', 1, 1, 'numbered', '${ids.otherVenue}'),
      ('${ids.spareSeat}', '${ids.numberedSection}', 1, 2, 'numbered', '${ids.venue}');
    INSERT INTO event (id, venue_id, artist, starts_at, ends_at) VALUES
      ('${ids.otherEvent}', '${ids.venue}', 'Other band', now() + interval '60 days',
       now() + interval '60 days 2 hours');
    INSERT INTO ticket_type (id, event_id, type, price, currency) VALUES
      ('${ids.otherTicketType}', '${ids.otherEvent}', 'Standard', 80, 'UAH');
    INSERT INTO event_seat (id, event_id, seat_id, ticket_type_id, venue_id) VALUES
      ('${ids.otherEventSeat}', '${ids.otherEvent}', '${ids.seat}', '${ids.otherTicketType}',
       '${ids.venue}');
    INSERT INTO ticket_allocation (id, event_id, section_id, ticket_type_id, venue_id,
                                   section_type, section_capacity, capacity)
    VALUES ('${ids.otherAllocation}', '${ids.otherEvent}', '${ids.standingSection}',
            '${ids.otherTicketType}', '${ids.venue}', 'standing', 100, 30);
  `);
}
