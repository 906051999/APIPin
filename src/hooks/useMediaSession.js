'use client';

import { useEffect } from 'react';

export function useMediaSession({ 
  currentSong, 
  isPlaying,
  audioRef,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  currentLyricIndex
}) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const audioElement = audioRef.current;
    if (!audioElement) return;

    // 更新媒体会话元数据
    if (currentSong) {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.name,
          artist: currentSong.singer,
          album: currentSong.album || 'Unknown Album',
          artwork: [
            {
              src: currentSong.cover || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDBweCIgaGVpZ2h0PSIxMDBweCIgdmlld0JveD0iMCAwIDEwMCAxMDAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAiIHk9IjUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMzMzMiPk5PPEJSIi8+PHRleHQgeD0iNTAiIHk9IjcwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMzMzMiPkNvdmVyPC90ZXh0Pjwvc3ZnPg==',
              sizes: '100x100',
              type: 'image/svg+xml'
            }
          ]
        });
      }

      // 更新播放状态
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // 添加进度更新处理程序
      const updatePositionState = () => {
        if (audioElement.duration) {
          navigator.mediaSession.setPositionState({
            duration: audioElement.duration,
            position: audioElement.currentTime,
            playbackRate: audioElement.playbackRate,
          });
        }
      };

      // 监听时间更新事件
      audioElement.addEventListener('timeupdate', updatePositionState);
      audioElement.addEventListener('durationchange', updatePositionState);

      // 设置媒体会话动作处理程序
      navigator.mediaSession.setActionHandler('play', onPlay);
      navigator.mediaSession.setActionHandler('pause', onPause);
      navigator.mediaSession.setActionHandler('previoustrack', onPrevious);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);

      // 添加进度跳转支持
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in audioElement) {
          audioElement.fastSeek(details.seekTime);
          return;
        }
        audioElement.currentTime = details.seekTime;
        updatePositionState();
      });

      // 添加快进快退支持
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        audioElement.currentTime = Math.max(audioElement.currentTime - skipTime, 0);
        updatePositionState();
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        audioElement.currentTime = Math.min(audioElement.currentTime + skipTime, audioElement.duration);
        updatePositionState();
      });

      // 如果有歌词，更新当前播放状态的描述
      if (currentSong.lyrics?.length && currentLyricIndex >= 0) {
        const currentLyric = currentSong.lyrics[currentLyricIndex]?.text || '';
        // 使用歌词作为播放状态描述
        navigator.mediaSession.metadata.description = currentLyric;
      }

      // 清理函数
      return () => {
        audioElement.removeEventListener('timeupdate', updatePositionState);
        audioElement.removeEventListener('durationchange', updatePositionState);
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      };
    }
  }, [currentSong, isPlaying, currentLyricIndex, audioRef, onPlay, onPause, onPrevious, onNext]);
}