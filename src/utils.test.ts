import prettier from 'prettier';
import { getType, object2Type } from './utils';

describe('object 2 type should work fine', () => {
  it('should work fine', () => {
    const result = object2Type(
      {
        a: 1,
        b: '2',
        c: {
          d: '3',
          e: [1, 2, 3],
        },
        f: [
          {
            ff: ['1', '2', '3'],
          },
        ],
        g: false,
        h: [],
      },
      {
        typeName: 'Test',
      }
    );
    expect(prettier.format(result, { parser: 'typescript' }).trim()).toEqual(
      `
export type Test = {
  a: number;

  b: string;

  c: {
    d: string;
    e: number[];
  };

  f: {
    ff: string[];
  }[];

  g: boolean;

  h: never[];
};`.trim()
    );
  });
  it('null type', () => {
    const result = object2Type(
      {
        a: null,
        b: [null, null],
      },
      {
        typeName: 'API',
      }
    );
    expect(prettier.format(result, { parser: 'typescript' }).trim()).toEqual(
      `
export type API = {
  a: null;

  b: null[];
};    
`.trim()
    );
  });

  it('undefined[]', () => {
    const result = object2Type(
      {
        data: [],
        success: true,
        trace_id: 'trace_202211251411564398',
        user_id: 5578,
      },
      { typeName: 'API' }
    );
    expect(prettier.format(result, { parser: 'typescript' }).trim()).toEqual(
      `
export type API = {
  data: never[];

  success: boolean;

  trace_id: string;

  user_id: number;
};    
`.trim()
    );
  });
});

describe('getType should work fine', () => {
  it('pathname with dot', () => {
    expect(getType('get', '/api/v1/user.info', 'res')).toEqual(
      'GET_API_V1_USER_INFO_RES'
    );
  });
});
