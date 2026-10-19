import React from 'react';
import { CalendarDays, Clock3, Play } from 'lucide-react';
import { getCloudinaryUrl } from '../config/cloudinary';

const durationLabel = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

const dateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

const posterUrl = (poster) => {
  if (!poster) return null;
  if (poster.provider === 'cloudinary' && poster.publicId) return getCloudinaryUrl(poster.publicId, { width: 800, height: 450, crop: 'fill', gravity: 'auto' });
  return poster.externalUrl || null;
};

export default function VideoCard({ video, onPlay }) {
  const poster = posterUrl(video.thumbnail);
  const duration = durationLabel(video.durationSeconds);
  const published = dateLabel(video.publishedAt);
  return (
    <article className="overflow-hidden rounded-[18px] border border-asanda-line bg-white shadow-sm dark:border-slate-700 dark:bg-dark-surface">
      <button type="button" onClick={() => onPlay(video)} className="group block w-full text-left outline-none transition-shadow hover:shadow-lg focus-visible:ring-4 focus-visible:ring-asanda-orange/40 motion-reduce:transition-none" aria-label={`Reproducir ${video.title}`}>
        <span className="relative grid aspect-video place-items-center overflow-hidden bg-gradient-to-br from-asanda-deep to-asanda-ink">
          {poster ? <img src={poster} alt={video.thumbnail.altText || ''} className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-[1.03]" loading="lazy" /> : <span className="px-6 text-center text-sm font-bold text-cyan-50">Video ASANDA</span>}
          <span className="relative grid h-14 w-14 place-items-center rounded-full bg-white/95 text-asanda-deep shadow-lg" aria-hidden="true"><Play size={25} fill="currentColor" /></span>
          {duration && <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded bg-black/80 px-2 py-1 text-xs font-bold text-white"><Clock3 size={13} aria-hidden="true" />{duration}</span>}
        </span>
        <span className="block p-5">
          <span className="block font-display text-xl font-bold leading-tight text-asanda-ink dark:text-white">{video.title}</span>
          {video.description && <span className="mt-2 line-clamp-2 block text-sm leading-6 text-slate-600 dark:text-slate-300">{video.description}</span>}
          {published && <time dateTime={video.publishedAt} className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400"><CalendarDays size={14} aria-hidden="true" />{published}</time>}
        </span>
      </button>
    </article>
  );
}
