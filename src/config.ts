import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolePathWithRole } from './utils';
export type ConfigType = {
  mock?: {
    /** default: ~/mock */
    outputDir?: string;
    /** default: "api.[role].mock.js", */
    fileName?: string;
  };
  type?: boolean;
  namespace?: string;
  comment?: boolean;
  /** default: ~/types */
  outputDir?: string;
  ready?: boolean;
  successFilter?: (response: Record<any, any>) => boolean;
  role?: string;
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
      type: false,
      ...userConfig,
    };
    this.createInitialFile();
  }
  createInitialFile = () => {
    const { outputDir, mock } = this.config;
    const { outputDir: mockOutputDir = './mock' } = mock;
    const finalOutputDir = join(process.cwd(), outputDir);
    if (!existsSync(finalOutputDir)) {
      mkdirSync(finalOutputDir, { recursive: true });
    }
    const finalMockOutputDir = join(process.cwd(), mockOutputDir);
    if (!existsSync(finalMockOutputDir)) {
      mkdirSync(finalMockOutputDir, { recursive: true });
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
      const { fileName = 'api.[role].mock.js', outputDir = './mock' } =
        this.config.mock;
      const role = this.config.role;

      return join(process.cwd(), outputDir, resolePathWithRole(fileName, role));
    }
  };
  getTypeFilePath = () => {
    const { outputDir = './types' } = this.config;
    return join(process.cwd(), outputDir, `./index.ts`);
  };
  getCacheFilePath = () => {
    return join(
      this.getCacheDir(),
      resolePathWithRole('./[role].cache.json', this.config.role)
    );
  };
  getCacheDir = () => {
    const { outputDir = './types' } = this.config;
    return join(process.cwd(), outputDir, 'cache');
  };
  getRole = () => {
    return this.config.role;
  };
  getSuccessFilter = () => {
    return this.config.successFilter;
  };
}
