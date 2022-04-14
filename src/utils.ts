type JSON2TSOptions = {
  typeName: string;
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
  const { typeName } = options;

  const data: Record<any, any> =
    typeof json === 'string' ? JSON.parse(json) : json;

  const fn = (object: Record<any, any>) => {
    const currentObject = {};
    for (const key in object) {
      const value = object[key];

      switch (typeof value) {
        case 'object': {
          if (Array.isArray(value)) {
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
        `${key}: ${
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
