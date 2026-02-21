'use server';
/**
 * @fileOverview A Genkit flow for summarizing legal documents related to traffic fines.
 *
 * - summarizeDocument - A function that handles the document summarization process.
 * - DocumentSummarizerInput - The input type for the summarizeDocument function.
 * - DocumentSummarizerOutput - The return type for the summarizeDocument function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DocumentSummarizerInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "A legal document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  documentFileName: z.string().describe('The name of the legal document file.'),
});
export type DocumentSummarizerInput = z.infer<typeof DocumentSummarizerInputSchema>;

const DocumentSummarizerOutputSchema = z.object({
  simplifiedExplanation: z.string().describe('A simplified explanation of the document content.'),
  relevantLaws: z
    .array(z.string())
    .describe('A list of relevant laws mentioned or implied in the document.'),
  nextSteps: z
    .array(z.string())
    .describe('A list of actionable next steps for the user based on the document.'),
});
export type DocumentSummarizerOutput = z.infer<typeof DocumentSummarizerOutputSchema>;

export async function summarizeDocument(
  input: DocumentSummarizerInput
): Promise<DocumentSummarizerOutput> {
  return documentSummarizerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'documentSummarizerPrompt',
  input: { schema: DocumentSummarizerInputSchema },
  output: { schema: DocumentSummarizerOutputSchema },
  prompt: `You are an expert in legal document analysis, specializing in traffic laws and administrative procedures. Your task is to analyze a legal document related to traffic fines, simplify its content, identify relevant laws, and outline the next steps for the user.

Here is the legal document (File: {{{documentFileName}}}):
{{media url=documentDataUri}}

Based on the document provided, please perform the following:
1.  Provide a clear and concise 'simplifiedExplanation' of the document's content, avoiding legal jargon as much as possible.
2.  List any 'relevantLaws' (e.g., specific articles, decrees, or regulations) that are either mentioned in the document or are pertinent to its context and implications. Provide a brief explanation for each law if possible.
3.  Outline clear 'nextSteps' the user should take based on the document's information. These should be actionable and easy to understand.

Ensure your output adheres strictly to the provided JSON schema for DocumentSummarizerOutput.`,
});

const documentSummarizerFlow = ai.defineFlow(
  {
    name: 'documentSummarizerFlow',
    inputSchema: DocumentSummarizerInputSchema,
    outputSchema: DocumentSummarizerOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
