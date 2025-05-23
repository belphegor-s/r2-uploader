'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';
import { format } from 'date-fns';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { MAX_FILE_SIZE } from '@/data/constants';
import { formatFileSize } from '@/utils/formatFileSize';
import { formatFileName } from '@/utils/formatFileName';
import { AnimatePresence, motion } from 'framer-motion';

const PrivateUploadPage = () => {
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [expiry, setExpiry] = useState(30);
  const [sendEmail, setSendEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [generating, setGenerating] = useState(false);

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch('/api/upload/private');
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
      const response = await fetch('/api/upload/private', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      const uploaded = Array.from(files).map((file, i) => ({
        name: file.name,
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

  const openPresignModal = (file) => {
    setSelectedFile(file);
    setExpiry(30);
    setSendEmail(false);
    setEmail('');
  };

  const generatePresignedUrl = async () => {
    if (generating) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/upload/private/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: selectedFile.key,
          expiry: Number(expiry),
          email: sendEmail ? email : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate URL');

      navigator.clipboard.writeText(data.url);
      if (data?.message) {
        toast.success(data.message, {
          duration: 5000,
        });
      }
      toast.success('Pre-signed URL generated and copied to clipboard', {
        duration: 5000,
      });
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to generate pre-signed URL');
    } finally {
      setGenerating(false);
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
          <div className="w-full max-w-2xl mx-auto p-4 sm:p-8">
            <div>
              <Link href="/upload" className="text-blue-500 hover:text-blue-300 transition-all">
                &larr; Public Upload
              </Link>
            </div>
            {/* Upload Card */}
            <div className="bg-[#313131] text-[#f5f5f5] rounded-2xl shadow-xl p-6 sm:p-8 mb-8 mt-2">
              <h1 className="text-2xl font-bold text-center text-[#f5f5f5] mb-6">Upload Files (Private)</h1>
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
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold truncate">
                          {file.name}
                        </a>
                        {/* <button onClick={() => handleCopy(file.url)} className="mt-2 sm:mt-0 px-3 py-1 text-xs bg-[#313131] hover:bg-[#434343] transition-all rounded-md text-white cursor-pointer">
                          📋 Copy
                        </button> */}
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 max-w-full sm:max-w-[60%] truncate">
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold truncate">
                        {formatFileName(file.key, 'private')}
                      </a>
                      <span className="text-gray-400 text-xs mt-1 sm:mt-0">{format(new Date(file.lastModified), 'PPpp')}</span>
                    </div>
                    <button onClick={() => openPresignModal(file)} className="mt-2 sm:mt-0 px-3 py-1 text-xs bg-[#313131] hover:bg-[#434343] transition-all rounded-md text-white cursor-pointer">
                      🔐 Generate Pre-signed URL
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <AnimatePresence>
            {selectedFile && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => {
                  if (generating) return;
                  setSelectedFile(null);
                }}
              >
                <motion.form
                  onSubmit={(e) => {
                    e.preventDefault();
                    generatePresignedUrl();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#1e1e1e] p-6 rounded-xl max-w-md w-full shadow-2xl border border-slate-500 text-white space-y-6"
                >
                  <h3 className="text-xl font-bold border-b border-gray-700 pb-4">Generate Pre-signed URL</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" htmlFor="expiry-select">
                        Expiry Duration
                      </label>
                      <select
                        id="expiry-select"
                        value={expiry}
                        onChange={(e) => setExpiry(Number(e.target.value))}
                        className="block w-full p-2 rounded bg-[#2a2a2a] border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        required
                        disabled={generating}
                      >
                        <option value={30}>30 seconds</option>
                        <option value={60}>1 minute</option>
                        <option value={300}>5 minutes</option>
                        <option value={600}>10 minutes</option>
                        <option value={1800}>30 minutes</option>
                        <option value={3600}>1 hour</option>
                      </select>
                    </div>
                    <label htmlFor="send-email-checkbox" className={`text-sm cursor-pointer flex items-center gap-2 w-max select-none ${generating ? 'text-gray-500' : ''}`}>
                      <input type="checkbox" id="send-email-checkbox" checked={sendEmail} onChange={() => setSendEmail(!sendEmail)} className="accent-blue-600" disabled={generating} />
                      Send link via email
                    </label>
                    {sendEmail && (
                      <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="email-input">
                          Recipient Email
                        </label>
                        <input
                          type="email"
                          id="email-input"
                          placeholder="john.doe@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full p-2 rounded bg-[#2a2a2a] border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                          required={sendEmail}
                          disabled={generating}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="px-4 py-1.5 rounded border border-gray-500 text-sm text-gray-300 hover:bg-[#2a2a2a] transition disabled:opacity-50"
                      disabled={generating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 px-4 py-1.5 rounded text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-50"
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        'Generate Link'
                      )}
                    </button>
                  </div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default PrivateUploadPage;
