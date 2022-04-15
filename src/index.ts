import { parse } from 'url';
import {
  writeFile,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import './utils';
import { getType, JSON2TS } from './utils';
import { throttle, cloneDeep } from 'lodash';
import prettier from 'prettier';

const REQUEST_LISTEN = !!process.env.REQUEST_LISTEN;
const OUTPUT_DIR = './types';
const PAYLOAD_NAME = '__payload';
const FINAL_OUTPUT_DIR = join(process.cwd(), OUTPUT_DIR);
const CACHE_PATH = join(process.cwd(), OUTPUT_DIR, '.cache');
const CACHE_FILE_PATH = join(CACHE_PATH, './cache.json');

type ConfigType = {
  mock?: boolean;
  namespace?: string;
};

class Config {
  private config: ConfigType;
  constructor() {
    this.config = {
      mock: false,
      namespace: 'API',
    };
  }
  setConfig = (userConfig: ConfigType) => {
    this.config = {
      ...this.config,
      ...userConfig,
    };
  };
  getConfig = () => this.config;
}

const config = new Config();

export const setConfig = config.setConfig;

if (REQUEST_LISTEN) {
  console.log('>>> start create typescript file');
}

if (!existsSync(CACHE_PATH)) {
  mkdirSync(CACHE_PATH, { recursive: true });
}

if (!existsSync(CACHE_FILE_PATH)) {
  writeFileSync(CACHE_FILE_PATH, '{}');
}

if (!existsSync(FINAL_OUTPUT_DIR)) {
  mkdirSync(FINAL_OUTPUT_DIR);
}

type CacheDataType = {
  query: Record<any, any>;
  res: Record<any, any>;
  payload: Record<any, any>;
};
type CacheDataWithTypeType = CacheDataType & { types: string };

type CacheType = {
  [key: string]: CacheDataWithTypeType;
};

class Core {
  private cache: CacheType;
  static createCacheKey = (method: string, pathname: string) => {
    return `${method} ${pathname}`;
  };
  constructor() {
    this.cache = JSON.parse(readFileSync(CACHE_FILE_PATH, 'utf8') || `{}`);
  }
  add(cacheKey: string, data: CacheDataType) {
    let cacheWithoutTypes;
    if (this.cache[cacheKey]) {
      cacheWithoutTypes = cloneDeep(this.cache[cacheKey]);
      delete cacheWithoutTypes.types;
    }

    if (
      cacheWithoutTypes &&
      JSON.stringify(cacheWithoutTypes) === JSON.stringify(data)
    ) {
      return;
    }

    const { query, res, payload } = data;
    const [method, pathname] = cacheKey.split(' ');
    const getInterfaceName = (type) => {
      return getType(method, pathname, type);
    };
    const queryType = JSON2TS(query, { typeName: getInterfaceName('query') });
    const payloadType = JSON2TS(payload, {
      typeName: getInterfaceName('payload'),
    });
    const resType = JSON2TS(res, { typeName: getInterfaceName('res') });

    const dataWithType: CacheDataWithTypeType = {
      ...data,
      types: queryType + '\n' + payloadType + '\n' + resType,
    };

    this.cache = {
      ...this.cache,
      [cacheKey]: dataWithType,
    };

    this.save();
    this.onAdd();
  }
  private onAdd = throttle(() => {
    this.generate();
  }, 3000);
  save() {
    writeFileSync(CACHE_FILE_PATH, JSON.stringify(this.cache, undefined, 2));
  }
  getCache = () => this.cache;
  generate = () => {
    const cache = this.cache;
    const content = [];
    Object.keys(cache).forEach((key) => {
      const { types } = cache[key];
      content.push(types);
    });
    writeFile(
      getOutputFilePath(`index.ts`),
      prettier.format(
        `
      namespace ${config.getConfig().namespace}{
        ${content.join('\n')}
      }
    `,
        { parser: 'typescript' }
      ),

      (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log('done write file');
        }
      }
    );
  };
}

const core = new Core();

const getOutputFilePath = (filename: string) => {
  return join(process.cwd(), OUTPUT_DIR, filename);
};

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

export const EventHandler = {
  onProxyReq: (proxyReq, req, res) => {
    if (REQUEST_LISTEN) {
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
    if (REQUEST_LISTEN && res.statusCode !== 304) {
      parseBody(proxyRes).then((responseData) => {
        const method = req.method;
        const pathname = parse(req.url).pathname;
        core.add(Core.createCacheKey(method, pathname), {
          res: responseData,
          query: req.query,
          payload: req[PAYLOAD_NAME],
        });
      });
    }
  },
};
