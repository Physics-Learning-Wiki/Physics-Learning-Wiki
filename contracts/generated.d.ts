export interface SchemaError {
  instancePath: string;
  message?: string;
  params: Record<string, unknown>;
}
export interface Validator {
  (value: unknown): boolean;
  errors?: SchemaError[] | null;
}
export const validateEnvelope: Validator;
export const validateQuestionSchema: Validator;
export const validateWithdrawal: Validator;
