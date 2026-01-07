/**
 * Returns a hello message for the Apps Script project.
 * @returns A friendly hello string.
 */
export function helloScript(): string {
  const rootFolderName = DriveApp.getRootFolder().getName();
  return `Hello Script 👋 (root folder: ${rootFolderName})`;
}
