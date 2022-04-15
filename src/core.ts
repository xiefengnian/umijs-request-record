import { writeFile, readFileSync, writeFileSync } from 'fs';
import './utils';
import { getType, JSON2TS } from './utils';
import { throttle, cloneDeep } from 'lodash';
import prettier from 'prettier';

export type CacheDataType = {
  query: Record<any, any>;
  res: Record<any, any>;
  payload: Record<any, any>;
};
export type CacheDataWithTypeType = CacheDataType & { types: string };

export type CacheType = {
  [key: string]: CacheDataWithTypeType;
};

export class Core {
  private cache: CacheType;
  static createCacheKey = (method: string, pathname: string) => {
    return `${method} ${pathname}`;
  };
  constructor(
    private options: {
      cacheFilePath: string;
      outputFilePath: string;
      mockFilePath: string;
      comment: boolean;
      namespace: string;
      mock: boolean;
    }
  ) {
    this.cache = JSON.parse(
      readFileSync(this.options.cacheFilePath, 'utf8') || `{}`
    );
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
    const queryType = JSON2TS(query, {
      typeName: getInterfaceName('query'),
      comment: this.options.comment,
    });
    const payloadType = JSON2TS(payload, {
      typeName: getInterfaceName('payload'),
      comment: this.options.comment,
    });
    const resType = JSON2TS(res, {
      typeName: getInterfaceName('res'),
      comment: this.options.comment,
    });

    const typeComment = `/** ${cacheKey} */`;

    const dataWithType: CacheDataWithTypeType = {
      ...data,
      types: typeComment + queryType + '\n' + payloadType + '\n' + resType,
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
    writeFileSync(
      this.options.cacheFilePath,
      JSON.stringify(this.cache, undefined, 2)
    );
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
      this.options.outputFilePath,
      prettier.format(
        `
      namespace ${this.options.namespace}{
        ${content.join('\n')}
      }
    `,
        { parser: 'typescript' }
      ),

      (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log('done write ts file.');
        }
      }
    );
    /** mock file */
    if (this.options.mock) {
      writeFile(
        this.options.mockFilePath,
        prettier.format(
          'module.exports = {' +
            Object.keys(cache)
              .map((key) => {
                const { res } = cache[key];
                return `'${key}': ${JSON.stringify(res)}`;
              })
              .join(',\n') +
            '}',
          { parser: 'babel' }
        ),
        (err) => {
          if (err) {
            console.log(err);
          } else {
            console.log('done write mock file');
          }
        }
      );
    }
  };
}
