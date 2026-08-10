const unavailableContent = { approved: false, title: '', sections: [] };
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isValidSection = (section) => isRecord(section) && typeof section.heading === 'string' && section.heading.trim().length > 0 && typeof section.body === 'string' && section.body.trim().length > 0;

export const legalContent = { legal: unavailableContent, privacy: unavailableContent };
export const isValidLegalContent = (content) => isRecord(content) && content.approved === true && typeof content.title === 'string' && content.title.trim().length > 0 && Array.isArray(content.sections) && content.sections.length > 0 && Array.from(content.sections).every(isValidSection);
export const getApprovedLegalContent = (kind, source = legalContent) => { const content = source?.[kind]; return isValidLegalContent(content) ? content : null; };
