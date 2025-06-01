'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';
import { format, set } from 'date-fns';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { MAX_FILE_SIZE } from '@/data/constants';
import { formatFileSize } from '@/utils/formatFileSize';
import { formatFileName } from '@/utils/formatFileName';
import { AnimatePresence, motion } from 'framer-motion';
import copyToClipboard from '@/utils/copyToClipboard';

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
  const [emails, setEmails] = useState(['']);
  const [generating, setGenerating] = useState(false);
  const emailsRef = useRef([]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [customExpiry, setCustomExpiry] = useState('');
  const [customExpiryUnit, setCustomExpiryUnit] = useState('minutes');

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
    setCustomExpiry('');
    setCustomExpiryUnit('minutes');
    setSendEmail(false);
    setEmails(['']);
  };

  const calculateExpirySeconds = (capAtMax = true) => {
    if (expiry !== 'custom') return expiry;

    const customValue = parseInt(customExpiry);
    if (!customValue || customValue <= 0) return 30; // fallback

    const multipliers = {
      seconds: 1,
      minutes: 60,
      hours: 3600,
      days: 86400,
    };

    const totalSeconds = customValue * multipliers[customExpiryUnit];
    const maxExpiry = 604800; // 7 days in seconds (AWS S3 limit)

    // Only cap at max if requested (for API calls), otherwise return raw value (for validation display)
    return capAtMax ? Math.min(totalSeconds, maxExpiry) : totalSeconds;
  };

  const generatePresignedUrl = async () => {
    if (generating) return;

    if (expiry === 'custom') {
      const customValue = parseInt(customExpiry);
      if (!customValue || customValue <= 0) {
        toast.error('Please enter a valid expiry duration');
        return;
      }

      const totalSeconds = calculateExpirySeconds();
      if (totalSeconds > 604800) {
        toast.error('Maximum expiry duration is 7 days due to AWS S3 limits');
        return;
      }
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/upload/private/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: selectedFile.key,
          expiry: calculateExpirySeconds(true),
          emails: sendEmail ? emails.filter((email) => email.trim()) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate URL');

      setGeneratedLink(data.url);
      await copyToClipboard(data.url);

      if (data?.message) {
        toast.success(data.message, {
          duration: 5000,
        });
      } else {
        toast.success('Pre-signed URL generated', {
          duration: 5000,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to generate pre-signed URL');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!selectedFile) {
      setGeneratedLink('');
    }
  }, [selectedFile]);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleEmailChange = (index, value) => {
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
  };

  const addEmailField = () => {
    if (emails.length >= 10) {
      toast.error('You can only add up to 10 email recipients.');
      return;
    }
    setEmails([...emails, '']);
  };

  const removeEmailField = (index) => {
    const updated = emails.filter((_, i) => i !== index);
    setEmails(updated.length > 0 ? updated : ['']);
  };

  useEffect(() => {
    if (emailsRef.current && emailsRef.current.length > 0) {
      const lastEl = [...emailsRef.current].reverse().find((el) => el !== null);

      if (lastEl) {
        lastEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [emails]);

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
                    <div className="p-2">
                      <label className="block text-sm font-medium mb-1" htmlFor="expiry-select">
                        Expiry Duration
                      </label>
                      <select
                        id="expiry-select"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                        className="block w-full p-2 mt-2 rounded bg-[#2a2a2a] border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        required
                        disabled={generating}
                      >
                        <optgroup label="Short">
                          <option value={30}>30 seconds</option>
                          <option value={60}>1 minute</option>
                          <option value={120}>2 minutes</option>
                          <option value={300}>5 minutes</option>
                        </optgroup>
                        <optgroup label="Medium">
                          <option value={600}>10 minutes</option>
                          <option value={900}>15 minutes</option>
                          <option value={1800}>30 minutes</option>
                        </optgroup>
                        <optgroup label="Long">
                          <option value={2700}>45 minutes</option>
                          <option value={3600}>1 hour</option>
                        </optgroup>
                        <optgroup label="Custom">
                          <option value="custom">Custom Duration</option>
                        </optgroup>
                      </select>
                      {expiry === 'custom' && (
                        <div className="mt-3 flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max="10080" // 7 days in minutes
                            value={customExpiry}
                            onChange={(e) => setCustomExpiry(e.target.value)}
                            placeholder="Enter duration"
                            className="flex-1 p-2 rounded bg-[#2a2a2a] border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            required
                            disabled={generating}
                          />
                          <select
                            value={customExpiryUnit}
                            onChange={(e) => setCustomExpiryUnit(e.target.value)}
                            className="p-2 rounded bg-[#2a2a2a] border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            disabled={generating}
                          >
                            <option value="seconds">Seconds</option>
                            <option value="minutes">Minutes</option>
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                          </select>
                        </div>
                      )}
                      {expiry === 'custom' && customExpiry && (
                        <div className="mt-4 text-xs text-gray-400">
                          {(() => {
                            const totalSeconds = calculateExpirySeconds(false); // Don't cap for display validation
                            const maxExpiry = 604800;

                            if (totalSeconds > maxExpiry) {
                              return <span className="text-red-400">⚠️ Exceeds maximum limit (7 days). Will be capped at 7 days.</span>;
                            }

                            const days = Math.floor(totalSeconds / 86400);
                            const hours = Math.floor((totalSeconds % 86400) / 3600);
                            const minutes = Math.floor((totalSeconds % 3600) / 60);
                            const seconds = totalSeconds % 60;

                            let display = [];
                            if (days > 0) display.push(`${days} day${days !== 1 ? 's' : ''}`);
                            if (hours > 0) display.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
                            if (minutes > 0) display.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
                            if (seconds > 0) display.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

                            return `Duration: ${display.join(' ')}`;
                          })()}
                        </div>
                      )}
                    </div>

                    <label htmlFor="send-email-checkbox" className={`text-sm cursor-pointer flex items-center p-2 gap-2 w-max select-none ${generating ? 'text-gray-500' : ''}`}>
                      <input type="checkbox" id="send-email-checkbox" checked={sendEmail} onChange={() => setSendEmail((prev) => !prev)} className="accent-blue-600" disabled={generating} />
                      Send link via email
                    </label>
                    {sendEmail && (
                      <div>
                        <label className="block text-sm font-medium mb-1 px-2">Recipient Emails</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-2 mb-2">
                          {emails.map((emailVal, index) => (
                            <div key={index} className="flex gap-2" ref={(el) => (emailsRef.current[index] = el)}>
                              <input
                                type="email"
                                placeholder="john.doe@example.com"
                                value={emailVal}
                                onChange={(e) => handleEmailChange(index, e.target.value)}
                                className="flex-1 p-2 rounded bg-[#2a2a2a] border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                                required={sendEmail}
                                disabled={generating}
                              />
                              <button
                                type="button"
                                onClick={() => removeEmailField(index)}
                                className={`text-red-400 hover:text-red-600 text-xs font-bold select-none ${index === 0 ? 'invisible' : ''}`}
                                disabled={generating}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={addEmailField} className="mt-2 px-2 text-blue-400 hover:text-blue-600 text-sm select-none" disabled={generating}>
                          + Add another email
                        </button>
                      </div>
                    )}
                    {generatedLink && (
                      <div className="mt-4 text-sm text-gray-200 px-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            Generated Link:{' '}
                            <a href={generatedLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                              {generatedLink}
                            </a>
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigator.clipboard.writeText(generatedLink).then(() => {
                                toast.success('Link copied to clipboard!');
                              });
                            }}
                            className="sm:mt-0 px-3 py-1 text-xs bg-[#313131] hover:bg-[#434343] transition-all rounded-md text-white cursor-pointer whitespace-nowrap"
                          >
                            📋 Copy
                          </button>
                        </div>
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
