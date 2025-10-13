/**
 * Utilitário para conversão consistente de datas considerando o timezone brasileiro (UTC-3)
 */

/**
 * Converte uma data (string ou Date) para epoch milliseconds,
 * interpretando como horário brasileiro (UTC-3)
 */
export function toEpochMs(dateLike: string | Date | null | undefined): number | null {
  if (!dateLike) return null;
  if (dateLike instanceof Date) {
    console.log('[toEpochMs] Date input:', dateLike, '-> ms:', dateLike.getTime());
    return dateLike.getTime();
  }
  
  // Para strings UTC que vêm do backend, converter para horário brasileiro
  if (typeof dateLike === 'string' && dateLike.includes('Z')) {
    // Remover o 'Z' e tratar como horário local brasileiro
    const dateWithoutZ = dateLike.replace('Z', '');
    const [datePart, timePart] = dateWithoutZ.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    
    // Criar data interpretando como horário local brasileiro
    const localDate = new Date(year, month - 1, day, hour, minute, second || 0);
    const result = localDate.getTime();
    
    console.log('[toEpochMs] UTC String converted to BR time:', dateLike, '-> Local Date:', localDate, '-> ms:', result);
    return result;
  }
  
  // Para outros formatos, converter normalmente
  const result = new Date(dateLike).getTime();
  console.log('[toEpochMs] String input:', dateLike, '-> Date:', new Date(dateLike), '-> ms:', result);
  return result;
}

/**
 * Converte epoch milliseconds para Date object
 */
export function fromEpochMs(ms: number): Date {
  return new Date(ms);
}