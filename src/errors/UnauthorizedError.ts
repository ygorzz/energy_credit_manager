import BaseError from './BaseError.js';

export default class UnauthorizedError extends BaseError {
  constructor(message: string) {
    super(message, 401);
  }
}
