import { tool } from "ai";
import { z } from "zod";

/**
 * Lets the model ask the user to pick from a short list of options. The tool
 * has no `execute`: the answer is provided client-side by the user via the
 * ChoicePicker component, then sent back as the next message.
 */
export const presentChoices = tool({
  description:
    "Present a multiple-choice picker above the user's input. Use this when you need a precise answer from a small set of alternatives, instead of asking with free-form text.",
  inputSchema: z.object({
    title: z
      .string()
      .describe("The question to display above the options."),
    options: z
      .array(z.string().min(1).max(80))
      .min(2)
      .max(9)
      .describe("Between 2 and 9 short option labels."),
    allowOther: z
      .boolean()
      .optional()
      .describe(
        "When true (the default), show a 'Something else' fallback that lets the user type their own answer."
      ),
  }),
});

export const tools = {
  presentChoices,
};

export type ToolName = keyof typeof tools;
