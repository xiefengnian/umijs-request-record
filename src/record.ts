import { parse } from "url";
import { unzip } from "zlib";
import { Config, ConfigType } from "./config";
import { Core } from "./core";
import "./utils";

const PAYLOAD_NAME = "__payload";

type ParseBodyOptions = {
  contentEncoding: string;
};

const parseBody = (incomingMessage, options?: ParseBodyOptions) =>
  new Promise<Record<any, any>>((resolve, reject) => {
    let chunks = [];
    incomingMessage.on("data", (chunk) => {
      chunks.push(chunk);
    });
    incomingMessage.on("close", () => {
      const body = Buffer.concat(chunks);
      if (options?.contentEncoding) {
        unzip(body, (err, result) => {
          if (err) {
            reject(err);
          } else {
            try {
              resolve(JSON.parse(result.toString("utf-8")));
            } catch (error) {
              resolve({});
            }
          }
        });
        return;
      }
      try {
        resolve(JSON.parse(body.toString("utf-8")));
      } catch (error) {
        resolve({});
      }
    });
  });

export class RequestRecord {
  private config: Config;
  private core: Core;
  private successFilter: ConfigType["successFilter"];
  constructor(config: ConfigType) {
    this.config = new Config(config);
    const initialConfig = this.config.getConfig();

    this.core = new Core({
      cacheFilePath: this.config.getCacheFilePath(),
      outputFilePath: this.config.getTypeFilePath(),
      comment: initialConfig.comment,
      namespace: initialConfig.namespace,
      mock: !!initialConfig.mock,
      mockCachePath: this.config.getMockCacheFilePath(),
      mockOutputPath: this.config.getMockOutputFilePath(),
      role: this.config.getRole(),
    });
    this.successFilter = this.config.getSuccessFilter();

    if (initialConfig.ready) {
      console.log(`[Request Record] ready with scene=${this.config.getRole()}`);
      this.core.generateMock();
    }
  }
  EventHandler = {
    onProxyReq: (proxyReq, req) => {
      if (this.config.getConfig().ready) {
        if (req.headers["content-length"]) {
          // 表示存在body
        }
        if ((proxyReq.path as string).includes("?")) {
          proxyReq.path = proxyReq.path + "&__rid__=" + Math.random();
        } else {
          proxyReq.path = proxyReq.path + "?__rid__=" + Math.random();
        }
        proxyReq.setHeader("if-none-match", "");
        parseBody(req).then((body) => {
          req[PAYLOAD_NAME] = body;
        });
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      if (this.config.getConfig().ready && res.statusCode !== 304) {
        parseBody(proxyRes, {
          contentEncoding: proxyRes.headers["content-encoding"],
        }).then((responseData) => {
          const method = req.method;
          const pathname = parse(req.url).pathname;

          const successFunction = () => {
            this.core.add(Core.createCacheKey(method, pathname), {
              res: responseData,
              query: req.query,
              payload: req[PAYLOAD_NAME],
            });
          };

          if (this.successFilter) {
            if (this.successFilter(responseData)) {
              successFunction();
            }
          } else {
            successFunction();
          }
        });
      }
    },
  };
}
