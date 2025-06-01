'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import { format } from 'date-fns';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { MAX_FILE_SIZE } from '@/data/constants';
import { formatFileSize } from '@/utils/formatFileSize';
import { formatFileName } from '@/utils/formatFileName';

const UploadPage = () => {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrls, setFileUrls] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const sortedFiles = useMemo(
    () =>
      [...uploadedFiles].sort((a, b) => {
        return sortOrder === 'asc' ? new Date(a.lastModified) - new Date(b.lastModified) : new Date(b.lastModified) - new Date(a.lastModified);
      }),
    [uploadedFiles, sortOrder],
  );
  const [copiedStates, setCopiedStates] = useState({});

  const handleCopy = (url, fileId) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedStates((prev) => ({ ...prev, [fileId]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [fileId]: false }));
      }, 1000);
    });
  };

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch('/api/upload');
      const data = await response.json();
      setUploadedFiles(data?.files || []);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      toast.error('Failed to fetch uploaded files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

    setUploading(true);

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
      fetchUploadedFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  return (
    <div className="min-h-screen bg-[#272727] text-[#f5f5f5]">
      <Navbar />
      {loading ? (
        <div className="mt-8">
          <Loader />
        </div>
      ) : (
        <div className="w-full">
          <div className="w-full max-w-3xl mx-auto p-4 sm:p-8">
            <div className="w-max ml-auto">
              <Link href="/upload/private" className="text-blue-500 hover:text-blue-300 transition-all">
                Private Upload &rarr;
              </Link>
            </div>
            {/* Upload Card */}
            <div className="bg-[#313131] text-[#f5f5f5] rounded-2xl shadow-xl p-6 sm:p-8 mb-8 mt-2">
              <h1 className="text-2xl font-bold text-center text-[#f5f5f5] mb-6">Upload Files (Public)</h1>
              <div className="mb-4">
                <input type="file" multiple onChange={handleFileChange} className="w-full text-[#f5f5f5] border border-gray-300 rounded-md p-3 cursor-pointer" />
              </div>
              {files && (
                <div className="mb-4 bg-[#313131] border border-slate-500 rounded-md p-4">
                  <h2 className="font-semibold text-[#f5f5f5] mb-2">Selected Files:</h2>
                  <ul className="space-y-1 text-[#f5f5f5] text-sm">
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
                disabled={uploading || !files}
                className="w-full bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition disabled:opacity-50 disabled:bg-blue-500 cursor-pointer"
              >
                {uploading ? 'Uploading...' : 'Upload Files'}
              </button>
              {fileUrls.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold text-[#f5f5f5] mb-2">Recently Uploaded:</h2>
                  <ul className="space-y-3 text-sm">
                    {fileUrls.map((file, idx) => (
                      <li key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#1c1c1c] border border-gray-200 rounded-md p-2">
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold hover:underline truncate" title={file.name}>
                          {file.name}
                        </a>
                        <button
                          onClick={() => handleCopy(file.url, `recent-${idx}`)}
                          className="mt-2 sm:mt-0 px-3 py-1 text-xs bg-[#313131] hover:bg-[#434343] transition-all rounded-md text-white cursor-pointer"
                        >
                          {copiedStates[`recent-${idx}`] ? '✅ Copied!' : '📋 Copy'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* Uploaded Files List */}
            <div className="bg-[#313131] rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                <h2 className="text-xl font-semibold text-[#f5f5f5]">Uploaded Files:</h2>
                <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="text-sm text-blue-400 hover:underline self-start sm:self-auto cursor-pointer">
                  Sort by Date: {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
                </button>
              </div>

              <ul className="space-y-3 text-sm">
                {sortedFiles.map((file, idx) => (
                  <li key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#1c1c1c] border border-gray-200 rounded-md p-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 max-w-full sm:max-w-[70%] truncate">
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold hover:underline truncate" title={formatFileName(file.key)}>
                        {formatFileName(file.key)}
                      </a>
                      <span className="text-gray-400 text-xs mt-1 sm:mt-0">{format(new Date(file.lastModified), 'PPpp')}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(file.url, `uploaded-${idx}`)}
                      className="mt-2 sm:mt-0 px-3 py-1 text-xs bg-[#313131] hover:bg-[#434343] transition-all rounded-md text-white cursor-pointer"
                    >
                      {copiedStates[`uploaded-${idx}`] ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
