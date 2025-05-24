async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text to clipboard:', err);
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;

  textarea.style.position = 'fixed';
  textarea.style.top = 0;
  textarea.style.left = 0;
  textarea.style.opacity = 0;

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const successful = document.execCommand('copy');
    return successful;
  } catch (err) {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export default copyToClipboard;
