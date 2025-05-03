'use client';

import { useState } from 'react';

const UploadPage = () => {
  const [files, setFiles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileUrls, setFileUrls] = useState([]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(e.target.files);
    }
  };

  const handleUpload = async () => {
    if (!files) return;

    setLoading(true);

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setFileUrls(data.urls);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-center text-gray-700 mb-4">Upload Files to Cloudflare R2</h1>

        <div className="mb-4">
          <input type="file" multiple onChange={handleFileChange} className="w-full text-gray-700 border border-gray-300 rounded-md p-3" />
        </div>

        <button onClick={handleUpload} disabled={loading} className="w-full bg-blue-500 text-white p-3 rounded-md disabled:bg-gray-300 cursor-pointer">
          {loading ? 'Uploading...' : 'Upload Files'}
        </button>

        {fileUrls.length > 0 && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold text-gray-700">Uploaded Files:</h2>
            <ul className="list-disc ml-5 mt-2 text-blue-500">
              {fileUrls.map((url, idx) => (
                <li key={idx}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
