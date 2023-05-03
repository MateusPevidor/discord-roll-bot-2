import * as dotenv from 'dotenv';
dotenv.config()

import { REST, Routes } from 'discord.js';

import { PingCommand } from "./commands/ping";
import { RollCommand } from './commands/roll';
import { TempCommand } from './commands/temp';

const rest = new REST().setToken(process.env.DISCORD_TOKEN || "");

const commands = new Array();

const loadCommands = () => {
  const _commands = [
    new PingCommand(),
		new RollCommand(),
		new TempCommand(),
  ].map(({ command }) => command.toJSON());

  commands.push(..._commands);
}

const deployCommands = async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		await rest.put(
			Routes.applicationCommands(process.env.DISCORD_CLIENTID || ""),
			{ body: commands },
		);

		console.log(`Successfully reloaded application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
};

loadCommands();
deployCommands();