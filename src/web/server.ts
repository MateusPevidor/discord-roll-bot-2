import Express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';

import Routes from './routes';

import { AppError } from '../shared/utils/AppError';
import 'express-async-errors';

export abstract class Server {
  static create() {
    const app = Express();
    const port = process.env.PORT || 3002;

    app.use(Express.json());
    app.use(cors());

    app.use('/', Routes);

    app.use((err: Error, _: Request, res: Response, __: NextFunction) => {
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
