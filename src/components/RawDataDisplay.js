'use client';

import { Card, Typography, Collapse } from 'antd';
import { useState } from 'react';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

export default function RawDataDisplay({ rawData, platform }) {
  const [activeKey, setActiveKey] = useState(['1']);

  if (!rawData) return null;

  return (
    <Card 
      title="原始返回数据" 
      className="mt-4"
      extra={
        <Text type="secondary">
          平台：{platform === 'qq' ? 'Spotify' : 'iTunes'}
        </Text>
      }
    >
      <Collapse 
        activeKey={activeKey} 
        onChange={(keys) => setActiveKey(keys)}
      >
        <Panel header="完整数据" key="1">
          <Paragraph 
            copyable 
            ellipsis={{ rows: 10, expandable: true }}
          >
            {JSON.stringify(rawData, null, 2)}
          </Paragraph>
        </Panel>
        
        {platform === 'qq' && rawData.data && (
          <Panel header="音频详情" key="2">
            <div>
              <Text strong>歌曲名：</Text> 
              <Text>{rawData.data.song}</Text>
              <br />
              <Text strong>歌手：</Text> 
              <Text>{rawData.data.singer}</Text>
              <br />
              <Text strong>音频链接：</Text> 
              <Text copyable>{rawData.data.url}</Text>
              <br />
              <Text strong>音频质量：</Text> 
              <Text>{rawData.data.quality}</Text>
            </div>
          </Panel>
        )}

        {platform !== 'qq' && rawData.data && (
          <Panel header="音频详情" key="2">
            <div>
              <Text strong>歌曲名：</Text> 
              <Text>{rawData.data[0].name}</Text>
              <br />
              <Text strong>歌手：</Text> 
              <Text>{rawData.data[0].singer}</Text>
              <br />
              <Text strong>音频链接：</Text> 
              <Text copyable>{rawData.data[0].mp3}</Text>
            </div>
          </Panel>
        )}
      </Collapse>
    </Card>
  );
} 