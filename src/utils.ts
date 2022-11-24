type JSON2TSOptions = {
  typeName: string;
  comment?: boolean;
};

const JSONStringifyWithoutQuotes = (object: Record<any, any>) => {
  return `
    {
      ${Object.keys(object)
        .map(
          (key) =>
            `${key}: ${
              typeof object[key] === 'object'
                ? JSONStringifyWithoutQuotes(object[key])
                : object[key]
            }`
        )
        .join(',\n')}
      }
  `.trim();
};

export const JSON2TS = (
  json: string | Record<any, any>,
  options: JSON2TSOptions
) => {
  const { typeName, comment } = options;

  const data: Record<any, any> =
    typeof json === 'string' ? JSON.parse(json) : json;

  const fn = (object: Record<any, any>) => {
    const currentObject = {};
    for (const key in object) {
      const value = object[key];

      switch (typeof value) {
        case 'object': {
          if (value === null) {
            currentObject[key] = 'null';
            break;
          }
          if (Array.isArray(value)) {
            if (value.length === 0) {
              currentObject[key] = 'never[]';
              break;
            }

            const value0 = value[0];
            if (value0 === null) {
              currentObject[key] = 'null[]';
              break;
            }
            currentObject[key] =
              typeof value[0] === 'object'
                ? `${JSONStringifyWithoutQuotes(fn(value[0]))}[]`
                : `${typeof value[0]}[]`;
          } else {
            currentObject[key] = fn(value);
          }
          break;
        }
        default: {
          currentObject[key] = typeof value;
        }
      }
    }
    return currentObject;
  };

  const typeObject = fn(data);
  const typeString = `
export type ${typeName} = {
  ${Object.keys(typeObject)
    .map(
      (key) =>
        `${
          comment
            ? `/** example: ${
                typeof json[key] === 'object'
                  ? JSON.stringify(json[key])
                      .replace(/(:)/g, '$1 ')
                      .replace(/(,)/g, '$1 ')
                  : json[key]
              } */`
            : ''
        }
        ${key}: ${
          typeof typeObject[key] === 'object'
            ? JSONStringifyWithoutQuotes(typeObject[key])
            : typeObject[key]
        }`
    )
    .join(';\n  ')}
}
  `;

  return typeString;
};

type Options = {
  typeName: string;
};

export const object2Type = (object: Record<any, any>, options: Options) => {
  return JSON2TS(object, {
    typeName: options.typeName,
  });
};

export const getType = (method, pathname, type) => {
  return `${method}_${pathname.replace(/([A-Z])/g, '_$1')}_${type}`
    .replace(/\//g, '_')
    .replace('__', '_')
    .replace(/\./g, '_')
    .toUpperCase();
};

export const resolePathWithRole = (originPath: string, role?: string) => {
  if (!role) {
    return originPath.replace('[role].', '');
  }
  return originPath.replace(`[role]`, role);
};
