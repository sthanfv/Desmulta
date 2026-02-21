'use server';
/**
 * @fileOverview This file defines a Genkit flow for assessing the viability of traffic fine debt removal.
 *
 * - preliminaryCaseAssessment - A function that handles the preliminary case assessment process.
 * - PreliminaryCaseAssessmentInput - The input type for the preliminaryCaseAssessment function.
 * - PreliminaryCaseAssessmentOutput - The return type for the preliminaryCaseAssessment function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema for the preliminary case assessment
const PreliminaryCaseAssessmentInputSchema = z.object({
  cedula: z.string().describe("The user's identification number (cedula)."),
  fineDetails: z
    .string()
    .describe(
      "Details about the user's traffic fines, including dates, types, and amounts if known. Provide as much detail as possible."
    ),
});
export type PreliminaryCaseAssessmentInput = z.infer<typeof PreliminaryCaseAssessmentInputSchema>;

// Output schema for the preliminary case assessment
const PreliminaryCaseAssessmentOutputSchema = z.object({
  viability: z
    .enum(['high', 'medium', 'low', 'unknown'])
    .describe(
      'The viability assessment for debt removal. "high" means strong chances, "medium" means moderate chances, "low" means weak chances, "unknown" means more information is needed.'
    ),
  summary: z
    .string()
    .describe('A concise summary of the preliminary assessment, explaining the reasoning.'),
  legalJustifications: z
    .array(z.string())
    .describe(
      'General legal justifications or principles relevant to the assessment, such as prescription periods, due process, or administrative appeals.'
    ),
});
export type PreliminaryCaseAssessmentOutput = z.infer<typeof PreliminaryCaseAssessmentOutputSchema>;

// Exported wrapper function for the flow
export async function preliminaryCaseAssessment(
  input: PreliminaryCaseAssessmentInput
): Promise<PreliminaryCaseAssessmentOutput> {
  return preliminaryCaseAssessmentFlow(input);
}

// Define the prompt for the AI model
const preliminaryCaseAssessmentPrompt = ai.definePrompt({
  name: 'preliminaryCaseAssessmentPrompt',
  input: { schema: PreliminaryCaseAssessmentInputSchema },
  output: { schema: PreliminaryCaseAssessmentOutputSchema },
  prompt: `You are an expert in Colombian administrative traffic law, specializing in the removal of traffic fines due to prescription or other legal justifications.
Your task is to provide a preliminary assessment of a user's case for debt removal based on the provided information.

Carefully analyze the 'fineDetails' to identify potential grounds for debt removal, such as:
- Fines older than 3 years (prescription of the executive action for collection).
- Fines older than 6 years (prescription of the administrative action for collection).
- Lack of proper notification (violating due process).
- Errors in the fine issuance.
- Any other relevant legal principle in Colombian traffic law.

Based on your analysis, provide a 'viability' assessment (high, medium, low, or unknown), a 'summary' explaining your reasoning, and a list of 'legalJustifications' that could apply.

If the information provided is insufficient to give a clear assessment, state 'unknown' for viability and explain what additional details are needed in the summary.

User's Identification (Cedula): {{{cedula}}}
Details about Traffic Fines: {{{fineDetails}}}`,
});

// Define the Genkit flow
const preliminaryCaseAssessmentFlow = ai.defineFlow(
  {
    name: 'preliminaryCaseAssessmentFlow',
    inputSchema: PreliminaryCaseAssessmentInputSchema,
    outputSchema: PreliminaryCaseAssessmentOutputSchema,
  },
  async (input) => {
    const { output } = await preliminaryCaseAssessmentPrompt(input);
    if (!output) {
      throw new Error('Failed to get a response from the AI model.');
    }
    return output;
  }
);
