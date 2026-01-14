'use client';

import { AnimatePresence, motion } from 'framer-motion';

const Modal = ({ open, onClose, children, maxWidth = 'max-w-md', closeOnBackdrop = true }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          >
            <div className={`w-full ${maxWidth} bg-[#1c1c1c] rounded-2xl border border-gray-700 shadow-xl`} onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
