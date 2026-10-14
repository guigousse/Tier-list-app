import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

// AI icons are shared by concept: one copy on the device per URL, whatever the number
// of cards and lists using it, so the cards keep their picture offline.
function iconsDir(): Directory {
  const dir = new Directory(Paths.document, 'ai-icons');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

const fileFor = (url: string) => new File(iconsDir(), url.split('/').pop()!.replace(/[^\w.-]/g, '_'));
const downloading = new Set<string>();

/** Keeps a copy of the icon on the device (once per URL). */
export async function cacheAiIcon(url: string): Promise<void> {
  if (Platform.OS === 'web' || downloading.has(url)) return;
  downloading.add(url);
  try {
    const file = fileFor(url);
    if (!file.exists) await File.downloadFileAsync(url, file);
  } catch {
    // Offline: the URL is shown meanwhile, the copy is made on a later display.
  } finally {
    downloading.delete(url);
  }
}

/** The device copy if there is one, else the URL (and a copy is made). */
export function aiIconUri(url: string): string {
  if (Platform.OS === 'web') return url;
  try {
    const file = fileFor(url);
    if (file.exists) return file.uri;
  } catch {
    // Unreadable cache: fall back to the network.
  }
  cacheAiIcon(url);
  return url;
}
