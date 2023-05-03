import * as dotenv from 'dotenv';
dotenv.config()

import { Client, Events, GatewayIntentBits } from 'discord.js';

import { PingCommand } from './commands/ping';
import { RollCommand } from './commands/roll';
import { TempCommand } from './commands/temp';
import { ICommand } from './interfaces/command';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

interface Commands {
  [id: string]: ICommand;
}

const commands = {} as Commands;

client.once(Events.ClientReady, c => {
  commands.ping = new PingCommand();
  commands.roll = new RollCommand();
  commands.temp = new TempCommand();

  client.user?.setPresence({
    activities: [
      { name: '/temp' },
      { name: '/roll' }
    ]
  });

  console.log('Bot is online! ', c.user.tag);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands[interaction.commandName];
  command.execute(interaction);
});

client.login(process.env.DISCORD_TOKEN);