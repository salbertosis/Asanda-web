const unavailableContent = { approved: false, title: '', sections: [] };
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isValidSection = (section) => isRecord(section) && typeof section.heading === 'string' && section.heading.trim().length > 0 && typeof section.body === 'string' && section.body.trim().length > 0;

const approvedLegal = {
  approved: true,
  title: 'Información legal',
  sections: [{ heading: 'Propiedad y uso del contenido', body: 'Todo el contenido alojado en esta plataforma, incluyendo datos de eventos, boletines de resultados, normativas, gráficos y logotipos, es propiedad exclusiva de la Asociación de Deportes Acuáticos del Estado Anzoátegui (ASANDA) o cuenta con las debidas autorizaciones de uso. Queda permitida la consulta, descarga e impresión del material exclusivamente para fines informativos, personales y no comerciales por parte de atletas, entrenadores, clubes afiliados y representantes. Queda expresamente prohibida la reproducción total o parcial, redistribución o modificación del contenido sin la autorización previa y escrita de la junta directiva de la asociación.' }],
};
const approvedPrivacy = {
  approved: true,
  title: 'Privacidad',
  sections: [{ heading: 'Tratamiento de la información', body: 'La Asociación de Deportes Acuáticos del Estado Anzoátegui (ASANDA) se compromete a resguardar la información de sus usuarios, atletas, entrenadores y clubes afiliados. Los datos recopilados en este sitio web (tales como nombres, marcas deportivas, categorías y afiliaciones) se procesan con la única finalidad de gestionar las inscripciones, rankings, tiempos y logística de las competencias acuáticas organizadas o avaladas por la asociación. No se comparten ni se comercializan datos con terceros. Para cualquier solicitud relacionada con la actualización de registros o protección de datos, diríjase a los canales de atención oficiales de la asociación.' }],
};

export const legalContent = { legal: approvedLegal, privacy: approvedPrivacy };
export const isValidLegalContent = (content) => isRecord(content) && content.approved === true && typeof content.title === 'string' && content.title.trim().length > 0 && Array.isArray(content.sections) && content.sections.length > 0 && Array.from(content.sections).every(isValidSection);
export const getApprovedLegalContent = (kind, source = legalContent) => { const content = source?.[kind]; return isValidLegalContent(content) ? content : null; };
