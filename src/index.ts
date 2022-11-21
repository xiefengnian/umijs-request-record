import type { IApi } from 'umi';
import { RequestRecord } from './record';

export default (api: IApi) => {
  api.describe({
    key: 'requestRecord',
    config: {
      schema(joi) {
        return joi.object({
          fromProxy: joi.string(),
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
    enableBy: ({ userConfig }) => !!userConfig.proxy,
  });

  api.registerCommand({
    name: 'record',
    fn({ args }) {
      api.service.commands['dev'].fn({ args });
    },
  });

  api.modifyConfig((config) => {
    const { EventHandler } = new RequestRecord({
      ...api.userConfig.requestRecord,
      mock: {
        ...api.userConfig.requestRecord.mock,
      },
      ready: api.name === 'record',
      role: api.args.role,
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
      if (args.context === api.userConfig.requestRecord.fromProxy) {
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
    });
    return {
      ...config,
      proxy: newProxy,
    };
  });
};
