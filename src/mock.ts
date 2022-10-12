import { join, isAbsolute } from 'path';
import { Core } from './core';
import { resolePathWithRole } from './utils';
import fs from 'fs';
import chokidar from 'chokidar';

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
  constructor(config: MockConfig) {
    const mockFilename = `requestRecord.mock.js`;
    this.config = {
      mockFileDir: './mock',
      mockCacheFileDir: './types/cache/mock',
      ...config,
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
  useRole = (role: string) => {
    const { mockCacheFileDir } = this.config;
    const finalMockCacheFilePath = join(
      process.cwd(),
      mockCacheFileDir,
      resolePathWithRole('./[role].mock.cache.js', role)
    );
    if (fs.existsSync(finalMockCacheFilePath)) {
      if (this.watcher && role !== this.currentRole) {
        console.log(
          `role change - new role: ${role}, current role: ${this.currentRole}`
        );
        this.watcher.close();
      }
      this.watcher = chokidar.watch(finalMockCacheFilePath, {
        usePolling: true,
        interval: 3000,
      });
      this.watcher.on('all', () => {
        if (fs.existsSync(this.mockFilePath)) {
          fs.unlinkSync(this.mockFilePath);
        }
        console.log(`reset file`);
        fs.copyFileSync(finalMockCacheFilePath, this.mockFilePath);
        this.mockData = require(this.mockFilePath);
      });
      this.currentRole = role;
    } else {
      console.error(
        `[mock util] mock fail. role "${role}" cache file ${finalMockCacheFilePath} not found.`
      );
    }
  };
}
