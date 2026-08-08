// Configuración de Cloudinary para almacenamiento de imágenes
// Reemplaza 'tu-cloud-name' con tu Cloud Name de Cloudinary

export const CLOUDINARY_CONFIG = {
  cloudName: 'tu-cloud-name', // Reemplazar con tu Cloud Name
  baseUrl: 'https://res.cloudinary.com',
  folder: 'asanda/atletas' // Carpeta en Cloudinary
};

// Función helper para generar URLs de Cloudinary
export const getCloudinaryUrl = (publicId, options = {}) => {
  const { cloudName, baseUrl, folder } = CLOUDINARY_CONFIG;
  const {
    width = 400,
    height = 400,
    crop = 'fill',
    quality = 'auto',
    format = 'auto'
  } = options;

  // Si ya es una URL completa, retornarla
  if (publicId.startsWith('http')) {
    return publicId;
  }

  // Construir la URL de Cloudinary
  const transformations = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
  const path = folder ? `${folder}/${publicId}` : publicId;
  
  return `${baseUrl}/${cloudName}/image/upload/${transformations}/${path}`;
};

// Función para generar URL de foto de atleta
export const getAtletaFotoUrl = (cedula, club) => {
  // Normalizar nombre del club para la carpeta
  const clubFolder = club.toLowerCase().replace(/\s+/g, '-');
  const publicId = `${clubFolder}/${cedula}`;
  
  return getCloudinaryUrl(publicId, {
    width: 400,
    height: 400,
    crop: 'fill',
    quality: 'auto'
  });
};

