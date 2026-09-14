import BaseError from './base.error.js';

export default class ForbiddenError extends BaseError {
  constructor(message: string) {
    super(message, 403);
  }
}
