'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LyricDisplay({ lyrics = [], currentLyricIndex, onLyricClick, className = '' }) {
  const lyricsContainerRef = useRef(null);

  useEffect(() => {
    if (lyricsContainerRef.current && currentLyricIndex !== -1) {
      const lyricElement = lyricsContainerRef.current.children[currentLyricIndex];
      if (lyricElement) {
        lyricElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  }, [currentLyricIndex]);

  if (lyrics.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-gray-500 p-4"
      >
        暂无歌词
      </motion.div>
    );
  }

  return (
    <motion.div 
      ref={lyricsContainerRef} 
      className={`h-full overflow-y-auto px-4 md:px-8 py-6 rounded-lg ${className}`}
      style={{ 
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent',
        overflowX: 'hidden'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <AnimatePresence>
        {lyrics.map((lyric, index) => {
          const isActive = index === currentLyricIndex;
          const isNearActive = Math.abs(index - currentLyricIndex) <= 2;
          
          return (
            <motion.div 
              key={index} 
              onClick={() => onLyricClick(lyric.time)}
              className={`
                p-2 
                cursor-pointer 
                rounded-lg
                text-center
                my-3 md:my-4
                transition-colors
                duration-300
                relative
                ${isActive ? 'text-white font-bold' : 'text-gray-500 hover:text-gray-300'}
              `}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: isNearActive ? 1 : 0.6,
                y: 0,
                scale: isActive ? 1.05 : 1,
              }}
              whileHover={{ 
                scale: isActive ? 1.05 : 1.02,
                opacity: 1,
              }}
              transition={{
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1],
                scale: {
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }
              }}
            >
              <motion.div
                className="absolute inset-0 rounded-lg"
                initial={false}
                animate={{
                  backgroundColor: isActive 
                    ? 'rgba(59, 130, 246, 0.9)' 
                    : 'rgba(0, 0, 0, 0)',
                  scale: isActive ? 1 : 0.95,
                }}
                transition={{
                  duration: 0.3,
                  ease: 'easeOut'
                }}
              />
              <span className="relative z-10 text-sm md:text-base lg:text-lg">
                {lyric.name}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
} 