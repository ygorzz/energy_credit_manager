const { DATABASE_URL, JWT_SECRET } = process.env;

if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

export const env = {
  DATABASE_URL,
  JWT_SECRET,
};
