import BaseError from './BaseError.js';

export default class ConflictError extends BaseError {
  constructor(message: string) {
    super(message, 409);
  }
}
