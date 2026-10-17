import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { newId } from './id';

// Only the file name is persisted: the app container path changes between
// iOS updates, so absolute URIs would break.
// Looked up once: every card displayed asked the file system again (a native call).
let images: Directory | null = null;
function imagesDir(): Directory {
  if (images) return images;
  const dir = new Directory(Paths.document, 'card-images');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return (images = dir);
}

export function imageUri(name: string | undefined): string | undefined {
  if (!name) return undefined;
  // On web the picker returns a data URI, stored as is.
  if (name.includes(':')) return name;
  return new File(imagesDir(), name).uri;
}

/** Lets the user pick a picture and stores a copy. Returns its file name. */
export async function pickCardImage(source: 'library' | 'camera'): Promise<string | undefined> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  };
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return undefined;
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets?.[0]) return undefined;
  const asset = result.assets[0];

  if (Platform.OS === 'web') return asset.uri;

  const picked = new File(asset.uri);
  const name = `${newId()}${picked.extension || '.jpg'}`;
  picked.copySync(new File(imagesDir(), name));
  return name;
}

/** Downloads a picture from the web and stores a copy. Returns its file name. */
export async function downloadCardImage(url: string): Promise<string> {
  if (Platform.OS === 'web') return url;
  const ext = url.match(/\.(jpe?g|png|webp)(?:$|\?)/i)?.[1]?.toLowerCase() ?? 'jpg';
  const name = `${newId()}.${ext === 'jpeg' ? 'jpg' : ext}`;
  await File.downloadFileAsync(url, new File(imagesDir(), name));
  return name;
}

export function deleteCardImage(name: string | undefined): void {
  if (!name || name.includes(':')) return;
  try {
    const file = new File(imagesDir(), name);
    if (file.exists) file.delete();
  } catch {
    // Missing file: nothing to clean up.
  }
}

/** Copies an image so a duplicated list owns its own files. */
export function duplicateCardImage(name: string | undefined): string | undefined {
  if (!name || name.includes(':')) return name;
  try {
    const src = new File(imagesDir(), name);
    if (!src.exists) return undefined;
    const copyName = `${newId()}${src.extension || '.jpg'}`;
    src.copySync(new File(imagesDir(), copyName));
    return copyName;
  } catch {
    return undefined;
  }
}
