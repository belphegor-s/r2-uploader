'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const formatFileSize = (bytes) => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const UploadPage = () => {
  const [files, setFiles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileUrls, setFileUrls] = useState([]);

  const handleFileChange = (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const oversizeFile = Array.from(selectedFiles).find((file) => file.size > MAX_FILE_SIZE);
    if (oversizeFile) {
      toast.error(`File "${oversizeFile.name}" exceeds 100MB limit.`);
      setFiles(null);
      return;
    }

    setFiles(selectedFiles);
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

      const uploaded = Array.from(files).map((file, i) => ({
        name: file.name,
        url: data.urls[i],
      }));

      setFileUrls(uploaded);
      setFiles(null);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard!');
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex justify-center items-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-xl">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Upload Files</h1>

        <div className="mb-4">
          <input type="file" multiple onChange={handleFileChange} className="w-full text-gray-800 border border-gray-300 rounded-md p-3 cursor-pointer" />
        </div>

        {files && (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-md p-4">
            <h2 className="font-semibold text-gray-700 mb-2">Selected Files:</h2>
            <ul className="space-y-1 text-gray-600 text-sm">
              {Array.from(files).map((file, idx) => (
                <li key={idx}>
                  📄 <span className="font-medium">{file.name}</span> — {formatFileSize(file.size)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={loading || !files}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-3 rounded-md transition disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Uploading...' : 'Upload Files'}
        </button>

        {fileUrls.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Uploaded Files:</h2>
            <ul className="space-y-3 text-sm">
              {fileUrls.map((file, idx) => (
                <li key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-2">
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[70%]">
                    {file.name}
                  </a>
                  <button onClick={() => handleCopy(file.url)} className="ml-4 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 cursor-pointer">
                    📋 Copy
                  </button>
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
