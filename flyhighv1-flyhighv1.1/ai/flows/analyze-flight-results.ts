
'use server';

/**
 * @fileOverview An AI flow for analyzing a list of flights.
 *
 * - analyzeFlightResults - A function that takes flight data and returns a summary.
 * - AnalyzeFlightResultsInput - The input type for the function.
 * - AnalyzeFlightResultsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { FlightSchema } from '@/types';

const AnalyzeFlightResultsInputSchema = z.object({
  availableFlights: z.array(FlightSchema).describe('A list of available flights to be analyzed.'),
});
export type AnalyzeFlightResultsInput = z.infer<typeof AnalyzeFlightResultsInputSchema>;

const AnalyzeFlightResultsOutputSchema = z.object({
  analysis: z.string().describe("A summary of the flight results."),
  analyzedFlights: z.array(FlightSchema).describe('The summarized flight results, including best, cheapest, and fastest options.'),
});
export type AnalyzeFlightResultsOutput = z.infer<typeof AnalyzeFlightResultsOutputSchema>;

export async function analyzeFlightResults(input: AnalyzeFlightResultsInput): Promise<AnalyzeFlightResultsOutput> {
  return analyzeFlightResultsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'analyzeFlightResultsPrompt',
    input: { schema: AnalyzeFlightResultsInputSchema },
    output: { schema: AnalyzeFlightResultsOutputSchema },
    model: 'googleai/gemini-1.5-pro-latest',
    prompt: `You are a flight analysis expert. Your task is to analyze a list of available flights and provide a concise summary.
Base your entire analysis ONLY on the provided flight data. Do not invent information.

Your flight analysis summary should have three sections:
1.  **Best Flights**: The best flights based on a balance of price, duration, and stops. Highlight at least 3.
2.  **The Cheapest Flight**: The single flight with the lowest price.
3.  **The Fastest Flight**: The single flight with the shortest duration.

When you have analyzed flights, populate the 'analyzedFlights' field in the output with the flight data for the best, cheapest, and fastest options. The best options should come first.

Available flights for analysis:
{{{availableFlights}}}
`
});

const analyzeFlightResultsFlow = ai.defineFlow(
  {
    name: 'analyzeFlightResultsFlow',
    inputSchema: AnalyzeFlightResultsInputSchema,
    outputSchema: AnalyzeFlightResultsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
        availableFlights: input.availableFlights
    });
    
    if (!output) {
        throw new Error("Failed to get a valid response from the AI model for flight analysis.");
    }
    return output;
  }
);
