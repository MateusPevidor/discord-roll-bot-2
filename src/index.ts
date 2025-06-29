import * as dotenv from 'dotenv';
dotenv.config();

import { RollBot } from './bot/bot';
import { Server } from './web/server';

RollBot.create();
Server.create();
