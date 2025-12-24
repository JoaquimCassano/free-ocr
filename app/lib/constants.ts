export const RESPONSE_MODES = [
  "markdown",
  "json",
  "pydantic",
  "zod",
  "plain",
] as const;

export type ResponseMode = (typeof RESPONSE_MODES)[number];

export const MODE_CONFIG: Record<
  ResponseMode,
  { label: string; description: string }
> = {
  markdown: {
    label: "Markdown",
    description: "Original OCR text",
  },
  plain: {
    label: "Plain Text",
    description: "Cleaned text format",
  },
  json: {
    label: "JSON",
    description: "Structured JSON format",
  },
  pydantic: {
    label: "Pydantic",
    description: "Python Pydantic model code",
  },
  zod: {
    label: "Zod",
    description: "TypeScript Zod schema code",
  },
};

export const MODE_INSTRUCTIONS: Record<ResponseMode, string> = {
  markdown: "",
  plain:
    "Return only the cleaned, plain text from the OCR content without any formatting or additional explanations. Remove all markdown syntax. (unless it clearly is part of the original text, like a # in a code snippet)",
  json: "Convert the OCR content into a properly formatted JSON object. Infer logical field names and structure. Return only the JSON, no explanations.",
  pydantic:
    "Generate a Python Pydantic model class that represents the structure of the OCR content. The model should have appropriate field names and types. Return only the valid Python code for the model definition, starting with imports.",
  zod: "Generate a TypeScript Zod schema that validates the structure of the OCR content. The schema should have appropriate field names and types. Return only the valid TypeScript code for the schema definition, starting with imports.",
};
