'use server';

/**
 * @fileOverview This flow takes customer email responses and extracts key details to create job descriptions using AI.
 *
 * - createJobDescriptionFromEmail - A function that generates a job description from an email.
 * - CreateJobDescriptionFromEmailInput - The input type for the createJobDescriptionFromEmail function.
 * - CreateJobDescriptionFromEmailOutput - The return type for the createJobDescriptionFromEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreateJobDescriptionFromEmailInputSchema = z.object({
  customerEmail: z
    .string()
    .describe('The customer email response containing job details.'),
});

export type CreateJobDescriptionFromEmailInput = z.infer<
  typeof CreateJobDescriptionFromEmailInputSchema
>;

const CreateJobDescriptionFromEmailOutputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The generated job description based on the customer email.'),
  importantDetails: z.string().describe('Any important details from the email'),
});

export type CreateJobDescriptionFromEmailOutput = z.infer<
  typeof CreateJobDescriptionFromEmailOutputSchema
>;

export async function createJobDescriptionFromEmail(
  input: CreateJobDescriptionFromEmailInput
): Promise<CreateJobDescriptionFromEmailOutput> {
  return createJobDescriptionFromEmailFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createJobDescriptionFromEmailPrompt',
  input: {schema: CreateJobDescriptionFromEmailInputSchema},
  output: {schema: CreateJobDescriptionFromEmailOutputSchema},
  prompt: `You are an AI assistant designed to extract job descriptions from customer emails.

  Analyze the following customer email and create a detailed job description that can be assigned to a technician.
  Also, extract any important details from the email that the technician should be aware of.

  Customer Email: {{{customerEmail}}}
  \n`,
});

const createJobDescriptionFromEmailFlow = ai.defineFlow(
  {
    name: 'createJobDescriptionFromEmailFlow',
    inputSchema: CreateJobDescriptionFromEmailInputSchema,
    outputSchema: CreateJobDescriptionFromEmailOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
