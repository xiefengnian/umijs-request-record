import chokidar from 'chokidar';
import fs from 'fs';
import { isAbsolute, join } from 'path';
import { Core } from './core';
import { resolePathWithRole } from './utils';

type MockConfig = {
  /** default: ./mock */
  mockFileDir: string;
  /** default: "./types/cache/mock", */
  mockCacheFileDir: string;
};

export class Mock {
  private mockData: Record<string, any> = {};
  private mockFilePath: string;
  private config: MockConfig;
  constructor(config?: MockConfig) {
    const mockFilename = `requestRecord.mock.js`;
    this.config = {
      mockFileDir: './mock',
      mockCacheFileDir: './types/cache/mock',
      ...(config || {}),
    };
    const { mockFileDir } = this.config;
    const finalMockFileDir = isAbsolute(mockFileDir)
      ? mockFileDir
      : join(process.cwd(), mockFileDir);
    this.mockFilePath = join(finalMockFileDir, mockFilename);
  }

  private currentRole: string | undefined;
  private watcher: ReturnType<typeof chokidar.watch> | undefined;

  request = (url: string, method: string) => {
    return this.mockData[Core.createCacheKey(url, method)];
  };
  useRole = (role: string | undefined) => {
    const { mockCacheFileDir } = this.config;
    const finalMockCacheFilePath = join(
      process.cwd(),
      mockCacheFileDir,
      resolePathWithRole('./[role].mock.cache.js', role)
    );
    if (fs.existsSync(finalMockCacheFilePath)) {
      if (fs.existsSync(this.mockFilePath)) {
        fs.unlinkSync(this.mockFilePath);
      }
      fs.copyFileSync(finalMockCacheFilePath, this.mockFilePath);
      this.mockData = require(this.mockFilePath);
    } else {
      console.error(
        `[mock util] mock fail. role "${role}" cache file ${finalMockCacheFilePath} not found.`
      );
    }
  };
}
