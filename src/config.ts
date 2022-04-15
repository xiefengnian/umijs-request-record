import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
export type ConfigType = {
  mock?: {
    /** default: ~/mock */
    outputDir?: string;
    /** default: api.mock.js */
    fileName?: string;
  };
  namespace?: string;
  comment?: boolean;
  /** default: ~/types */
  outputDir?: string;
  ready?: boolean;
};

export class Config {
  private config: ConfigType;
  constructor(userConfig: ConfigType) {
    this.config = {
      mock: {
        fileName: 'api.mock.js',
        outputDir: './mock',
      },
      namespace: 'API',
      comment: true,
      outputDir: './types',
      ready: true,
      ...userConfig,
    };
    this.createInitialFile();
  }
  createInitialFile = () => {
    const { outputDir } = this.config;
    const finalOutputDir = join(process.cwd(), outputDir);
    if (!existsSync(finalOutputDir)) {
      mkdirSync(finalOutputDir, { recursive: true });
    }
    const cacheDir = this.getCacheDir();
    const cacheFilePath = this.getCacheFilePath();
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
    if (!existsSync(cacheFilePath)) {
      writeFileSync(cacheFilePath, '{}');
    }
  };
  getConfig = () => this.config;
  getMockFilePath = () => {
    if (this.config.mock) {
      const { fileName = 'api.mock.js', outputDir = './mock' } =
        this.config.mock;
      return join(process.cwd(), outputDir, fileName);
    }
  };
  getTypeFilePath = () => {
    const { outputDir = './types' } = this.config;
    return join(process.cwd(), outputDir, './index.ts');
  };
  getCacheFilePath = () => {
    return join(this.getCacheDir(), './cache.json');
  };
  getCacheDir = () => {
    const { outputDir = './types' } = this.config;
    return join(process.cwd(), outputDir, 'cache');
  };
}
