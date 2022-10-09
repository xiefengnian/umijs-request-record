import { join, isAbsolute } from 'path';
import { Core } from './core';
import { resolePathWithRole } from './utils';

type MockConfig = {
  mockFileDir: string;
  role?: string;
  /** default: api.[role].mock.js */
  mockFilename?: string;
};

export class Mock {
  private mockData: Record<string, any> = {};
  constructor(private config: MockConfig) {
    const { mockFileDir, mockFilename = `api.[role].mock.js` } = this.config;
    const finalMockFileDir = isAbsolute(mockFileDir)
      ? mockFileDir
      : join(process.cwd(), mockFileDir);
    const mockFilePath = join(
      finalMockFileDir,
      resolePathWithRole(mockFilename, this.config.role)
    );
    try {
      this.mockData = require(mockFilePath);
    } catch (error) {
      console.log(`Can't found mock file in "${mockFilePath}".\n`, error);
    }
  }
  request = (url: string, method: string) => {
    return this.mockData[Core.createCacheKey(url, method)];
  };
}
