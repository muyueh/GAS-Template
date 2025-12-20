import { registerGlobalFunctions } from './lib/registerGlobals';

/**
 * Boots the script and exposes entrypoints to the Apps Script global scope.
 * This file is the bundler entrypoint. It should stay small and deterministic.
 * @returns Nothing.
 */
function bootstrap(): void {
  registerGlobalFunctions();

  return undefined;
}

bootstrap();
