import BaseError from './base.error.js';

export default class ConflictError extends BaseError {
  constructor(message: string) {
    super(message, 409);
  }
}
