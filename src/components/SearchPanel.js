'use client';

import { Input, Button, List, Dropdown, Tag } from 'antd';
import { SearchOutlined, PlayCircleOutlined, CustomerServiceOutlined, FieldTimeOutlined, FileOutlined, DashboardOutlined } from '@ant-design/icons';
import { useMusic } from '@/contexts/MusicContext';

const QUALITY_OPTIONS = [
  { value: 5, label: '标准音质' },
  { value: 9, label: 'HQ高音质' },
  { value: 11, label: 'SQ无损音质' },
  { value: 13, label: '臻品全景声' },
  { value: 14, label: '臻品母带2.0' }
];

// 添加平台特性标签
const PlatformFeatureTag = ({ platform }) => {
  if (platform === 'qq') {
    return (
      <Tag color="blue" className="ml-2 whitespace-nowrap">
        Spotify <span className="text-xs opacity-75">可选音质</span>
      </Tag>
    );
  }
  return (
    <Tag color="green" className="ml-2 whitespace-nowrap">
      iTunes <span className="text-xs opacity-75">含歌词</span>
    </Tag>
  );
};

// 付费标签组件
const PaymentTag = ({ payType }) => {
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

// 添加音质选择菜单项组件
const QualityMenuItem = ({ quality, label, selectedQuality, onClick }) => (
  <div
    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${selectedQuality === quality ? 'text-blue-600' : ''}`}
    onClick={() => onClick(quality)}
  >
    {label}
  </div>
);

export default function SearchPanel({ showSearchInput = true }) {
  const { 
    searchTerm, 
    setSearchTerm,
    songs,
    setSongs,
    currentSong,
    setCurrentSong,
    setIsPlaying,
    selectedQuality,
    setSelectedQuality,
    onSearch,
    onPlaySong,
    isSearching,
    isLoading,
  } = useMusic();

  // 把 renderQualityMenu 移到组件内部
  const renderQualityMenu = (song) => ({
    items: QUALITY_OPTIONS.map(opt => ({
      key: opt.value,
      label: (
        <QualityMenuItem
          quality={opt.value}
          label={opt.label}
          selectedQuality={selectedQuality}
          onClick={(quality) => {
            setSelectedQuality(quality);
          }}
        />
      ),
    })),
  });

  return (
    <div className="h-full flex flex-col">
      {showSearchInput && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Input.Search
            placeholder="搜索歌曲"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={onSearch}
            enterButton
            loading={isSearching}
            className="flex-grow"
          />
        </div>
      )}

      <List
        loading={isSearching}
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
        itemLayout="horizontal"
        dataSource={songs}
        renderItem={(song, index) => (
          <List.Item 
            className="hover:bg-gray-50/50 rounded-lg transition-colors duration-200 flex-col items-start"
          >
            {/* 上部分：歌曲信息和来源 */}
            <div className="w-full flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                {/* 歌曲名称可换行显示 */}
                <div className="text-base mb-1 break-words pr-4">
                  {song.name}
                </div>
                <div className="text-sm text-gray-500">
                  {song.singer}
                </div>
                {/* 显示 QQ 音乐的详细信息 */}
                {song.platform === 'qq' && song.details && (
                  <div className="mt-2 text-xs space-y-2">
                    {/* 付费标签和发行信息 - 强制在一行显示 */}
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <PaymentTag payType={song.details.pay} />
                      <span className="text-gray-400">
                       发行时间：{song.details.time}
                      </span>
                    </div>

                    {/* 音质和大小信息 */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <CustomerServiceOutlined />
                        <span>{song.details.quality}</span>
                      </div>
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <DashboardOutlined />
                        <span>{song.details.kbps}</span>
                      </div>
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <FileOutlined />
                        <span>{song.details.size}</span>
                      </div>
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <FieldTimeOutlined />
                        <span>{song.details.interval}</span>
                      </div>
                      {song.details.bpm && (
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <DashboardOutlined rotate={90} />
                          <span>BPM: {song.details.bpm}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 使用新的平台特性标签组件 */}
              <PlatformFeatureTag platform={song.platform} />
            </div>

            {/* 下部分：音质选择和播放按钮 */}
            <div className="w-full flex justify-end items-center gap-2 mt-1">
              {/* 音质选择在左 */}
              {song.platform === 'qq' && (
                <Dropdown
                  menu={renderQualityMenu(song)}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button 
                    size="small"
                    type="text"
                    className="text-gray-600 hover:text-blue-600"
                  >
                    {QUALITY_OPTIONS.find(opt => opt.value === selectedQuality)?.label}
                  </Button>
                </Dropdown>
              )}

              {/* 播放按钮在右 */}
              <Button 
                type="text" 
                icon={<PlayCircleOutlined />} 
                onClick={() => onPlaySong(song, song.searchIndex, selectedQuality, false, true)}
                loading={isLoading && currentSong?.name === song.name}
              >
                播放
              </Button>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
} 