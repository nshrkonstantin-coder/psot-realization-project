/**
 * Uploads a file to the "КБТ" folder in storage
 * Creates the folder if it doesn't exist
 */
export async function uploadToKBTFolder(file: File, userId: string): Promise<string> {
  try {
    // 1. Get all folders for user
    const getFoldersResponse = await fetch(
      `https://functions.poehali.dev/89ba96e1-c10f-490a-ad91-54a977d9f798?user_id=${userId}`
    );
    const foldersData = await getFoldersResponse.json();

    // 2. Check if "КБТ" folder exists (root level, no parent)
    let kbtFolderId: number | null = null;
    const kbtFolder = foldersData.folders?.find(
      (f: any) => f.folder_name === 'КБТ' && f.parent_id === null
    );

    if (kbtFolder) {
      kbtFolderId = kbtFolder.id;
    } else {
      // 3. Create "КБТ" folder if it doesn't exist
      const createFolderResponse = await fetch(
        'https://functions.poehali.dev/89ba96e1-c10f-490a-ad91-54a977d9f798',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            user_id: userId,
            folder_name: 'КБТ'
          })
        }
      );
      const folderData = await createFolderResponse.json();
      kbtFolderId = folderData.folder_id;
      
      if (!kbtFolderId) {
        throw new Error('Не удалось создать папку КБТ');
      }
    }

    // 4. Upload file to "КБТ" folder
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder_id', String(kbtFolderId));

    const uploadResponse = await fetch(
      'https://functions.poehali.dev/cbbbbc82-61fa-4061-88d0-900cb586aea6',
      {
        method: 'POST',
        body: formData
      }
    );

    if (!uploadResponse.ok) {
      throw new Error('Ошибка загрузки файла');
    }

    const uploadData = await uploadResponse.json();
    return uploadData.file_url || '';
  } catch (error) {
    console.error('Error uploading to КБТ folder:', error);
    throw error;
  }
}
