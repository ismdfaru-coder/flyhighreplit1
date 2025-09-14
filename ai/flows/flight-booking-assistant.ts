
'use server';

/**
 * @fileOverview A conversational AI flow for booking flights.
 *
 * - flightBookingAssistant - A function that handles the conversational flight booking process.
 * - FlightBookingInput - The input type for the flightBookingAssistant function.
 * - FlightBookingOutput - The return type for the flightBookingAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FlightBookingInputSchema = z.object({
  conversationHistory: z.string().describe('The history of the conversation so far.'),
});
export type FlightBookingInput = z.infer<typeof FlightBookingInputSchema>;

const FlightBookingOutputSchema = z.object({
  reply: z.string().describe('The assistant\'s reply to the user.'),
  isFlightDetailsComplete: z.boolean().describe('Whether all required flight details have been gathered.'),
  flightDetails: z.object({
    destination: z.string().optional().describe('The destination of the flight.'),
    origin: z.string().optional().describe('The origin of the flight.'),
    dates: z.string().optional().describe('The dates for the flight.'),
    passengers: z.number().optional().describe('The number of passengers.'),
    flightClass: z.string().optional().describe('The flight class (e.g., economy, business).'),
  }).optional().describe('The extracted flight details, if complete.'),
});
export type FlightBookingOutput = z.infer<typeof FlightBookingOutputSchema>;

export async function flightBookingAssistant(input: FlightBookingInput): Promise<FlightBookingOutput> {
  return flightBookingAssistantFlow(input);
}

const prompt = ai.definePrompt({
    name: 'flightBookingAssistantPrompt',
    input: { schema: FlightBookingInputSchema },
    output: { schema: FlightBookingOutputSchema },
    model: 'googleai/gemini-1.5-pro-latest',
    prompt: `You are an expert travel agent AI. Your primary goal is to have a concise conversation with the user to gather all the necessary information to find a flight.
You MUST determine the **origin**, **destination**, **dates**, and **number of passengers**.
Your responses must be plain text without any markdown.

- If you do not have all the required details, ask for the missing information in a friendly, conversational way. Be direct.
- Once you have all the required information (origin, destination, dates, passengers), set 'isFlightDetailsComplete' to true and fill in the 'flightDetails' object. DO NOT ask for confirmation.

Keep your replies helpful and to the point.

Conversation history:
{{{conversationHistory}}}

Assistant's next reply:
`
});


const flightBookingAssistantFlow = ai.defineFlow(
  {
    name: 'flightBookingAssistantFlow',
    inputSchema: FlightBookingInputSchema,
    outputSchema: FlightBookingOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
        conversationHistory: input.conversationHistory,
    });
    
    if (!output) {
        throw new Error("Failed to get a valid response from the AI model.");
    }
    return output;
  }
);
