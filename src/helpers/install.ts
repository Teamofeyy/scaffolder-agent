import spawn from 'cross-spawn';
import type { PackageManager } from '../types';

/**
 * Spawn a package manager installation based on user preference.
 */
export async function install(
  packageManager: PackageManager,
  cwd: string,
  isOnline: boolean = true
): Promise<void> {
  const args: string[] = ['install'];
  if (!isOnline) {
    args.push('--offline');
  }

  return new Promise<void>((resolve, reject) => {
    const child = spawn(packageManager, args, {
      cwd,
      stdio: 'inherit',
      env: {
        ...process.env,
        ADBLOCK: '1',
        NODE_ENV: 'development',
        DISABLE_OPENCOLLECTIVE: '1',
      },
    });

    child.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`${packageManager} ${args.join(' ')} failed with code ${code}`));
        return;
      }
      resolve();
    });

    child.on('error', (err: Error) => {
      reject(err);
    });
  });
}

