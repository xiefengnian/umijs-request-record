# request2type

a tool for generating type of request params/payload/query, works in http-proxy-middleware.

## Install

```shell
$ yarn add @alipay/request-record --dev
```

## Usage

### In Umi

1. add handler in umi config file.

```ts
import { defineConfig } from 'umi';

export default defineConfig({
  proxy: {
    '/api': {
      target: 'http://local.alipay.net:8090',
    },
  },
  requestRecord: {
    fromProxy: '/api',
  },
  plugins: ['@alipay/request-record/dist/cjs/umi-plugin'],
});
```

2. start umi

```shell
$ umi record role=admin
```

3. mock file output in `./mock/requestRecord.mock.js`
