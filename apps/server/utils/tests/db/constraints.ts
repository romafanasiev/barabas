/* Every constraint name the schema declares, in one place: tests import from here,
   and the coverage test compares this list with the live database. */
export * from '../../../src/modules/event/infrastructure/currency.constraints.js';
export * from '../../../src/modules/event/infrastructure/event-seat.constraints.js';
export * from '../../../src/modules/event/infrastructure/event.constraints.js';
export * from '../../../src/modules/event/infrastructure/ticket-allocation.constraints.js';
export * from '../../../src/modules/event/infrastructure/ticket-type.constraints.js';
export * from '../../../src/modules/ticketing/infrastructure/check-in.constraints.js';
export * from '../../../src/modules/ticketing/infrastructure/hold-allocated-item.constraints.js';
export * from '../../../src/modules/ticketing/infrastructure/hold-seat-item.constraints.js';
export * from '../../../src/modules/ticketing/infrastructure/hold.constraints.js';
export * from '../../../src/modules/ticketing/infrastructure/order-item.constraints.js';
export * from '../../../src/modules/ticketing/infrastructure/order.constraints.js';
export * from '../../../src/modules/ticketing/infrastructure/payment.constraints.js';
export * from '../../../src/modules/ticketing/infrastructure/ticket.constraints.js';
export * from '../../../src/modules/venue/infrastructure/seat.constraints.js';
export * from '../../../src/modules/venue/infrastructure/section.constraints.js';
export * from '../../../src/modules/venue/infrastructure/venue.constraints.js';
