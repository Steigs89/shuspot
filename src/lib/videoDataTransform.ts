import { VideoChannelWithCounts, VideoSeries, VideoContent } from '../hooks/useVideos';
import { Channel, Series, Episode, Season } from './videoMockData';

/**
 * Transform Supabase video channel data to UI format
 * 
 * @param channel - Channel data from Supabase
 * @param allSeries - All series data for counting
 * @param language - Language preference ('en' or 'zh')
 */
export function transformChannel(
  channel: VideoChannelWithCounts,
  allSeries: VideoSeries[],
  language: 'en' | 'zh' = 'en'
): Channel {
  // Get series for this channel
  const channelSeries = allSeries.filter(s => s.channel_id === channel.id);
  
  // Use bilingual fields based on language preference
  const name = language === 'zh' && channel.chinese_name 
    ? channel.chinese_name 
    : channel.name;
  
  const description = language === 'zh' && channel.chinese_description
    ? channel.chinese_description
    : channel.english_description || channel.description || '';
  
  return {
    id: channel.id,
    name,
    description,
    banner: channel.banner_url || 'https://images.unsplash.com/photo-1629822908853-b1d2a39ece98?w=1080',
    logo: channel.channel_thumb_url || channel.profile_pic_url || channel.banner_url || 'https://images.unsplash.com/photo-1629822908853-b1d2a39ece98?w=200',
    gradeLevels: ['Pre-K', 'K', '1', '2', '3'], // Default - could be stored in metadata
    genres: ['Science'], // Default - could be stored in metadata
    categories: [
      {
        name: 'All Shows',
        seriesIds: channelSeries.map(s => s.id)
      }
    ]
  };
}

/**
 * Transform Supabase video series data to UI format
 * 
 * @param series - Series data from Supabase
 * @param videos - All videos for this series
 * @param language - Language preference ('en' or 'zh')
 */
export function transformSeries(
  series: VideoSeries,
  videos: VideoContent[],
  language: 'en' | 'zh' = 'en'
): Series {
  // Use bilingual name based on language preference
  const title = language === 'zh' && series.chinese_name
    ? series.chinese_name
    : series.name;
  
  // Group videos by season (for now, all videos go into season 1)
  // In the future, you could add a season field to video_content table
  const episodes = videos
    .filter(v => v.series_id === series.id)
    .sort((a, b) => a.display_order - b.display_order)
    .map((video, index) => transformVideo(video, 1, index + 1, language));

  const seasons: Season[] = episodes.length > 0 ? [
    {
      number: 1,
      episodes
    }
  ] : [];

  return {
    id: series.id,
    title,
    description: series.description || '',
    thumbnail: series.thumbnail_url || 'https://images.unsplash.com/photo-1613271752699-ede48a285196?w=400',
    banner: series.season_thumb_url || series.thumbnail_url || 'https://images.unsplash.com/photo-1613271752699-ede48a285196?w=1080',
    seasons,
    channelId: series.channel_id
  };
}

/**
 * Transform Supabase video content to UI episode format
 * 
 * @param video - Video content from Supabase
 * @param seasonNumber - Season number for this episode
 * @param episodeNumber - Episode number within season
 * @param language - Language preference ('en' or 'zh')
 */
export function transformVideo(
  video: VideoContent,
  seasonNumber: number = 1,
  episodeNumber: number = 1,
  language: 'en' | 'zh' = 'en'
): Episode {
  // Format duration as MM:SS
  const minutes = Math.floor(video.duration / 60);
  const seconds = video.duration % 60;
  const runtime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Prioritize Bunny CDN URL over regular video_url
  const videoUrl = video.bunny_cdn_url || video.video_url;
  
  // Use bilingual fields based on language preference
  const title = language === 'zh' && video.chinese_title
    ? video.chinese_title
    : video.title;
  
  const description = language === 'zh' && video.chinese_description
    ? video.chinese_description
    : video.english_description || video.description || undefined;

  // Debug logging
  console.log(`🎬 Transform video: ${title}`, {
    bunny_cdn_url: video.bunny_cdn_url,
    video_url: video.video_url,
    final_url: videoUrl,
    duration: video.duration,
    ar_level: video.ar_level,
    genres: [video.genre_1, video.genre_2, video.genre_3].filter(Boolean),
    content_flags: {
      song: video.is_song,
      lullaby: video.is_lullaby,
      animation: video.is_animation,
      dance: video.is_dance,
      educational: video.is_educational,
      entertainment: video.is_entertainment
    }
  });

  return {
    id: video.id,
    title,
    description,
    thumbnail: video.thumbnail_url || 'https://images.unsplash.com/photo-1613271752699-ede48a285196?w=400',
    runtime,
    duration: video.duration,
    seasonNumber,
    episodeNumber,
    videoUrl,
    watched: 0, // Could be fetched from user progress table
    // Include GPT metadata for filtering/display
    arLevel: video.ar_level,
    genres: [video.genre_1, video.genre_2, video.genre_3].filter(Boolean) as string[],
    isSong: video.is_song,
    isLullaby: video.is_lullaby,
    isAnimation: video.is_animation,
    isDance: video.is_dance,
    isEducational: video.is_educational,
    isEntertainment: video.is_entertainment,
    // Subtitles
    subtitles: video.subtitles || undefined
  };
}

/**
 * Transform all Supabase data to UI format
 * 
 * @param channels - All channel data
 * @param allSeries - All series data
 * @param allVideos - All video content
 * @param language - Language preference ('en' or 'zh')
 */
export function transformAllVideoData(
  channels: VideoChannelWithCounts[],
  allSeries: VideoSeries[],
  allVideos: VideoContent[],
  language: 'en' | 'zh' = 'en'
): {
  channels: Channel[];
  series: Series[];
} {
  const transformedChannels = channels.map(channel => 
    transformChannel(channel, allSeries, language)
  );

  const transformedSeries = allSeries.map(series =>
    transformSeries(series, allVideos, language)
  );

  return {
    channels: transformedChannels,
    series: transformedSeries
  };
}
