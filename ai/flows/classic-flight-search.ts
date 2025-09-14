
'use server';
/**
 * @fileOverview A flow to handle the entire classic flight search process.
 * It takes a freeform query, parses it, performs a visual search,
 * and then analyzes the results to return a structured list of flights.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ClassicFlightSearchInput, ClassicFlightSearchOutput, ClassicFlightSearchInputSchema, ClassicFlightSearchOutputSchema, VisualFlightSearchInputSchema } from '@/types';
import { visualFlightSearch, } from './visual-flight-search';

// The main prompt that orchestrates the parsing and analysis
const flightQueryParsingPrompt = ai.definePrompt({
  name: 'classicFlightQueryParsingPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: {
    schema: z.object({
      query: z.string(),
    }),
  },
  output: {
    schema: VisualFlightSearchInputSchema
  },
  prompt: `You are an expert flight search assistant. Your task is to process a user's query to extract the key flight details: origin, destination, dates, and number of passengers.
- If the user provides only partial information (e.g., just "flights to Chennai"), you MUST infer the missing details. For example, assume the origin is "Glasgow", the date is for "next week", and the number of passengers is "1".
- You must return all fields for the flight details. The 'dates' field must always be populated; default to 'next week' if it is not specified.

Current Date: ${new Date().toLocaleDateString()}

User Query: {{{query}}}
`,
});


// Define the main flow
const classicFlightSearchFlow = ai.defineFlow(
  {
    name: 'classicFlightSearchFlow',
    inputSchema: ClassicFlightSearchInputSchema,
    outputSchema: ClassicFlightSearchOutputSchema,
  },
  async ({ query }) => {
    // Step 1: Parse the user's query to get flight details.
    const parsingResponse = await flightQueryParsingPrompt({ query });
    const details = parsingResponse.output;

    if (!details) {
        throw new Error("Could not parse flight details from your query.");
    }
    
    // Step 2: Use the visual flight search flow to get flight data
    const visualSearchResult = await visualFlightSearch(details);

    // If no flights were found in the visual search, return early.
    if (visualSearchResult.flights.length === 0) {
        return {
            flights: [],
            redirectUrl: visualSearchResult.redirectUrl,
            htmlContent: visualSearchResult.htmlContent,
            cheapestPrice: visualSearchResult.cheapestPrice,
            parsedQuery: details,
        };
    }
    
    // Step 3: Return the complete, structured output.
    return {
      flights: visualSearchResult.flights,
      redirectUrl: visualSearchResult.redirectUrl,
      htmlContent: visualSearchResult.htmlContent,
      cheapestPrice: visualSearchResult.cheapestPrice,
      parsedQuery: details,
    };
  }
);


export async function classicFlightSearch(input: ClassicFlightSearchInput): Promise<ClassicFlightSearchOutput> {
    return classicFlightSearchFlow(input);
}
