declare module 'youtube-dl' {
  interface Info {
    url: string;
  }
  interface Ytdl {
    getInfo: (...args: any[]) => Promise<Info>
  }
  const ytdl: Ytdl
  export default ytdl
}
