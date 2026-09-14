import BaseError from './BaseError.js';

export default class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404);
  }
}
