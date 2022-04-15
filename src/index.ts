import { parse } from 'url';
import './utils';
import { Config, ConfigType } from './config';
import { Core } from './core';

const PAYLOAD_NAME = '__payload';

const parseBody = (incomingMessage) =>
  new Promise<Record<any, any>>((resolve, reject) => {
    let chunks = [];
    incomingMessage.on('data', (chunk) => {
      chunks.push(chunk);
    });
    incomingMessage.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        resolve({});
      }
    });
  });

export default class Main {
  private config: Config;
  private core: Core;
  constructor(config: ConfigType) {
    this.config = new Config(config);
    const initialConfig = this.config.getConfig();
    if (initialConfig.ready) {
      console.log('>>> start create typescript file');
    }
    this.core = new Core({
      cacheFilePath: this.config.getCacheFilePath(),
      outputFilePath: this.config.getTypeFilePath(),
      comment: initialConfig.comment,
      namespace: initialConfig.namespace,
      mock: !!initialConfig.mock,
      mockFilePath: this.config.getMockFilePath(),
    });
  }
  EventHandler = {
    onProxyReq: (proxyReq, req) => {
      if (this.config.getConfig().ready) {
        if (req.headers['content-length']) {
          // 表示存在body
        }
        if ((proxyReq.path as string).includes('?')) {
          proxyReq.path = proxyReq.path + '&__rid__=' + Math.random();
        } else {
          proxyReq.path = proxyReq.path + '?__rid__=' + Math.random();
        }
        proxyReq.setHeader('if-none-match', '');
        parseBody(req).then((body) => {
          req[PAYLOAD_NAME] = body;
        });
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      if (this.config.getConfig().ready && res.statusCode !== 304) {
        parseBody(proxyRes).then((responseData) => {
          const method = req.method;
          const pathname = parse(req.url).pathname;
          this.core.add(Core.createCacheKey(method, pathname), {
            res: responseData,
            query: req.query,
            payload: req[PAYLOAD_NAME],
          });
        });
      }
    },
  };
}
