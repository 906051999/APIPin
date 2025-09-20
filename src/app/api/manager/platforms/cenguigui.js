// 汽水音乐平台API实现
class CenguiguiAPI {
  constructor() {
    this.baseUrl = 'https://api.cenguigui.cn/api/douyin/music/';
  }

  // 构建搜索URL
  buildSearchUrl(term, limit = 10) {
    return `${this.baseUrl}?msg=${encodeURIComponent(term)}&limit=${limit}&type=json`;
  }

  // 构建详情URL
  buildDetailUrl(term, index) {
    return `${this.baseUrl}?msg=${encodeURIComponent(term)}&type=json&n=${index}`;
  }

  // 格式化搜索结果
  formatSearchResult(data) {
    if (!data || !data.data) return [];

    return data.data.map((item, index) => ({
      id: `${item.n}`,
      title: item.title,
      artist: item.singer,
      album: '',
      cover: item.cover,
      source: 'cenguigui',
      index: item.n
    }));
  }

  // 格式化详情结果
  formatDetailResult(data) {
    if (!data || !data.data) return null;

    const item = data.data;
    return {
      id: item.title,
      title: item.title,
      artist: item.singer,
      album: '',
      cover: item.cover,
      url: item.url,
      lyric: item.lrc,
      source: 'cenguigui'
    };
  }

  // 搜索音乐
  async search(term, options = {}) {
    const url = this.buildSearchUrl(term, options.limit);
    try {
      const response = await fetch(url);
      const data = await response.json();
      return this.formatSearchResult(data);
    } catch (error) {
      throw new Error(`Cenguigui search failed: ${error.message}`);
    }
  }

  // 获取音乐详情
  async getDetail(identifier, options = {}) {
    const url = this.buildDetailUrl(identifier, options.index);
    try {
      const response = await fetch(url);
      const data = await response.json();
      return this.formatDetailResult(data);
    } catch (error) {
      throw new Error(`Cenguigui get detail failed: ${error.message}`);
    }
  }
}

export default CenguiguiAPI;