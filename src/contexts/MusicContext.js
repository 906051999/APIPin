'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useFavoriteSync } from '@/hooks/useFavoriteSync';
import { usePlayQueue } from '@/hooks/usePlayQueue';

const MusicContext = createContext(null);

const CURRENT_SONG_KEY = 'currentPlayingSong';

// 创建一个message实例，避免使用全局的message函数
let messageInstance = null;

export function setMessageInstance(instance) {
  messageInstance = instance;
}

export function MusicProvider({ children }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [view, setView] = useState('search');
  const [selectedQuality, setSelectedQuality] = useState(5); // 默认标准音质
  const [playHistory, setPlayHistory] = useLocalStorage('playHistory', []);
  const { favorites, isFavorite, toggleFavorite } = useFavoriteSync();
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { queue: playQueue, isInQueue, toggleQueue, clearQueue, getNextSong, getPreviousSong } = usePlayQueue();
  const audioRef = useRef(null);
  const messageShownRef = useRef(false);
  const abortControllerRef = useRef(null);

  // 初始化时从 localStorage 读取上次播放的歌曲
  useEffect(() => {
    // 如果消息已经显示过，直接返回
    if (messageShownRef.current) return;
    
    try {
      const savedSong = localStorage.getItem(CURRENT_SONG_KEY);
      if (savedSong) {
        const parsedSong = JSON.parse(savedSong);
        setCurrentSong(parsedSong);
        // 使用 ref 来确保消息只显示一次
        if (!messageShownRef.current) {
          message.info(`上次播放: ${parsedSong.name} - ${parsedSong.singer}`, 3);
          messageShownRef.current = true;
        }
      }
    } catch (error) {
      console.error('Failed to load last playing song:', error);
    }
  }, []); // 只在组件挂载时执行一次

  // 当 currentSong 改变时保存到 localStorage
  useEffect(() => {
    if (!currentSong) return;
    
    try {
      localStorage.setItem(CURRENT_SONG_KEY, JSON.stringify(currentSong));
    } catch (error) {
      console.error('Failed to save current song:', error);
    }
  }, [currentSong]);

  // 添加 URL 格式化函数
  const formatRequestUrl = (song, searchTerm = '', index = 0) => {
    // 如果没有 requestUrl，根据平台构建
    if (!song.requestUrl) {
      const term = encodeURIComponent(searchTerm || `${song.name} ${song.singer}`);
      // 使用新的API管理器格式
      return `/api/manager?action=detail&platform=gdstudio&term=${term}`;
    }

    // 处理旧格式 URL
    if (isOldRequestUrl(song.requestUrl)) {
      const url = new URL(song.requestUrl, 'http://example.com');
      const term = url.searchParams.get('term') || `${song.name} ${song.singer}`;
      const platform = url.searchParams.get('platform') || 'gdstudio';
      return `/api/manager?action=detail&platform=${platform}&term=${encodeURIComponent(term)}`;
    }

    // 已经是新格式，直接返回
    return song.requestUrl;
  };

  // 修改 addToHistory 函数
  const addToHistory = (song) => {
    setPlayHistory(prev => {
      const filtered = prev.filter(s => 
        !(s.name === song.name && s.singer === song.singer && s.platform === song.platform)
      );
      
      const updatedSong = {
        ...song,
        requestUrl: formatRequestUrl(song, searchTerm, song.searchIndex)
      };
      
      return [updatedSong, ...filtered].slice(0, 50);
    });
  };

  // 从播放历史中删除
  const removeFromHistory = (song) => {
    setPlayHistory(prev => 
      prev.filter(s => 
        !(s.name === song.name && s.singer === song.singer && s.platform === song.platform)
      )
    );
  };

  // 搜索功能
  const onSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      // 使用新的API管理器进行搜索
      const response = await fetch(`/api/manager?action=search&platform=gdstudio&term=${encodeURIComponent(searchTerm)}`);
      const result = await response.json();

      if (result.success) {
        const formattedSongs = result.data.map((song, index) => ({
          ...song,
          platform: 'gdstudio',
          name: song.title || song.name,
          singer: song.artist || song.singer,
          coverId: song.coverId, // 确保保留coverId字段
          lyricId: song.lyricId, // 确保保留lyricId字段
          searchIndex: index,
          requestUrl: `/api/manager?action=detail&platform=gdstudio&term=${song.id}`
        }));

        setSongs(formattedSongs);
      } else {
        throw new Error(result.error || '搜索失败');
      }
    } catch (error) {
      message.error('搜索失败');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  // 修改 onPlaySong 函数
  const onPlaySong = async (song, index, quality, isRetry = false, fromSearch = false) => {
    if (isLoading && !isRetry) return;

    // 如果有 URL 且不是重试，直接播放
    if (song.url && !isRetry) {
      setCurrentSong(song);
      setIsPlaying(true);
      return;
    }

    const currentController = new AbortController();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = currentController;

    setIsLoading(true);
    try {
      // 格式化 requestUrl
      const requestUrl = formatRequestUrl(song, searchTerm, index);

      const timeoutId = setTimeout(() => {
        currentController.abort();
      }, 10000);

      const response = await fetch(requestUrl, {
        signal: currentController.signal
      });
      
      clearTimeout(timeoutId);
      
      const result = await response.json();
      console.log('Song detail result:', result); // 添加调试日志

      if (result.success) {
        const data = result.data;
        const updatedSong = {
          ...song,
          id: data.id || song.id,
          url: data.url,
          cover: data.cover || song.cover,
          lyrics: data.lyric || data.lyrics || [],
          searchTerm: song.searchTerm || searchTerm,
          searchIndex: song.searchIndex || index,
          details: data,
          requestUrl: requestUrl,
          quality: quality,
          // 确保保留歌曲对象中的coverId和lyricId
          coverId: data.coverId || song.coverId,
          lyricId: data.lyricId || song.lyricId
        };

        console.log('Song data before fetching additional resources:', updatedSong); // 添加调试日志
        console.log('Cover ID:', updatedSong.coverId, 'Lyric ID:', updatedSong.lyricId); // 添加调试日志

        // 直接获取专辑图片和歌词，确保总是获取到这些资源
        try {
          // 获取专辑图片
          if (updatedSong.coverId) {
            const picUrl = `/api/manager?action=detail&platform=${song.platform}&term=${updatedSong.coverId}&type=pic`;
            console.log('Fetching picture from:', picUrl); // 添加日志以便调试
            const picResponse = await fetch(picUrl);
            const picResult = await picResponse.json();
            console.log('Picture result:', picResult); // 添加日志以便调试
            if (picResult.success && picResult.data && picResult.data.url) {
              updatedSong.cover = picResult.data.url;
              console.log('Updated cover:', updatedSong.cover); // 添加调试日志
            }
          }

          // 获取歌词
          if (updatedSong.lyricId) {
            const lyricUrl = `/api/manager?action=detail&platform=${song.platform}&term=${updatedSong.lyricId}&type=lyric`;
            console.log('Fetching lyrics from:', lyricUrl); // 添加日志以便调试
            const lyricResponse = await fetch(lyricUrl);
            const lyricResult = await lyricResponse.json();
            console.log('Lyrics result:', lyricResult); // 添加日志以便调试
            if (lyricResult.success && lyricResult.data) {
              // 歌词可能在lyric或tlyric字段中
              const lyricContent = lyricResult.data.lyric || lyricResult.data.tlyric || '';
              console.log('Lyric content:', lyricContent); // 添加调试日志
              // 确保歌词数据格式正确
              if (typeof lyricContent === 'string' && lyricContent) {
                // 解析LRC歌词格式
                updatedSong.lyrics = parseLyric(lyricContent);
              } else {
                updatedSong.lyrics = lyricContent;
              }
              console.log('Updated lyrics:', updatedSong.lyrics); // 添加调试日志
            }
          }
        } catch (error) {
          console.error('Failed to fetch additional resources:', error);
        }

        if (!updatedSong.url || !isValidUrl(updatedSong.url)) {
          throw new Error('无效的音频 URL');
        }

        updateSongData(updatedSong);
        setCurrentSong(updatedSong);
        setIsPlaying(isRetry ? isPlaying : true);
        addToHistory(updatedSong);
      } else {
        throw new Error(result.error || '获取歌曲详情失败');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        message.error('请求超时，播放失败');
      } else if (error.name === 'SecurityError' || error.message.includes('CORS')) {
        message.error('音频加载失败，请尝试其他歌曲');
      } else {
        message.error(error.message || '播放失败，请尝试其他歌曲');
      }
      setIsPlaying(false);
    } finally {
      if (currentController.signal.aborted) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  // 更新所有相关列表中的歌曲数据
  const updateSongData = (updatedSong) => {
    // 更新播放历史 - 使用完全匹配
    setPlayHistory(prev => prev.map(song => 
      isSameSong(song, updatedSong) && song.requestUrl === updatedSong.requestUrl 
        ? { ...updatedSong } 
        : song
    ));

    // 更新播放队列 - 使用完全匹配
    if (playQueue.some(song => isSameSong(song, updatedSong) && song.requestUrl === updatedSong.requestUrl)) {
      toggleQueue(updatedSong);
      toggleQueue(updatedSong);
    }

    // 搜索结果不需要更新
    // 删除 setSongs 的更新
  };

  // 修改判断是否为同一首歌的逻辑
  const isSameSong = (song1, song2) => {
    return song1.name === song2.name && 
           song1.singer === song2.singer && 
           song1.platform === song2.platform &&
           (!song1.requestUrl || !song2.requestUrl || song1.requestUrl === song2.requestUrl);
  };

  // 修改音质选择处理函数
  const handleQualityChange = (quality) => {
    setSelectedQuality(quality);
  };

  // 监听歌曲播放结束,自动播放下一首
  useEffect(() => {
    if (!isPlaying && currentSong && !isLoading && audioRef.current?.ended) {
      const nextSong = getNextSong(currentSong);
      if (nextSong) {
        if (nextSong.url) {
          setCurrentSong(nextSong);
          setIsPlaying(true);
        } else {
          onPlaySong(nextSong, nextSong.searchIndex, selectedQuality);
        }
      }
    }
  }, [isPlaying, currentSong, isLoading]);

  const playPreviousSong = () => {
    if (!currentSong) return;
    const previousSong = getPreviousSong(currentSong);
    if (previousSong) {
      if (previousSong.url) {
        setCurrentSong(previousSong);
        setIsPlaying(true);
      } else {
        onPlaySong(previousSong, previousSong.searchIndex, selectedQuality);
      }
    }
  };

  const playNextSong = () => {
    if (!currentSong) return;
    const nextSong = getNextSong(currentSong);
    if (nextSong) {
      if (nextSong.url) {
        setCurrentSong(nextSong);
        setIsPlaying(true);
      } else {
        onPlaySong(nextSong, nextSong.searchIndex, selectedQuality);
      }
    }
  };

  const value = {
    searchTerm,
    setSearchTerm,
    songs,
    setSongs,
    currentSong,
    setCurrentSong,
    isPlaying,
    setIsPlaying,
    view,
    setView,
    selectedQuality,
    setSelectedQuality: handleQualityChange,
    onSearch,
    onPlaySong,
    playHistory,
    favorites,
    isFavorite,
    removeFromHistory,
    toggleFavorite,
    isSearching,
    isLoading,
    playQueue,
    isInQueue,
    toggleQueue,
    clearQueue,
    playPreviousSong,
    playNextSong,
    audioRef,
    addToHistory,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}; 

// 添加LRC歌词解析函数
function parseLyric(lrc) {
  const lyrics = [];
  const lines = lrc.split('\n');
  
  for (const line of lines) {
    // 匹配时间标签 [mm:ss.xx] 或 [mm:ss]
    const timeMatch = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/);
    if (timeMatch) {
      const minute = parseInt(timeMatch[1]);
      const second = parseInt(timeMatch[2]);
      const millisecond = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
      const time = minute * 60 + second + millisecond / 1000;
      
      // 提取歌词文本（去除时间标签）
      const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
      
      // 只添加非空歌词行
      if (text) {
        lyrics.push({
          time: time.toFixed(3),
          name: text
        });
      }
    }
  }
  
  return lyrics;
}

// 添加 URL 验证辅助函数
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// 在 MusicProvider 中添加辅助函数
const isOldRequestUrl = (url) => {
  // 更新检查旧URL的逻辑，检查是否包含旧的API路径
  return url?.includes('/api/sby') || url?.includes('wydg') || url?.includes('qqdg');
};