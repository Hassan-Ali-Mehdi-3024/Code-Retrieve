'use server';
/**
 * @fileOverview An AI agent for scoring leads based on initial inquiries and website activity.
 *
 * - scoreLead - A function that handles the lead scoring process.
 * - ScoreLeadInput - The input type for the scoreLead function.
 * - ScoreLeadOutput - The return type for the scoreLead function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScoreLeadInputSchema = z.object({
  initialInquiry: z
    .string()
    .describe('The lead’s initial inquiry or message.'),
  websiteActivity: z
    .string()
    .describe('A description of the lead’s activity on the website.'),
  companyDescription: z
    .string()
    .optional()
    .describe('A brief description of LUXE Maintenance Corporation.'),
});
export type ScoreLeadInput = z.infer<typeof ScoreLeadInputSchema>;

const ScoreLeadOutputSchema = z.object({
  leadScore: z
    .number()
    .describe(
      'A numerical score representing the quality and potential of the lead (0-100).' // More specific description
    ),
  reason: z
    .string()
    .describe('A brief explanation of why the lead received the assigned score.'),
  isQualified: z
    .boolean()
    .describe('Whether the lead is qualified for further engagement.'),
});
export type ScoreLeadOutput = z.infer<typeof ScoreLeadOutputSchema>;

export async function scoreLead(input: ScoreLeadInput): Promise<ScoreLeadOutput> {
  return scoreLeadFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scoreLeadPrompt',
  input: {schema: ScoreLeadInputSchema},
  output: {schema: ScoreLeadOutputSchema},
  prompt: `You are an AI assistant specialized in scoring leads for LUXE Maintenance Corporation, using provided information to determine the lead's potential.

  LUXE Maintenance Corporation Description: {{companyDescription}}

  Score the following lead based on their initial inquiry and website activity.

  Initial Inquiry: {{{initialInquiry}}}
  Website Activity: {{{websiteActivity}}}

  Consider factors such as the clarity of the inquiry, the level of interest shown, and the relevance of their website activity to LUXE Maintenance Corporation's services.

  Provide a leadScore between 0 and 100. Provide reason behind the score. Provide isQualified as a boolean.
`,
});

const scoreLeadFlow = ai.defineFlow(
  {
    name: 'scoreLeadFlow',
    inputSchema: ScoreLeadInputSchema,
    outputSchema: ScoreLeadOutputSchema,
  },
  async input => {
    const {output} = await prompt({
      ...input,
      companyDescription: 'LUXE Maintenance Corporation is a premium maintenance provider offering comprehensive solutions for residential and commercial properties.',
    });
    return output!;
  }
);
