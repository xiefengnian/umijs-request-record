import express from 'express';
import fs from 'fs';
import { merge } from 'lodash';
import { join } from 'path';
import { parse } from 'url';

type ArgsType = { port: number; scene: string };

const getCachePath = (scene: string) => {
  return join(
    process.cwd(),
    'types',
    'cache',
    'mock',
    (scene === 'default' ? '' : `${scene}.`) + 'mock.cache.js'
  );
};

export const startMock = (args?: ArgsType) => {
  const { port, scene } = merge(
    {
      port: 7000,
      scene: 'default',
    },
    args
  );

  return new Promise<{
    close: () => void;
  }>((resolve, reject) => {
    const cachePath = getCachePath(scene);

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
        close: () => {
          server.close();
        },
      });
    });

    app.get('*', (req, res) => {
      const { url } = req;

      const key = `GET ${parse(url).pathname}`;
      if (mockFile[key]) {
        res.json(mockFile[key]);
      } else {
        res.status(404).send(`Mock key ${key} Not Found`);
      }
    });

    app.post('*', (req, res) => {
      const { url } = req;
      const key = `GET ${parse(url).pathname}`;
      if (mockFile[key]) {
        res.json(mockFile[key]);
      } else {
        res.status(404).send(`Mock key ${key} Not Found`);
      }
    });
  });
};
