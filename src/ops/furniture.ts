const FURNITURE = /테이블|탁자|의자|책상|가구|table|chair|desk|furniture/i;

export function mentionsFurniture(text: string): boolean {
  return FURNITURE.test(text);
}

export function stripFurnitureAdvice(texts: string[]): string[] {
  return texts.filter((text) => !mentionsFurniture(text));
}

export function isDescriptionShort(name: string, description: string): boolean {
  const text = `${name} ${description}`.replace(/\s+/g, " ").trim();
  return text.length < 24;
}
