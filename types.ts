
import { z } from 'zod';

export const FlightSchema = z.object({
    id: z.string(),
    price: z.number(),
    provider: z.string(),
    legs: z.array(z.object({
        duration: z.string(),
        airline: z.string(),
        airlineLogoUrl: z.string(),
        departureTime: z.string(),
        arrivalTime: z.string(),
        stops: z.string(),
    })),
    emissions: z.object({ co2: z.number() }).optional(),
    from: z.object({ time: z.string(), code: z.string() }),
    to: z.object({ time: z.string(), code: z.string() }),
    duration: z.string(),
    stops: z.number(),
    });

export type Flight = z.infer<typeof FlightSchema>;

export const VisualFlightSearchInputSchema = z.object({
    origin: z.string(),
    destination: z.string(),
    dates: z.string(),
    passengers: z.number(),
    flightClass: z.string(),
    });

export type VisualFlightSearchInput = z.infer<typeof VisualFlightSearchInputSchema>;

export const VisualFlightSearchOutputSchema = z.object({
    flights: z.array(FlightSchema),
    redirectUrl: z.string(),
    htmlContent: z.string(),
    cheapestPrice: z.number().nullable(),
    });

export type VisualFlightSearchOutput = z.infer<typeof VisualFlightSearchOutputSchema>;

export const ClassicFlightSearchInputSchema = z.object({
    query: z.string(),
});

export type ClassicFlightSearchInput = z.infer<typeof ClassicFlightSearchInputSchema>;

export const ClassicFlightSearchOutputSchema = z.object({
    reply: z.string(),
    flightDetails: VisualFlightSearchInputSchema.nullable(),
});

export type ClassicFlightSearchOutput = z.infer<typeof ClassicFlightSearchOutputSchema>;
