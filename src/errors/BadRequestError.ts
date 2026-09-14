import type { ZodError } from 'zod';
import BaseError from './BaseError.js';

export default class BadRequest extends BaseError {
  constructor(error: ZodError) {
    const messages: string[] = error.issues.map((e) => {
      return e.message;
    });

    const errorMessage: string = messages.join('; ');
    super(errorMessage, 400);
  }
}
