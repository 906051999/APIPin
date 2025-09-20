'use client';

import { useMusic } from '@/contexts/MusicContext';
import { List, Button, Empty, Tabs, Tag, message } from 'antd';
import { 
  PlayCircleOutlined, 
  DeleteOutlined, 
  StarOutlined, 
  StarFilled, 
  PlusSquareOutlined 
} from '@ant-design/icons';
import { useEffect, useState } from 'react';

// 平台标签组件
export const PlatformTag = ({ platform }) => {
  if (platform === 'gdstudio') {
    return (
      <Tag color="blue" className="whitespace-nowrap">GD音乐台(music.gdstudio.xyz)</Tag>
    );
  }
  // 其他平台默认显示平台名称
  return (
    <Tag color="default" className="whitespace-nowrap">{platform}</Tag>
  );
};

// 付费标签组件
const PaymentTag = ({ payType }) => {
  if (!payType) return null;
  
  const getPaymentStyle = (type) => {
    switch (type) {
      case '付费':
        return { color: '#ff4d4f', borderColor: '#ff4d4f' };
      case '免费':
        return { color: '#52c41a', borderColor: '#52c41a' };
      default:
        return { color: '#faad14', borderColor: '#faad14' };
    }
  };

  return (
    <Tag 
      className="rounded-full text-xs border px-2 py-0.5"
      style={getPaymentStyle(payType)}
      bordered
    >
      {payType}
    </Tag>
  );
};

// 添加评语组件
const CommentTag = ({ comment }) => {
  if (!comment) return null;
  return (
    <div className="mt-2 relative group">
      {/* 主容器 */}
      <div className="p-3 bg-gradient-to-br from-slate-50/95 to-white/90 rounded-lg border border-slate-200/50 
                    shadow-sm transition-all duration-300 relative overflow-hidden
                    hover:shadow-[0_0_15px_rgba(0,0,0,0.1)]">
        {/* 水墨效果装饰 */}
        <div className="absolute -right-4 -top-4 w-8 h-8 bg-black/5 rounded-full blur-lg transform rotate-45" />
        <div className="absolute -left-4 -bottom-4 w-8 h-8 bg-black/5 rounded-full blur-lg" />
        
        <div className="relative">
          {/* 头部 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-800 tracking-wider">RKPIN | 推荐</span>
          </div>
          
          {/* 内容区 */}
          <div className="relative pl-2">
            <div className="text-xs text-slate-600 leading-relaxed">
              {comment}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QueueButton = ({ song, isInQueue, toggleQueue }) => {
  const [isActive, setIsActive] = useState(isInQueue(song));

  const handleClick = () => {
    const newState = !isActive;
    setIsActive(newState); // 立即更新视觉状态
    toggleQueue(song);
    // 添加 toast 提示
    message.success(newState ? '已添加到播放清单' : '已从播放清单移除', 0.5);
  };

  // 强制在状态变化时更新
  useEffect(() => {
    const newState = isInQueue(song);
    if (isActive !== newState) {
      setIsActive(newState);
    }
  }, [isInQueue, song, isActive]);

  return (
    <Button
      key="queue"
      type="text"
      size="small"
      icon={<PlusSquareOutlined />}
      onClick={handleClick}
      className={`flex items-center !px-2 ${isActive ? 'text-blue-500' : ''}`}
    />
  );
};

export default function PlayList() {
  const { 
    playHistory,
    favorites,
    removeFromHistory,
    toggleFavorite,
    isFavorite,
    onPlaySong,
    setCurrentSong,
    setIsPlaying,
    isInQueue,
    toggleQueue,
    addToHistory,
  } = useMusic();

  const [playlists, setPlaylists] = useState({});

  // 加载歌单数据
  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const response = await fetch('/api/playlists');
        const data = await response.json();
        setPlaylists(data);
      } catch (error) {
        console.error('Failed to load playlists:', error);
      }
    };
    loadPlaylists();
  }, []);

  // 直接播放已有URL的歌曲
  const handlePlay = (song) => {
    if (song.url) {
      // 如果有 url，直接播放，同时添加到历史
      setCurrentSong(song);
      setIsPlaying(true);
      addToHistory(song);
    } else {
      // 没有 url 才需要请求
      onPlaySong(song, song.searchIndex, song.quality);
    }
  };

  const renderSongList = (songs, isHistory = false) => {
    if (!songs.length) {
      return (
        <Empty 
          description={isHistory ? "暂无播放记录" : "暂无收藏歌曲"} 
          className="mt-8"
        />
      );
    }

    return (
      <List
        className="overflow-y-auto custom-scrollbar"
        style={{ 
          // 调整最大高度，减去底部播放器(72px)、搜索栏区域(约100px)和安全区域
          maxHeight: 'calc(100vh - 280px)' 
        }}
        itemLayout="horizontal"
        dataSource={songs}
        renderItem={(song, index) => (
          <List.Item
            className="hover:bg-gray-50/50 rounded-lg transition-colors duration-200"
            actions={[
              <Button 
                key="play"
                type="text"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handlePlay(song)}
                className="flex items-center !px-2"
              />,
              <Button
                key="favorite"
                type="text"
                size="small"
                icon={isFavorite(song) ? <StarFilled /> : <StarOutlined />}
                onClick={() => toggleFavorite(song)}
                className="flex items-center !px-2"
              />,
              isHistory && (
                <Button
                  key="delete"
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeFromHistory(song)}
                  className="flex items-center !px-2"
                />
              ),
              <QueueButton 
                key="queue"
                song={song}
                isInQueue={isInQueue}
                toggleQueue={toggleQueue}
              />
            ].filter(Boolean)}
          >
            <List.Item.Meta
              title={
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{song.name}</span>
                  <PlatformTag platform={song.platform} />
                  {song.details && <PaymentTag payType={song.details.pay} />}
                </div>
              }
              description={
                <div className="space-y-1">
                  <div className="text-xs">{song.singer}</div>
                  <CommentTag comment={song.comment} />
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  return (
    <Tabs
      defaultActiveKey="history"
      items={[
        {
          key: 'history',
          label: '播放历史',
          children: renderSongList(playHistory, true)
        },
        {
          key: 'favorites',
          label: '收藏列表',
          children: renderSongList(favorites)
        }
      ].concat(
        // 把歌单添加到右侧
        Object.entries(playlists).map(([name, songs]) => ({
          key: name,
          label: name,
          children: renderSongList(songs)
        }))
      )}
    />
  );
} 