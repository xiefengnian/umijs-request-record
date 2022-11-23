import express from 'express';
import fs from 'fs';
import { join } from 'path';
export class Mock {
  static start = (
    { port, scene }: { port: number; scene: string } = {
      port: 7000,
      scene: 'default',
    }
  ) =>
    new Promise<{
      close: () => void;
    }>((resolve, reject) => {
      const cachePath = join(
        process.cwd(),
        'types',
        'cache',
        'mock',
        (scene === 'default' ? '' : `${scene}.`) + 'mock.cache.js'
      );

      if (!fs.existsSync(cachePath)) {
        reject(new Error(`mock cache file not found: ${cachePath}`));
        return;
      }

      fs.copyFileSync(
        cachePath,
        join(process.cwd(), 'mock', 'requestRecord.mock.js')
      );

      const mockFile = require(join(
        process.cwd(),
        'mock',
        `requestRecord.mock.js`
      ));

      const app = express();
      const server = app.listen(port, () => {
        console.log(
          '[Request Mock] Mock server is running at http://localhost:%s',
          port
        );
        resolve({
          close: server.close,
        });
      });

      app.get('*', (req, res) => {
        const { url } = req;
        const key = `GET ${url}`;
        if (mockFile[key]) {
          res.json(mockFile[key]);
        } else {
          res.status(404).send(`Mock key ${key} Not Found`);
        }
      });

      app.post('*', (req, res) => {
        const { url } = req;
        const key = `GET ${url}`;
        if (mockFile[key]) {
          res.json(mockFile[key]);
        } else {
          res.status(404).send(`Mock key ${key} Not Found`);
        }
      });
    });
}
