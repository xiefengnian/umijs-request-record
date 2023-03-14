import { address, portfinder } from '@umijs/utils';
import fs from 'fs';
import { join } from 'path';
import type { IApi } from 'umi';
import { RequestRecord } from './record';
const DEFAULT_PORT = '8000';
const DEFAULT_HOST = '0.0.0.0';

export default (api: IApi) => {
  api.describe({
    key: 'requestRecord',
    config: {
      schema(joi) {
        return joi.object({
          exclude: joi.array(),
          type: joi.boolean(),
          namespace: joi.string(),
          comment: joi.boolean(),
          outputDir: joi.string(),
          successFilter: joi.func(),
          role: joi.string(),
          mock: joi.object({
            outputDir: joi.string(),
            fileName: joi.string(),
            usingRole: joi.string(),
          }),
        });
      },
      default: {
        mock: {
          outputDir: './mock',
          fileName: 'requestRecord.mock.js',
          usingRole: 'default',
        },
        outputDir: './types',
      },
    },
    enableBy: ({ userConfig }) =>
      !!userConfig.proxy || api.name === 'setup' /** test 时名称为 setup */,
  });

  api.registerCommand({
    name: 'record',
    fn({ args }) {
      api.service.commands['dev'].fn({ args });
    },
  });

  api.onGenerateFiles(async () => {
    api.writeTmpFile({
      content: fs.readFileSync(
        join(__dirname, '../../src/runtime/mock.ts'),
        'utf-8'
      ),
      path: '../requestRecordMock.ts',
    });
    api.writeTmpFile({
      content: fs.readFileSync(
        join(__dirname, '../../src/runtime/startMock.js'),
        'utf-8'
      ),
      path: '../startMock.js',
    });
  });

  api.modifyAppData(async (memo) => {
    if (api.name !== 'record') return memo;
    // 模拟 preset-umi 的 dev 指令的初始化工作
    memo.port = await portfinder.getPortPromise({
      port: parseInt(String(process.env.PORT || DEFAULT_PORT), 10),
    });
    memo.host = process.env.HOST || DEFAULT_HOST;
    memo.ip = address.ip();
    return memo;
  });

  api.modifyConfig((config) => {
    if (api.name !== 'record') return config;
    const { EventHandler } = new RequestRecord({
      ...api.userConfig.requestRecord,
      mock: {
        ...api.userConfig.requestRecord.mock,
      },
      ready: api.name === 'record',
      role: api.args.scene,
    });

    const { proxy } = config;
    // Supported proxy types:
    // proxy: { target, context }
    // proxy: { '/api': { target, context } }
    // proxy: [{ target, context }]
    const newProxy = (
      Array.isArray(proxy)
        ? proxy
        : proxy.target
        ? [proxy]
        : Object.keys(proxy).map((key) => {
            return {
              ...proxy[key],
              context: key,
            };
          })
    ).map((args) => {
      if (!api.userConfig.requestRecord.exclude?.includes(args.context)) {
        return {
          ...args,
          onProxyReq: (proxyReq: any, req: any) => {
            EventHandler.onProxyReq(proxyReq, req);
            args.onProxyReq?.(proxyReq, req);
          },
          onProxyRes: (proxyRes: any, req: any, res: any) => {
            EventHandler.onProxyRes(proxyRes, req, res);
            args.onProxyRes?.(proxyRes, req, res);
          },
        };
      }
      return args;
    });
    return {
      ...config,
      proxy: newProxy,
      mock: false,
    };
  });
};
