'use client';

import { useState, useEffect, useRef } from 'react';
import { Progress } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusic } from '@/contexts/MusicContext';

export default function RequestStatusMonitor() {
  const [activeRequests, setActiveRequests] = useState(0);
  const [stats, setStats] = useState({
    success: 0,
    error: 0,
    total: 0,
    pending: 0,
    canceled: 0,
    timeouts: 0,
    networkErrors: 0
  });
  const [messageIndex, setMessageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const autoScrollInterval = useRef(null);
  const typingTimeout = useRef(null);
  const { currentSong, isPlaying, audioRef } = useMusic();
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);

  // 监听网络请求
  useEffect(() => {
    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest.prototype.open;
    const originalWebSocket = window.WebSocket;
    let activeXHRs = new Set();
    let activeWebSockets = new Set();
    let requestTimeouts = new Map();

    // 拦截 fetch
    window.fetch = async (...args) => {
      const requestId = Math.random().toString(36);
      setStats(prev => ({
        ...prev, 
        total: prev.total + 1,
        pending: prev.pending + 1
      }));

      // 设置超时检测
      requestTimeouts.set(requestId, setTimeout(() => {
        setStats(prev => ({...prev, timeouts: prev.timeouts + 1}));
        requestTimeouts.delete(requestId);
      }, 30000));

      try {
        const response = await originalFetch(...args);
        clearTimeout(requestTimeouts.get(requestId));
        requestTimeouts.delete(requestId);
        
        if (response.ok) {
          setStats(prev => ({
            ...prev, 
            success: prev.success + 1,
            pending: prev.pending - 1
          }));
        } else {
          setStats(prev => ({
            ...prev, 
            error: prev.error + 1,
            pending: prev.pending - 1
          }));
        }
        return response;
      } catch (error) {
        clearTimeout(requestTimeouts.get(requestId));
        requestTimeouts.delete(requestId);
        
        setStats(prev => ({
          ...prev, 
          error: prev.error + 1,
          pending: prev.pending - 1,
          networkErrors: prev.networkErrors + 1
        }));
        throw error;
      }
    };

    // 拦截 XMLHttpRequest
    window.XMLHttpRequest.prototype.open = function(...args) {
      const xhr = this;
      activeXHRs.add(xhr);
      setStats(prev => ({
        ...prev, 
        total: prev.total + 1,
        pending: prev.pending + 1
      }));

      xhr.addEventListener('load', () => {
        activeXHRs.delete(xhr);
        if (xhr.status >= 200 && xhr.status < 300) {
          setStats(prev => ({
            ...prev, 
            success: prev.success + 1,
            pending: prev.pending - 1
          }));
        } else {
          setStats(prev => ({
            ...prev, 
            error: prev.error + 1,
            pending: prev.pending - 1
          }));
        }
      });

      xhr.addEventListener('error', () => {
        activeXHRs.delete(xhr);
        setStats(prev => ({
          ...prev, 
          error: prev.error + 1,
          pending: prev.pending - 1,
          networkErrors: prev.networkErrors + 1
        }));
      });

      xhr.addEventListener('abort', () => {
        activeXHRs.delete(xhr);
        setStats(prev => ({
          ...prev, 
          canceled: prev.canceled + 1,
          pending: prev.pending - 1
        }));
      });

      return originalXHR.apply(this, args);
    };

    // 拦截 WebSocket
    window.WebSocket = function(...args) {
      const ws = new originalWebSocket(...args);
      activeWebSockets.add(ws);

      ws.addEventListener('open', () => {
        setStats(prev => ({...prev, success: prev.success + 1}));
      });

      ws.addEventListener('error', () => {
        setStats(prev => ({
          ...prev, 
          error: prev.error + 1,
          networkErrors: prev.networkErrors + 1
        }));
      });

      ws.addEventListener('close', () => {
        activeWebSockets.delete(ws);
      });

      return ws;
    };

    // 监听网络状态变化
    window.addEventListener('online', () => {
      setStats(prev => ({...prev, networkErrors: prev.networkErrors - 1}));
    });

    window.addEventListener('offline', () => {
      setStats(prev => ({...prev, networkErrors: prev.networkErrors + 1}));
    });

    // 清理函数
    return () => {
      window.fetch = originalFetch;
      window.XMLHttpRequest.prototype.open = originalXHR;
      window.WebSocket = originalWebSocket;
      activeXHRs.clear();
      activeWebSockets.clear();
      requestTimeouts.forEach(timeout => clearTimeout(timeout));
      requestTimeouts.clear();
    };
  }, []);

  // 计算完成进度
  const completedPercent = Math.min(
    Math.round(((stats.success + stats.error) / Math.max(stats.total, 1)) * 100),
    100
  ) || 0;

  // 添加歌词监听
  useEffect(() => {
    if (!currentSong?.lyrics?.length || !isPlaying) {
      setCurrentLyricIndex(-1);
      return;
    }

    const findCurrentLyricIndex = (time) => {
      for (let i = currentSong.lyrics.length - 1; i >= 0; i--) {
        let lyricTime = 0;
        // 处理不同的时间格式
        if (typeof currentSong.lyrics[i].time === 'string') {
          if (currentSong.lyrics[i].time.includes(':')) {
            // 旧格式 mm:ss 或 mm:ss.SSS
            lyricTime = currentSong.lyrics[i].time.split(':').reduce((acc, val) => acc * 60 + parseFloat(val), 0);
          } else {
            // 新格式 秒数（字符串形式的数字）
            lyricTime = parseFloat(currentSong.lyrics[i].time);
          }
        } else if (typeof currentSong.lyrics[i].time === 'number') {
          // 数字格式的秒数
          lyricTime = currentSong.lyrics[i].time;
        }
        
        if (time >= lyricTime - 1) return i;
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

    audioRef.current?.addEventListener('timeupdate', handleTimeUpdate);
    return () => audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
  }, [currentSong?.lyrics, isPlaying, audioRef, currentLyricIndex]);

  // 修改获取消息数组的函数
  const getMessageArray = () => {
    // 如果有歌词且正在播放，优先显示当前歌词
    if (currentSong?.lyrics?.length && isPlaying && currentLyricIndex !== -1) {
      const currentLyric = currentSong.lyrics[currentLyricIndex];
      if (currentLyric?.name) {
        return [currentLyric.name];
      }
    }

    if (stats.total === 0) return ['等待用户指令...'];
    
    if (activeRequests === 0 && completedPercent === 100) {
      if (stats.error > 0) {
        return [
          '警告: 系统核心受损...',
          '量子数据流中断...',
          '检测到未知干扰源...',
          '主神经网络受阻...',
          '建议执行紧急重启协议...'
        ];
      }
      return [
        '量子计算矩阵重组完毕...',
        '神经网络同步率100%...',
        '音频波形校准完成...',
        '数据流压缩解密成功...',
        '全息音乐投影系统已激活...'
      ];
    }

    if (stats.networkErrors > 0) {
      return [
        '警告: 量子通讯链路断开...',
        '尝试重建神经元连接...',
        '空间信号不稳定...',
        '等待量子纠缠恢复...'
      ];
    }

    if (stats.timeouts > 0) {
      return [
        '时空同步失败...',
        '量子处理器响应延迟...',
        '等待跨维度信号...',
        '时间通道阻塞...'
      ];
    }

    if (stats.canceled > 0) {
      return [
        '用户终止量子运算...',
        '神经网络任务中止...',
        '正在清理量子态...',
        '数据流正在收束...'
      ];
    }

    if (stats.pending > 2) {
      return [
        '并行宇宙计算进行中...',
        '多维度任务执行中...',
        '量子叠加态处理中...',
        '跨时空数据整合中...'
      ];
    }

    return [
      '最终量子态坍缩中...',
      '神经网络优化完成...',
      '维度数据分析结束...',
      '全息音频准备就绪...'
    ];
  };

  // 点击切换消息
  const handleClick = () => {
    const messages = getMessageArray();
    setMessageIndex((prev) => (prev + 1) % messages.length);
  };

  // 获取当前消息
  const getMessage = () => {
    const messages = getMessageArray();
    return messages[messageIndex % messages.length];
  };

  // 获取状态颜色
  const getStatusColor = () => {
    if (activeRequests === 0 && stats.error > 0) return '#ff4d4f';
    if (activeRequests === 0 && completedPercent === 100) return '#52c41a';
    return '#1677ff';
  };

  // 打字机效果
  useEffect(() => {
    const message = getMessage();
    if (!message || message === displayedText) return;

    setIsTyping(true);
    let index = 0;
    let mounted = true;

    const typeText = () => {
      if (!mounted) return;
      
      // 如果是歌词，使用更快的打字速度
      const typingSpeed = currentSong?.lyrics?.length && isPlaying ? 0 : 50;
      
      if (index <= message.length) {
        setDisplayedText(message.slice(0, index));
        index++;
        typingTimeout.current = setTimeout(typeText, typingSpeed);
      } else {
        setIsTyping(false);
      }
    };

    typeText();

    return () => {
      mounted = false;
      clearTimeout(typingTimeout.current);
    };
  }, [getMessage()]);

  // 自动滚动消息
  useEffect(() => {
    if (!isTyping) {
      autoScrollInterval.current = setInterval(() => {
        handleClick();
      }, 5000);
    }

    return () => clearInterval(autoScrollInterval.current);
  }, [isTyping]);

  return (
    <motion.div 
      className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm cursor-pointer select-none"
      layout="position"
      initial={false}
      animate={{
        width: currentSong?.lyrics?.length && isPlaying 
          ? '100%' 
          : 'min(250px, 80vw)'
      }}
      transition={{
        layout: {
          type: "spring",
          bounce: 0.2,
          duration: 0.6,
          ease: "easeInOut"
        },
        width: {
          type: "spring",
          bounce: 0.2,
          duration: 0.6,
          ease: "easeInOut"
        }
      }}
      style={{
        maxWidth: currentSong?.lyrics?.length && isPlaying ? '100%' : '250px',
        willChange: 'width'
      }}
      whileHover={{ 
        scale: currentSong?.lyrics?.length && isPlaying ? 1 : 1.02,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}
      whileTap={{ scale: currentSong?.lyrics?.length && isPlaying ? 1 : 0.98 }}
      onClick={handleClick}
      onHoverStart={() => {
        setIsHovered(true);
        clearInterval(autoScrollInterval.current);
      }}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div
        animate={activeRequests > 0 ? { rotate: 360 } : { rotate: 0 }}
        transition={activeRequests > 0 ? { 
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        } : { duration: 0.3 }}
      >
        <Progress 
          type="circle"
          percent={completedPercent}
          size={24}
          strokeWidth={6}
          status={activeRequests > 0 ? "active" : "normal"}
          strokeColor={{
            '0%': getStatusColor(),
            '100%': getStatusColor(),
          }}
          showInfo={false}
        />
      </motion.div>

      <div className="flex flex-col overflow-hidden flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={getMessage()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-gray-600"
          >
            {displayedText}
            {isTyping && (
              <motion.span
                animate={{ opacity: [0, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                |
              </motion.span>
            )}
          </motion.div>
        </AnimatePresence>

        <motion.span 
          className="text-xs text-gray-400"
          animate={{ opacity: isHovered ? 0.8 : 0.6 }}
        >
          {currentSong?.lyrics?.length && isPlaying ? 
            `正在播放: ${currentSong.name} - ${currentSong.singer}` :
            (stats.total > 0 ? 
              `任务进度 ${completedPercent}%` : 
              '任务系统已就绪'
            )
          }
        </motion.span>
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-1/2 -bottom-8 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap bg-white/90 px-2 py-1 rounded-md shadow-sm"
          >
            点击切换状态消息
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 