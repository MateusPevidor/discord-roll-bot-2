import * as dotenv from 'dotenv';
dotenv.config();

import { RollBot } from './bot';
import { Server } from './server';

RollBot.create();
Server.create(RollBot.client);
