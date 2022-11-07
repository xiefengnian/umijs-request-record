# request2type

a tool for generating type of request params/payload/query, works in http-proxy-middleware.

## Install

```shell
$ yarn add @umijs/request2type --dev
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
    ready: true,
    role: 'admin',
    mock: {},
  },
  plugins: ['@alipay/request-record/dist/cjs/umi-plugin'],
});
```

2. add type file to tsconfig.json

```json
{
  "typeRoots": ["./types"]
}
```

3. start umi dev

```shell
$ umi dev
```

4. use type in request, all types export from namespace `API`

```ts
const getUserInfo = (query: API.GET_API_USER_INFO_QUERY) => {
  return axios.get<typeof query, AxiosResponse<API.GET_API_USER_INFO_RES>>(
    `/api/userInfo?${stringify(query)}`
  );
};
```

5. mock file output in `./mock/requestRecord.mock.js`
