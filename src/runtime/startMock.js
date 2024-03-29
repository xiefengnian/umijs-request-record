var express = require('express');
var fs = require('fs');
var { join } = require('path');
var { parse } = require('url');
var { scene, port } = process.env;
var getCachePath = (scene2) => {
  return join(
    process.cwd(),
    'types',
    'cache',
    'mock',
    (scene2 === 'default' ? '' : `${scene2}.`) + 'mock.cache.js'
  );
};
var cachePath = getCachePath(scene);
if (!fs.existsSync(cachePath)) {
  throw new Error(`mock cache file not found: ${cachePath}`);
}
fs.copyFileSync(
  cachePath,
  join(process.cwd(), 'mock', 'requestRecord.mock.js')
);
var mockFile = require(join(process.cwd(), 'mock', `requestRecord.mock.js`));
var app = express();
var server = app.listen(port, () => {
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
