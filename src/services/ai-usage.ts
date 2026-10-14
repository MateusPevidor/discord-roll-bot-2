import DatabaseService, { AiAdmissionInput, AiAdmissionResult } from './database';

export class AiUsageService {
  private static queue: Promise<void> = Promise.resolve();
  constructor(private readonly database = DatabaseService.getInstance()) {}

  admit(input: AiAdmissionInput): Promise<AiAdmissionResult> {
    return this.serial(() => this.database.admitAiUsage(input));
  }

  complete(usageId: number, tokenUsage?: number): Promise<boolean> {
    return this.serial(() => this.database.completeAiUsage(usageId, tokenUsage));
  }

  private serial<T>(action: () => Promise<T>): Promise<T> {
    const result = AiUsageService.queue.then(action, action);
    AiUsageService.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}
