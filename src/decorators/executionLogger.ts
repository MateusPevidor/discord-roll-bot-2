import fs from 'fs';
import path from 'path';

import { ChatInputCommandInteraction } from 'discord.js';

export default function logExecution(
  _: any,
  __: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    const command = args[0] as ChatInputCommandInteraction;

    const executionString = `[${new Date()}] command ${
      command.commandName
    } executed by ${command.user.tag} in ${
      command.guildId
    } with options ${JSON.stringify(command.options)}`;

    console.log(executionString);

    fs.appendFileSync(
      path.resolve(__dirname, '../../logs/execution.log'),
      executionString + '\n'
    );

    return originalMethod.apply(this, args);
  };

  return descriptor;
}
