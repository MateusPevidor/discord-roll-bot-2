import { Client } from 'discord.js';
import Express from 'express';
import cors from 'cors';

export abstract class Server {
  static create(discordjsClient: Client) {
    const app = Express();
    const port = process.env.PORT || 3000;

    app.use(Express.json());
    app.use(cors());

    app.post('/setMute', (req, res) => {
      const { guildId, userId, mute } = req.body;

      console.log(`guildId: ${guildId}, userId: ${userId}, mute: ${mute}`);

      discordjsClient.guilds
        .fetch(guildId)
        .then((guild) => {
          guild.members
            .fetch(userId)
            .then((member) => {
              member.voice
                .setDeaf(mute)
                .then(() => {
                  return res.status(200).send('OK');
                })
                .catch((err) => {
                  console.error(err);
                  return res.status(500).send('Could not mute member');
                });
            })
            .catch((err) => {
              console.error(err);
              return res.status(404).send('Could not fetch member');
            });
        })
        .catch((err) => {
          console.error(err);
          return res.status(404).send('Could not fetch guild');
        });

      return res.status(200).send('OK');
    });

    app.get('/setMute/status', (req, res) => {
      const { guildId, userId } = req.query as {
        guildId: string;
        userId: string;
      };

      console.log(`guildId: ${guildId}, userId: ${userId}`);

      discordjsClient.guilds
        .fetch(guildId)
        .then((guild) => {
          guild.members
            .fetch(userId)
            .then((member) => {
              return res.status(200).json({
                status: member.voice.deaf
              });
            })
            .catch((err) => {
              console.error(err);
              return res.status(404).send('Could not fetch member');
            });
        })
        .catch((err) => {
          console.error(err);
          return res.status(404).send('Could not fetch guild');
        });

      return res.status(500).send('Unknown error');
    });

    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  }
}
