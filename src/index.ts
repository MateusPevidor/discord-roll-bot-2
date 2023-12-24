import * as dotenv from 'dotenv';
dotenv.config()

import { Client, Events, GatewayIntentBits } from 'discord.js';

import { PingCommand } from './commands/ping';
import { RollCommand } from './commands/roll';
import { TempCommand } from './commands/temp';
import { MinecraftOddsCommand } from './commands/minecraftOdds';
import { DiceOddsCommand } from './commands/diceOdds';
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
  commands.mcodds = new MinecraftOddsCommand();
  commands.diceodds = new DiceOddsCommand();

  client.user?.setPresence({
    activities: [
      { name: '/temp' },
      { name: '/roll' },
      { name: '/mcodds' },
      { name: '/diceodds' }
    ]
  });

  console.log('Bot is online! ', c.user.tag);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands[interaction.commandName];

  try {
    await command.execute(interaction);
  } catch (err) {
    console.log(err);
  }
});

client.login(process.env.DISCORD_TOKEN);