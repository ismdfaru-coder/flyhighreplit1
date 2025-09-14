
import { z } from "zod";

export const FlightLegSchema = z.object({
  airline: z.string(),
  airlineLogoUrl: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  duration: z.string(),
  stops: z.string(),
  fromCode: z.string().optional(),
  toCode: z.string().optional(),
});

export type FlightLeg = z.infer<typeof FlightLegSchema>;

export const FlightSchema = z.object({
  id: z.string(),
  legs: z.array(FlightLegSchema),
  price: z.number(),
  provider: z.string(),
  from: z.object({
    code: z.string(),
    time: z.string(),
  }).optional(),
  to: z.object({
    code: z.string(),
    time: z.string(),
  }).optional(),
  duration: z.string().optional(),
  stops: z.number().optional(),
  emissions: z.object({
    co2: z.number(),
  }).optional(),
});

export type Flight = z.infer<typeof FlightSchema>;


export const VisualFlightSearchInputSchema = z.object({
  destination: z.string().describe('The destination of the flight.'),
  origin: z.string().describe('The origin of the flight.'),
  dates: z.string().describe('The dates for the flight.'),
  passengers: z.number().describe('The number of passengers.'),
  flightClass: z.string().optional().describe('The flight class (e.g., economy, business).'),
});
export type VisualFlightSearchInput = z.infer<typeof VisualFlightSearchInputSchema>;

export const VisualFlightSearchOutputSchema = z.object({
  flights: z.array(FlightSchema).describe('An array of flights found on the page.'),
  redirectUrl: z.string().describe('The URL to redirect the user to for booking.'),
  htmlContent: z.string().describe("The full HTML content of the flight results page for debugging."),
  cheapestPrice: z.number().nullable().describe('The cheapest price found on the page.'),
});
export type VisualFlightSearchOutput = z.infer<typeof VisualFlightSearchOutputSchema>;

export const ClassicFlightSearchInputSchema = z.object({
  query: z.string().describe('The free-form text query from the user.'),
});
export type ClassicFlightSearchInput = z.infer<typeof ClassicFlightSearchInputSchema>;

export const ClassicFlightSearchOutputSchema = z.object({
  flights: z.array(FlightSchema).describe('An array of sorted flights found on the page.'),
  redirectUrl: z.string().optional().describe('The URL to redirect the user to for booking.'),
  htmlContent: z.string().optional().describe("The full HTML content of the flight results page for debugging."),
  cheapestPrice: z.number().nullable().optional().describe('The cheapest price found on the page.'),
  parsedQuery: z.object({
      origin: z.string().optional(),
      destination: z.string().optional(),
      dates: z.string().optional(),
      passengers: z.number().optional(),
      flightClass: z.string().optional(),
  }).optional().describe("The parsed flight details from the user's query."),
});
export type ClassicFlightSearchOutput = z.infer<typeof ClassicFlightSearchOutputSchema>;
