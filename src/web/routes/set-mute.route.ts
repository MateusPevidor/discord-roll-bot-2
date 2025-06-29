import { RollBot } from '@/bot/bot';
import { AppError } from '@/shared/utils/app-error';
import { Request, Response } from 'express';

export const SetMute = async (req: Request, res: Response) => {
  const { guildId, userId, mute } = req.body;

  const guild = await RollBot.client.guilds.fetch(guildId);

  if (!guild) {
    throw new AppError('Guild not found', 404);
  }

  const member = await guild.members.fetch(userId);

  if (!member) {
    throw new AppError('Member not found', 404);
  }

  const muted = await member.voice.setDeaf(mute);

  if (!muted) {
    throw new AppError('Failed to mute member', 400);
  }

  return res.status(204).json();
};

export const SetMuteStatus = async (req: Request, res: Response) => {
  const { guildId, userId } = req.query as {
    guildId: string;
    userId: string;
  };

  if (!guildId || !userId) {
    throw new AppError('Missing query parameters', 400);
  }

  const guild = await RollBot.client.guilds.fetch(guildId);

  if (!guild) {
    throw new AppError('Guild not found', 404);
  }

  const member = await guild.members.fetch(userId);

  if (!member) {
    throw new AppError('Member not found', 404);
  }

  return res.status(200).json({
    status: member.voice.serverDeaf
  });
};
