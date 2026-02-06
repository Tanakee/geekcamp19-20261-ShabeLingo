import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Upload an image from a local URI to Firebase Storage.
 * @param uri Local file URI (e.g. file://...)
 * @param path Storage path (e.g. users/userId/images/filename)
 * @returns Promise resolving to the download URL
 */
export const uploadImage = async (uri: string, path: string): Promise<string> => {
  try {
    // Convert URI to Blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create a reference
    const storageRef = ref(storage, path);

    // Upload
    await uploadBytes(storageRef, blob);

    // Get URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};
