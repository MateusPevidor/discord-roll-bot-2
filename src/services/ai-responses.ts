import { createHash, randomBytes } from 'crypto';
import DatabaseService from './database';

export const AI_RESPONSE_TOKEN = /^[A-Za-z0-9_-]{43}$/;
export const hashResponseToken = (token: string) => createHash('sha256').update(token).digest('hex');

export class AiResponseService {
  constructor(private readonly database = DatabaseService.getInstance()) {}

  async create(commandType: string, shortAnswer: string, detailedAnswer: string, retentionSeconds: number): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.database.createAiResponse({
      tokenHash: hashResponseToken(token), commandType, shortAnswer, detailedAnswer,
      expiresAt: new Date(Date.now() + retentionSeconds * 1000)
    });
    return token;
  }

  async find(token: string) {
    if (!AI_RESPONSE_TOKEN.test(token)) return null;
    return this.database.findAiResponse(hashResponseToken(token), new Date());
  }
}
