'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Slider, Typography, Drawer, message } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, UpOutlined, DownOutlined, CustomerServiceOutlined, StarOutlined, StarFilled, StepBackwardOutlined, StepForwardOutlined } from '@ant-design/icons';
import LyricDisplay from './LyricDisplay';
import { useMusic } from '@/contexts/MusicContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaSession } from '@/hooks/useMediaSession';

const { Text } = Typography;

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 在组件顶部添加样式
const vinylStyles = {
  animation: 'spin 20s linear infinite',
  animationPlayState: 'paused'
};

// 创建一个统一的 Slider 样式配置
const sliderStyles = {
  rail: { 
    backgroundColor: '#e8e8e8', 
    height: '2px' 
  },
  track: { 
    backgroundColor: '#1677ff', 
    height: '2px' 
  },
  handle: { 
    borderColor: '#1677ff',
    width: '12px',
    height: '12px',
    marginTop: '-6px',
    transform: 'translateY(50%)', // 关键是这，确保滑块垂直居中
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  }
};

// 自定义进度条组件
const ProgressSlider = ({ value, max, onChange, disabled }) => {
  const sliderWidth = 100;
  const progress = (value / max) * sliderWidth;

  return (
    <div className="relative w-full group h-1">
      {/* 进度条背景 */}
      <div className="absolute w-full h-1 bg-gray-200/50 rounded-full" />
      
      {/* 进度条 */}
      <div 
        className="absolute h-1 bg-blue-500 rounded-full transition-all"
        style={{ width: `${progress}%` }}
      />

      {/* 滑块 */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 -ml-1.5"
        style={{ left: `${progress}%` }}
      >
        <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm 
                      transform transition-transform duration-200
                      group-hover:scale-125 group-hover:shadow-md" />
      </div>

      {/* 隐藏的滑块输入 */}
      <input
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="absolute w-full opacity-0 cursor-pointer"
        style={{ height: '20px', top: '-10px' }}
      />
    </div>
  );
};

// 添加动画变体配置
const containerVariants = {
  expanded: {
    height: '100vh',
    margin: 0,
    borderRadius: 0,
    top: 0,
    bottom: 'auto'
  },
  collapsed: {
    height: '80px',
    margin: '0 8px 8px 8px',
    borderRadius: '12px',
    bottom: 0,
    top: 'auto'
  }
};

const coverVariants = {
  playing: {
    rotate: 360,
    transition: {
      duration: 20,
      ease: "linear",
      repeat: Infinity
    }
  },
  paused: {
    rotate: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export default function GlobalAudioPlayer() {
  const { 
    currentSong, 
    isPlaying, 
    setIsPlaying, 
    toggleFavorite, 
    isFavorite, 
    isLoading,
    onPlaySong,
    playPreviousSong,
    playNextSong,
    audioRef,
  } = useMusic();

  const [expanded, setExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);

  const isHandlingErrorRef = useRef(false); // 使用 ref 来跨渲染周期跟踪状态

  useEffect(() => {
    const audioElement = audioRef.current;
    
    const handleLoadedMetadata = () => {
      setDuration(audioElement.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime);
    };

    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [currentSong?.url]);

  // 合并所有音频相关的事件处理
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleError = (error) => {
      if (isHandlingErrorRef.current) return;
      isHandlingErrorRef.current = true;
      
      console.error('Audio error:', error);
      
      // 检查错误类型
      const errorCode = error.target?.error?.code;
      const errorMessage = error.target?.error?.message || error.message || '';
      
      // CORS 错误或网络错误
      if (errorCode === 18 || 
          errorMessage.includes('CORS') || 
          errorCode === 2 || // NETWORK_ERR
          errorMessage.includes('network')) {
        setIsPlaying(false);
        message.error('音频加载失败，请尝试其他歌曲');
      } 
      // 如果有 requestUrl，尝试重新请求
      else if (currentSong?.requestUrl) {
        onPlaySong(currentSong, currentSong.searchIndex, currentSong.quality, true);
      } 
      // 其他错误
      else {
        setIsPlaying(false);
        message.error('播放出错，请稍后重试');
      }
      
      // 重置错误处理状态
      setTimeout(() => {
        isHandlingErrorRef.current = false;
      }, 1000);
    };

    const handlePlay = () => {
      if (!audioRef.current) return;

      if (isPlaying && !isHandlingErrorRef.current) {
        audioRef.current.play().catch(err => {
          // 只处理真正的播放错误
          if (err.name !== 'AbortError') {
            handleError(err);
          }
        });
      } else {
        audioRef.current.pause();
      }
    };

    audioElement.addEventListener('error', handleError);
    handlePlay();

    return () => {
      audioElement.removeEventListener('error', handleError);
    };
  }, [isPlaying, currentSong, onPlaySong]);

  const handleSliderChange = (value) => {
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const handleLyricClick = (timeStr) => {
    let newTime;
    
    // 处理不同的时间格式
    if (timeStr.includes(':')) {
      // 旧格式 mm:ss
      const [minutes, seconds] = timeStr.split(':').map(parseFloat);
      newTime = minutes * 60 + seconds;
    } else {
      // 新格式 秒数（字符串形式的数字）
      newTime = parseFloat(timeStr);
    }
    
    // 确保时间是有效的有限数值
    if (isFinite(newTime) && newTime >= 0) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  useEffect(() => {
    if (!currentSong?.lyrics?.length) return;
    
    const findCurrentLyricIndex = (time) => {
      for (let i = currentSong.lyrics.length - 1; i >= 0; i--) {
        const lyricTime = currentSong.lyrics[i].time.split(':').reduce((acc, val) => acc * 60 + parseFloat(val), 0);
        if (time >= lyricTime) return i;
      }
      return -1;
    };

    const handleTimeUpdate = () => {
      const currentTime = audioRef.current.currentTime;
      const index = findCurrentLyricIndex(currentTime);
      if (index !== currentLyricIndex) {
        setCurrentLyricIndex(index);
      }
    };

    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('timeupdate', handleTimeUpdate);
      return () => {
        if (audioElement) {
          audioElement.removeEventListener('timeupdate', handleTimeUpdate);
        }
      };
    }
  }, [currentSong?.lyrics, currentLyricIndex]);

  // 添加音频结束事件监听
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    
    const handleEnded = () => {
      setIsPlaying(false); // 通知父组件停止播放
    };

    audioElement.addEventListener('ended', handleEnded);
    return () => {
      if (audioElement) {
        audioElement.removeEventListener('ended', handleEnded);
      }
    };
  }, [setIsPlaying]);

  // 添加媒体会话支持
  useMediaSession({
    currentSong,
    isPlaying,
    audioRef,
    currentLyricIndex,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onPrevious: playPreviousSong,
    onNext: playNextSong
  });

  const renderPlayControls = () => (
    <div className="flex items-center justify-center gap-3 md:gap-6">
      {/* 上一首 */}
      <button
        onClick={playPreviousSong}
        disabled={!currentSong}
        className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center
                   bg-gradient-to-br from-gray-50 to-gray-100
                   hover:from-gray-100 hover:to-gray-200
                   active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 group"
      >
        <StepBackwardOutlined className="text-gray-600 text-lg md:text-xl 
                                       group-hover:text-gray-800 transition-colors" />
      </button>
      
      {/* 播放/暂停按钮 */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        disabled={!currentSong || isLoading}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center
                   bg-gradient-to-br from-blue-500 to-blue-600
                   hover:from-blue-600 hover:to-blue-700
                   active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 shadow-lg hover:shadow-xl
                   disabled:shadow-none relative overflow-hidden"
      >
        {isLoading ? (
          <div className="w-5 h-5 md:w-6 md:h-6 border-3 border-white/30 
                         border-t-white rounded-full animate-spin" />
        ) : (
          <div className="text-white text-2xl md:text-3xl transition-transform duration-200">
            {isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          </div>
        )}
      </button>
      
      {/* 下一首 */}
      <button
        onClick={playNextSong}
        disabled={!currentSong}
        className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center
                   bg-gradient-to-br from-gray-50 to-gray-100
                   hover:from-gray-100 hover:to-gray-200
                   active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 group"
      >
        <StepForwardOutlined className="text-gray-600 text-lg md:text-xl 
                                      group-hover:text-gray-800 transition-colors" />
      </button>
    </div>
  );

  // 收藏按钮样式也可以更新
  const FavoriteButton = ({ isFavorite, onClick }) => (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-full flex items-center justify-center
                  transition-all duration-200 group hover:scale-110
                  ${isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
    >
      {isFavorite ? (
        <StarFilled className="text-lg transition-transform group-hover:scale-110" />
      ) : (
        <StarOutlined className="text-lg transition-transform group-hover:scale-110" />
      )}
    </button>
  );

  // 默认封面图像 - 使用内联SVG data URL
  const DEFAULT_COVER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDBweCIgaGVpZ2h0PSIxMDBweCIgdmlld0JveD0iMCAwIDEwMCAxMDAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAiIHk9IjUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMzMzMiPk5PPEJSIi8+PHRleHQgeD0iNTAiIHk9IjcwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMzMzMiPkNvdmVyPC90ZXh0Pjwvc3ZnPg==';

  return (
    <motion.div 
      className="fixed left-0 right-0 bg-white/80 backdrop-blur-sm"
      variants={containerVariants}
      initial="collapsed"
      animate={expanded ? "expanded" : "collapsed"}
      transition={{ type: "spring", bounce: 0.1, duration: 0.6 }}
      style={{
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div 
            key="expanded"
            className="h-full flex flex-col p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button 
              type="text"
              icon={<DownOutlined />}
              onClick={() => setExpanded(false)}
              className="self-start mb-2"
            />
            
            <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden items-center justify-center" 
                 style={{ maxHeight: 'calc(100vh - 180px)' }}>
              {currentSong ? (
                <>
                  <div className="md:w-1/2 flex-none flex items-center justify-center p-4">
                    <div className="flex flex-col items-center">
                      <div 
                        className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden"
                        style={{
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                        }}
                      >
                        <motion.img 
                          src={currentSong?.cover || DEFAULT_COVER}
                          alt={currentSong?.name}
                          className="w-full h-full object-cover"
                          variants={coverVariants}
                          animate={isPlaying ? "playing" : "paused"}
                        />
                      </div>
                      
                      <div className="mt-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Text strong className="text-lg">{currentSong?.name}</Text>
                          <FavoriteButton 
                            isFavorite={isFavorite(currentSong)} 
                            onClick={() => toggleFavorite(currentSong)}
                          />
                        </div>
                        <Text type="secondary">{currentSong?.singer}</Text>
                      </div>
                    </div>
                  </div>

                  <div className="md:w-1/2 h-full overflow-hidden">
                    <LyricDisplay 
                      lyrics={currentSong?.lyrics || []}
                      currentLyricIndex={currentLyricIndex}
                      onLyricClick={handleLyricClick}
                      className="h-full"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500">
                  <CustomerServiceOutlined className="text-6xl mb-4 block" />
                  <p>还没有播放任何歌曲</p>
                  <p className="text-sm mt-2">搜索并选择一首歌曲开始播放</p>
                </div>
              )}
            </div>

            <div className="h-[120px] flex flex-col justify-end py-4">
              <div className="flex items-center gap-2 px-2">
                <Text className="w-[45px] text-right text-xs flex-shrink-0">{formatTime(currentTime)}</Text>
                <ProgressSlider 
                  value={currentTime}
                  max={duration || 100}
                  onChange={handleSliderChange}
                  disabled={!currentSong}
                />
                <Text className="w-[45px] text-xs flex-shrink-0">{formatTime(duration)}</Text>
              </div>
              
              {renderPlayControls()}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="collapsed"
            className="h-full flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* 主内容区域 */}
            <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto] 
                          items-center gap-3 md:gap-6 px-3 md:px-6 h-[60px]">
              {/* 左侧：展开按钮和封面 */}
              <div className="flex items-center gap-2 md:gap-3">
                <Button 
                  type="text"
                  icon={<UpOutlined />}
                  onClick={() => setExpanded(true)}
                  className="hover:scale-105 transition-transform"
                />
                
                <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shadow-sm">
                  <motion.img 
                    src={currentSong?.cover || DEFAULT_COVER}
                    alt={currentSong?.name}
                    className="w-full h-full object-cover"
                    variants={coverVariants}
                    animate={isPlaying ? "playing" : "paused"}
                  />
                </div>
              </div>

              {/* 中间：歌曲信息 */}
              <div className="min-w-0 flex flex-col justify-center px-2 md:px-4">
                <div className="flex items-center gap-2">
                  <Text className="text-sm md:text-base font-medium truncate">
                    {currentSong?.name || '未播放任何歌曲'}
                  </Text>
                  {currentSong && (
                    <FavoriteButton 
                      isFavorite={isFavorite(currentSong)} 
                      onClick={() => toggleFavorite(currentSong)}
                    />
                  )}
                </div>
                <Text className="text-xs md:text-sm text-gray-500 truncate">
                  {currentSong?.singer || '点击播放按钮开始'}
                </Text>
              </div>

              {/* 右侧：播放控制 */}
              <div className="flex-shrink-0">
                {renderPlayControls()}
              </div>
            </div>

            {/* 进度条 */}
            <div className="px-3 md:px-6 h-[20px] flex items-center gap-2">
              <span className="text-xs text-gray-400 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1">
                <ProgressSlider 
                  value={currentTime}
                  max={duration || 100}
                  onChange={handleSliderChange}
                  disabled={!currentSong}
                />
              </div>
              <span className="text-xs text-gray-400 w-10">
                {formatTime(duration)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio 
        ref={audioRef}
        src={currentSong?.url}
        crossOrigin="anonymous"
        preload="auto"
        className="hidden"
      />
    </motion.div>
  );
} 