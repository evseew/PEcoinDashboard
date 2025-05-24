"use client"

import { motion } from "framer-motion"

interface ErrorOverlayProps {
  message: string
}

export function ErrorOverlay({ message }: ErrorOverlayProps) {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <motion.div
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl max-w-md w-full text-center shadow-xl border-2 border-[#D63D3D] dark:border-[#D63D3D]/80"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="text-[#D63D3D] text-2xl font-display font-bold mb-4"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          Oops! Something went wrong
        </motion.div>
        <p className="dark:text-gray-300 text-lg mb-6">{message}</p>
        <motion.button
          onClick={() => window.location.reload()}
          className="camp-button px-6 py-3 text-lg font-display font-bold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Try Again
        </motion.button>
      </motion.div>
    </div>
  )
}
