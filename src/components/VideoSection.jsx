import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, ArrowRight } from 'lucide-react';
import { getVideosDestacados } from '../data/videos';

const VideoSection = () => {
  const videos = getVideosDestacados(4);

  return (
    <section id="videos" className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Videos Destacados</h2>
          <Link to="/videos" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            Ver todos <ArrowRight size={18} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
            >
              <div className="relative">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.titulo}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-4 group-hover:scale-110 transition-transform">
                      <Play className="text-blue-600" size={32} fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  <Clock size={12} />
                  {video.duracion}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {video.titulo}
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{video.vistas} vistas</span>
                  <span>{video.fecha}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideoSection;

