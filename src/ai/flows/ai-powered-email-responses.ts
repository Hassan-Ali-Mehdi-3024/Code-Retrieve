// This is an AI-powered email response generator flow.
// It takes an email and some context and generates a response.
// It exports the generateEmailResponse function, the GenerateEmailResponseInput type, and the GenerateEmailResponseOutput type.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEmailResponseInputSchema = z.object({
  emailContent: z.string().describe('The content of the email to respond to.'),
  customerDetails: z.string().optional().describe('Additional details about the customer, if available.'),
  previousConversation: z.string().optional().describe('The previous conversation history with the customer, if available.'),
  tone: z.string().optional().default('professional').describe('The desired tone of the email response (e.g., professional, friendly, casual).'),
});
export type GenerateEmailResponseInput = z.infer<typeof GenerateEmailResponseInputSchema>;

const GenerateEmailResponseOutputSchema = z.object({
  response: z.string().describe('The generated email response.'),
});
export type GenerateEmailResponseOutput = z.infer<typeof GenerateEmailResponseOutputSchema>;

export async function generateEmailResponse(input: GenerateEmailResponseInput): Promise<GenerateEmailResponseOutput> {
  return generateEmailResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEmailResponsePrompt',
  input: {schema: GenerateEmailResponseInputSchema},
  output: {schema: GenerateEmailResponseOutputSchema},
  prompt: `You are an AI assistant helping the sales team at LUXE Maintenance Corporation.
  Your task is to generate a personalized and relevant email response to leads and customers.
  Consider the email content, customer details, and previous conversation history to craft an effective response.

  Email Content:
  {{emailContent}}

  Customer Details (if available):
  {{#if customerDetails}}
  {{customerDetails}}
  {{else}}
  No customer details provided.
  {{/if}}

  Previous Conversation (if available):
  {{#if previousConversation}}
  {{previousConversation}}
  {{else}}
  No previous conversation history provided.
  {{/if}}

  Desired Tone: {{tone}}

  Please generate a response that is appropriate for the context and achieves the goal of improving customer engagement and satisfaction.
  The response should be in the same language as the email content.

  Response:
  `,
});

const generateEmailResponseFlow = ai.defineFlow(
  {
    name: 'generateEmailResponseFlow',
    inputSchema: GenerateEmailResponseInputSchema,
    outputSchema: GenerateEmailResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
