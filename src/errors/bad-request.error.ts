import BaseError from './base.error.js';

export default class BadRequest extends BaseError {
  constructor(message: string) {
    super(message, 400);
  }
}

