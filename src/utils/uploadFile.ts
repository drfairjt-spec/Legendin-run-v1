export async function uploadFile(file: File, category: 'avatars' | 'covers' | 'portfolio' | 'posts' | 'receipts' | 'contracts'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`/api/upload/${category}`, { 
    method: 'POST', 
    body: formData 
  });
  
  if (!response.ok) {
    throw new Error('ارائه فایل با اشتباه مواجه شد');
  }
  
  const result = await response.json();
  return result.url;
}

// Example usage in components:
// const updatedUrl = await uploadFile(fileInput.files[0], 'avatar');
// setUser({ ...user, avatar: updatedUrl });