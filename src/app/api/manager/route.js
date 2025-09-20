import { NextResponse } from 'next/server';
import CenguiguiAPI from './platforms/cenguigui';
import GdstudioAPI from './platforms/gdstudio';
import XfabeAPI from './platforms/xfabe';

// 平台API映射
const platformAPIs = {
  'cenguigui': new CenguiguiAPI(),
  'gdstudio': new GdstudioAPI(),
  'xfabe': new XfabeAPI()
};

// 统一的错误处理
function handleError(error) {
  console.error('API Error:', error);
  return NextResponse.json(
    { success: false, error: error.message },
    { status: 500 }
  );
}

// GET 处理器
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action'); // search 或 detail
  const platform = searchParams.get('platform'); // cenguigui, gdstudio, xfabe
  const term = searchParams.get('term'); // 搜索关键词或歌曲ID

  try {
    // 参数验证
    if (!action || !['search', 'detail'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action parameter, must be "search" or "detail"' },
        { status: 400 }
      );
    }

    if (!platform || !platformAPIs[platform]) {
      return NextResponse.json(
        { success: false, error: 'Invalid platform parameter' },
        { status: 400 }
      );
    }

    if (!term || term.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Invalid term parameter' },
        { status: 400 }
      );
    }

    const api = platformAPIs[platform];
    let result;

    if (action === 'search') {
      // 搜索音乐
      result = await api.search(term, {
        limit: searchParams.get('limit') || 10,
        page: searchParams.get('page') || 1
      });
    } else if (action === 'detail') {
      const type = searchParams.get('type'); // 可选：pic 或 lyric
      
      if (type === 'pic') {
        // 获取专辑图片
        result = await api.getPicture(term, {
          size: searchParams.get('size') || 500
        });
      } else if (type === 'lyric') {
        // 获取歌词
        result = await api.getLyric(term);
      } else {
        // 获取音乐详情
        result = await api.getDetail(term, {
          index: searchParams.get('index'),
          quality: searchParams.get('quality') || 320
        });
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleError(error);
  }
}