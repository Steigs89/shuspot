import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large';
export type ImageFormat = 'avif' | 'webp' | 'jpeg';

interface OptimizedImageResult {
  url: string;
  srcSet: string;
  isOptimized: boolean;
  isLoading: boolean;
}

/**
 * Hook to get optimized image variants
 * Automatically selects the best format based on browser support
 */
export function useOptimizedImage(
  originalUrl: string | undefined,
  preferredSize: ImageSize = 'medium'
): OptimizedImageResult {
  const [result, setResult] = useState<OptimizedImageResult>({
    url: originalUrl || '',
    srcSet: '',
    isOptimized: false,
    isLoading: true
  });

  useEffect(() => {
    if (!originalUrl) {
      setResult({
        url: '',
        srcSet: '',
        isOptimized: false,
        isLoading: false
      });
      return;
    }

    let isMounted = true;

    async function fetchOptimizedVariants() {
      try {
        // Find the image record by original URL
        const { data: image, error: imageError } = await supabase
          .from('images')
          .select('id')
          .eq('original_url', originalUrl)
          .single();

        if (imageError || !image) {
          // No optimized version available, use original
          if (isMounted) {
            setResult({
              url: originalUrl || '',
              srcSet: '',
              isOptimized: false,
              isLoading: false
            });
          }
          return;
        }

        // Get all variants for this image
        const { data: variants, error: variantsError } = await supabase
          .from('image_variants')
          .select('*')
          .eq('image_id', image.id);

        if (variantsError || !variants || variants.length === 0) {
          // No variants yet, use original
          if (isMounted) {
            setResult({
              url: originalUrl || '',
              srcSet: '',
              isOptimized: false,
              isLoading: false
            });
          }
          return;
        }

        // Detect browser format support
        const supportedFormats = getSupportedFormats();

        // Find the best variant for the preferred size
        const preferredVariant = variants.find(
          v => v.variant_type === preferredSize && supportedFormats.includes(v.format)
        );

        // Build srcSet for responsive images
        const srcSet = buildSrcSet(variants, supportedFormats);

        if (isMounted) {
          setResult({
            url: preferredVariant?.url || originalUrl || '',
            srcSet,
            isOptimized: true,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Error fetching optimized image:', error);
        if (isMounted) {
          setResult({
            url: originalUrl || '',
            srcSet: '',
            isOptimized: false,
            isLoading: false
          });
        }
      }
    }

    fetchOptimizedVariants();

    return () => {
      isMounted = false;
    };
  }, [originalUrl, preferredSize]);

  return result;
}

/**
 * Detect which image formats the browser supports
 */
function getSupportedFormats(): ImageFormat[] {
  const formats: ImageFormat[] = ['jpeg']; // Always supported

  // Check WebP support
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
      formats.unshift('webp');
    }
  }

  // AVIF support - add to front if supported
  formats.unshift('avif');

  return formats;
}

/**
 * Build srcSet string for responsive images
 */
function buildSrcSet(variants: any[], supportedFormats: ImageFormat[]): string {
  const sizeOrder: ImageSize[] = ['thumbnail', 'small', 'medium', 'large'];
  const srcSetEntries: string[] = [];

  // Get the best format available
  const bestFormat = supportedFormats[0];

  for (const size of sizeOrder) {
    const variant = variants.find(
      v => v.variant_type === size && v.format === bestFormat
    );

    if (variant) {
      srcSetEntries.push(`${variant.url} ${variant.width}w`);
    }
  }

  return srcSetEntries.join(', ');
}

/**
 * Simple component wrapper for optimized images
 */
interface OptimizedImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | undefined;
  alt: string;
  size?: ImageSize;
}

export function OptimizedImg({
  src,
  alt,
  size = 'medium',
  className = '',
  ...props
}: OptimizedImgProps) {
  const { url, srcSet } = useOptimizedImage(src, size);

  return (
    <img
      src={url}
      srcSet={srcSet || undefined}
      sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1920px"
      alt={alt}
      className={className}
      loading="lazy"
      {...props}
    />
  );
}
