import Express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { RollBot } from './bot';
import { AppError } from './utils/AppError';
import 'express-async-errors';

export abstract class Server {
  static create() {
    const app = Express();
    const port = process.env.PORT || 3000;

    app.use(Express.json());
    app.use(cors());

    app.post('/setMute', async (req, res) => {
      const { guildId, userId, mute } = req.body;

      console.log(`guildId: ${guildId}, userId: ${userId}, mute: ${mute}`);

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
    });

    app.get('/setMute/status', async (req, res) => {
      const { guildId, userId } = req.query as {
        guildId: string;
        userId: string;
      };

      const guild = await RollBot.client.guilds.fetch(guildId);

      if (!guild) {
        return res.status(404).send('Guild not found');
      }

      const member = await guild.members.fetch(userId);

      if (!member) {
        return res.status(404).send('Member not found');
      }

      return res.status(200).json({
        status: member.voice.serverDeaf
      });
    });

    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof AppError) {
        return res.status(err.statusCode).send(err.message);
      }

      res.status(500).send('Something went wrong!');
    });

    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  }
}
