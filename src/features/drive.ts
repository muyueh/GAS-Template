import { logInfo } from '../lib/logger';

/**
 * Creates a folder under a parent folder if it does not already exist.
 *
 * @param {GoogleAppsScript.Drive.Folder} parent - The parent folder.
 * @param {string} name - Folder name to find/create.
 * @returns {GoogleAppsScript.Drive.Folder} The existing or newly created folder.
 */
export function getOrCreateFolder(
  parent: GoogleAppsScript.Drive.Folder,
  name: string
): GoogleAppsScript.Drive.Folder {
  logInfo('getOrCreateFolder()', { name });

  const existing = parent.getFoldersByName(name);
  if (existing.hasNext()) {
    return existing.next();
  }

  return parent.createFolder(name);
}

/**
 * Gets the script owner's root Drive folder.
 *
 * @returns {GoogleAppsScript.Drive.Folder} The root folder.
 */
export function getRootFolder(): GoogleAppsScript.Drive.Folder {
  logInfo('getRootFolder()');
  return DriveApp.getRootFolder();
}
