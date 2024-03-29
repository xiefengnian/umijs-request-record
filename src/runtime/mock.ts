import { fork } from 'child_process';
import { merge } from 'lodash';
import { join } from 'path';

type ArgsType = { port: number; scene: string };

export const startMock = (args?: ArgsType) => {
  const { port, scene } = merge(
    {
      port: 7000,
      scene: 'default',
    },
    args
  );

  return new Promise<{
    close: () => void;
  }>((resolve, reject) => {
    const proc = fork(join(__dirname, './startMock.js'), [], {
      env: {
        scene,
        port: String(port),
      },
    });
    proc.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Mock server exited with code ${code}`));
      }
    });
    resolve({
      close: () => {
        proc.kill();
      },
    });
  });
};
