import { Client } from 'pg';
export declare const seedIds: {
    venue: string;
    section: (n: number) => string;
    seat: (n: number) => string;
    event: string;
    ticketType: (n: number) => string;
    eventSeat: (n: number) => string;
    allocation: (n: number) => string;
};
export declare function seed(client: Client): Promise<void>;
