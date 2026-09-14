import type { Response } from 'express';

// Error class already contains the message propertie. So, we can pass as a super argument
export default class BaseError extends Error {
  constructor(
    message: string = 'Internal Server Error',
    public statusCode: number = 500,
  ) {
    super(message);
  }

  sendAnswer(res: Response) {
    return res.status(this.statusCode).json({ statusCode: this.statusCode, message: this.message });
  }
}
