"use client"

import { motion } from "framer-motion"
import { CampIcon } from "@/components/camp-icons"

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-2xl font-display font-bold mb-6 bg-gradient-to-r from-[#C5E17E] to-[#FFEE98] bg-clip-text text-transparent">
          Loading data
        </div>

        <div className="flex space-x-4">
          <motion.div
            animate={{
              y: [0, -15, 0],
              rotate: [0, 10, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0,
            }}
          >
            <CampIcon type="forest" size="lg" />
          </motion.div>

          <motion.div
            animate={{
              y: [0, -15, 0],
              rotate: [0, -10, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0.3,
            }}
          >
            <CampIcon type="beach" size="lg" />
          </motion.div>

          <motion.div
            animate={{
              y: [0, -15, 0],
              rotate: [0, 10, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0.6,
            }}
          >
            <CampIcon type="water" size="lg" />
          </motion.div>

          <motion.div
            animate={{
              y: [0, -15, 0],
              rotate: [0, -10, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0.9,
            }}
          >
            <CampIcon type="social" size="lg" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
