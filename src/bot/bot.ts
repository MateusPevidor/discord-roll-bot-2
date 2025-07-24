import { Client, Events, GatewayIntentBits } from 'discord.js';
import { ICommand } from './interfaces/command';
import { PingCommand } from './commands/ping';
import { RollCommand } from './commands/roll';
import { TempCommand } from './commands/temp';
import { MinecraftOddsCommand } from './commands/minecraft-odds';
import { ConnectionCommand } from './commands/connection';
import { DiceOddsCommand } from './commands/dice-odds';
import { TrackerCommand } from './commands/tracker';
import PollingService from '../services/polling';

interface Commands {
  [id: string]: ICommand;
}

export abstract class RollBot {
  static client: Client;

  static create() {
    if (RollBot.client) return;

    RollBot.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages
      ]
    });

    const commands = {} as Commands;

    RollBot.client.once(Events.ClientReady, (c) => {
      commands.ping = new PingCommand();
      commands.roll = new RollCommand();
      commands.temp = new TempCommand();
      commands.mcodds = new MinecraftOddsCommand();
      commands.diceodds = new DiceOddsCommand();
      commands.connection = new ConnectionCommand();
      commands.tracker = new TrackerCommand();

      RollBot.client.user?.setPresence({
        activities: [
          { name: '/temp' },
          { name: '/roll' },
          { name: '/diceodds' },
          { name: '/mcodds' },
          { name: '/tracker' }
        ]
      });

      console.log('Bot is online! ', c.user.tag);

      // Start MCSR match polling
      const pollingService = PollingService.getInstance(RollBot.client);
      pollingService.startPolling(15); // Check every 15 seconds
    });

    RollBot.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = commands[interaction.commandName];

      try {
        await command.execute(interaction);
      } catch (err) {
        console.log(err);
      }
    });

    RollBot.client.login(process.env.DISCORD_TOKEN);
  }
}
