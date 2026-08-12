// Configuración de Cloudinary para almacenamiento de imágenes
export const CLOUDINARY_CONFIG = {
  cloudName: 'xkggetol',
  baseUrl: 'https://res.cloudinary.com'
};

// Función helper para generar URLs de Cloudinary
export const getCloudinaryUrl = (publicId, options = {}) => {
  const { cloudName, baseUrl } = CLOUDINARY_CONFIG;
  const {
    width = 400,
    height = 400,
    crop = 'fill',
    gravity,
    quality = 'auto',
    format = 'auto'
  } = options;

  // Si ya es una URL completa, retornarla
  if (publicId.startsWith('http')) {
    return publicId;
  }

  // Construir la URL de Cloudinary
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    gravity && `g_${gravity}`,
    `q_${quality}`,
    `f_${format}`
  ].filter(Boolean).join(',');
  return `${baseUrl}/${cloudName}/image/upload/${transformations}/${publicId}`;
};

