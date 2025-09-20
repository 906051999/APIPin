// GD音乐平台API实现
class GdstudioAPI {
  constructor() {
    this.baseUrl = 'https://music-api.gdstudio.xyz/api.php';
  }

  // 构建搜索URL
  buildSearchUrl(term, limit = 20, page = 1) {
    return `${this.baseUrl}?types=search&name=${encodeURIComponent(term)}&count=${limit}&pages=${page}&source=netease`;
  }

  // 构建详情URL
  buildDetailUrl(trackId, quality = 320) {
    return `${this.baseUrl}?types=url&id=${trackId}&br=${quality}&source=netease`;
  }

  // 构建图片URL
  buildPicUrl(picId, size = 500) {
    return `${this.baseUrl}?types=pic&id=${picId}&size=${size}&source=netease`;
  }

  // 构建歌词URL
  buildLyricUrl(lyricId) {
    return `${this.baseUrl}?types=lyric&id=${lyricId}&source=netease`;
  }

  // 格式化搜索结果
  formatSearchResult(data) {
    if (!data || !Array.isArray(data)) return [];

    return data.map(item => ({
      id: item.id,
      title: item.name,
      artist: Array.isArray(item.artist) ? item.artist.join(', ') : item.artist,
      album: item.album,
      coverId: item.pic_id,
      lyricId: item.lyric_id,
      source: 'gdstudio'
    }));
  }

  // 格式化详情结果
  formatDetailResult(data) {
    if (!data || !data.url) return null;

    return {
      url: data.url,
      quality: data.br,
      size: data.size,
      source: 'gdstudio'
    };
  }

  // 格式化图片结果
  formatPicResult(data) {
    if (!data || !data.url) return null;

    return {
      url: data.url,
      source: 'gdstudio'
    };
  }

  // 格式化歌词结果
  formatLyricResult(data) {
    if (!data) return null;

    return {
      lyric: data.lyric || '',
      tlyric: data.tlyric || '',
      source: 'gdstudio'
    };
  }

  // 搜索音乐
  async search(term, options = {}) {
    const url = this.buildSearchUrl(term, options.limit, options.page);
    try {
      const response = await fetch(url);
      const data = await response.json();
      return this.formatSearchResult(data);
    } catch (error) {
      throw new Error(`Gdstudio search failed: ${error.message}`);
    }
  }

  // 获取音乐详情
  async getDetail(identifier, options = {}) {
    const url = this.buildDetailUrl(identifier, options.quality);
    try {
      const response = await fetch(url);
      const data = await response.json();
      return this.formatDetailResult(data);
    } catch (error) {
      throw new Error(`Gdstudio get detail failed: ${error.message}`);
    }
  }

  // 获取歌词
  async getLyric(identifier) {
    const url = this.buildLyricUrl(identifier);
    try {
      const response = await fetch(url);
      const data = await response.json();
      return this.formatLyricResult(data);
    } catch (error) {
      throw new Error(`Gdstudio get lyric failed: ${error.message}`);
    }
  }

  // 获取专辑图片
  async getPicture(identifier, options = {}) {
    const url = this.buildPicUrl(identifier, options.size);
    try {
      const response = await fetch(url);
      const data = await response.json();
      return this.formatPicResult(data);
    } catch (error) {
      throw new Error(`Gdstudio get picture failed: ${error.message}`);
    }
  }
}

export default GdstudioAPI;