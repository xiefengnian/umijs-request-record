import { object2Type } from './utils';
import prettier from 'prettier';

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
};`.trim()
    );
  });
});
