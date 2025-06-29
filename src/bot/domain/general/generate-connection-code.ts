import MyIpApi, { MyIpResponse } from '../../../shared/services/ipinfo';
import { words } from '../../../shared/utils/word-list';

export async function generateConnectionCode(userId: string): Promise<string> {
  const response = await MyIpApi.get<MyIpResponse>('/');
  const ip = response.data.ip;

  const ipWords = ip
    .split('.')
    .map((octet) => words[parseInt(octet)])
    .join(' ');

  return `${ipWords} ${userId}`;
}
