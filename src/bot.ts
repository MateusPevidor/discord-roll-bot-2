import { Client, Events, GatewayIntentBits } from 'discord.js';
import { ICommand } from './interfaces/command';
import { PingCommand } from './commands/ping';
import { RollCommand } from './commands/roll';
import { TempCommand } from './commands/temp';
import { MinecraftOddsCommand } from './commands/minecraftOdds';
import { ConnectionCommand } from './commands/connection';

interface Commands {
  [id: string]: ICommand;
}

export class RollBot {
  public client: Client;

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds]
    });

    const commands = {} as Commands;

    this.client.once(Events.ClientReady, (c) => {
      commands.ping = new PingCommand();
      commands.roll = new RollCommand();
      commands.temp = new TempCommand();
      commands.mcodds = new MinecraftOddsCommand();
      commands.connection = new ConnectionCommand();

      this.client.user?.setPresence({
        activities: [{ name: '/temp' }, { name: '/roll' }]
      });

      console.log('Bot is online! ', c.user.tag);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = commands[interaction.commandName];

      try {
        await command.execute(interaction);
      } catch (err) {
        console.log(err);
      }
    });

    this.client.login(process.env.DISCORD_TOKEN);
  }
}
