/**
 * Convert a local file to a Base64 Data URI string using standard Fetch API and FileReader.
 * This avoids dependency on expo-file-system legacy methods.
 * 
 * @param uri Local file URI (e.g. file://...)
 * @param path Unused
 * @returns Promise resolving to the Base64 Data URI (data:...)
 */
export const uploadImage = async (uri: string, path: string): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to convert blob to base64 string'));
        }
      };
      
      reader.onerror = (e) => {
        reject(new Error('FileReader failed: ' + JSON.stringify(e)));
      };
      
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting file to base64:', error);
    throw error;
  }
};
