const express = require('express');
const fs = require('fs');
const { join } = require('path');
const { parse } = require('url');

const { scene, port } = process.env;

const getCachePath = (scene) => {
  return join(
    process.cwd(),
    'types',
    'cache',
    'mock',
    (scene === 'default' ? '' : `${scene}.`) + 'mock.cache.js'
  );
};
const cachePath = getCachePath(scene);

if (!fs.existsSync(cachePath)) {
  throw new Error(`mock cache file not found: ${cachePath}`);
}

fs.copyFileSync(
  cachePath,
  join(process.cwd(), 'mock', 'requestRecord.mock.js')
);

const mockFile = require(join(process.cwd(), 'mock', `requestRecord.mock.js`));

const app = express();
const server = app.listen(port, () => {
  console.log(
    '[Request Mock] Mock server is running at http://localhost:%s',
    port
  );
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
  const key = `POST ${parse(url).pathname}`;
  if (mockFile[key]) {
    res.json(mockFile[key]);
  } else {
    res.status(404).send(`Mock key ${key} Not Found`);
  }
});

process.on('exit', () => {
  server.close();
});
