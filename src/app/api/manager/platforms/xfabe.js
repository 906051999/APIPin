// XF网易云音乐平台API实现
class XfabeAPI {
  constructor() {
    this.searchUrl = 'https://node.api.xfabe.com/api/wangyi/search';
    this.musicUrl = 'https://node.api.xfabe.com/api/wangyi/music';
    this.lyricUrl = 'https://node.api.xfabe.com/api/wangyi/lyrics';
  }

  // 构建搜索URL
  buildSearchUrl(term, limit = 10) {
    return `${this.searchUrl}?search=${encodeURIComponent(term)}&limit=${limit}`;
  }

  // 构建详情URL
  buildDetailUrl(trackId) {
    return `${this.musicUrl}?type=json&id=${trackId}`;
  }

  // 构建歌词URL
  buildLyricUrl(trackId) {
    return `${this.lyricUrl}?id=${trackId}`;
  }

  // 格式化搜索结果
  formatSearchResult(data) {
    if (!data || !data.data || !data.data.songs) return [];

    return data.data.songs.map(song => ({
      id: song.id,
      title: song.name,
      artist: song.artistsname,
      album: song.album,
      duration: song.duration,
      source: 'xfabe'
    }));
  }

  // 格式化详情结果
  formatDetailResult(data) {
    if (!data || !data.data) return null;

    const song = data.data;
    return {
      id: song.id,
      title: song.name,
      artist: song.artistsname,
      album: song.album,
      cover: song.picurl,
      url: song.url,
      duration: song.duration,
      pay: song.pay,
      source: 'xfabe'
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
      throw new Error(`Xfabe search failed: ${error.message}`);
    }
  }

  // 获取音乐详情
  async getDetail(identifier, options = {}) {
    const url = this.buildDetailUrl(identifier);
    try {
      const response = await fetch(url);
      const data = await response.json();
      return this.formatDetailResult(data);
    } catch (error) {
      throw new Error(`Xfabe get detail failed: ${error.message}`);
    }
  }

  // 获取歌词
  async getLyric(identifier) {
    const url = this.buildLyricUrl(identifier);
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      throw new Error(`Xfabe get lyric failed: ${error.message}`);
    }
  }
}

export default XfabeAPI;