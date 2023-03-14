import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFile,
  writeFileSync,
} from "fs";
import { cloneDeep, throttle } from "lodash";
import { dirname } from "path";
import prettier from "prettier";
import { ConfigType } from "./config";
import "./utils";
import { getType, JSON2TS } from "./utils";

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
      mockOutputPath: string;
      mockCachePath: string;
      comment: boolean;
      namespace: string;
      mock: boolean;
      role?: ConfigType["role"];
    }
  ) {
    this.cache = JSON.parse(
      readFileSync(this.options.cacheFilePath, "utf8") || `{}`
    );
    if (!existsSync(this.options.mockCachePath)) {
      const mockCacheDir = dirname(this.options.mockCachePath);
      if (!existsSync(mockCacheDir)) {
        mkdirSync(mockCacheDir, { recursive: true });
      }
      writeFileSync(this.options.mockCachePath, "");
    }
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

    console.log(`[Request Record] 'add' - ${cacheKey}`);

    const { query, res, payload } = data;
    const [method, pathname] = cacheKey.split(" ");
    const getInterfaceName = (type) => {
      return getType(method, pathname, type);
    };
    const queryType = JSON2TS(query, {
      typeName: getInterfaceName("query"),
      comment: this.options.comment,
    });
    const payloadType = JSON2TS(payload, {
      typeName: getInterfaceName("payload"),
      comment: this.options.comment,
    });
    const resType = JSON2TS(res, {
      typeName: getInterfaceName("res"),
      comment: this.options.comment,
    });

    const typeComment = `/** ${cacheKey} */`;

    const dataWithType: CacheDataWithTypeType = {
      ...data,
      types: typeComment + queryType + "\n" + payloadType + "\n" + resType,
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
      export namespace ${this.options.namespace}{
        ${content.join("\n")}
      }
    `,
        { parser: "typescript" }
      ),

      (err) => {
        if (err) {
          console.log(err);
        }
      }
    );
    this.generateMock();
  };
  generateMock = () => {
    const cache = this.cache;
    /** mock file */
    if (this.options.mock) {
      const mockContent = prettier.format(
        "module.exports = {" +
          Object.keys(cache)
            .map((key) => {
              const { res } = cache[key];
              return `'${key}': ${JSON.stringify(res)}`;
            })
            .join(",\n") +
          "}",
        { parser: "babel" }
      );

      writeFileSync(this.options.mockCachePath, mockContent);
      writeFileSync(this.options.mockOutputPath, mockContent);
    }
  };
}
