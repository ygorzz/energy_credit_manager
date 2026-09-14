import BaseError from './base.error.js';

export default class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}
