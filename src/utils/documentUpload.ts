import { apiFetch } from '@/lib/api';

interface UploadDocumentParams {
  userId: string;
  department: string;
  documentType: string;
  file: File;
}

export async function uploadDocumentToStorage({
  userId,
  department,
  documentType,
  file
}: UploadDocumentParams): Promise<string> {
  const getFoldersResponse = await apiFetch(
    `https://functions.poehali.dev/89ba96e1-c10f-490a-ad91-54a977d9f798?user_id=${userId}`
  );
  const foldersData = await getFoldersResponse.json();

  let departmentFolderId;
  const departmentFolder = foldersData.folders?.find(
    (f: any) => f.folder_name === department && f.parent_id === null
  );

  if (departmentFolder) {
    departmentFolderId = departmentFolder.id;
  } else {
    const createDeptResponse = await apiFetch(
      'https://functions.poehali.dev/89ba96e1-c10f-490a-ad91-54a977d9f798',
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          user_id: userId,
          folder_name: department
        })
      }
    );
    const deptData = await createDeptResponse.json();
    departmentFolderId = deptData.folder_id;
    
    if (!departmentFolderId) {
      throw new Error('Не удалось создать папку подразделения');
    }
  }

  const refreshFoldersResponse = await apiFetch(
    `https://functions.poehali.dev/89ba96e1-c10f-490a-ad91-54a977d9f798?user_id=${userId}`
  );
  const refreshedFoldersData = await refreshFoldersResponse.json();

  let documentTypeFolderId;
  const documentTypeFolder = refreshedFoldersData.folders?.find(
    (f: any) =>
      f.folder_name === documentType && f.parent_id === departmentFolderId
  );

  if (documentTypeFolder) {
    documentTypeFolderId = documentTypeFolder.id;
  } else {
    const createDocTypeResponse = await apiFetch(
      'https://functions.poehali.dev/89ba96e1-c10f-490a-ad91-54a977d9f798',
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          user_id: userId,
          folder_name: documentType,
          parent_id: departmentFolderId
        })
      }
    );
    const docTypeData = await createDocTypeResponse.json();
    documentTypeFolderId = docTypeData.folder_id;
    
    if (!documentTypeFolderId) {
      throw new Error('Не удалось создать папку типа документа');
    }
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder_id', String(documentTypeFolderId));

  const uploadResponse = await apiFetch(
    'https://functions.poehali.dev/cbbbbc82-61fa-4061-88d0-900cb586aea6',
    {
      method: 'POST',
      body: formData
    }
  );

  const uploadData = await uploadResponse.json();
  return uploadData.file_url;
}