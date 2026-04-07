import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface VideoContent {
  id: string;
  series_id: string;
  title: string;
  chinese_title?: string;
  description: string;
  english_description?: string;
  chinese_description?: string;
  youtube_url: string;
  youtube_id: string;
  video_url: string;
  bunny_cdn_url?: string;
  bunny_guid?: string;
  transcoding_status?: string;
  thumbnail_url: string;
  transcript: string;
  subtitles: any;
  duration: number;
  display_order: number;
  // GPT Metadata fields
  ar_level?: number;
  video_frame_dimensions?: string;
  genre_1?: string;
  genre_2?: string;
  genre_3?: string;
  is_song?: boolean;
  is_lullaby?: boolean;
  is_animation?: boolean;
  is_dance?: boolean;
  is_educational?: boolean;
  is_entertainment?: boolean;
  intended_for_children?: boolean;
  has_english_subtitles?: boolean;
  created_at: string;
  updated_at: string;
}

export interface VideoSeries {
  id: string;
  channel_id: string;
  name: string;
  chinese_name?: string;
  description: string;
  thumbnail_url: string;
  season_thumb_url?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface VideoChannel {
  id: string;
  name: string;
  chinese_name?: string;
  description: string;
  english_description?: string;
  chinese_description?: string;
  banner_url: string;
  profile_pic_url: string;
  channel_thumb_url?: string;
  source_type?: 'youtube' | 'disney_netflix';
  created_at: string;
  updated_at: string;
}

export interface VideoChannelWithCounts extends VideoChannel {
  series_count: number;
  video_count: number;
}

export function useVideoChannels() {
  const [channels, setChannels] = useState<VideoChannelWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchChannels() {
      try {
        setLoading(true);
        
        // Fetch all channels - force fresh data by using a unique query each time
        // This prevents Supabase client from returning cached results
        const { data: channelsData, error: channelsError } = await supabase
          .from('video_channels')
          .select('*')
          .order('name')
          .gte('created_at', '2000-01-01') // Add a filter that always matches to bust cache
          .limit(1000);

        if (channelsError) throw channelsError;
        
        // Log channel data to verify URLs are present
        console.log('📺 Fetched channels:', channelsData?.map(c => ({
          name: c.name,
          banner_url: c.banner_url,
          channel_thumb_url: c.channel_thumb_url
        })));

        // For each channel, get series and video counts
        const channelsWithCounts = await Promise.all(
          (channelsData || []).map(async (channel) => {
            // Get series count
            const { count: seriesCount } = await supabase
              .from('video_series')
              .select('*', { count: 'exact', head: true })
              .eq('channel_id', channel.id);

            // Get series IDs for this channel
            const { data: seriesData } = await supabase
              .from('video_series')
              .select('id')
              .eq('channel_id', channel.id);

            const seriesIds = (seriesData || []).map(s => s.id);

            // Get video count across all series
            let videoCount = 0;
            if (seriesIds.length > 0) {
              const { count } = await supabase
                .from('video_content')
                .select('*', { count: 'exact', head: true })
                .in('series_id', seriesIds);
              videoCount = count || 0;
            }

            return {
              ...channel,
              series_count: seriesCount || 0,
              video_count: videoCount
            };
          })
        );

        setChannels(channelsWithCounts);
        setError(null);
      } catch (err) {
        console.error('Error fetching video channels:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchChannels();
  }, []);

  return { channels, loading, error };
}

export function useVideoSeries(channelId?: string) {
  const [series, setSeries] = useState<VideoSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSeries() {
      try {
        setLoading(true);
        
        let query = supabase
          .from('video_series')
          .select('*')
          .order('display_order');

        if (channelId) {
          query = query.eq('channel_id', channelId);
        }

        const { data, error: seriesError } = await query;

        if (seriesError) throw seriesError;

        setSeries(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching video series:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchSeries();
  }, [channelId]);

  return { series, loading, error };
}

export function useVideoContent(seriesId?: string) {
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true);
        
        let query = supabase
          .from('video_content')
          .select('*')
          .order('display_order');

        if (seriesId) {
          query = query.eq('series_id', seriesId);
        }

        const { data, error: videosError } = await query;

        if (videosError) throw videosError;

        setVideos(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching video content:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, [seriesId]);

  return { videos, loading, error };
}

// Hook to get all data for a specific channel
export function useChannelData(channelId: string) {
  const { channels, loading: channelsLoading } = useVideoChannels();
  const { series, loading: seriesLoading } = useVideoSeries(channelId);
  const [allVideos, setAllVideos] = useState<VideoContent[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

  const channel = channels.find(c => c.id === channelId);

  useEffect(() => {
    async function fetchAllVideos() {
      if (series.length === 0) {
        setAllVideos([]);
        setVideosLoading(false);
        return;
      }

      try {
        setVideosLoading(true);
        const seriesIds = series.map(s => s.id);
        
        const { data, error } = await supabase
          .from('video_content')
          .select('*')
          .in('series_id', seriesIds)
          .order('display_order');

        if (error) throw error;

        setAllVideos(data || []);
      } catch (err) {
        console.error('Error fetching all videos for channel:', err);
      } finally {
        setVideosLoading(false);
      }
    }

    fetchAllVideos();
  }, [series]);

  return {
    channel,
    series,
    videos: allVideos,
    loading: channelsLoading || seriesLoading || videosLoading
  };
}

// Hook to get recently uploaded videos across all channels
export function useRecentVideos(limit: number = 10) {
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRecentVideos() {
      try {
        setLoading(true);
        
        const { data, error: videosError } = await supabase
          .from('video_content')
          .select(`
            *,
            video_series!inner(
              id,
              name,
              chinese_name,
              channel_id,
              video_channels!inner(
                id,
                name,
                chinese_name
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (videosError) throw videosError;

        setVideos(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching recent videos:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentVideos();
  }, [limit]);

  return { videos, loading, error };
}
